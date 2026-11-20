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
- **JWT** — short-lived access tokens (1h) + rotating refresh tokens (7d) in HttpOnly/SameSite cookies + refresh-token **families** with reuse detection (`Session` model)
- **bcrypt** — password hashing
- **Helmet / hpp / strict CORS allowlist / CSRF origin-check** — security hardening
- **express-rate-limit** — 50 req/15min on auth, 300 req/15min general
- **ExcelJS** — Excel export (replaced unmaintained SheetJS/xlsx)
- **PDFKit** — PDF report export
- **Nodemailer** — password reset / verification / group invite emails + outbox email channel
- **WhatsApp Cloud API (Meta v21.0)** — pre-approved templates, direct sends, HMAC-verified delivery webhooks, opt-in consent
- **Socket.IO** — JWT-authenticated realtime group rooms
- **Multer** — receipt uploads with magic-byte MIME verification + Cloudinary for profile pictures
- **Passport (Google OAuth20)** — social login

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
│   ├── messGroupController.js     # groups, join codes, extras, exports, seeding setup
│   ├── mealController.js          # slot-state meal engine + guests + bulk + absence
│   ├── expenseController.js       # V2 workflow (draft→submit→approve/reject/reverse) + legacy CRUD
│   ├── moneyController.js         # money transactions, funds, custodians, ledger balances
│   ├── membershipController.js    # effective-dated memberships (placeholders, depart, roles)
│   ├── policyController.js        # immutable policy versions
│   ├── periodController.js        # open→review→finalized state machine, previews, checklist
│   ├── statementController.js     # finalize (versioned/superseding) + history
│   ├── recurringController.js     # recurring rules → expense drafts
│   ├── reconciliationController.js# counted vs ledger balance, accounting equation
│   ├── disputeController.js       # member disputes with threaded responses
│   ├── notificationController.js  # outbox mgmt, WhatsApp webhook + consent
│   ├── sessionController.js       # device list, revoke one/all
│   ├── attachmentController.js    # receipt upload/download (verified magic bytes)
│   ├── depositAssetController.js  # landlord deposits / kitchen equipment / refunds
│   ├── expenseCategoryController.js # categories + 14 Bangladesh presets auto-seed
│   ├── statsController.js         # legacy stats + V2 ledger dashboard
│   ├── adminController.js         # HIDDEN platform admin: traffic, global users/groups, suspension
│   ├── summaryController.js       # LEGACY float summary engine (deprecated)
│   └── paymentNoteController.js   # LEGACY admin payment notes
├── middleware/
│   ├── auth.js             # JWT access-token guard (x-auth-token)
│   ├── roles.js            # legacy requireGroupRole + V2 requireGroupRoleV2 (5 roles)
│   ├── csrf.js             # Origin-check CSRF protection for cookie mutations
│   ├── idempotency.js      # Idempotency-Key replay protection (409 on body mismatch)
│   ├── receiptUpload.js    # multer disk storage + magic-byte verify + sha256
│   ├── privacy.js          # requireHistoryWindow + field allowlist
│   └── upload.js           # multer (profile pics → Cloudinary)
├── models/                 # (21 models — see §4)
│   ├── routes/                 # (18 routers + hidden adminRoutes — see §5)
├── services/
│   ├── ledgerService.js    # postJournal / reverseJournal (balanced, exactly-once)
│   ├── statementService.js # buildStatementDraft / finalizeStatement (supersession)
│   ├── allocationService.js# 7 split-mode weight builder + largest-remainder charges
│   ├── periodService.js    # getOrCreatePeriod / ensureOpen / bumpRevision / beginReview
│   ├── membershipService.js# interval algebra: active/in-month/eligible-days/overlap
│   ├── sessionService.js   # refresh-token families, rotation, reuse detection
│   ├── schedulerService.js # cron: recurring drafts, deadline reminders, default meals, cleanup
│   ├── outboxWorker.js     # leased delivery batches (email + WhatsApp, consent-aware)
│   └── duplicateDetection.js # duplicate expense warnings (receipt ref / supplier+amount+date)
├── utils/
│   ├── money.js            # integer-poisha parsing/formatting + largest-remainder allocator
│   ├── tokens.js           # access/refresh signing, hashing, HttpOnly cookie helpers
│   ├── transaction.js      # withTransaction() — replica-set aware
│   ├── pagination.js       # stable cursor pagination (base64 cursors)
│   ├── dhakaTime.js        # Asia/Dhaka civil-day helpers (UTC+6 bucketing)
│   ├── whatsapp.js         # wa.me links, Cloud API template/direct send, webhook HMAC verify
│   └── mailer.js           # Nodemailer templates
├── validation/
│   ├── schemas.js          # all Zod schemas (~460 lines: money, meals, expenses, policies…)
│   └── validate.js         # Zod middleware + NoSQL-operator sanitizer
├── scripts/
│   └── migrateLegacyData.js # idempotent legacy→V2 migration
├── tests/                  # node --test suite: 26/26 passing (see §9)
└── index.js                # Express 5 app, security stack, Socket.IO, workers
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

- **`requirePlatformAdmin`** (`controllers/adminController.js`) — email allowlist (`ADMIN_EMAILS`) + optional `X-Admin-Key` second factor; denials are audit-logged and answered with the generic global **404** so non-admins can't even confirm the endpoint exists.
- **Privacy middleware** (`middleware/privacy.js`) — `requireGroupMembership` (404-masked membership gate), `resolveHistoryWindow` (ex-member reads clamped to `[firstJoin, lastDeparture]`), `MEMBER_VISIBLE_FIELDS` allowlist, `publicProfile` projection.
- **Invite system** — join codes + shareable copyable links (`{FRONTEND_URL}/join?code=MM-XXXXXX`) returned by `GET /api/messgroups/code/:groupId`; joining is only possible via code.

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

12. **Privacy guards** — membership-gated reads; 404-masking of group existence; field allowlists on cross-member profiles; ex-member history clamped to their interval.
13. **Hidden admin control plane** — allowlist + optional header key; denials audit-logged and 404-masked.
14. **Suspension** — banned users fail login, refresh and every authenticated request.

---

## 10. Testing

`npm test` → `node --test tests/*.test.js` — **26/26 passing**:

- `goldenCalculation.test.js` — §8 golden end-to-end calculation
- `moneyPrecision.test.js` — integer-poisha parsing/formatting/rounding (×2)
- `journalBalance.test.js` — debit == credit invariant
- `acceptanceGates.test.js` — randomized allocation invariants (conservation/determinism/permutation over 200 trials), leap-day & Dhaka-midnight (UTC+6) boundaries, member-days + absence marking, guest pools, idempotency hash-mismatch misuse, cross-group authorization isolation
- `scenarioGates.test.js` — all-10-kind ledger event balance matrix, finalize/edit race semantics (loser gets 409), partial-payable extinguishing, departing-debtor preservation, archived category snapshots, supersession chain integrity, delivery-failure decision matrix

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
```
