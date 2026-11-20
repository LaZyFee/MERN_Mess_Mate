# MealMate — Project Plan & Full Backend Architecture Documentation

**Project Root:** `MealMate/` — Backend lives in `Server/`
**Stack:** Express 5 · Mongoose 8 (MongoDB) · Socket.IO 4 · Zod 4 · JWT · Passport (Google OAuth) · ES Modules (`"type": "module"`)
**Entry Point:** `Server/index.js` (port 5000, `npm run dev` via nodemon)
**Tests:** `npm test` → `node --test tests/*.test.js`

---

## 1. Project Vision

MealMate is a **mess/mess-group management and accounting system** for shared living in Bangladesh. Members log meals per day across configurable slots (breakfast/lunch/snacks/dinner), expenses flow through an approval workflow, and money movements land in an **immutable double-entry ledger**. Every month is closed via a versioned, immutable **Statement** — never an overwrite. The domain model is built around four core ideas:

1. **Integer-poisha money** — 1 BDT = 100 poisha; all amounts are integers, never floats (`utils/money.js`).
2. **Double-entry journal** — the monetary source of truth; debits must equal credits; balances are *derived*, not stored (`Journal` + `ledgerService`).
3. **State machines everywhere** — Expense (`draft → submitted → approved | rejected → reversed`), MoneyTransaction, Period (`open → review → finalized`), with revision counters for concurrency safety.
4. **Immutability & auditability** — statements supersede instead of overwrite, journals reverse instead of delete, every financial action lands in an append-only audit trail.

---

## 2. Runtime Wiring (`Server/index.js`)

| Concern | Implementation |
|---|---|
| Security headers | `helmet()` |
| Rate limiting | `express-rate-limit` — auth: 50 req/15min; general: 300 req/15min |
| CORS | Strict allowlist from `FRONTEND_URL` env (comma-separated), credentials enabled |
| Body limits | `express.json({limit:'10kb'})` + urlencoded — rejects oversized payloads |
| Parameter pollution | `hpp()` |
| CSRF | `middleware/csrf.js` mounted globally (origin check for cookie mutations) |
| Sessions | `express-session` (MemoryStore) — only for the Google OAuth handshake (10 min cookie) |
| Auth | `passport.initialize()/session()` with Google OAuth20 strategy (`config/passportJs.js`) |
| Realtime | Socket.IO server with JWT handshake (`?token=`), rooms `group:<id>`; `io` exposed to controllers via `app.set('io', io)` |
| Background jobs | `startOutboxWorker()` (notification delivery) and `startScheduler()` (cron) started at boot |
| Error handling | Global handler — never leaks internal messages; 404 catch-all |

**Mounted route prefixes:** `/api/users`, `/api/admin` (hidden control plane — replies **404** to non-admins), `/api/messgroups`, `/api/meals`, `/api/expenses`, `/api/summary`, `/api/stats`, `/api/memberships`, `/api/policies`, `/api/periods`, `/api/money`, `/api/statements`, `/api/recurring`, `/api/reconciliation`, `/api/disputes`, `/api/notifications`, `/api/sessions`, `/api/attachments`, `/api/assets`.

---

## 3. MODELS (detailed, one per model)

### 3.1 Core Identity & Group

**`User`** (`models/User.js`)
Account holder. Fields: `googleId` (optional OAuth identity), `username`, `email` (unique, plugin `mongoose-unique-validator`), `phone`, `whatsapp` (optional, digits w/ country code), `whatsappConsent` + `whatsappConsentAt` (Doc §13 opt-in for automated WA messages), `password` (bcrypt, required only if not Google), `profilePic`, `refreshToken` (hashed), `suspended` (platform-level ban, indexed — checked on login, refresh and **every** authenticated request via `auth` middleware), password-reset/email-verification token fields, and legacy `messGroups[]` array (denormalized — doc says this should not exist; kept for back-compat). Works: register/login bcrypt-compare, refresh-token rotation, consent toggles gate WhatsApp delivery. Privacy rule: a user's profile is discoverable by others **only inside groups they share** (`GET /api/users/groups/:groupId/members` returns username/profilePic/whatsapp only — never email/phone).

**`MessGroup`** (`models/MessGroup.js`)
The mess. Fields: `name`, `code` (unique join code like `MM-7K2QPX`), `admin`, V2 meal config — `mealSlots[]` (enum of 4 slots), `mealWeights{breakfast,lunch,snacks,dinner}` (integer per-1000), `defaultMealSubunits{}` (0/250/500/750/1000 auto-fill), `defaultMealsEnabled`, `guestMealModes[]`. Legacy fields: embedded `members[]`, pendingRequests, `entries[]` (date + meals + costs embedded docs — obsolete ledger-bypass pattern), `extras[]` (static monthly costs, superseded by RecurringRule).

**`Membership`** (`models/Membership.js`)
Effective-dated "who was in the group when" history — the V2 replacement for embedded members. Fields: `groupId`, `user` (null for placeholders), `displayName`, `isPlaceholder`, interval `[startDate, endDate)`, V2 `role` (owner/manager/treasurer/auditor/member), `room`, `weight` (share weight e.g. bigger room = 2), `leftAt` (departure keeps debt/credit), `replacedBy` (placeholder→real account link). Works: RBAC resolves the role from the interval containing "now"; overlap prevention via `membershipService.assertNoOverlap`.

**`Session`** (`models/Session.js`)
One row per device. `familyId` (one per login), `deviceId`, `userAgent`, `ip`, `currentTokenHash` (sha256 of newest refresh token), `previousTokenHashes[]` (rotation history), `revokedAt/reason`, `reusedAt`, TTL-indexed `expiresAt`. Works: refresh rotation stays in-family; replaying an old token revokes the **whole family** (reuse detection).

