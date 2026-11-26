# MealMate

**MealMate** is a full-stack web application that replaces the Excel sheets used by shared households ("mess" / hostel groups) to track daily meals and shared costs.

Every resident logs meals per slot; every expense and money movement flows through an approval workflow into an **immutable double-entry ledger** using integer poisha (1 BDT = 100 poisha, never floats). At month end the system computes the meal rate, allocates each cost with one of eight split modes, and produces a **versioned, immutable statement** — corrections create version N+1 that supersedes, never overwrite. Members are told what they owe through email/WhatsApp delivery, and everything money-related is auditable after the fact.

- **Backend:** Node.js + Express 5 REST API with MongoDB, in `Server/`
- **Frontend:** Next.js App Router client acting as a BFF (HttpOnly cookie auth), in `Client/`
- **Status:** backend and client are implemented; the release gates that remain are deployment-side (see [Delivery status](#11-delivery-status)).

---

## Contents

1. [Why it exists / core concepts](#1-why-it-exists--core-concepts)
2. [Features & modules](#2-features--modules)
3. [Technology stack](#3-technology-stack)
4. [Architecture overview](#4-architecture-overview)
5. [Project structure](#5-project-structure)
6. [Getting started](#6-getting-started)
7. [Environment variables](#7-environment-variables)
8. [Database setup, indexes & migrations](#8-database-setup-indexes--migrations)
9. [Authentication & authorization](#9-authentication--authorization)
10. [Testing](#10-testing)
11. [Delivery status](#11-delivery-status)
12. [Deployment & operations](#12-deployment--operations)
13. [Security overview](#13-security-overview)
14. [Documentation](#14-documentation)
15. [Roadmap](#15-roadmap)

---

## 1. Why it exists / core concepts

A *mess* is a group of people who share a kitchen: hostels, bachelor flats, family floors. They track two things — **how many meals each person ate** and **who paid for what** — and at month end they need to know the meal rate and who owes whom. Spreadsheets make that manual, trust-dependent and easy to lose.

MealMate models the domain properly:

| Concept | Meaning |
|---|---|
| **Group** | An independent mess with its own members, categories, policies and history. Multiple groups per user are supported. |
| **Membership** | An effective-dated interval `[startDate, endDate)` with a role — the identity used for balances, beneficiaries, statements and duties. Departure preserves debt/credit. |
| **Meal slot** | `breakfast / lunch / snacks / dinner`, each with an explicit state `unknown → consumed (¼/½/¾/1 portion) / confirmed_zero`. A missing slot is never silently counted as zero, and `unknown` blocks month close. |
| **Expense** | Multi-line, multi-payer document: `draft → submitted → approved | rejected → reversed`. |
| **Journal** | A balanced double-entry posting (debits = credits). The only monetary source of truth. |
| **Period / Statement** | A month's state machine `open → review → finalized`, closed by an immutable, versioned statement. |

**Money rules that shape the whole app**

* All amounts are **integer poisha**. Input `12550` = ৳125.50.
* Allocations use a deterministic **largest-remainder** split, so charges always sum exactly to the line total.
* Balances are **derived** from journals, never stored as flags or floats.
* Nothing financial is ever edited or deleted: journals reverse, statements supersede.

---

## 2. Features & modules

| Area | What it does |
|---|---|
| **Auth & identity** | Email/password with JWT access + rotating refresh cookies, Google OAuth, TOTP 2FA (mandatory for platform admins), password reset/verification. |
| **Groups & joining** | Create groups, expiry/max-use invite codes hashed at rest, moderated join requests, join codes, role management. |
| **Meals** | Daily slot entry, guest meals (`individual` / `universal` pools), bulk entry, absence ranges, tomorrow's headcount for the cook. |
| **Expenses** | Multi-line drafts with per-line split modes, 8 allocation modes, approval with self-approval disclosure, rejection, reversal, duplicate warnings, receipts. |
| **Money & funds** | Contributions, payouts, supplier payments, member settlements, transfers, fees; confirm→post workflow; cash/wallet/bank fund accounts with custodians; derived balances. |
| **Month close** | Period state machine, versioned statement preview, close checklist, accounting-equation check, immutable finalize, corrections as new versions, email/WhatsApp bill delivery. |
| **Recurring bills & policies** | Recurring rules generating expense drafts; immutable, effective-dated policy versions (meal weights, portion rules, cutoff hour). |
| **Reconciliation & disputes** | Cash-count vs ledger expectation with variance resolution; member disputes on expenses, money transactions or statement items. |
| **Household ops** | Duty rosters (bazar/cleaning/cooking), swaps, weekly menu, notes/announcements/hand-over tasks, today board, bazar suggestions, duty-fairness board, emergency broadcast. |
| **Bazar tools** | Shared shopping list → expense draft; kitchen stock inventory with refills; quick polls. |
| **Notifications** | In-app inbox with preferences and Socket.IO push, transactional email, WhatsApp templates with opt-in consent and delivery webhooks, manual `wa.me` fallback. |
| **Support desk** | User tickets with strict turn-taking and SLA timers, hidden admin desk (queue, canned replies, internal notes, redaction), public appeal for suspended accounts. |
| **Operations** | Append-only audit trail, idempotent financial mutations, Mongo-backed job locks and run logs, retention jobs. |

The frontend exposes these as: auth pages, a per-group workspace (`overview, meals, expenses, money, statements, charts, members, board, policy, more`), inbox, profile, support, and a hidden platform admin area.

---

## 3. Technology stack

**Backend (`Server/package.json`)**

| Layer | Choice |
|---|---|
| Runtime | Node.js (ES modules), Express 5 |
| Database | MongoDB with Mongoose 8; multi-document transactions via `withTransaction()` (replica set) with a standalone fallback |
| Validation | Zod 4 (body/params/query) + Mongo-operator stripping |
| Auth | `jsonwebtoken` (1 h access, 7 d refresh), `bcrypt`, Passport Google OAuth 2.0, built-in-crypto TOTP |
| Realtime | Socket.IO 4 (cookie handshake) |
| Hardening | Helmet, `hpp`, `express-rate-limit`, strict CORS, CSRF double-submit |
| Files | Multer (memory) + magic-byte checks + Cloudinary (authenticated receipts, profile pictures) |
| Exports | ExcelJS (.xlsx), PDFKit (.pdf) |
| Messaging | Nodemailer (SMTP), WhatsApp Cloud API (Meta v21.0) |
| Sessions | `express-session` with a MongoDB store (OAuth handshake only) |
| Dev/test | `mongodb-memory-server`, `supertest`, `node --test`, nodemon |

**Frontend (`Client/`)**

Next.js (App Router), React Server Components, Tailwind CSS, Zustand for small client stores, Axios/fetch through a same-origin `/api/bff` proxy, Socket.IO client, Chart.js, React Icons.

---

## 4. Architecture overview

```
Browser ──► Next.js (Client/) ──► /api/bff/* (allowlist proxy) ──► Express API (Server/) ──► MongoDB
   │              │  edge cookie gate, server layouts                    │
   │              └─ relays Set-Cookie, adds X-Client: web               ├─► Cloudinary (receipts, avatars)
   └──────── Socket.IO (withCredentials, mm_at cookie) ───────────────────┤
                                                                          ├─► SMTP (email outbox)
                                                                          ├─► WhatsApp Cloud API
                                                                          └─► background jobs: outbox worker + scheduler
```

**Key architectural decisions**

* **Cookie-only browser auth.** `mm_at` (access) and `refreshToken` are HttpOnly; only `mm_csrf` and theme are readable. The browser never learns the backend URL; the BFF proxies and relays `Set-Cookie`. Non-browser clients can use bearer tokens.
* **Ledger-first accounting.** Expenses are approved → allocated → journaled in one transaction; money is confirmed → journaled. Everything else (balances, statements, dashboard) is derived.
* **State machines with revisions.** Expense, money transaction and period states are explicit; period `revision` makes concurrent finalization lose with `409`.
* **Effective-dated memberships** instead of an embedded member list, so history, ex-member visibility and duty assignment stay correct over time.
* **Outbox pattern** for notifications: queued rows are delivered by a leased worker with retries, and every state is visible through the API.
* **Hidden admin plane** (`/api/admin*`): email allowlist + 2FA, answering `404` to everyone else.

How the money math works in detail: [documentation → `Server/docs/plan.md`](Server/docs/plan.md).

---

## 5. Project structure

```text
MealMate/
├── README.md                          # this file — overview & onboarding
│
├── Server/                            # Express API + all detailed documentation
│   ├── index.js                       # app, security stack, routes, Socket.IO, workers
│   ├── docs/
│   │   ├── API_DOCUMENTATION.md       # ⭐ every endpoint, verified against source
│   │   ├── plan.md                    # roadmap, data model, implementation status
│   │   ├── PROJECT_IMPROVEMENT_RECOMMENDATIONS.md
│   │   └── RUNBOOK_BACKUP.md
│   ├── config/                        # db, cloudinary, mongo session store, passport
│   ├── controllers/               # 31 controllers (one per domain)
│   ├── middleware/                # auth, roles, csrf, idempotency, privacy, uploads, deprecation
│   ├── models/                        # 38 Mongoose models
│   ├── routes/                        # 29 routers
│   ├── services/                  # ledger, allocation, statement, scheduler, outbox, support rules…
│   ├── utils/                     # money, tokens, totp, pagination, dhaka time, whatsapp…
│   ├── validation/                # Zod schemas + validate middleware
│   ├── scripts/                   # indexes, migrations, smoke scripts, route↔doc audit
│   └── tests/                     # unit tests + tests/integration (supertest)
│
└── Client/                        # Next.js App Router client (BFF)
    ├── middleware.js              # edge cookie gate + security headers
    └── src/                       # app routes, /api/bff proxy, lib/api (serverApi, browserApi)
```

---

## 6. Getting started

### Prerequisites

* Node.js 20+ and npm
* MongoDB — a local `mongod` for development; a **replica set** is required for real transaction atomicity
* Optional: Google OAuth credentials, Cloudinary, SMTP, WhatsApp Cloud API, ClamAV (each degrades gracefully when unset)

### 1. Install

```bash
cd Server
npm install

cd ../Client
npm install
```

### 2. Configure

```bash
cd Server
cp .env.example .env      # then fill in values (see §7)
```

### 3. Run the API

```bash
cd Server
npm run dev               # nodemon index.js → http://localhost:5000
```

The root route `GET /` answers with the plain text `Meal Mate Server is running`. On boot the server connects to MongoDB, starts the outbox worker and the scheduler (unless `ENABLE_SCHEDULER=false`).

### 4. Run the client

```bash
cd Client
npm run dev
```

Set the client's backend URL env var (see §7.2) to `http://localhost:5000` and open the dev URL Next.js prints.

### 5. First run

1. Register an account, then create a group — the creator becomes the group's **owner** and gets a default policy version plus preset expense categories.
2. Invite residents with an invite code from the group settings (Group admin → invite code) and let them join.
3. Add memberships for residents without accounts (placeholders), log meals, book and approve expenses, confirm contributions.
4. At month end: begin review → checklist → finalize (owner) → review delivery states in the outbox.

---

## 7. Environment variables

> Names and behaviour only — **never commit real values**. Anything marked *optional* degrades to a documented no-op state when unset.

### 7.1 Server (`Server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | no (default `5000`) | HTTP port |
| `NODE_ENV` | recommended | `production` enables Secure cookies, SameSite=Strict and HSTS |
| `MONGO_URI` | **yes** | MongoDB connection string; a replica set is needed for transactions |
| `MONGO_REPLICA_SET` | optional | replica-set name when the deployment requires it |
| `JWT_SECRET` | **yes** | Signs access tokens (1 h) |
| `JWT_REFRESH_SECRET` | **yes** | Signs refresh tokens (7 d) — must differ from `JWT_SECRET` |
| `SESSION_SECRET` | **yes** | `express-session` secret for the Google OAuth handshake |
| `FRONTEND_URL` | **yes** | Comma-separated CORS/redirect allowlist (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google OAuth login |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | for uploads | Receipt and profile-picture storage |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | optional | Email delivery; unset ⇒ outbox rows become `not_configured` |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` / `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_APP_SECRET` / `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | optional | WhatsApp Cloud API sending + HMAC-verified webhook |
| `ADMIN_EMAILS` | for admin plane | Comma-separated platform-admin allowlist (`/api/admin*`, support desk) |
| `ADMIN_PANEL_KEY` | optional | When set, `/api/admin*` also requires the `X-Admin-Key` header |
| `TOTP_ENCRYPTION_KEY` | for 2FA | High-entropy secret used to derive the AES-256 key that encrypts TOTP secrets |
| `INVITE_PEPPER` | for invitations | Pepper for invite-code hashes |
| `CAPTCHA_PROVIDER` | optional | Appeal CAPTCHA hook (currently a stub) |
| `SUPPORT_STRICT_TURNS` | optional (default on) | Locks user comments after every user message until an admin replies |
| `ENABLE_SCHEDULER` | optional | Set `false` on instances that must not run cron jobs |

### 7.2 Client (`Client/`)

| Variable | Description |
|---|---|
| `BACKEND_URL` | Server base URL used by server-side fetches and the BFF proxy (e.g. `http://localhost:5000`) |
| `NEXT_PUBLIC_APP_URL` | Public origin of the client app |
| `SOCKET_ORIGIN` | Socket.IO origin allowed in the client CSP `connect-src` (comma-separated for several) |
| `ADMIN_PANEL_KEY` | Optional client-side copy of the backend admin key for the hidden `/admin` plane; leave empty unless the backend sets one |

The browser never receives a backend URL or a token — all calls go through `/api/bff` on the client origin. See `Client/.env.example` for the canonical list.

---

## 8. Database setup, indexes & migrations

* **Database:** MongoDB, database name taken from `MONGO_URI`. No SQL migrations exist — Mongoose models define the schema.
* **Transactions:** `withTransaction()` uses real `session.withTransaction()` on a replica set and a non-transactional fallback on standalone `mongod`. **Production must run a replica set** for atomic approval/finalize behaviour.
* **Indexes:** create/verify them with

  ```bash
  cd Server
  node scripts/checkIndexes.js
  ```

  Key invariants include the exactly-once journal index `(groupId, sourceType, sourceId, sourceRevision, postingKind)` unique, unique `(groupId, userId, date)` on meals, unique `(groupId, month, version)` on statements, unique `(groupId, actorId, operation, key)` on idempotency records, and TTL indexes for sessions, idempotency records, inbox notifications, security events and job runs.
* **Seed data:** no separate seed step — creating a group seeds its default policy version and the Bangladesh preset expense categories (`POST /api/messgroups/categories/:groupId/seed` re-seeds categories).
* **One-off migrations** (idempotent, run manually against an existing database):

  ```bash
  node scripts/migrateLegacyData.js    # legacy → V2: policies, memberships, recurring rules, expense normalisation, 4-slot meals
  node scripts/migrateInviteCodes.js   # hashes legacy MessGroup join codes into InviteCode rows
  ```

* **Data volumes/time zone:** all business-day and month bucketing uses **Asia/Dhaka**. Money stored everywhere as integer poisha; legacy collections (`PaymentNote`, legacy summaries) still use floats.

---

## 9. Authentication & authorization

**Authentication** — three ways to present the access token, checked in order: `mm_at` HttpOnly cookie, `x-auth-token` header, `Authorization: Bearer`. Browser clients log in with `X-Client: web` to receive `mm_at`, `refreshToken` and `mm_csrf` cookies; the response body then contains only the user. Refresh rotates the refresh token (the old one is invalidated by hash comparison); logout clears cookies and the stored refresh hash. Every authenticated request re-checks the account for suspension.

**2FA** — TOTP setup → verify (returns one-time recovery codes) → disable needs password + code. When 2FA is enabled, password login returns a `twoFactorRequired` challenge that must be completed at `/api/users/login/2fa`. Platform admins must use 2FA.

**CSRF** — cookie-authenticated mutations must send `x-csrf-token` equal to the readable `mm_csrf` cookie; the Origin must be in `FRONTEND_URL`. Bearer-only clients are exempt.

**Authorization** — two layers:

* **Group roles (V2, `Membership`-based):** `member < auditor < treasurer < manager < owner`. A higher rank satisfies a lower requirement. **Auditors are read-only everywhere.** Legacy `MessGroup.admin` is treated as `owner`.
* **Platform admin** — `ADMIN_EMAILS` allowlist + mandatory 2FA (`amr: otp`) + optional `X-Admin-Key`; non-admins receive a generic `404`.

Privacy: group data is invisible to non-members (404-masked), user profiles are only visible to co-members (username/profile picture only — never email/phone), and ex-members can read history only inside their membership interval.

The complete matrix, cookie flags, socket authorization and error codes are in [**API documentation**](Server/docs/API_DOCUMENTATION.md) §2–§6.

---

## 10. Testing

Run from `Server/`:

```bash
npm test                   # unit suite (node --test tests/*.test.js)
npm run test:integration   # integration suite (mongodb-memory-server + supertest)
```

* **Unit tests** cover pure logic: money precision and allocation invariants, journal balance, golden month calculation, roster generation, support rules, TOTP, invite codes, note visibility, retention, inbox rules, job locks, privacy payloads.
* **Integration tests** boot an in-memory MongoDB: `financial.test.js` uses a **replica set** to exercise transactions (rollback, concurrent posting, preview); the others use a standalone server (inbox/jobs, cookie+CSRF login, routines, support).
* The first integration run needs the `mongod` binary (or a populated `mongodb-memory-server` cache).
* No provider credentials are needed: SMTP/WhatsApp/ClamAV/CAPTCHA paths run their no-op branches.

**Last recorded run (P11/S3 phase gate):** 176 unit tests pass, 53 integration tests pass, 0 failures. Re-run both suites after any change — the numbers in this line are a snapshot, not a guarantee.

**Route ↔ documentation check**

```bash
node scripts/auditRoutes.mjs
```

compares the documented endpoints in `Server/docs/API_DOCUMENTATION.md` with the actual router table and prints anything missing on either side (expected output: `ACTUAL: 221 DOCUMENTED: 221`). `node scripts/auditRoutes.mjs --write-table` regenerates the generated route table block in the API doc (prose untouched); `--write-table --check` fails when it is stale. `node scripts/importSmoke.mjs` loads every route/controller/service/model to prove nothing is unreachable. CI (`.github/workflows/ci.yml`) runs all of these plus both suites.

**Not covered automatically:** live OAuth/2FA through a deployed BFF, real SMTP/WhatsApp delivery, ClamAV, CAPTCHA, replica-set recovery drills and load tests. See [Roadmap](#15-roadmap).

---

## 11. Delivery status

Legend: **IMPLEMENTED** (verified in source and exercised by tests/build) · **PARTIALLY IMPLEMENTED** (main path works, a documented sub-behaviour does not) · **NEEDS VERIFICATION** (depends on infrastructure not available in this environment).

| Area | Status | Notes |
|---|---|---|
| Backend API (all modules) | IMPLEMENTED | 221 routes across 29 routers, documented 1:1 in `Server/docs/API_DOCUMENTATION.md`. |
| Financial core (ledger, allocation, statements) | IMPLEMENTED | Atomic on a replica set; standalone dev falls back to non-transactional. |
| Inbox & background jobs | IMPLEMENTED | Inbox, preferences, job locks/run logs. Delivery depends on provider config. |
| Support desk | PARTIALLY IMPLEMENTED | User + admin APIs, SLA jobs, turn-taking. Real Turnstile CAPTCHA wired (needs `TURNSTILE_SECRET`; `CAPTCHA_DEV_BYPASS` for dev/test). |
| Operations & observability | IMPLEMENTED | `GET /api/health` readiness probe, admin `GET /api/admin/health` exception view, outbox lease recovery, nightly accounting-equation check, `X-Request-Id` correlation on responses and audit rows. |
| Household ops (routines/shopping/kitchen/polls) | PARTIALLY IMPLEMENTED | Rule level tested; roster horizon auto-extension is a placeholder (explicit endpoint works). |
| Security hardening | IMPLEMENTED | Session families are authoritative for refresh tokens; revoke-one/revoke-all/password-change/suspend revoke families; legacy `User.refreshToken` accepted until `LEGACY_REFRESH_SUNSET`. |
| Browser authentication (BFF) | IMPLEMENTED locally / NEEDS VERIFICATION deployed | Cookie login, CSRF, logout, BFF relay tested locally; Google OAuth + 2FA through a deployed BFF untested. |
| Frontend | PARTIALLY IMPLEMENTED | Next.js App Router client builds all routes; see roadmap for open items. |

Known issues, inconsistencies and product questions are tracked in [`PROJECT_IMPROVEMENT_RECOMMENDATIONS.md`](Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md) — the backend was **not** changed to match documentation.

---

## 12. Deployment & operations

### Running in production

1. **MongoDB replica set** (Atlas or self-managed) so `withTransaction()` is truly atomic. Verify with `node scripts/checkIndexes.js`.
2. **Environment:** `NODE_ENV=production`, strong distinct `JWT_SECRET` / `JWT_REFRESH_SECRET` / `SESSION_SECRET`, real `FRONTEND_URL`, `ADMIN_EMAILS`, `TOTP_ENCRYPTION_KEY`, `INVITE_PEPPER`, plus Cloudinary and (optionally) SMTP/WhatsApp. Rotate all secrets before the first deploy.
3. **HTTPS everywhere.** Secure cookies and HSTS require it; OAuth callbacks must be registered at the externally reachable backend origin (`/api/users/auth/google/callback`).
4. **Processes:** one API process runs both the outbox worker and the scheduler at boot. Jobs are protected by Mongo `JobLock`, so extra instances won't double-run them — but set `ENABLE_SCHEDULER=false` on instances that should not schedule. Rate limiters and TOTP challenges are per-process (Redis is the recommended upgrade for multi-instance).
5. **Proxy:** the app trusts one proxy hop (`trust proxy 1`) for client IPs behind Render/Heroku/Vercel-style platforms.
6. **Client:** deploy Next.js with `BACKEND_URL` pointing at the API and a same-origin `/api/bff` proxy; all auth cookies stay HttpOnly on the client origin.

### Operational checks

* `GET /api/health` — unauthenticated readiness probe: DB ping + scheduler heartbeat (`200`/`503`, no tenant data).
* `GET /` returns `Meal Mate Server is running` (plain HTTP liveness).
* `GET /api/admin/health`, `GET /api/admin/overview` and `GET /api/admin/jobs` (platform admin, 2FA) show what is stuck: job age/failures, outbox depth and oldest pending, reconciliation variance, receipt `scanStatus` counts, job-lock holders.
* Outbox health: `GET /api/notifications/groups/:groupId/notifications?state=failed` (`processing` is an internal lease state and is not exposed).
* Request correlation: every response carries `X-Request-Id`; audit rows store the same id.
* Accounting integrity: `GET /api/reconciliation/groups/:groupId/reconciliations/equation` → `balanced: true`.
* Backups/restores: the backup/restore runbook (`Server/docs/RUNBOOK_BACKUP.md`) is referenced by the operations plan — confirm it is present in your checkout before relying on it; the restore drill is still open.
* Smoke scripts live in `Server/scripts/smoke/`.

Newly opened metrics/readiness work is listed in the recommendations document.

---

## 13. Security overview

* Zod validation on every body/params/query, with Mongo-operator stripping and `hpp` parameter-pollution defence; 10 KB body limit.
* Strict CORS allowlist with an explicit header allowlist, Helmet (CSP, Referrer-Policy, Permissions-Policy, HSTS), `Cache-Control: no-store` on authenticated JSON, generic error responses.
* CSRF double-submit for cookie mutations; HttpOnly access/refresh cookies; query-string Socket.IO tokens rejected.
* Rate limits: 50/15 min on auth routes, 300/15 min on general API routes, 20/15 min on public support actions, 1/day appeals, per-user join-code lockout.
* Idempotency keys on financial mutations (409 on body mismatch, cached replay).
* Uploads: MIME allowlist + magic-byte verification + sha256 + 10 MiB cap + authenticated Cloudinary storage + per-record download authorization.
* Append-only audit trail; privacy guards (404 masking, field allowlists, ex-member clamping); hidden, 2FA-gated admin plane; platform suspension enforced per request.

Full details, including current gaps: [API documentation](Server/docs/API_DOCUMENTATION.md) §3, §9 and the recommendations document.

---

## 14. Documentation

| Document | Purpose |
|---|---|
| **[Server/docs/API_DOCUMENTATION.md](Server/docs/API_DOCUMENTATION.md)** | **API integration reference** — every endpoint with method, path, auth, roles, validation, request/response shapes, errors, side effects, Socket.IO events, workflow walkthroughs and known inconsistencies. |
| [Server/docs/plan.md](Server/docs/plan.md) | Development roadmap, architectural decisions, data model and implementation status per module. |
| [Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md](Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md) | Future improvements, prioritised technical recommendations and open product decisions. |
| `Server/docs/RUNBOOK_BACKUP.md` (plain path, not linked — the file may be absent) | Backup/restore runbook referenced by the operations section. |
| [Client/docs/FRONTEND_BUILD_PROMPT.md](Client/docs/FRONTEND_BUILD_PROMPT.md) | Frontend build brief and per-module definition of done. |

**API at a glance** — the server mounts `/api/health`, `/api/users`, `/api/sessions`, `/api/admin` (hidden), `/api/admin/support` (hidden), `/api/messgroups`, `/api/invite`, `/api/memberships`, `/api/meals`, `/api/expenses`, `/api/money`, `/api/policies`, `/api/periods`, `/api/statements`, `/api/recurring`, `/api/reconciliation`, `/api/disputes`, `/api/assets`, `/api/attachments`, `/api/notifications`, `/api/stats`, `/api/inbox`, `/api/support`, `/api/routines`, `/api/shopping-list`, `/api/kitchen-inventory`, `/api/polls`, and the deprecated `/api/summary`. Paths, payloads and rules are intentionally **not** duplicated here — see **[API documentation](Server/docs/API_DOCUMENTATION.md)**.

---

## 15. Roadmap

Short version; the detailed, prioritised list lives in [PROJECT_IMPROVEMENT_RECOMMENDATIONS.md](Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md).

**Before/at deployment**

- [x] Unify refresh-token storage (`User.refreshToken` vs `Session` families) so device revocation is truthful
- [x] Bind statement finalize to a frozen input set; enqueue outbox rows inside the same transaction
- [x] Require `payers[]` on expenses; validate every cross-group reference
- [ ] Run the replica-set race drill, restore drill and a 50-member load test
- [ ] Configure real SMTP/WhatsApp, rotate secrets, deploy behind HTTPS with `NODE_ENV=production`

**Short term**

- [x] CI: syntax check + module-import smoke + `scripts/auditRoutes.mjs` + both test suites
- [x] Readiness endpoint, outbox lease recovery, quarantine for pending-scan receipts, scheduled accounting-equation check
- [x] Consolidate Zod schemas and extract an export service

**Product ideas** — bazar budget forecast, monthly budgets, payment reminders, Bengali localisation, "explain my bill", PWA offline meal entry, Excel import.
