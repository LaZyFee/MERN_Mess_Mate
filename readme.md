# MealMate — Backend Documentation & Development Plan

*MealMate is a MERN-stack web application that digitizes "mess" meal & cost tracking — with a real double-entry ledger, versioned month-end statements, and audited financial workflows.*

> 📄 **Companion doc:** [`plan.md`](./plan.md) — deep per-file documentation of every model, controller, service, util, route, middleware and validation schema in the `Server/` codebase.


## Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Backend Project Structure](#3-backend-project-structure-implemented)
4. [Database Schema Design](#4-database-schema-design)
5. [API Reference (implemented)](#5-api-reference-implemented)
6. [How the Money Works](#6-how-the-money-works)
7. [Privacy Model & Hidden Admin Panel](#7-privacy-model--hidden-admin-panel)
8. [Realtime, Filters & Indexing](#8-realtime-filters--indexing)
9. [Security Measures](#9-security-measures-implemented)
10. [Testing](#10-testing)
11. [Frontend User Interface](#11-frontend-user-interface)
12. [User Workflow](#12-user-workflow)
13. [Roadmap / Remaining Work](#13-roadmap--remaining-work)
14. [Advanced Features](#14-advanced-features-what-better-you-can-do)
15. [Environment Variables](#15-environment-variables-env)
16. [Routine & Notice Board](#16-routine--notice-board-planned)
17. [Support Desk](#17-support-desk-planned)
18. [Notification Inbox](#18-notification-inbox-planned)
19. [Security Hardening Roadmap](#19-security-hardening-roadmap)
20. [Frontend Architecture (SSR / BFF / cookies)](#20-frontend-architecture-ssr--bff--cookies)
21. [Updated Roadmap](#21-updated-roadmap)

---

## 1. Project Overview

This project digitizes mess meal and cost tracking from Excel sheets into a modern, collaborative web application. A "mess" refers to a shared living arrangement (hostels, group homes) where residents track daily meals and shared expenses collectively.

Each member logs meals **per meal slot** (breakfast / lunch / snacks / dinner) with quarter-portion granularity and an explicit *unknown / confirmed-zero / consumed* state — missing meals are never silently counted as zero.
Members (or the admin) log expenses with **multi-line receipts and multi-payer support**, which flow through a `draft → submitted → approved` workflow.
Every approved cost and confirmed money movement lands in an **immutable double-entry journal** (integer poisha — 1 BDT = 100 poisha, no floats).
The system computes a meal rate from the ledger, splits costs by 7 allocation modes (meal share, equal, member-days, fixed amounts, weights, usage meters, personal), and shows who owes whom at month end.
Month-end closing produces a **versioned, immutable Statement** — corrections create version N+1 that supersedes, never an overwrite.
Members receive their bill via WhatsApp templates (with opt-in consent) or email outbox delivery. Multiple independent mess groups are supported, each with its own join code, roles, categories and history.

### Key Objectives

- Replace manual Excel tracking with automated, **auditable** calculations
- Double-entry accounting as the single monetary source of truth
- Enable multi-user collaboration with **5-tier role-based access** (owner / manager / treasurer / auditor / member)
- Provide real-time updates and instant ledger-derived balances
- Export data to Excel/PDF for record keeping
- Support multiple independent mess groups with effective-dated membership history

---

## 2. Tech Stack

### 2.1 Overall MERN Stack (planned)

#### Frontend

- **React.js** — User interface and components
- **Tailwind CSS** — Styling and responsive design
- **Axios** — API communication
- **React Router** — Navigation
- **Chart.js** — Data visualization (optional)
**Backend**

- **Node.js + Express.js** — Server and API endpoints
- **JWT** — Authentication and session management
- **Bcrypt** — Password hashing
- **CORS** — Cross-origin requests
**Database**

- **MongoDB** — Primary database
- **Mongoose** — ODM for MongoDB
**Additional Tools**

- ** export functionality
- **PDFKit** — PDF report generation
- **Nodemailer** — Email notifications
- **Socket.io** — Real-time updates

### 2.2 Backend Tech Stack (as implemented)

- **Node.js + Express 5** — REST API (ES modules)
- **MongoDB + Mongoose 8** — data layer; multi-document transactions via `withTransaction()` (replica-set aware, graceful standalone fallback)
- **Zod 4** — request validation (body + params + queries), with Mongo-operator stripping (NoSQL-injection defense)
- **JWT** — short-lived access tokens (1h, `amr` claim) + rotating refresh tokens (7d, jti) in HttpOnly/SameSite cookies + refresh-token **families** with reuse detection (`Session` model)
- **bcrypt** — password hashing
- **TOTP 2FA** (RFC 6238, built-in crypto only) — `utils/totp.js`; mandatory for platform admins via `middleware/amrGate.js`
- **Helmet** — CSP, Referrer-Policy, Permissions-Policy, HSTS (production)
- **hpp / strict CORS allowlist / CSRF double-submit** — security hardening (`mm_csrf` cookie + `x-csrf-token` header)
- **express-rate-limit** — 50 req/15min auth, 300 req/15min general, 20/15min support actions, 1/day/IP appeal
- **MongoDB-backed express-session store** (`config/mongoSessionStore.js`) — replaces MemoryStore, TTL index
- **ExcelJS** — Excel export
- **PDFKit** — PDF report export
- **Nodemailer** — password reset / verification / group invite emails + outbox email channel
- **WhatsApp Cloud API (Meta v21.0)** — pre-approved templates, direct sends, HMAC-verified delivery webhooks, opt-in consent
- **Socket.IO** — JWT-authenticated realtime rooms (`user:<id>` inbox, `group:<id>`); cookie-only handshake (`mm_at`), query-string tokens rejected
- **Multer** — receipt uploads with magic-byte MIME verification + Cloudinary for profile pictures
- **Passport (Google OAuth20)** — social login

**Removed (cleanup done):** `bcryptjs`, `pdfmake`, `express-validator`, `express-mongo-sanitize`.

**Dev:** `mongodb-memory-server` (integration tests), `supertest` (HTTP assertions).

---

## 3. Backend Project Structure (implemented)

```text
Server/
├── config/
│   ├── db.js               # MongoDB connection
│   ├── cloudinary.js       # Cloudinary SDK config (profile pics)
│   └── passportJs.js       # Google OAuth strategy
├── controllers/            # (20 controllers)
│   ├── userController.js          # auth, token rotation, reset/verify, profile, Google OAuth
│   ├── adminController.js         # HIDDEN platform admin: traffic, users/groups, suspension, 2FA gate
│   ├── attachmentController.js    # receipt upload/download (verified magic bytes)
│   ├── depositAssetController.js  # landlord deposits / kitchen equipment / refunds
│   ├── disputeController.js       # member disputes with threaded responses
│   ├── expenseCategoryController.js # categories + 14 Bangladesh presets auto-seed
│   ├── expenseController.js       # V2 workflow (draft→submit→approve/reject/reverse) + legacy CRUD
│   ├── inboxController.js         # B0: in-app notification feed (list/unread/read/prefs)
│   ├── inviteController.js        # B3.1: hashed join codes (create/join/metadata)
│   ├── kitchenInventoryController.js # B2: staple stock tracking + refills
│   ├── mealController.js          # slot-state meal engine + guests + bulk + absence
│   ├── messGroupController.js     # groups, join codes, extras, exports, seeding setup, feature flags, audit log
│   ├── membershipController.js    # effective-dated memberships (placeholders, depart, roles)
│   ├── moneyController.js         # money transactions, funds, custodians, ledger balances
│   ├── notificationController.js  # outbox mgmt, WhatsApp webhook + consent
│   ├── paymentNoteController.js   # LEGACY admin payment notes
│   ├── pollController.js          # B2: quick polls for menu decisions
│   ├── periodController.js        # open→review→finalized state machine, previews, checklist
│   ├── policyController.js        # immutable policy versions
│   ├── routinesController.js      # B2: rosters/duties/swaps/menu/notes/board/emergency-broadcast
│   ├── sessionController.js       # device list, revoke one/all
│   ├── shoppingListController.js  # B2: shared bazar list → expense draft
│   ├── statementController.js     # finalize (versioned/superseding) + history
│   ├── statsController.js         # legacy stats + V2 ledger dashboard
│   ├── supportAdminController.js  # B1: hidden admin support desk (queue/reply/assign/stats)
│   ├── supportController.js       # B1: user support tickets (create/message/resolve/appeal)
│   ├── summaryController.js       # LEGACY float summary engine (deprecated)
│   ├── totpController.js          # B3.2: TOTP 2FA setup/verify/disable/login step-up
│   ├── userController.js          # auth, token rotation, reset/verify, profile, Google OAuth, download-my-data
├── middleware/
│   ├── amrGate.js        # 2FA gate (amr: otp) for admin routes — returns 404 if not satisfied
│   ├── auth.js           # JWT guard: mm_at cookie / x-auth-token / Bearer; suspended check per request
│   ├── csrf.js           # Double-submit cookie (mm_csrf) + x-csrf-token for cookie mutations
│   ├── deprecate.js      # Deprecation/Sunset headers on legacy routes
│   ├── idempotency.js    # Idempotency-Key replay protection (409 on body mismatch)
│   ├── privacy.js        # requireGroupMembership + resolveHistoryWindow + publicProfile allowlist
│   ├── rateLimiters.js   # joinCodeLimiter: per-IP + per-user limits with exponential lockout
│   ├── receiptUpload.js  # multer disk storage + magic-byte verify + sha256
│   ├── roles.js          # legacy requireGroupRole + V2 requireGroupRoleV2 (5 roles)
│   └── upload.js         # multer (profile pics → Cloudinary)
├── models/                 # (~40 models — see §4)
├── routes/                 # (~28 routers + hidden admin/support — see §5)
├── services/
│   ├── allocationService.js# 7 split-mode weight builder + largest-remainder charges
│   ├── duplicateDetection.js # duplicate expense warnings (receipt ref / supplier+amount+date)
│   ├── inboxService.js     # B0: notify() inserts InboxNotification + emits inbox-new to socket rooms
│   ├── inboxService.rules.js # pure helpers: computeExpiry, buildDedupeKey
│   ├── jobRunner.js        # B0.2: runJob(name, fn) — Mongo lock + run log; prevents overlapping cron
│   ├── jobRunner.rules.js  # pure lock-decision rules
│   ├── ledgerService.js    # postJournal / reverseJournal (balanced, exactly-once, session-aware)
│   ├── membershipService.js# interval algebra: active/in-month/eligible-days/overlap
│   ├── outboxWorker.js     # leased delivery batches (email + WhatsApp, consent-aware, backoff)
│   ├── periodService.js    # getOrCreatePeriod / ensureOpen / bumpRevision / beginReview
│   ├── retentionRules.js   # B3: ticket anonymisation (18 months) + audit deletion (24 months)
│   ├── routineJobs.js      # B2: duty reminders, mark-missed, note expiry, roster horizon, departed reassignment
│   ├── routineRules.js     # B2: pure rule engine (generateDuties, visibleNoteAudience, claim/done tasks, fairAmountOrder)
│   ├── schedulerService.js # cron: recurring drafts, default meals, deadline reminders, weekly digest, all jobs via runJob
│   ├── securityService.js  # B3.3: runAnomalySweep (15-min), recordNewSignIn
│   ├── sessionService.js   # refresh-token families, rotation, reuse detection
│   ├── statementService.js # buildStatementDraft / finalizeStatement (supersession)
│   ├── supportJobs.js      # B1: SLA watcher, auto-close, retention job
│   ├── supportRules.js     # B1: pure rule engine (canUserComment, canTransition, slaStage, comment-lock matrix)
├── utils/
│   ├── dhakaTime.js        # Asia/Dhaka civil-day helpers (UTC+6 bucketing)
│   ├── mailer.js           # Nodemailer templates (reset, verify, invite)
│   ├── money.js            # integer-poisha parsing/formatting + largest-remainder allocator
│   ├── pagination.js       # stable cursor pagination (base64 cursors)
│   ├── tokens.js           # access/refresh signing, hashing, HttpOnly cookie helpers (mm_at, refreshToken)
│   ├── totp.js             # B3.2: TOTP (RFC 6238), QR URL, recovery codes, AES-256-GCM secret encryption
│   ├── transaction.js      # withTransaction() — replica-set aware, standalone fallback
│   ├── whatsapp.js         # wa.me links, Cloud API template/direct send, webhook HMAC verify
├── validation/
│   ├── inboxSchemas.js     # B0: inbox list/read/prefs schemas
│   ├── routineSchemas.js   # B2: roster/duty/swap/menu/note/task schemas
│   ├── schemas.js          # all shared Zod schemas (money, meals, expenses, policies, memberships…)
│   ├── supportSchemas.js   # B1: ticket/message/transition/rate/appeal/admin schemas
│   └── validate.js         # Zod middleware + Mongo-operator sanitizer (NoSQL-injection defense)
├── scripts/
│   ├── checkIndexes.js     # asserts every expected index (incl. TTL) exists across collections
│   ├── migrateInviteCodes.js # B3.1: hashes legacy MessGroup.code into InviteCode collection
│   ├── migrateLegacyData.js # idempotent legacy→V2: PolicyVersion, Memberships, RecurringRules, expense normalization, 4-slot meal migration
│   └── smoke/              # b0.sh, b2.sh, b3.sh, b4.sh, live-infra-gates.sh
├── tests/                  # node --test suite: 19 suites / 111 passing (see §9)
│   └── integration/        # supertest tests needing live server: b0, cookies, routines, support
├── config/
│   ├── db.js               # Mongoose connection from MONGO_URI
│   ├── cloudinary.js       # Cloudinary SDK config (profile pictures)
│   ├── mongoSessionStore.js # MongoDB-backed express-session store (replaces MemoryStore)
│   └── passportJs.js       # Google OAuth20 strategy
└── index.js                # Express 5 app, security stack, Socket.IO (cookie auth), outbox worker, scheduler
```

---

## 4. Database Schema Design

All money amounts are **integer poisha** (100 poisha = ৳1). Full field-level detail for every model is in [`plan.md`](./plan.md) §3.

### 4.1 Identity & Groups

**User** — `googleId`, `username`, `email` (unique), `phone`, `whatsapp` + `whatsappConsent`/`whatsappConsentAt` (opt-in), hashed `password`, `profilePic`, hashed `refreshToken`, `suspended` (platform ban — enforced at login/refresh/every request), reset/verify token fields. Privacy: profile discoverable **only within shared groups**; directory exposes username/profilePic/whatsapp only.

**MessGroup** — `name`, unique join `code`, `admin`, V2 meal config (`mealSlots[]`, `mealWeights{}` per-1000, `defaultMealSubunits{}`, `defaultMealsEnabled`, `guestMealModes[]`), legacy embedded `members[]`, `pendingRequests`, `entries[]`, `extras[]`.

**Membership** — *the* V2 membership source of truth: effective-dated interval `[startDate, endDate)`, `role` (`owner|manager|treasurer|auditor|member`), `displayName`, `isPlaceholder` (+`replacedBy` linking to a later real account), `room`, `weight`, `leftAt`. Departure preserves debt/credit. Overlapping intervals prevented.

**Session** — one row per device: `familyId` (per login), hashed current + previous refresh tokens (rotation history), reuse detection revokes the whole family, TTL expiry.

### 4.2 Ledger & Money

**Journal** — *monetary source of truth.* Immutable double-entry postings; embedded `lines[]` typed `member | fund | clearing` with debit/credit direction and poisha amounts; `sourceType/sourceId/sourceRevision/postingKind` provenance; **unique index guarantees exactly-once posting**; reversals are mirror-image rows linking `reversalOf`.

**MoneyTransaction** — lifecycle `submitted → confirmed | rejected`, confirmed → `reversed`. Six kinds: `contribution`, `payout`, `supplier_payment`, `member_settlement`, `transfer`, `fee`. Bangladesh payment rails (`cash/bkash/nagad/rocket/bank/other`), TrxID `reference`, evidence URL.

**FundAccount** — group-owned `cash | wallet | bank`; **masked** identifiers only; custodian + custody history; balance derived from journals, never stored.

**Allocation** — frozen per-line allocation evidence: pool kind, per-member weights and exact poisha charges, `largest_remainder_v1` algorithm version, reversal links. Makes every statement explainable.

**Reconciliation** — counted/statement cash vs ledger-expected balance per fund account; variance stored, resolution states (`adjusted | accepted_shortage | found_cash`), never hidden.

### 4.3 Expenses

**Expense** — workflow `draft → submitted → approved | rejected → reversed`. **Multi-line** `lines[]` (each with categoryId, poisha amount, per-line splitMode override, beneficiaries/fixed/weights/usage) and **multi-payer** `payers[]` (fund account or personal pocket). Supplier-payable support (`isPayable`, `paidTotal`), service periods for bills, `receiptReference` for duplicate detection.

**ExpenseCategory** — per-group, admin-managed; default splitMode (`meal_units | equal_all | equal_selected | member_days | fixed_amounts | weighted | usage | personal`); `isFoodPool` feeds the meal rate; archive-instead-of-delete. **14 Bangladesh preset categories auto-seeded on group creation** (Bazar, Rice, Fish/Meat, Cooking Oil, LPG, Cook Salary, Rent, Electricity, Water, Wi-Fi, Waste Collection, Kitchen Supplies, Repairs, Personal).

**RecurringRule** — generates expense **drafts** (never auto-approved): amount, split mode, due day, effective month range, `generatedKeys[]` ledger prevents duplicate generation per cost period.

**DepositAsset** — capital items kept out of the food pool: `landlord_deposit | kitchen_equipment | advance | other_asset`, funding shares per member, refund records, custodian.

### 4.4 Meals

**Meal** — one doc per user/group/Dhaka-day (unique index). Four **slot subdocuments** (`breakfast/lunch/snacks/dinner`) each with:
- `state`: `unknown` (blocks statement finalize) | `confirmed_zero` (explicit absence) | `consumed`
- `portionSubunits`: integer thousandths (250 = ¼, 500 = ½, 750 = ¾, 1000 = 1 portion)
- `source`: `member | absence | default | admin`

`pre('validate')` sums `totalMealSubunits` over consumed slots only.

**GuestMeal** — guest consumption: host attribution, Dhaka `localDate`, slot, portionSubunits, **poolMode** `individual` (counts into host's own total) or `universal` (raises the group's meal-rate denominator), event pool ref, active/void status.

### 4.5 Policy / Period / Statement

**PolicyVersion** — immutable, effective-dated group policy: per-slot `mealWeights` (integer per-1000), `allowedPortions`, `entryCutoffHour` (Dhaka), timezone `Asia/Dhaka`, rounding `largest_remainder`, approval & review settings. Edits create version N+1.

**Period** — one calendar month per group, state machine **`open → review → finalized`**, `revision` counter incremented on every cost-affecting mutation; finalize passes `expectedRevision` → concurrent edit loses with **409**.

**Statement** — immutable month-end snapshot with **versioning/supersession** (`supersedes`/`supersededBy`). Per-member items: weighted mealUnits, mealCost, otherCost, contributions, personalPayments, settlements, opening/closing credit, owes/receives/settled status. Frozen `policySnapshot` + `membershipSnapshot` + `sourceHash`. Legacy `MonthlySummary` is read-only history.

### 4.6 Ops & Delivery

**AuditEvent** — append-only (no update/delete API): actor, dotted action (`expense.approved`…), redacted before/after snapshots, requestId, ip. Auditing never breaks the request path.

**IdempotencyRecord** — replay protection keyed (group, actor, operation, key) with sha256 request hash and cached response; same key + different body → **409**; TTL expiry.

**NotificationOutbox** — outbox pattern: channels email/whatsapp/in_app, lifecycle `pending → processing → sent | delivered | read | failed | skipped | not_configured`, retries with backoff, dedupe key, `providerMessageId` linked to Meta webhooks, consent basis.

**Attachment** — private receipt/document metadata: MIME whitelist (jpeg/png/webp/pdf), ≤10MB, sha256, magic-byte verified, group-scoped authenticated download.

**PaymentNote** *(legacy)* — admin notes with boolean `isPaid` tracking; deprecated — balances must derive from Journal postings.

### 4.7 Hidden Admin Control Plane & Privacy (new)

- **`requirePlatformAdmin`** (`controllers/adminController.js`) — email allowlist (`ADMIN_EMAILS`) + `requireAdminAMR` (2FA mandatory, `amr: otp`); denials are audit-logged and answered with the generic global **404** so non-admins can't even confirm the endpoint exists.
- **Privacy middleware** (`middleware/privacy.js`) — `requireGroupMembership` (404-masked membership gate), `resolveHistoryWindow` (ex-member reads clamped to `[firstJoin, lastDeparture]`), `MEMBER_VISIBLE_FIELDS` allowlist, `publicProfile` projection.
- **Invite system** — hashed `InviteCode` model (sha256 + pepper, 7-day TTL, max-uses); `GET /api/invite/codes/:groupId` returns metadata only (no plaintext); plaintext shown once at creation via `POST /api/invite/codes`; joining via `POST /api/invite/join-by-code`.

### 4.8 Routine & Notice Board models (B2 — implemented)

**`Roster`** — named rotation for one duty type (`bazar`/`cleaning`/`cooking`/`custom`). Fields: `title`, `type`, `areas[]`, `rotation` (`mode: round_robin|weekly_template|fair|manual`, `memberOrder[]`, `weeklyTemplate`, `daysOfWeek[]`), `skipWhenAbsent`, `weekStartsOn` (default Saturday), `horizonDays` (default 30), `state` (draft|published|archived), `revision`, `createdBy`. Unique `(groupId, title)`.

**`DutyAssignment`** — one member + one Dhaka civil day + one task. Fields: `rosterId`, `taskKey`, `localDate` (`YYYY-MM-DD`), `membershipId`, `status` (scheduled|done|missed|swapped|skipped|cancelled), `doneAt`, `doneNote`, `linkedExpenseId`, `origin` (generated|manual|swap|reassign), `revision`. Unique `(rosterId, taskKey, localDate)`.

**`SwapRequest`** — member asks to swap/give away a duty. Fields: `assignmentId`, `fromMembershipId`, `toMembershipId` (null = open offer), `status` (pending|accepted|declined|cancelled|expired), `reason`, `respondedBy`, `expiresAt` (TTL = duty date).

**`MenuPlan`** — weekly cooking schedule. Fields: `weekStart`, `isTemplate`, `days[{weekday, slots:{breakfast/lunch/snacks/dinner}[{name,qtyHint?}], cookMembershipId?, estCostPoisha?, note?}]`, `revision`. Unique `(groupId, weekStart)`.

**`Note`** — board post: `note`/`announcement`/`handover`/`alert`. Fields: `authorMembershipId`, `authorUserId`, `kind`, `title` (≤120), `body` (≤2000 plain text), `audience` (all/members/role), `pinned` (max 3), `validFrom/validUntil` (auto-archive TTL), `absence{from,to}`, `tasks[{_id,text,assigneeMembershipId,claimedBy,doneBy,doneAt,status}]` (≤20), `readBy[]`, `state` (active|archived|deleted — soft delete), `revision`.

**`ShoppingList`** — shared bazar list. Fields: `title`, `items[{name,quantity,unit,estimatedPricePoisha,addedBy,addedByName,checked,checkedBy,checkedAt,note}]`, `status` (open|closed), `expenseDraftId`, `closedAt`, `closedBy`. Convertible to expense draft via `toExpense`.

**`KitchenItem`** — kitchen inventory tracker. Fields: `name`, `unit`, `currentStock`, `reorderThreshold`, `averageConsumptionPerDay`, `lastRefill`, `refills[]`, `isActive`, `createdBy`. Computes `daysRemaining` and `needsRefill`.

**`Poll`** — quick polls for menu. Fields: `question`, `options[{text,voteCount,votedBy[]}]`, `createdBy`, `status` (open|closed), `expiresAt`, `relatedMenuItem`.

### 4.9 Support Desk models (B1 — implemented)

**`SupportTicket`** — `ticketNo` (`MM-T-000123` via atomic `Counter`), `userId`, `groupId?`, `category`, `subject` (≤120), `status` (open|answered|awaiting_admin|resolved|closed), `priority` (low|normal|high|urgent — admin-set), `assignedAdminId?`, `firstAdminReplyAt`, `lastUserMessageAt`, `lastAdminMessageAt`, `firstResponseDueAt` (SLA: normal 24h, urgent 4h), `resolvedAt`, `closedAt`, `closedBy`, `resolutionNote`, `reopenCount`, `rating?{score 1-5, comment}`, `contextSnapshot`, `revision`.

**`SupportMessage`** — `ticketId`, `authorType` (user|admin|system), `authorId`, `body` (≤2000), `isInternal` (admin-only), `attachmentIds[]`. Immutable; admin can `redact` (body → `[removed]`).

**`SupportActionToken`** — single-use signed links (resolve|close|rate). Fields: `ticketId`, `userId`, `purpose`, `tokenHash` (sha256), `expiresAt` (7-day TTL), `usedAt`.

**`SupportCannedReply`** — admin snippets (`title`, `body`, `category`).

### 4.10 Security & Inbox models (B0/B3 — implemented)

**`InboxNotification`** — per-user in-app notification (`scope: user|admin`). Fields: `userId`, `groupId?`, `type`, `title` (≤120), `body` (≤300), `link{kind,id}`, `readAt`, `dedupeKey` (sparse unique), `expiresAt` (90-day TTL). Admin alerts fanned out per-admin with own `readAt`.

**`SecurityEvent`** — anomaly audit events. Fields: `userId`, `groupId?`, `type` (refresh_token_reuse|new_device|new_country|device_enrolment_burst|repeated_failures|join_code_failure|new_sign_in|token_from_query_string), `ip`, `ua`, `meta`, `createdAt` (90-day TTL).

**`JobLock` + `JobRun`** — distributed cron locking (`JobLock {name, lockedUntil, owner}`) and per-run audit log (`JobRun {name, startedAt, finishedAt,status,processed,failed,error}`, 30-day TTL).

**`InviteCode`** — hashed join codes (B3.1). Fields: `groupId`, `codeHash` (sha256 + pepper, unique), `prefix` (first 4 chars), `expiresAt` (default 7-day TTL), `maxUses` (default 20), `usedCount`, `revokedAt`, `createdBy`. Plaintext shown once at creation.

---

## 5. API Reference (implemented)

All routes prefixed with `/api`. Auth via the `x-auth-token` header (access JWT). V2 group routes resolve roles from the effective-dated `Membership` via `requireGroupRoleV2`. Financial mutations accept an `Idempotency-Key` header. Cursor-paginated lists return `{items, nextCursor, hasMore, count}`.

### 5.1 Authentication & Sessions — `/api/users`, `/api/sessions`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/users/register` | — | Register → token pair (+ HttpOnly refresh cookie). Verification email if SMTP configured. |
| POST | `/users/login` | — | Login → token pair. |
| POST | `/users/refresh` | — | Rotation: cookie-or-body refresh token → new pair. Reuse revokes the family. |
| POST | `/users/logout` | — | Invalidates stored token, clears cookie. |
| GET/PUT | `/users/profile` | ✅ | View/update profile (incl. optional WhatsApp number). |
| POST | `/users/change-password` | ✅ | `{ currentPassword, newPassword }` |
| POST | `/users/forgot-password` / `/reset-password` | — | Reset flow (15-min token). |
| GET | `/users/verify-email/:token` | — | Marks account verified. |
| POST | `/users/profile-pic` | ✅ | multipart `image` → Cloudinary. |
| GET | `/users/auth/google(/callback)` | — | Google OAuth. |
| GET | `/sessions/users/sessions` | ✅ | Active device list. |
| DELETE | `/sessions/users/sessions/:familyId` | ✅ | Revoke one device. |
| DELETE | `/sessions/users/sessions` | ✅ | Revoke all other devices. |
| GET | `/users/groups/:groupId/members` | ✅ member | Co-member directory (username/profilePic/whatsapp only). **404 unless you share the group.** |

### 5.2 Mess Groups — `/api/messgroups`

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/create` | user | Creates group + join code; auto-creates owner Membership, PolicyVersion v1, seeds 14 Bangladesh preset categories. |
| POST | `/join-by-code` / `/join-request/:groupId` | user | Join requests — **the only way into a group** (no browsing/discovery). |
| GET | `/my-groups`, `/:groupId` | user/member | Own groups; group detail is **404-masked for non-members**. |
| POST | `/approve/:groupId/:userId`, `/add-member/:groupId` | admin | Membership approvals. |
| DELETE | `/remove-member/:groupId/:userId` | admin/self | Kick / leave. |
| GET | `/code/:groupId`, POST `/regenerate-code/:groupId` | admin | Join code management — `GET` also returns a copyable `inviteLink`. |
| POST | `/invite/:groupId` | admin | Email invite. |
| POST/GET/PUT/DELETE | `/categories/:groupId(…)`, `/categories/:groupId/seed` | admin/member | Category CRUD + preset re-seed. |
| POST/GET/DELETE | `/extras/:groupId(…)` | admin/member | Legacy fixed extras. |
| PUT/GET | `/payment-note/:groupId/:userId/:month` | admin/self | Legacy payment notes. |
| GET | `/entries/:groupId`, `/calculate/:groupId`, `/export/:groupId`, `/pdf/:groupId` | member | Legacy totals + Excel/PDF exports. |

### 5.3 Meals & Guests — `/api/meals`

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/:groupId` | member | Upsert own slot entry `{ date?, slots: { lunch: { state, portionSubunits? }, … } }` — period-open enforced, revision bumped. |
| PUT/DELETE | `/entry/:id` | owner/admin | Edit/delete own entry. |
| GET | `/:groupId`, `/:groupId/:month` | member | Filtered lists (`?month=` XOR `?from=&to=`, `&userId=`). |
| POST/GET | `/:groupId/guests` | member | Record/list guest meals (`individual` or `universal` pool). |
| POST | `/:groupId/bulk/preview` → `/bulk/apply` | admin | Dry-run change set, then apply (up to 500 entries). |
| POST | `/:groupId/absence/preview` → `/absence/apply` | admin | Mark a date window `confirmed_zero` (source: absence), ≤366 days. |

### 5.4 Expenses — `/api/expenses`

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/groups/:groupId/expenses` | member | Create draft (multi-line poisha amounts). Returns `duplicateWarnings[]` when suspicious. Idempotent. |
| POST | `/…/:expenseId/submit` | member | draft → submitted. |
| POST | `/…/:expenseId/approve` | treasurer | Builds allocations, freezes `Allocation`, posts Journal — in one transaction. Idempotent. |
| POST | `/…/:expenseId/reject` / `/reverse` | treasurer | Reject, or reverse via reversal row + mirrored journal. Idempotent. |
| GET | `/groups/:groupId/expenses` | member | Cursor-paginated list (`?status=&costPeriod=&payable=&cursor=&limit=`). |
| POST/PUT/GET/DELETE | `/:groupId`, `/entry/:id` | member/payer | Legacy simple expense CRUD. |

### 5.5 Money & Funds — `/api/money`

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET/POST | `/groups/:groupId/money` | member | List (cursor-paginated) / submit transaction. Idempotent. |
| POST | `/…/:txId/confirm` | treasurer | Confirm → balanced Journal posted per kind, in a transaction. Idempotent. |
| POST | `/…/:txId/reject` / `/reverse` | treasurer | Reject / linked reversal. |
| GET | `/groups/:groupId/memberships/:membershipId/balance` | member | Ledger-derived member balance. |
| GET/POST | `/groups/:groupId/funds` | member/treasurer | Fund accounts (ledger balances) / create. |
| POST | `/groups/:groupId/funds/:fundId/custodian` | owner | Custody handover. |

### 5.6 Memberships, Policies, Periods, Statements

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/memberships/groups/:groupId/memberships(/active,/month/:month)` | member | Membership history/eligibility. |
| POST/PATCH | `/memberships/groups/:groupId/memberships(…)` | manager | Create (member or placeholder) / effective-dated update / `…/:id/depart`. |
| GET/POST | `/policies/groups/:groupId/policies` | member/owner | Policy version history / publish new immutable version. |
| GET | `/periods/groups/:groupId/periods(/:month,/:month/preview,/:month/checklist)` | member/treasurer | Period state, no-persist statement preview, pre-close checklist. |
| POST | `/periods/…/:month/begin-review` / `return-to-open` / `correct` | manager | State-machine transitions + correction audit marker. |
| GET | `/statements/groups/:groupId/statements(/id/:statementId,/:month)` | member | Statement history & versions. |
| POST | `/statements/groups/:groupId/statements/:month/finalize` | owner | Version N+1 with supersession; 409 on revision conflict; 422 listing unresolved `unknown` meal slots. Idempotent. |

### 5.7 Recurring, Reconciliation, Disputes, Assets

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET/POST/PUT | `/recurring/groups/:groupId/recurring(…)` | member/treasurer | Recurring rule CRUD. |
| POST | `/recurring/…/:ruleId/generate`, `/generate-all` | treasurer | Generate expense drafts for a cost period (idempotent). |
| GET/POST | `/reconciliation/groups/:groupId/reconciliations(/equation)` | member/treasurer | Create/list reconciliations; accounting-equation health. `/:recId/resolve` resolves variance. |
| GET/POST | `/disputes/groups/:groupId/disputes(…)` | member/manager | Open/list/respond/resolve disputes (link correction journal). |
| GET/POST | `/assets/groups/:groupId(…)`, `/:assetId/refund` | member/treasurer | Deposit/asset tracking + refunds. |
| POST/GET | `/attachments/groups/:groupId/upload`, `/:attachmentId` | member | Verified receipt upload / authenticated download. |

### 5.8 Notifications, Stats, Legacy Summary

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET/POST | `/notifications/whatsapp/webhook` | **public** | Meta webhook verify (hub challenge) + HMAC-SHA256-verified delivery status callbacks. |
| PUT | `/notifications/whatsapp/consent` | ✅ | Recipient opt-in/out toggle. |
| GET | `/notifications/groups/:groupId/notifications(/:messageId)` | member | Outbox inspection. |
| POST | `/notifications/…/:messageId/resend`, `/manual-share` | manager | Resend / wa.me manual-share links. |
| GET | `/stats/groups/:groupId/dashboard` | member | **V2 ledger dashboard**: period state, expense breakdown by status, money totals, fund balances, settlement figures. |
| GET | `/stats/:groupId` | member | Legacy chart aggregates (`?granularity=month|year&year=&month=&userId=`). |
| GET | `/summary/:groupId/:month` | member | **Legacy** float summary (deprecated — prefer statement preview). |
| POST | `/summary/finalize/…` | admin | Legacy finalize — now returns 410/409 directing to `/api/statements/:month/finalize`. |
| GET | `/summary/whatsapp/:groupId/:month` | admin | Legacy wa.me link generation. |

### 5.9 Hidden Admin Control Plane — `/api/admin` (never linked in any user surface)

Guard: `ADMIN_EMAILS` env allowlist (+ optional `X-Admin-Key` header). Non-admins receive the **generic global 404** — the panel's existence is not confirmed. All access & mutations audit-logged.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/overview` | Totals (users, groups, active memberships, statements) + traffic (signups 24h/7d, verified, audit volume). |
| GET | `/admin/traffic?days=30` | Daily signup & activity buckets (aggregations). |
| GET | `/admin/audit?action=&groupId=&limit=` | Latest audit events, filterable. |
| GET | `/admin/users?q=&cursor=&limit=` | Global user directory (username/email/phone search, cursor pagination). |
| GET | `/admin/users/:userId` | Full profile + every membership incl. group names/codes. |
| PATCH | `/admin/users/:userId` | `{isVerified?, suspended?}` — suspension kills login/refresh/all requests. |
| GET | `/admin/groups?q=&limit=` | **All** groups + active member counts + admins (only place group enumeration exists). |
| GET | `/admin/groups/:groupId` | Deep inspection: group + all memberships populated. |
| DELETE | `/admin/groups/:groupId` | Archive a group (audit-logged, reason in body). |

### 5.10 Inbox — `/api/inbox` (B0)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | ✅ | List notifications (`?unread=1&cursor=&limit=`). |
| GET | `/unread-count` | ✅ | Count of unread notifications. |
| POST | `/read` | ✅ | Mark `{ids[]}` or `{all:true}` as read. |
| GET/PUT | `/preferences` | ✅ | Get/update per-type notification preferences + quiet hours. |

### 5.11 Support Desk — `/api/support` (B1, user side)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/actions/:token` | public | Redeem single-use action token (resolve/close/rate). Neutral responses. |
| POST | `/appeal` | public | Suspended-user appeal (1/day/IP, CAPTCHA hook). Neutral 200. |
| POST | `/tickets` | ✅ | Create ticket (idempotent; 3 open / 5 per day limits). |
| GET | `/tickets` | ✅ | My tickets (cursor-paginated). |
| GET | `/tickets/:ticketId` | ✅ | Thread (internal notes filtered) + `permissions.canComment` + reason. |
| POST | `/tickets/:ticketId/messages` | ✅ | Comment (rate-limited 10/min, turn-locked). |
| POST | `/tickets/:ticketId/resolve\|close\|reopen\|rate` | ✅ | State transitions (optimistic revision guard). |

### 5.12 Support Admin — `/api/admin/support` (B1, hidden behind `requirePlatformAdmin` + `requireAdminAMR`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/tickets` | Work queue (status/priority/assignee/category/overdue filters, cursor). |
| GET | `/tickets/:ticketId` | Full thread incl. internal notes + user context. |
| POST | `/tickets/:ticketId/reply` | Public reply (transitions to `answered`, sets `firstAdminReplyAt`). |
| POST | `/tickets/:ticketId/internal-note` | Admin-only note (does not change status). |
| POST | `/tickets/:ticketId/assign` | Assign to an admin. |
| PATCH | `/tickets/:ticketId` | Set priority/category/tags (SLA recomputed on priority change). |
| POST | `/tickets/:ticketId/resolve\|close\|reopen` | State transitions (reason required for admin reopen). |
| POST | `/tickets/:ticketId/messages/:messageId/redact` | Redact message body → `[removed]` (audit-logged). |
| GET | `/stats` | Open/awaiting/overdue counts, median first-response time, CSAT. |
| GET/POST/PUT/DELETE | `/canned-replies` | Admin snippets CRUD. |

### 5.13 Routine & Notice Board — `/api/routines` (B2)

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET/POST | `/groups/:groupId/rosters` | member / manager | List / create roster (draft). |
| GET/PATCH | `/groups/:groupId/rosters/:rosterId` | member / manager | Get / edit roster (bumps revision). |
| POST | `/groups/:groupId/rosters/:rosterId/publish` | manager | Publish + generate duty horizon. |
| POST | `/groups/:groupId/rosters/:rosterId/extend-horizon` | manager | Extend generated days (≤90). |
| GET | `/groups/:groupId/duties` | member | Calendar feed (`?from=&to=&membershipId=&status=&rosterId=`). |
| POST | `/groups/:groupId/duties/:assignmentId/done` | assignee/manager | Mark done `{doneNote?}`. |
| POST | `/groups/:groupId/duties/:assignmentId/reassign` | manager | Reassign to `{toMembershipId}`. |
| POST | `/groups/:groupId/swaps` | assignee | Create swap request `{toMembershipId?}`. |
| POST | `/groups/:groupId/swaps/:swapId/respond` | target | Accept/decline swap. |
| GET/POST | `/groups/:groupId/menu` | member / manager | Weekly menu plan (template or concrete week). |
| GET/POST/PATCH/DELETE | `/groups/:groupId/notes/…` | member / manager | Board notes + audience targeting. |
| POST | `/groups/:groupId/notes/:noteId/ack` | member | Acknowledge/read receipt. |
| POST | `/groups/:groupId/notes/:noteId/tasks/:taskId/claim\|done` | member | Claim or complete handover task. |
| GET | `/groups/:groupId/board/today` | member | Today's duties + menu + pinned notes + active handovers. |
| GET | `/groups/:groupId/menu/bazar-suggestions` | member | Aggregated shopping list from menu plan. |
| GET | `/groups/:groupId/duties/fairness` | member | Duty done/missed counts per member per month. |
| GET | `/groups/:groupId/bazar-spend-rotation` | member | Members sorted by cumulative bazar spend (fair_amount rotation). |
| POST | `/groups/:groupId/emergency-broadcast` | owner/manager | Alert note that bypasses quiet hours. |

### 5.14 Shopping List — `/api/shopping-list` (B2)

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/groups/:groupId` | member | Get/create open list. |
| POST | `/groups/:groupId/items` | member | Add item. |
| PATCH/DELETE | `/groups/:groupId/items/:itemId` | member | Check/uncheck or remove item. |
| POST | `/groups/:groupId/to-expense` | member | Convert checked items to expense draft (Bazar category). |
| GET | `/groups/:groupId/history` | member | Past lists. |

### 5.15 Kitchen Inventory — `/api/kitchen-inventory` (B2)

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET/POST | `/groups/:groupId` | member | List / create staple item (stock, reorder threshold, consumption/day). |
| PATCH/DELETE | `/groups/:groupId/:itemId` | member | Update / archive item. |
| POST | `/groups/:groupId/:itemId/refill` | member | Record refill (quantity, unit, cost, note). |

### 5.16 Polls — `/api/polls` (B2)

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET/POST | `/groups/:groupId` | member | List / create poll (2–6 options, expiresAt). |
| POST | `/:pollId/vote` | member | Vote (one vote per user, can change). |
| POST | `/:pollId/close` | member/manager+ | Close poll (creator or manager+). |
| GET | `/:pollId/results` | member | Results with percentages. |

### 5.17 TOTP 2FA — `/api/users/2fa` + `/api/users/login/2fa*` (B3.2)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/users/2fa/setup` | ✅ | Generate TOTP secret + QR URL. |
| POST | `/users/2fa/verify` | ✅ | Verify code + enable 2FA (returns recovery codes). |
| POST | `/users/2fa/disable` | ✅ | Disable 2FA (password + code required). |
| POST | `/users/login/2fa-challenge` | public | Password validation → challenge token (if 2FA enabled). |
| POST | `/users/login/2fa` | public | Verify challenge code → token pair (`amr: ['pwd','otp']`). |

### 5.18 Invite Codes — `/api/invite` (B3.1)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/join-by-code` | ✅ | Join group by hashed code (rate-limited, failure lockout). |
| POST | `/codes` | ✅ | Create/regenerate invite code (admin; plaintext shown once). |
| GET | `/codes/:groupId` | ✅ | Get active code metadata (prefix/expiry/usesLeft — no plaintext). |

---

## 6. How the Money Works

### 6.1 Money Precision

All amounts are **integer poisha** (`utils/money.js`). API inputs are canonical decimal strings ("1234.50") parsed exactly — no binary float multiplication anywhere. Cost splitting uses a deterministic **largest-remainder** allocator (ties broken by index) so every allocation sums exactly to its source total.

### 6.2 Ledger (double-entry)

Every financial event posts a balanced `Journal` (debits == credits, ≥2 lines, nonzero):

- **Expense approved** → allocations per line (meal pool lines debit member accounts by weighted meal units; clearing accounts credit the supplier payable / payer).
- **Money confirmed** → journal lines per transaction kind (e.g. contribution: debit fund / credit member; supplier payment: debit clearing / credit fund).
- **Reversals** → mirror-image journal linking `reversalOf`; originals are never edited or deleted.

Balances (fund accounts, member dues) are always **derived** by aggregating journals — never stored booleans or floats. Exactly-once posting is enforced by a unique index on `(groupId, sourceType, sourceId, sourceRevision, postingKind)`.

### 6.3 Allocation Modes (7)

| Mode | Use case |
|---|---|
| `meal_units` | Bazar/food — split by weighted meal units of beneficiaries |
| `equal_all` | Rent — equal among all active members |
| `equal_selected` | Wi-Fi — equal among explicit beneficiaries |
| `member_days` | Electricity — by eligible days intersecting the service period |
| `fixed_amounts` | Room rents — exact poisha per beneficiary |
| `weighted` | Bigger room = 2 shares (integer weights) |
| `usage` | Sub-meters — approved usage quantities |
| `personal` | One named beneficiary (convenience mode) |

### 6.4 Meal Rate

Food-pool expenses (`meal_units` categories) ÷ total **weighted** meal units → meal rate in integer poisha per unit, computed as `(mealExpenses × 1000) / totalMealSubunits`. Guest meals either feed the host's units (`individual`) or the shared denominator (`universal`). Any `unknown` slot in the period **blocks finalization** with a 422 listing the unresolved member/slot/date.

### 6.5 Month-End Close

1. Period → `review` (ordinary edits blocked with 409)
2. Treasurer runs the close checklist
3. Owner finalizes with `expectedRevision` → immutable Statement version N+1, predecessor superseded, policy & membership snapshots frozen, period → `finalized`
4. Correction = finalize again with a reason (new version) — history is never rewritten

### 6.6 Notifications

After finalize, the **outbox worker** delivers per-member bills: email (SMTP) and/or WhatsApp Meta templates — checking each recipient's `whatsappConsent` first (`skipped` when opted out), recording `providerMessageId`, and updating delivered/read state from HMAC-verified Meta webhooks. A zero-config fallback returns wa.me deep links for manual sending.

---

## 7. Privacy Model & Hidden Admin Panel

1. **No global discovery.** No endpoint lists groups or users globally for regular users. `/my-groups` returns only your groups; group detail, entries, categories, everything group-scoped 404-masks for outsiders.
2. **User info is group-scoped.** Another user's profile (even existence) is invisible until you share a group. The directory endpoint returns username/profilePic (+whatsapp among co-members) — never email/phone.
3. **Join only by code.** Groups are entered exclusively via a shareable, copyable invite link (`/join?code=MM-XXXXXX`) or 6-char code; admins can regenerate to kill old links.
4. **Leave/kick cuts access instantly.** Departure closes the Membership interval (`endDate/leftAt = now`) and pulls legacy arrays. Ex-members keep settled balances but can read history **only within their interval** (`resolveHistoryWindow` clamps meal/expense queries).
5. **Hidden admin panel.** `/api/admin/*` exists outside every user-facing surface; failures return the standard 404; platform admins browse all traffic, users, groups, and history there, and can suspend users or archive groups.

---

## 8. Realtime, Filters & Indexing

### 8.1 Realtime — Socket.IO

- Handshake requires a valid access token (`socket.handshake.auth.token` or `?token=`)
- Client emits `join-group` / `leave-group` with a groupId (ObjectId-validated)
- Controllers emit updates to `group:<id>` rooms; `io` is exposed to controllers via `app.set('io', io)`

### 8.2 Filter & Pagination Support

| Endpoint | Filters |
| --- | --- |
| `GET /api/meals/:groupId` | `?month=YYYY-MM` OR `?from=&to=`, `&userId=` |
| `GET /api/expenses/groups/:groupId/expenses` | `?status=`, `&costPeriod=`, `&payable=`, `&cursor=`, `&limit=` (cursor pagination) |
| `GET /api/money/groups/:groupId/money` | `?status=`, `&kind=`, `&cursor=`, `&limit=` (cursor pagination) |
| `GET /api/stats/:groupId` | `?granularity=month\|year`, `&year=`, `&month=`, `&userId=` |

Rules: `month` and `from/to` are mutually exclusive; `from` ≤ `to`; cursor lists cap at 100/page with stable base64 cursors.

### 8.3 Optimization & Indexing

| Collection | Key indexes |
| --- | --- |
| Journal | `(groupId, sourceType, sourceId, sourceRevision, postingKind)` **unique — exactly-once posting** · `(groupId, costPeriod)` |
| Meal | `(groupId, userId, date)` unique · slot-state compound |
| Statement | `(groupId, month, version)` unique · `(groupId, state)` |
| Period | `(groupId, month)` unique |
| Membership | `(groupId, user)` · `(groupId, startDate)` |
| Session | `familyId` unique · TTL `expiresAt` |
| Expense | `(groupId, status, costPeriod)` · `(groupId, categoryId, costPeriod)` |
| MoneyTransaction | `(groupId, status, paidAt)` · from/to member |
| IdempotencyRecord | `(groupId, actorId, operation, key)` unique · TTL |
| NotificationOutbox | `(state, nextAttemptAt)` · sparse unique dedupe |
| Allocation | `(groupId, expenseId, lineId)` unique |
| User / MessGroup / ExpenseCategory / PaymentNote | as before (unique email/code/name; admin & member lookups) |

Also: `$match`-first aggregation stages, `.lean()` on read-heavy lists, month-string range queries, and TTL indexes for self-expiring records.

---

## 9. Security Measures (implemented)

1. **Zod validation everywhere** — strict schemas for body, params and queries (ObjectId regex, poisha integer checks, strong password rules: 8+ chars with upper/lower/digit).
2. **NoSQL injection defense** — `$`/`.` keys stripped from body/params before validation (Express 5-compatible; `express-mongo-sanitize` not needed).
3. **5-tier RBAC** — `requireGroupRoleV2` resolves owner/manager/treasurer/auditor/member from active Membership intervals (falls back to legacy group admin → owner). Self-approval requires a reason; last owner cannot leave without transfer; role changes are audit-logged.
4. **Refresh-token rotation + families** — tokens stored as sha256 hashes; per-device `Session` rows; replaying a rotated token revokes the entire family.
5. **HttpOnly cookies + CSRF** — refresh token delivered in HttpOnly/SameSite cookie (`Path=/api/users`); global CSRF middleware checks Origin for cookie-carried mutations (Bearer clients bypass).
6. **Idempotency protection** — `Idempotency-Key` header on financial mutations; key reuse with a different body → 409; replays return cached responses.
7. **Rate limiting** — 50 req/15min auth; 300 req/15min general.
8. **Strict CORS allowlist** — `FRONTEND_URL` origins only, credentials-aware, explicit methods.
9. **Helmet**, **hpp**, 10kb body limit; error handler hides internals.
10. **Upload hardening** — receipt MIME whitelist **plus magic-byte signature verification**, sha256 hashing, 10MB cap, private storage, authenticated group-scoped download.
11. **Audit trail** — append-only redacted audit events on approvals, reversals, role/policy changes and period transitions.
12. **No data leakage** — secrets/tokens never serialized out; masked fund identifiers; generic auth errors.

13. **Privacy guards** — membership-gated reads; 404-masking of group existence; field allowlists on cross-member profiles; ex-member history clamped to their interval.
14. **Hidden admin control plane** — allowlist + `requireAdminAMR` (2FA mandatory); denials audit-logged and 404-masked.
15. **Suspension** — banned users fail login, refresh and every authenticated request.
16. **Cookie-only access token** — `mm_at` HttpOnly cookie (Path=/); query-string Socket.IO tokens rejected; CSRF double-submit (`mm_csrf` + `x-csrf-token`).
17. **MongoDB session store** — replaces MemoryStore (multi-instance safe, TTL index).
18. **Deprecation headers** — on legacy routes (`/api/messgroups/entries`, `/api/messgroups/calculate`).
19. **CSP + Referrer-Policy + Permissions-Policy + HSTS** — configured via helmet.
20. **Consent timestamps** — `termsAcceptedAt`, `privacyAcceptedAt`, `supportContextConsentAt`, `emailNotificationsConsentAt` on `User`.
21. **Cache-Control: no-store** on authenticated JSON responses.
22. **Invite code hashing** — sha256 + pepper, 7-day TTL, max-uses, plaintext shown once at creation.

---

## 10. Testing

`npm test` → `node --test tests/*.test.js` — **19 suites / 111 passing**:

- `goldenCalculation.test.js` — §8 golden end-to-end calculation
- `moneyPrecision.test.js` — integer-poisha parsing/formatting/rounding (×2)
- `journalBalance.test.js` — debit == credit invariant
- `acceptanceGates.test.js` — randomized allocation invariants (conservation/determinism/permutation over 200 trials), leap-day & Dhaka-midnight (UTC+6) boundaries, member-days + absence marking, guest pools, idempotency hash-mismatch misuse, cross-group authorization isolation
- `scenarioGates.test.js` — all-10-kind ledger event balance matrix, finalize/edit race semantics (loser gets 409), partial-payable extinguishing, departing-debtor preservation, archived category snapshots, supersession chain integrity, delivery-failure decision matrix
- `rosterGeneration.test.js` — round-robin continuity, skip-absent, departed member, DST-free Dhaka day edges, idempotent regeneration
- `supportRules.test.js` — full status × actor × action matrix incl. closed, strict-turn on/off, reopen-window
- `totp.test.js` — TOTP generation/verification, recovery codes, encrypt/decrypt round-trip
- `inviteCode.test.js` — expiry, max-uses race, revoked, hashed at rest
- `jobLockRules.test.js` — lock decision rules for cron runner
- `privacyPayload.test.js` — group payloads never contain `email`/`phone`
- `anomalySweep.test.js` — security anomaly detection sweep
- `departedReassignment.test.js` — duty reassignment on member departure
- `legacyMealMigration.test.js` — legacy 2-slot float meal migration to 4-slot state form
- `noteVisibility.test.js` — audience filtering, ex-member clamp, no HTML, task claim race (two claimers → one wins)
- `retention.test.js` — ticket anonymisation and audit retention cutoffs
- `inboxRules.test.js` — inbox dedupe and expiry helpers

Integration tests (`npm run test:integration`, needs live server): `b0.test.js`, `cookies.test.js`, `routines.test.js`, `support.test.js`.

Remaining (need live infrastructure): replica-set race drill, restore drill, load test.

---

## 11. Frontend User Interface

### 11.1 Authentication Pages

- **Login Page**: Email, password, remember me
- **Register Page**: Username, email, password, confirm password (+ optional WhatsApp number)
- **Profile Page**: Edit profile, change password, device/session management, WhatsApp consent toggle

### 11.2 Dashboard Pages

- **Home Dashboard**: Overview of all joined mess groups
- **Group Dashboard**: V2 ledger dashboard (`/api/stats/…/dashboard`) — period state, expense pipeline, fund balances
- **Add Entry Pages**: meal slots (state + portion picker), expense draft builder (multi-line, category + split mode)

### 11.3 Group Management Pages

- **Create Group**: name, meal slots/weights, default meals
- **Manage Members**: memberships timeline, placeholders, roles, approvals, departure
- **Group Settings**: policy versions, join codes, categories, recurring rules, deposits/assets

### 11.4 Reports & Export

- **Statement Viewer**: versioned statements with supersession history
- **Close Workflow**: review → checklist → finalize (with correction flow)
- **Export Options**: Excel, PDF downloads
- **Disputes & Reconciliation UI**

---

## 12. User Workflow

### For Owner / Manager

1. **Register/Login** → Create mess group → share join code
2. Configure policy (meal weights, cutoff hour), review preset categories
3. Approve join requests / add memberships (incl. placeholders for unregistered residents)
4. Approve submitted expenses (auto-journaled), confirm money transactions
5. Begin month review → run checklist → **finalize statement** (versioned)
6. Deliver bills via WhatsApp/email outbox; resolve disputes & reconciliations

### For Members

1. **Register/Login** → join by code → wait for approval
2. **Daily entry**: set meal slot states (consumed portions / confirmed absence)
3. Submit expenses (optionally upload receipts) and money contributions
4. View personal ledger balance, statement items, dispute anything questionable
5. Receive month-end bill; settle via member_settlement transactions

---

## 13. Roadmap / Remaining Work

### Phase: Frontend Integration (next)

- [ ] Axios client with access-token header + auto-refresh on 401 (cookie-aware retry queue)
- [ ] Socket.IO client: `join-group` per open group page
- [ ] Auth pages consuming token-pair + cookie flow (+ WhatsApp consent toggle, session manager)
- [ ] Meal slot-state entry UI (unknown/zero/consumed with portion picker)
- [ ] Expense draft builder (multi-line, split modes, payers) + approval inbox
- [ ] Statement viewer (versions, supersession, per-member items) + close-workflow screens
- [ ] Memberships timeline / policy editor / recurring rules / deposits UI
- [ ] Disputes, reconciliation and notification-outbox panels
- [ ] Charts consuming `/api/stats` + V2 dashboard

### Phase: Backend Cleanup (Priority 4 items)

- [ ] Remove unused deps: `bcryptjs`, `pdfmake`, `express-validator`, `express-mongo-sanitize`
- [ ] Deprecate legacy routes (`/api/messgroups/entries|calculate`, `/api/summary`) with `Deprecation` headers
- [ ] Extend `scripts/migrateLegacyData.js` to rewrite legacy 2-slot float Meal rows into slot-state form
- [ ] Move Google OAuth session off MemoryStore (Redis/Mongo-backed store)

### Phase: Production Hardening

- [ ] Cloud object storage (S3/R2) for receipts: signed upload/download URLs + AV-scan hook (`Attachment.scanStatus: pending` already modeled)
- [ ] MongoDB replica set in production to activate real `withTransaction()` atomicity
- [ ] Configure real SMTP credentials; deploy behind HTTPS; `NODE_ENV=production`
- [ ] Rotate all secrets before deploying
- [ ] Live-infrastructure test gates: §17.8 replica-set race drill, §17.13 restore drill, §17.14 load test (50 members, multi-year history)

### Phase: Enhancement

- [ ] PWA (offline entry with sync) · Bulk Excel/CSV import · Multi-language (English, Bengali)
- [ ] WhatsApp Cloud API production templates · Analytics/forecasting

---

## 14. Advanced Features (What Better You Can Do)

### 14.1 Real-time Updates

- **Socket.IO** live updates (implemented) + live member activity indicators

### 14.2 Mobile Optimization

- **PWA** with offline meal entry + sync; push reminders before entry cutoff

### 14.3 Analytics & Insights

- Cost trend analysis over months; meal consumption patterns; budget forecasting; member contribution analytics — building on the ledger-derived dashboard

### 14.4 Enhanced UX Features

- Dark/light theme; English/Bengali; keyboard shortcuts for slot entry; bulk import

### 14.5 Integration Capabilities

- bKash/Nagad payment-gateway integration for settle-up; bank statement import for reconciliation; calendar integration for meal planning

---

## 15. Environment Variables (`.env`)

```dotenv
PORT=5000
MONGO_URI=mongodb+srv://...   # replica set in production (enables transactions)
JWT_SECRET=...           # access tokens
JWT_REFRESH_SECRET=...   # refresh tokens (separate secret!)
SESSION_SECRET=...       # OAuth session cookie
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:5174   # comma-separated allowlist
SMTP_HOST=               # optional — emails marked not_configured if empty
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=MealMate <no-reply@mealmate.app>
WHATSAPP_TOKEN=          # optional — WhatsApp Cloud API template/direct send
WHATSAPP_PHONE_ID=       # optional — your WA business phone number id
WHATSAPP_TEMPLATE_NAME=  # optional — pre-approved template (default: statement_summary)
WHATSAPP_APP_SECRET=     # optional — webhook HMAC verification
ADMIN_EMAILS=you@example.com,other@…   # platform-admin allowlist (comma-separated)
ADMIN_PANEL_KEY=...      # optional second factor: X-Admin-Key header for /api/admin
TOTP_ENCRYPTION_KEY=...  # 32-byte base64 key for TOTP secret encryption (B3.2)
INVITE_DEFAULT_TTL_DAYS=7   # default invite code expiry (B3.1)
SUPPORT_STRICT_TURNS=true   # lock user comments until admin replies after every message (B1)
SUPPORT_SLA_NORMAL_HOURS=24 # normal ticket first-response SLA (B1)
SUPPORT_SLA_URGENT_HOURS=4  # urgent ticket first-response SLA (B1)
SUPPORT_AUTOCLOSE_HOURS=72  # auto-close resolved tickets after this many hours (B1)
ENABLE_SCHEDULER=true       # true only on the worker instance (cron)
COOKIE_DOMAIN=              # optional, production cookie domain
```


---

## 16. Routine & Notice Board (B2 — implemented)

Shows each member **who does bazar / cleaning / cooking and when**, **what is cooked on which day**, and lets members leave **notes and absence hand-overs** for the rest of the mess. No ledger impact. Full design: [`plan.md`](./plan.md) §14.

| Feature | Summary |
|---|---|
| Duty rosters | `bazar`, `cleaning` (with areas), `cooking`, `custom`; rotation modes `round_robin`, `weekly_template`, `fair`, `manual`; skips departed or absent members; publish → generates the next 30 days |
| Duty actions | mark done, swap request (to a person or open offer), manager reassign; bazar duty → prefilled expense draft |
| Weekly menu | per weekday × meal slot items, cook, estimated cost; a repeating template with weekly overrides |
| Notes | `note`, `announcement`, `handover` (absence window + task checklist anyone can claim), `alert`; audience targeting, pin (max 3), read receipts, auto-expiry |
| Board widget | `GET /api/routines/groups/:groupId/board/today` — today's duties, menu, pinned notes, active hand-overs in one call |
| Reminders | evening-before + morning-of duty reminders, swap and hand-over events, missed-duty alerts to managers |
| Shopping list | shared bazar list → convertible to expense draft (`/api/shopping-list`) |
| Kitchen inventory | staple stock tracking + refills (`/api/kitchen-inventory`) |
| Polls | quick menu decisions with voting (`/api/polls`) |
| Emergency broadcast | owner/manager alert that bypasses quiet hours |

New models: `Roster`, `DutyAssignment`, `SwapRequest`, `MenuPlan`, `Note`, `ShoppingList`, `KitchenItem`, `Poll`. New prefixes: `/api/routines`, `/api/shopping-list`, `/api/kitchen-inventory`, `/api/polls`. Realtime events: `duty-updated`, `menu-updated`, `note-created`, `note-updated`, `shoppingList-updated`, `kitchenInventory-updated`.

## 17. Support Desk (B1 — implemented)

A member can raise a ticket with the platform admin. Rules:

- A new ticket is **locked for the user until the admin first replies**; the user cannot add comments in the meantime.
- After an admin reply the user may respond (status `answered`); after the user's reply the thread locks again until the admin answers (strict turn-taking, toggle `SUPPORT_STRICT_TURNS`).
- `resolved` → user may **Reopen** within 7 days; `closed` is terminal — **no comments** (open a new linked ticket).
- Auto-close 72 h after `resolved`; SLA timers (first response due 24 h, urgent 4 h) raise admin alerts.
- Email buttons use **single-use action tokens** (resolve / close / rate), stored hashed, 7-day TTL.
- Admin-only **internal notes**, canned replies, assignment, priority, stats; suspended users can file an **appeal** through a rate-limited public route.

| Side | Prefix | Highlights |
|---|---|---|
| User | `/api/support` | `POST /tickets`, `GET /tickets`, `GET /tickets/:id` (returns `permissions.canComment` + reason), `POST /tickets/:id/messages\|resolve\|close\|reopen\|rate`, `POST /actions/:token` |
| Admin (hidden, 404-masked) | `/api/admin/support` | queue with filters, `reply`, `internal-note`, `assign`, `PATCH`, `resolve\|close\|reopen`, `stats`, `canned-replies` |

Error codes: `403 TICKET_AWAITING_ADMIN`, `403 TICKET_CLOSED`, `409 TICKET_STATE_CHANGED`. Models: `SupportTicket`, `SupportMessage` (immutable), `SupportActionToken`, `SupportCannedReply`, `Counter`. Details: `plan.md` §15.

## 18. Notification Inbox (B0 — implemented)

One `InboxNotification` collection (TTL 90 days) powers the in-app bell for **users and admins** (duties, notes, disputes, statements, support). Admin alerts are fanned out per admin (own read state); sockets auto-join `user:<id>` and receive `inbox-new`. API: `/api/inbox` (`GET /`, `GET /unread-count`, `POST /read`, `GET/PUT /preferences`). Email still flows via the outbox with dedupe keys; admin email is a digest. Details: `plan.md` §16.

## 19. Security Hardening (B3 — implemented)

| Item | Status |
|---|---|
| Invite codes hashed at rest, 7-day TTL, max-uses, one-time reveal; strict join limiter | ✅ `InviteCode` model + `joinCodeLimiter` |
| TOTP 2FA — mandatory for platform admins, offered to owner/treasurer | ✅ `utils/totp.js` + `middleware/amrGate.js` |
| Anomaly detection (`SecurityEvent` + 15-min sweep, new-device email) | ✅ `services/securityService.js` |
| Strip email/phone from every populate, central `publicProfile`, sensitive-read audit | ✅ `middleware/privacy.js` + `privacyPayload.test.js` |
| Retention job (tickets anonymised at 18 months, TTLs) | ✅ `services/retentionRules.js` + `supportJobs.supportRetentionFn` |
| CSP + Referrer-Policy + Permissions-Policy + HSTS | ✅ configured via helmet in `index.js` |
| Backup/restore runbook + quarterly drill | `docs/RUNBOOK_BACKUP.md` |
| Consent timestamps (terms, privacy, support context, email) | ✅ on `User` model |
| Cron hardening: Mongo `JobLock`, `JobRun` log, overlap guard, graceful shutdown | ✅ `services/jobRunner.js` + `schedulerService.js` |

## 20. Frontend Architecture (SSR / BFF / cookies)

Decision: move the client to **Next.js App Router** acting as a **BFF** — server middleware for route protection, protected server layouts, SSR for first-load data, HttpOnly cookies only (no `localStorage`), and a same-origin `/api/bff/*` proxy so the browser never learns the backend URL or any token. Browser DevTools will still show requests to your own origin; real security stays on the backend. Backend changes required (cookie access token, `X-Client: web` handling, CSRF double-submit, cookie-authenticated sockets): `plan.md` §19.1. Frontend rules: `FRONTEND_BUILD_PROMPT.md` §8.

The backend is already cookie-ready: `mm_at` HttpOnly access cookie, `mm_csrf` double-submit CSRF, Socket.IO authenticates from cookie (query-string tokens rejected), and `X-Client: web` triggers cookie-only token responses. The frontend (Vite + React SPA in `Client/`) can be migrated to Next.js App Router when ready.

## 21. Updated Roadmap

- [x] **B0** Inbox + JobLock/JobRun + scheduler audit fixes + notification preferences — implemented (111 unit tests pass)
- [x] **B1** Support Desk (rules matrix tests, admin alerts, action tokens, appeals) — implemented
- [x] **B2** Routine & Board (rosters, duties, swaps, menu, notes/hand-overs, reminders, shopping list, kitchen inventory, polls) — implemented
- [x] **B3** Security hardening (InviteCode, 2FA, SecurityEvent, CSP, retention, runbook) — implemented
- [x] **B4** Cookie-only auth on the backend — implemented (`mm_at` cookie, `mm_csrf` CSRF, cookie-authenticated Socket.IO)
- [ ] **B5** Next.js BFF frontend (foundation, then Support, Board, Inbox UI) — pending
- [ ] **B6** Extras: cook headcount, shared shopping list (done), fairness board (done), inventory tracker (done), polls (done), weekly digest (done) — backend done, frontend pending