### 3.2 Money & Ledger

**`Journal`** (`models/Journal.js`)
**The monetary source of truth.** Immutable double-entry postings. Embedded `lines[]`: each line has `accountType` (`member` | `fund` | `clearing`), optional `memberId`/`accountId`/`clearingName`, `direction` (debit/credit), `amount` (integer poisha ≥ 1), memo. Header: `groupId`, `sourceType` (expense / money_transaction / recurring / adjustment / reversal / opening), `sourceId`, `sourceRevision`, `postingKind` (original/reversal), `reversalOf`, `costPeriod` (YYYY-MM), `postedBy`. A **unique index on (groupId, sourceType, sourceId, sourceRevision, postingKind)** guarantees exactly-once posting. `ledgerService.postJournal` validates ≥2 lines, debits == credits, non-zero value; `reverseJournal` creates a mirrored reversal without touching the original.

**`MoneyTransaction`** (`models/MoneyTransaction.js`)
Real-world money movement with a lifecycle `submitted → confirmed | rejected`, confirmed → `reversed`. Six kinds: `contribution` (member→fund), `payout` (fund→member), `supplier_payment`, `member_settlement` (member→member), `transfer` (fund→fund), `fee`. Fields: integer-poisha `amount`, from/to Member + Account refs, `supplierName`, `method` (cash/bkash/nagad/rocket/bank/other — Bangladesh rails), `reference` (TrxID), `paidAt`, submitter/confirmator metadata, `reversalOf`, `evidenceUrl`. On `confirm`, `moneyController.buildJournalLines` translates each kind into balanced debit/credit journal lines inside `withTransaction()`.

**`FundAccount`** (`models/FundAccount.js`)
Group-owned cash / wallet / bank. `kind`, currency BDT, `maskedIdentifier` (raw wallet numbers **never stored**), `currentCustodian` + `custodianHistory[]` (interval custody trail), `isArchived`. Balance is *not stored* — computed from Journal postings.

**`Allocation`** (`models/Allocation.js`)
Frozen per-line allocation evidence produced at approval: `expenseId`, `lineId`, `poolKind` (the split mode), `total`, `entries[{membershipId, weight, charge}]`, `algorithmVersion: 'largest_remainder_v1'`, `reversalOf`. Unique index (groupId, expenseId, lineId). Makes any statement explainable/auditable after the fact.

**`Reconciliation`** (`models/Reconciliation.js`)
Counted (physical/statement) cash vs ledger-expected balance for a fund account at `asOf`. Stores `expectedBalance`, `actualBalance`, `variance` (actual − expected), status open/resolved, resolution (`adjusted` | `accepted_shortage` | `found_cash`), explanation and reviewers. Variances are explained, never hidden.

### 3.3 Expenses & Categories

**`Expense`** (`models/Expense.js`)
Full workflow: `draft → submitted → approved | rejected`; approved → `reversed` via a linked reversal row (never erased). **Multi-line receipts:** `lines[]` each with description, `categoryId`, poisha `amount`, per-line `splitMode` override, `beneficiaries[]`, `fixedAmounts[]`, `weights[]`, `usageQuantities[]`. **Multi-payer:** `payers[]` ({memberId, amount, fundAccountId|null = personal pocket}). Supplier-payable support: `isPayable`, `paidTotal`. Service-period fields for utility bills (`serviceStart/serviceEnd`), `costPeriod` (the month being charged), `receiptReference` (invoice/TrxID — used by duplicate detection), supplier name, revision counter, schemaVersion 2 (legacy `userId`/`amount`/`description`/`category` kept in sync).

**`ExpenseCategory`** (`models/ExpenseCategory.js`)
Per-group admin-managed category defining a **default split mode**: `meal_units` (food/bazar → meal rate), `equal_all` (rent), `equal_selected` (Wi-Fi subset), `member_days` (electricity by eligible days), `fixed_amounts` (room rents), `weighted`, `usage` (submeter), `personal` (convenience = equal_selected n=1; legacy `meal`/`equal` normalized). `isFoodPool` marks lines feeding the meal rate; archive-instead-of-delete. `expenseCategoryController` ships **14 Bangladesh presets** (Bazar/Groceries, Rice, Fish/Meat, Cooking Oil, LPG/Cooking Gas, Cook Salary, Rent, Electricity, Water, Wi-Fi, Waste Collection, Kitchen Supplies, Repairs, Personal) auto-seeded on group creation via `seedDefaultCategories()`.

**`DepositAsset`** (`models/DepositAsset.js`)
Capital items kept out of the food pool: `kind` (landlord_deposit / kitchen_equipment / advance / other_asset), `initialAmount`, `currentValuation`, status (active → partially/fully_refunded | written_off), `fundingShares[]` (who funded how much poisha, `refundedAmount` tracked), `refunds[]` (with optional linked MoneyTransaction), `custodianId`. Controller validates funding shares sum = initialAmount.

**`RecurringRule`** (`models/RecurringRule.js`)
Generates expense **drafts** (never auto-approved): name, categoryId, poisha amount, splitMode + beneficiaries/fixed/weights, supplier, `dueDayOfMonth`, effective month range `[effectiveFrom, effectiveTo]`, `generatedKeys[]` (generation ledger — unique per costPeriod prevents duplicates), `isActive`. The scheduler generates drafts for the current Dhaka month; manual endpoints exist for one rule or all rules.

### 3.4 Meals

**`Meal`** (`models/Meal.js`)
One document per user per group per Dhaka civil day (unique index). Four **slot subdocuments** (`breakfast/lunch/snacks/dinner`) each carrying:
- `state`: `unknown` (not yet reported — blocks finalize) | `confirmed_zero` (explicitly absent) | `consumed`
- `portionSubunits`: integer thousandths (250 = ¼, 500 = ½, 750 = ¾, 1000 = 1 portion)
- `actorId`, `source`: `member` | `absence` | `default` (scheduler auto-fill) | `admin`

A `pre('validate')` hook sums `totalMealSubunits` over **consumed** slots only (`unknown`/`confirmed_zero` contribute zero). Statement finalization refuses (422) any period with remaining `unknown` slots.

**`GuestMeal`** (`models/GuestMeal.js`)
Guest consumption. Fields: `hostUserId`/`hostMembershipId`, `guestName`, `localDate` (Dhaka civil date string), `slot`, `portionSubunits`, **`poolMode`**: `individual` (guest counted into the host's own meal total — host pays) or `universal` (added to the group denominator — everyone's meal rate rises), optional `eventPoolRef`, `status` active/void.

**`MonthlySummary`** (`models/MonthlySummary.js`) — **LEGACY**
Float-based per-month summary (`totalMeals`, `mealRate`, `userSummaries[]` with balance + owes/receives/settled, `extras[]`, `isFinalized`). Superseded by `Statement`; finalize path now returns 410/409 pointing to `/api/statements/:month/finalize`.

**`PaymentNote`** (`models/PaymentNote.js`) — **LEGACY**
Admin-authored per-member per-month note with `amountDue`, `isPaid`, `paidAt` boolean financial tracking — doc §7/§10 forbids boolean-based balances (must come from Journal). Kept only on deprecated routes.

### 3.5 Policy, Period, Statement

**`PolicyVersion`** (`models/PolicyVersion.js`)
Immutable, effective-dated group rules: `version`, `effectiveFrom` (YYYY-MM), per-slot `mealWeights` (integer per-1000), `allowedPortions`, `entryCutoffHour` (Dhaka hour after which edits are blocked), currency/timezone (`Asia/Dhaka`), rounding (`largest_remainder`), `requireExpenseApproval`, `reviewGraceDays`, publisher. Edits create a new version; finalized months freeze a `policySnapshot`.

**`Period`** (`models/Period.js`)
One calendar month per group with the state machine **`open → review → finalized`**. `revision` increments on every cost-affecting mutation while open; finalize passes `expectedRevision`, so a concurrent edit loses with **409 Conflict**. Links `policyVersion` and, at finalize, `statement`.

**`Statement`** (`models/Statement.js`)
Immutable month-end closing snapshot with versioning/supersession: corrections create version N+1 linked by `supersedes`/`supersededBy`; rows never mutate. Per-member `items[]`: mealUnits (weighted chargeable units), rawPortions snapshot, mealCost, otherCost, totalCharge, contributions, personalPayments, settlements paid/received, payoutsReceived, priorPeriodAdjustments, `openingCredit`/`closingCredit` (positive = group owes member), status owes/receives/settled. Header totals: mealExpenses/otherExpenses/totalExpenses, fundBalance, `mealRate` (integer poisha per meal unit), frozen `policySnapshot` + `membershipSnapshot`, `sourceHash` (sha256 of inputs).

### 3.6 Hidden Admin Control Plane (new)

**`adminController`** (`controllers/adminController.js`) + **`adminRoutes`** (`routes/adminRoutes.js`) — platform administration **completely invisible to app users**:

- **Guard:** `requirePlatformAdmin` — allowlist of emails from `ADMIN_EMAILS` env, optional second factor `X-Admin-Key` header vs `ADMIN_PANEL_KEY` env. Denied requests are **audit-logged** and answered with a generic **404** (same body as the global 404) so the endpoint's existence is never confirmed. No route is referenced from any user-facing surface.
- **Traffic:** `GET /api/admin/overview` — total users/groups/active memberships/statements, signups last 24h & 7d, verified count, audit-event volume; `GET /api/admin/traffic?days=30` — daily signup & activity buckets (Mongo aggregations); `GET /api/admin/audit` — filterable latest audit events.
- **User directory:** `GET /api/admin/users?q=&cursor=` (search by username/email/phone), `GET /api/admin/users/:userId` (full profile + all memberships incl. group names/codes), `PATCH /api/admin/users/:userId` (verify / **suspend** — suspension kills login, refresh and every authenticated request).
- **Group directory:** `GET /api/admin/groups?q=` (ALL groups + active member counts + admin info — the only place group enumeration exists), `GET /api/admin/groups/:groupId` (deep inspection: group + all memberships populated), `DELETE /api/admin/groups/:groupId` (archive, audit-logged).
- Every admin mutation is audit-logged (`admin.access_denied`, `admin.user_updated`, `admin.group_archived`).

### 3.7 Privacy Guards (new — `middleware/privacy.js`)

- **`requireGroupMembership`** — hard gate: active-membership lookup; non-members get a generic **404** (group existence never confirmed).
- **`resolveHistoryWindow`** — ex-members may read history **only inside their membership interval**: clamps date filters to `[firstJoin, lastDeparture]` (`req.historyFrom/To`, applied by meal & expense list controllers).
- **`MEMBER_VISIBLE_FIELDS` / `publicProfile`** — central allowlist (`username`, `profilePic`) for cross-member profile data; email/phone never cross the group boundary.
- **Co-member directory:** `GET /api/users/groups/:groupId/members` — only for group members; outsiders get 404.
- **Join path:** groups are reachable **only via invite code** (`join-by-code`); `GET /api/messgroups/code/:groupId` now also returns a ready-to-copy `inviteLink` (`{FRONTEND_URL}/join?code=MM-XXXXXX`).
- **Leave/kick:** `removeMember` closes the V2 Membership interval immediately (`endDate/leftAt = now`), pulls legacy arrays, and audit-logs `membership.self_left` vs `membership.kicked`. Balances preserved; future access denied instantly.

### 3.8 Ops, Security & Delivery

**`AuditEvent`** (`models/AuditEvent.js`) — append-only audit trail (no update/delete API). `actorId`, dotted `action` (e.g. `expense.approved`), target type/id, redacted `before`/`after` snapshots (redaction helper strips password/token fields), reason, requestId, ip; immutable `createdAt` only. The exported `audit()` helper never breaks the request path on failure.

**`IdempotencyRecord`** (`models/IdempotencyRecord.js`) — replay protection for financial mutations. Key = (groupId, actorId, operation, key); stores `requestHash` (sha256 of body+params), cached `resultBody`, TTL-indexed `expiresAt` (24h). Same key + different body → **409**; same key + same body → cached replay.

**`NotificationOutbox`** (`models/NotificationOutbox.js`) — outbox pattern: written with the business commit, processed afterwards by the worker. `channel` (email/whatsapp/in_app), purpose, dedupeKey, recipient snapshot (email/WA), template payload, lifecycle `pending → processing → sent | delivered | read | failed | skipped | not_configured`, attempts/maxAttempts, exponential `nextAttemptAt`, `providerMessageId` (linked to WA webhooks), `consentBasis`.

**`Attachment`** (`models/Attachment.js`) — private receipt/document metadata: original/stored names, storagePath, mimeType whitelist (jpeg/png/webp/pdf), size ≤ 10MB, `sha256`, `scanStatus`, target (expense_receipt/payment_evidence/other) + targetId. Download is authenticated and group-scoped.

---

## 4. SERVICES (admin visibility note: `audit()` events feed both the in-app audit trail and the admin traffic dashboard)

| Service | File | What it does |
|---|---|---|
| **ledgerService** | `services/ledgerService.js` | `postJournal()` — validates ≥2 lines, debit==credit, nonzero, dedup-checks then inserts (session-aware); `reverseJournal()` — idempotent mirror-image reversal linking `reversalOf`. |
| **statementService** | `services/statementService.js` | `buildStatementDraft()` — aggregates approved expenses → allocations, meals (weighted slot subunits), guest meals (individual/universal), confirmed transactions and opening credits into per-member items; meal-rate computed as integer thousandths. `finalizeStatement()` — wraps in `withTransaction()`, revision-guarded, creates version N+1, marks predecessor superseded, marks period finalized. |
| **allocationService** | `services/allocationService.js` | `buildWeights()` — resolves each expense line's pool & integer weights per split mode (meal_units from consumed Meal slots in the service window, equal modes, fixed amounts validated to sum exactly, integer weights, usage quantities, personal). Charges distributed with largest-remainder and frozen into `Allocation`. |
| **periodService** | `services/periodService.js` | `getOrCreatePeriod` (auto-links latest PolicyVersion), `ensureOpen` (409 when finalized/review — blocks edits), `bumpRevision` (atomic `$inc` guarded against finalized), `beginReview`, finalize guard. Audit-logged transitions. |
| **membershipService** | `services/membershipService.js` | Interval algebra over Memberships: `activeMemberships(at)`, `membershipsInMonth`, `isEligibleOn`, `eligibleDaysIn` (member_days mode), `assertNoOverlap`. |
| **sessionService** | `services/sessionService.js` | Refresh-token **families**: `createSession` (new familyId + hashed token), `rotateSession` (validates, detects replay of old token → revokes family, issues new in-family token), `revokeSession`. 7-day TTL. |
| **schedulerService** | `services/schedulerService.js` | Cron-driven jobs: `generateRecurringDraftsForMonth(costPeriod)` for all due active rules (idempotent via generatedKeys), deadline reminders, expired-idempotency cleanup, and `applyDefaultMealsForPreviousDay()` — fills only `unknown` slots of the prior Dhaka day from the group's `defaultMealSubunits`. |
| **outboxWorker** | `services/outboxWorker.js` | Leases pending/failed batches (findOneAndUpdate claim), delivers via `mailer.sendMail` (email) or WhatsApp template/direct send (checks recipient consent first → `skipped` when opted out, `not_configured` when env missing), retries with backoff up to maxAttempts. |
| **duplicateDetection** | `services/duplicateDetection.js` | `checkDuplicateExpense()` — exact `receiptReference` match + fuzzy supplier+amount within ±3-day window; returns `duplicateWarnings[]` surfaced by create/submit. |

---

## 5. UTILS

| Util | File | Contents |
|---|---|---|
| **money** | `utils/money.js` | The money constitution: `POISHA_PER_TAKA=100`; `parsePoisha` (exact canonical decimal-string → integer poisha, regex-validated, safe-integer check); `toDecimalString`; `sumPoisha`; `allocateByWeights` (deterministic largest-remainder, tie-break by index); `allocateEqual`; `allocationsBalanced`. |
| **tokens** | `utils/tokens.js` | `signAccessToken` (1h), `signRefreshToken` (7d, jti + type:'refresh'), `hashToken` (sha256 at-rest), `verifyRefreshToken` (signature + stored-hash match), cookie helpers `setRefreshTokenCookie` / `clearRefreshTokenCookie` / `getCookie` — HttpOnly, Path=/api/users, SameSite Strict(prod)/Lax(dev), Secure in prod. |
| **transaction** | `utils/transaction.js` | `withTransaction(fn)` — detects replica-set/sharded topology and wraps in `session.withTransaction()`; graceful standalone fallback for local dev. Used by approve/reverse/confirm/finalize. |
| **pagination** | `utils/pagination.js` | Stable cursor pagination: base64 cursor encode/decode, `paginateQuery({model, filter, cursor, limit, sortField…})` fetching limit+1 → returns `{items, nextCursor, hasMore, count}`. Used on expense & transaction lists. |
| **dhakaTime** | `utils/dhakaTime.js` | Civil-day helpers for UTC+6: `dayString` (YYYY-MM-DD in Asia/Dhaka), `dateAtDay` (UTC midnight), `monthOfDay`, `enumerateDays`. All day bucketing goes through here. |
| **whatsapp** | `utils/whatsapp.js` | `normalizeWaNumber`, `buildWaLink` (zero-config wa.me deep links), `buildMemberSummaryMessage` (emoji bill template), `buildWaSummaryLinks` (per-member links honoring consent), `sendWaDirect` & `sendWaTemplate` (Meta Cloud API v21.0), `verifyWebhookSignature` (HMAC-SHA256, timing-safe), `processWebhookStatuses` (maps Meta delivered/read/failed onto the Outbox). |
| **mailer** | `utils/mailer.js` | Nodemailer SMTP transport; generic `sendMail` (no-op warns when SMTP unset) + templates for password reset, email verification, group invite. |

---

## 6. CONTROLLERS

**userController** — `register`, `login` (bcrypt, generic "Invalid Credentials"), `refresh` (cookie-or-body refresh token → rotated pair), `logout` (invalidates + clears cookie), `getProfile`, `updateProfile`, `changePassword`, `forgotPassword`/`resetPassword` (token+expiry), `verifyEmail`, `uploadProfilePic` (Cloudinary via `config/cloudinary.js`), `googleAuth` (OAuth callback issuing tokens). `sendAuthResponse` sets the HttpOnly refresh cookie.

**messGroupController** — `createGroup` (join code with unambiguous alphabet, retries on collision; auto-creates owner Membership, PolicyVersion v1, seeds preset categories), join-request/approve flows, `addMember`, `getAllGroups` (scoped to own memberships), `getGroupById`, `getJoinCode`/`regenerateCode`, `joinByCode`, legacy embedded `addEntry`/`getEntries`/`calculate`, `excelExport` (exceljs), `pdfExport` (pdfkit), extras CRUD, `removeMember`, `inviteByEmail`.

**mealController** — slot-state meal engine: `addMeal`/`updateMeal`/`deleteMeal`/`getMeals`/`getMealsByMonth` (period-open enforcement + revision bumps, upsert by groupId+userId+day), `createGuestMeal`/`listGuestMeals`, `previewBulkMeals`/`applyBulkMeals` (dry-run change set, then apply, admin-only), `previewAbsence`/`applyAbsence` (date window → `confirmed_zero` slots with source `absence`).

**expenseController** — V2 workflow: `createExpense` (draft, poisha validation per line, duplicate warnings), `submitExpense`, `approveExpense` (in `withTransaction()`: allocation built + Allocation frozen + Journal posted, revision bumped, self-approval flagging), `rejectExpense`, `reverseExpense` (reversal row + mirrored journal), `listExpenses` (cursor pagination + filters); legacy simple CRUD (`addExpense`, `updateExpense`, `getExpenses`, `getExpensesByMonth`, `deleteExpense`).

**moneyController** — `submitTransaction`, `confirmTransaction` (journal posted per kind via `buildJournalLines`, inside a transaction), `rejectTransaction`, `reverseTransaction`, `listTransactions` (cursor pagination), `getBalance` (ledger-derived member balance), `listFunds` (ledger balances), `createFund`, `changeCustodian`.

**membershipController** — `listMemberships`, `createMembership` (member or placeholder, overlap-checked), `updateMembership` (effective-dated changes, placeholder→user linking), `departMembership` (sets endDate/leftAt, preserves balance), `listActive`, `listForMonth`.

**policyController** — `listPolicies`, `publishPolicy` (owner-only; creates next immutable version effective from a month).

**periodController** — `listPeriods`, `getPeriod`, `previewStatement` (no-persist draft), `startReview`, `reopenPeriod` (return-to-open), `closeChecklist` (pre-close checks), `recordCorrection` (audit-marked prior-period adjustment).

**statementController** — `finalize` (owner-only, wraps `finalizeStatement`), `getStatement` (version history for a month), `listStatements`, `getStatementById`.

**recurringController** — `listRules`, `createRule`, `updateRule`, `generateDraft` (single rule + costPeriod, idempotent), `generateAllDrafts`.

**reconciliationController** — `createReconciliation` (expected from ledger vs counted actual), `listReconciliations`, `resolveReconciliation`, `accountingEquation` (assets = liabilities + equity health check).

**disputeController** — `openDispute`, `listDisputes`, `respondToDispute` (threaded), `resolveDispute` (manager; can link a `correctionJournalId`).

**notificationController** — `listOutbox`, `getOutboxMessage`, `resend` (creates new record), `manualShareLinks` (wa.me links), `whatsappWebhookVerify` (Meta hub challenge, GET), `whatsappWebhookReceive` (HMAC-verified status callbacks), `setWhatsappConsent`.

**sessionController** — `getSessions` (device list), `revokeOne` (by familyId), `revokeAll`.

**attachmentController** — `uploadAttachment` (magic-byte verify, sha256, persist metadata, link to target), `downloadAttachment` (authenticated stream).

**depositAssetController** — `listAssets`, `createAsset` (funding shares sum validation), `recordAssetRefund`.

**expenseCategoryController** — presets constant, `seedDefaultCategories` + endpoint, CRUD (delete = archive).

**paymentNoteController** (legacy) — `upsertPaymentNote`, `getPaymentNote`, `getAllPaymentNotes`.

**summaryController** (legacy) — `computeSummary` (float meal-rate engine), `getSummary`, `finalizeSummary` (now returns 410/409 directing to V2), `whatsappSummary`.

**statsController** — `getStats` (legacy aggregates + category breakdown) and `getV2Dashboard` — ledger-derived dashboard: period state, expense counts by status, money totals, fund balances, statement/settlement figures with draft-preview fallback.

---

## 7. ROUTES (all under `/api`, `auth` middleware enforced per-router)

| Router | Key endpoints |
|---|---|
| `userRoutes` | POST `/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`; GET `/verify-email/:token`; GET `/auth/google` + `/auth/google/callback`; (auth) GET/PUT `/profile`, POST `/change-password`, `/profile-pic` |
| `messGroupRoutes` | POST `/create`, `/join-by-code`, `/join-request/:groupId`, `/approve/:groupId/:userId`, `/add-member/:groupId`, `/invite/:groupId`; GET `/my-groups`, `/:groupId`, `/entries/:groupId`, `/calculate/:groupId`, `/export/:groupId` (xlsx), `/pdf/:groupId`, `/extras/:groupId`, `/code/:groupId`; POST `/regenerate-code/:groupId`; DELETE `/remove-member/:groupId/:userId`; payment-notes CRUD; categories CRUD + `/categories/:groupId/seed` |
| `mealRoutes` | POST `/:groupId` (slot entry), `/:groupId/guests`, `/:groupId/bulk/preview|apply`, `/:groupId/absence/preview|apply`; PUT/DELETE `/entry/:id`; GET `/:groupId` (filtered), `/:groupId/:month` |
| `expenseRoutes` | Legacy: POST `/:groupId`, PUT/DELETE `/entry/:id`, GET `/:groupId(/:month)`. V2: GET/POST `/groups/:groupId/expenses`; POST `/:expenseId/submit|approve|reject|reverse` (approve/reverse idempotent, treasurer-gated) |
| `moneyRoutes` | GET/POST `/groups/:groupId/money`; POST `/:txId/confirm|reject|reverse`; GET `/memberships/:membershipId/balance`; GET/POST `/groups/:groupId/funds`; POST `/funds/:fundId/custodian` |
| `membershipRoutes` | GET `/groups/:groupId/memberships(/active,/month/:month)`; POST `/memberships`; PATCH `/:membershipId`; POST `/:membershipId/depart` (manager+) |
| `policyRoutes` | GET/POST `/groups/:groupId/policies` |
| `periodRoutes` | GET `/groups/:groupId/periods(/:month,/:month/preview,/:month/checklist)`; POST `/:month/begin-review`,`/:month/return-to-open`,`/:month/correct` |
| `statementRoutes` | GET `/groups/:groupId/statements(/id/:statementId,/:month)`; POST `/groups/:groupId/statements/:month/finalize` (owner, idempotent) |
| `recurringRoutes` | GET/POST `/groups/:groupId/recurring`; POST `/generate-all`; PUT/POST `/:ruleId(/generate)` |
| `reconciliationRoutes` | GET `/groups/:groupId/reconciliations(/equation)`; POST `/reconciliations`, `/:recId/resolve` |
| `disputeRoutes` | GET/POST `/groups/:groupId/disputes`; POST `/:disputeId/respond`,`/:disputeId/resolve` |
| `notificationRoutes` | **Public** GET/POST `/whatsapp/webhook`; (auth) PUT `/whatsapp/consent`; GET `/groups/:groupId/notifications(/:messageId)`; POST `/:messageId/resend`, `/manual-share` |
| `sessionRoutes` | GET `/users/sessions`; DELETE `/users/sessions/:familyId`, `/users/sessions` |
| `attachmentRoutes` | POST `/groups/:groupId/upload` (multer single 'file'); GET `/groups/:groupId/:attachmentId` |
| `depositAssetRoutes` | GET/POST `/groups/:groupId`; POST `/:assetId/refund` |
| `statsRoutes` | GET `/groups/:groupId/dashboard` (V2); GET `/:groupId` (legacy stats) |
| `summaryRoutes` (legacy) | GET `/:groupId/:month`; POST `/finalize/:groupId/:month`; GET `/whatsapp/:groupId/:month` |

---

## 8. MIDDLEWARE

| Middleware | File | Behavior |
|---|---|---|
| **auth** | `middleware/auth.js` | Reads `x-auth-token` header, verifies JWT against `JWT_SECRET`, validates ObjectId-shaped `user.id`, attaches `req.user`. |
| **roles (legacy)** | `middleware/roles.js` | `requireGroupRole('admin'|'member')` checks embedded MessGroup members/admin; `allowSelfOrAdmin` sets `req.canEditOthers`. |
| **roles V2** | `middleware/roles.js` | `requireGroupRoleV2(minRole)` resolves effective role from active Membership interval (`owner>manager>treasurer>auditor>member`, RANK comparison), falls back to group.admin→owner; sets `req.group`, `req.groupRole`, `req.membership`. Plus `flagSelfApproval` (self-approval needs a reason → 422), `assertOwnerTransfer`, `auditRoleChange`. |
| **csrf** | `middleware/csrf.js` | For unsafe methods without `Bearer` token or `X-Requested-With`/`X-CSRF-Token` headers, verifies Origin/Referer against the CORS allowlist → 403 otherwise. Protects cookie-carried refresh tokens. |
| **idempotency** | `middleware/idempotency.js` | `idempotent(operation)` — honors `Idempotency-Key` header; sha256 request hash; replays cached responses (`__idempotentReplay: true`); key-reuse with a different body → 409; duplicate concurrent create → 409 retry. |
| **receiptUpload** | `middleware/receiptUpload.js` | Multer disk storage in `/uploads/receipts` with random names; MIME whitelist + 10MB limit; `verifyMagicBytes()` (JPEG FFD8FF, PNG signature, `%PDF`, RIFF/WEBP); `computeFileSha256()`. |
| **upload** | `middleware/upload.js` | Multer for profile pictures → Cloudinary. |
| **validate** | `validation/validate.js` | Generic Zod middleware `validate(schema, source)`; deep-strips Mongo operator keys (`$…`, dotted) from body/params — NoSQL-injection defense (Express 5 forbids reassigning `req.query`, so queries land on `req.validated`). Returns 400 with field-level errors. |

---

## 9. VALIDATION (`validation/schemas.js` — Zod)

Shared primitives: `objectIdSchema` (24-hex), `passwordSchema` (8+ chars, upper/lower/digit), `whatsappSchema` (10–15 digits), `month` (`^\d{4}-\d{2}$`), `poisha` (integer ≥ 1), the 8-value `splitMode` enum.

Schema groups:
- **Auth:** `registerSchema`, `loginSchema`, `updateProfileSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema`.
- **Group:** `createGroupSchema` (mealSlots/mealWeights 0–1000/defaultMealSubunits restricted to 0/250/500/750/1000/defaultMealsEnabled), `addMemberSchema`, join-code, invite.
- **Meals (V2):** `mealSlotSchema` — superRefine enforcing: `consumed` requires portionSubunits ∈ {250,500,750,1000}; `confirmed_zero` must be 0; unknown carries nothing. `mealEntrySchema` (≥1 slot), `guestMealSchema` (poolMode individual|universal), `mealBulkSchema` (1–500 entries), `absenceRangeSchema` (from ≤ to, slot list, ≤366-day cap enforced in controller).
- **Legacy meals/costs/entries:** `addEntrySchema` (counts restricted to half-step grid), `extrasSchema`.
- **Expenses:** `createExpenseSchema` — lines[] each with categoryId + poisha amount + optional splitMode/beneficiaries/fixedAmounts/weights/usageQuantities; `expenseIdParam`, `reasonBody`, `listExpenseQuery` (status/costPeriod/payable).
- **Money:** `moneySchema` (kind enum, poisha amount, from/to member/account, method enum, reference), `fundSchema`, `custodianSchema`, `balanceParam`, `listMoneyQuery`, `txIdParam`.
- **Membership:** `createMembershipSchema` (nullable userId → placeholder, role enum), `updateMembershipSchema` (incl. `linkUserId`), `departSchema`.
- **Policy:** `publishPolicySchema` (mealWeights 0–1000, cutoff hour 0–23, reviewGraceDays).
- **Period/Statement:** `finalizeSchema` (`expectedRevision` for optimistic concurrency), `correctionSchema`.
- **Recurring:** `recurringSchema`, `generateSchema`.
- **Reconciliation / Disputes / Notifications / Sessions:** their respective create/resolve/query schemas.
- **Filters:** `mealFilterQuerySchema`, `expenseFilterQuerySchema` — month XOR from/to, from ≤ to; `statsQuerySchema` (granularity month|year).

---

## 10. CONFIG & SCRIPTS

- **`config/db.js`** — single Mongoose connection from `MONGO_URI`; exits the process on failure.
- **`config/cloudinary.js`** — Cloudinary SDK config for profile pictures.
- **`config/passportJs.js`** — Google OAuth20 strategy.
- **`scripts/migrateLegacyData.js`** — idempotent legacy→V2 migration: initialize PolicyVersion, seed categories, migrate embedded members→Memberships, convert extras→RecurringRules, normalize legacy expense rows to integer poisha + lines. Run: `node scripts/migrateLegacyData.js`.
- **`tests/`** — `goldenCalculation.test.js`, `moneyPrecision.test.js`, `journalBalance.test.js`, `acceptanceGates.test.js`, `scenarioGates.test.js`. 26/26 passing: §8 golden calc, precision, journal invariants, randomized allocation conservation/permutation trials, leap-day & Dhaka-midnight boundaries, member-days + absence, guest pools, idempotency misuse, cross-group isolation, all-10-kind ledger event matrix, finalize race semantics, supersession chains, delivery-failure matrix.

---

## 11. PACKAGE.JSON — Dependency Inventory

**Scripts:** `test` → `node --test tests/*.test.js` · `dev` → `nodemon index.js` · `"type": "module"`.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.1.0 | HTTP framework (Express 5 — getter-only `req.query`) |
| `mongoose` | ^8.18.1 | MongoDB ODM |
| `mongodb` | ^6.19.0 | Driver (transactions/topology introspection) |
| `socket.io` | ^4.8.4 | Realtime group-room updates |
| `zod` | ^4.6.7 | All input validation |
| `jsonwebtoken` | ^9.0.3 | Access/refresh JWTs + Socket.IO handshake auth |
| `bcrypt` | ^6.0.0 | Password hashing (**the one actually used**) |
| `bcryptjs` | ^3.0.2 | ⚠️ Unused duplicate — candidate for removal |
| `passport` + `passport-google-oauth20` | ^0.7.0 / ^2.0.0 | Google OAuth login |
| `express-session` | ^1.18.2 | OAuth handshake session (MemoryStore ⚠️) |
| `cloudinary` | ^2.11.0 | Profile-picture storage |
| `multer` | ^2.5.0 | File uploads (profile pic + receipts) |
| `nodemailer` | ^10.6.0 | SMTP email (outbox channel, resets, invites) |
| `exceljs` | ^3.4.0 | Excel export |
| `pdfkit` | ^0.20.2 | PDF export (**the one actually used**) |
| `pdfmake` | ^0.3.14 | ⚠️ Unused duplicate — candidate for removal |
| `helmet` | ^8.3.0 | Security headers |
| `cors` | ^2.8.5 | CORS allowlist |
| `express-rate-limit` | ^8.1.0 | Auth + general rate limits |
| `hpp` | ^0.2.3 | HTTP parameter-pollution defense |
| `express-validator` | ^7.2.1 | ⚠️ Installed but unused (Zod handles validation) |
| `express-mongo-sanitize` | ^2.2.0 | ⚠️ Installed but unused (incompatible w/ Express 5 `req.query`; sanitization done in `validate.js`) |
| `dotenv` | ^17.2.2 | Env config |
| `mongoose-unique-validator` | ^5.0.1 | Friendlier unique-index errors (User.email) |

---

## 12. ARCHITECTURE FLOW (how a month closes)

1. **Daily:** members upsert Meal slot states (period auto-created & revision-bumped). Absence windows and bulk entries run preview→apply. Scheduler auto-fills defaults for yesterday's `unknown` slots.
2. **Spending:** expenses drafted with categorized lines → submitted → treasurer approves → `allocationService` splits each line per its mode → charge frozen in `Allocation` → balanced `Journal` posted (exactly-once) — all inside one Mongo transaction.
3. **Money:** contributions/settlements/payouts submitted → confirmed by treasurer → journal lines per kind posted; funds & member balances are always *derived* from journals.
4. **Month end:** period → review (edits blocked) → treasurer checks the close checklist → owner finalizes with `expectedRevision`: statement draft built (allocations + weighted meals + guest pools + confirmed transactions + opening credits), unknown-slot audit (422 if unresolved), immutable version N+1 persisted with frozen policy/membership snapshots, predecessor marked superseded.
5. **Delivery:** notification outbox enqueues per-member messages; worker emails / sends WhatsApp templates honoring consent; Meta webhooks record delivered/read.
6. **Corrections:** never overwrite — reverse journals/expenses, or finalize a superseding statement; disputes and audit events track every step.

---
---

## 13. REMAINING PLAN / NEXT STEPS

### Privacy & Admin Control Plane (implemented)
1. ✅ **Hidden admin panel** — `/api/admin` (traffic overview/daily buckets, audit-feed, global user & group directories with search + cursor pagination, suspend/verify, group archive). Guard = `ADMIN_EMAILS` allowlist + optional `X-Admin-Key`; denials are audit-logged and answered with the generic global **404** so the surface is invisible to users.
2. ✅ **User suspension** — `User.suspended` enforced at login, refresh, and on every authenticated request (`auth` middleware).
3. ✅ **Group privacy** — non-members get a generic 404 on group detail and the co-member directory; no endpoint lists groups globally for users; profile data across members is allowlisted (username/profilePic only via the directory; whatsapp only among co-members).
4. ✅ **Invite codes & shareable links** — `GET /api/messgroups/code/:groupId` returns `{ code, inviteLink: "{FRONTEND_URL}/join?code=MM-XXXXXX" }` ready to copy/share; joining happens only through the code.
5. ✅ **Kick / leave with history cutoff** — `removeMember` closes the V2 Membership interval instantly, audit-logs `membership.self_left|kicked`, preserves balances; `resolveHistoryWindow` clamps meal/expense history reads to the ex-member's interval (future info invisible).

### Follow-ups
6. Migrate remaining legacy readers (`getEntries`, `calculate`, stats, summary) onto `resolveHistoryWindow` clamping.
7. Client admin shell (separate lazy-loaded admin app section reading `/api/admin/*`), plus `.env` docs for `ADMIN_EMAILS` / `ADMIN_PANEL_KEY`.
8. Legacy cleanup (Priority 4): remove `bcryptjs`, `pdfmake`, `express-validator`, `express-mongo-sanitize`; `Deprecation` headers on legacy routes; Redis/Mongo OAuth session store.
9. Meal migration: rewrite legacy 2-slot float Meal rows into slot-state form in `migrateLegacyData.js`.
10. Cloud receipt storage (S3/R2 signed URLs + AV-scan hook).
11. Production Mongo replica set to activate real `withTransaction()` atomicity.
12. Live-infrastructure test gates: §17.8 race drill, §17.13 restore drill, §17.14 load test.

### Security hardening ideas (recommended)
- **Invite-link TTL & one-time tokens** — hash codes at rest, 7-day expiry, max-use counters, rotate on suspicion; strict per-IP limiter on `join-by-code` to defeat brute-force.
- **2FA** — mandatory for platform admins; offered for owner/treasurer roles.
- **Anomaly detection** — alert on refresh-token reuse (family revocation already exists), impossible-travel IPs, bursty device enrollment.
- **Data minimization** — strip email/phone from every group populate; log reads of sensitive fields.
- **Retention policy** — archive (never hard-delete) groups; statements already immutable.
- **CSP + Referrer-Policy** headers; backup/restore drill runbook (pairs with Gate §17.13); consent timestamps for all processing.
