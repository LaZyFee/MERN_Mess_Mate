# MealMate - API Reference

**Audience:** frontend developers and anyone integrating with the MealMate backend.
**Scope:** every route currently mounted by `Server/index.js`, verified against the router files, controllers, middleware and Zod schemas.

> This document is the single implementation reference for the HTTP API. The [project README](../../README.md) covers what MealMate is and how to run it; [`plan.md`](plan.md) covers design, the data model and the router map; [`PROJECT_IMPROVEMENT_RECOMMENDATIONS.md`](PROJECT_IMPROVEMENT_RECOMMENDATIONS.md) covers future work.

---

## Table of contents

- [0. How to read this document](#0-how-to-read-this-document)
- [1. Conventions: URL shape, money, dates, errors](#1-conventions-url-shape-money-dates-errors)
  - [1.1 Request format](#11-request-format)
  - [1.2 Money](#12-money)
  - [1.3 Dates, months & time zone](#13-dates-months-time-zone)
  - [1.4 Standard success & error shapes](#14-standard-success-error-shapes)
- [2. Authentication & session lifecycle](#2-authentication-session-lifecycle)
  - [2.1 Transport](#21-transport)
  - [2.2 Tokens & cookies](#22-tokens-cookies)
  - [2.3 Login flow](#23-login-flow)
  - [2.4 Refresh & rotation](#24-refresh-rotation)
  - [2.5 Logout](#25-logout)
  - [2.6 Device sessions (`/api/sessions`)](#26-device-sessions-apisessions)
  - [2.7 Google OAuth](#27-google-oauth)
  - [2.8 Two-factor (TOTP)](#28-two-factor-totp)
- [3. CSRF, cookies & CORS](#3-csrf-cookies-cors)
- [4. Roles & permission matrix](#4-roles-permission-matrix)
- [5. Idempotency, rate limits, uploads](#5-idempotency-rate-limits-uploads)
  - [5.1 Idempotency](#51-idempotency)
  - [5.2 Rate limits](#52-rate-limits)
  - [5.3 File uploads](#53-file-uploads)
- [6. Real-time (Socket.IO)](#6-real-time-socketio)
- [7. Endpoint index (code-addressable)](#7-endpoint-index-code-addressable)
  - [7.1 Authentication, users & 2FA](#71-authentication-users-2fa)
  - [7.2 Device sessions](#72-device-sessions)
  - [7.3 Support desk (platform admin)](#73-support-desk-platform-admin)
  - [7.4 Platform administration (hidden)](#74-platform-administration-hidden)
  - [7.5 Mess groups, join codes, categories & extras](#75-mess-groups-join-codes-categories-extras)
  - [7.6 Expiring invitations](#76-expiring-invitations)
  - [7.7 Memberships](#77-memberships)
  - [7.8 Meals & guest meals](#78-meals-guest-meals)
  - [7.9 Expenses (legacy CRUD + V2 workflow)](#79-expenses-legacy-crud-v2-workflow)
  - [7.10 Money, balances & fund accounts](#710-money-balances-fund-accounts)
  - [7.11 Group policies](#711-group-policies)
  - [7.12 Periods & review](#712-periods-review)
  - [7.13 Statements & finalization](#713-statements-finalization)
  - [7.14 Recurring expenses](#714-recurring-expenses)
  - [7.15 Reconciliation](#715-reconciliation)
  - [7.16 Disputes](#716-disputes)
  - [7.17 Refundable assets / deposits](#717-refundable-assets-deposits)
  - [7.18 Attachments (receipts)](#718-attachments-receipts)
  - [7.19 Notifications & outbox](#719-notifications-outbox)
  - [7.20 Statistics & dashboard](#720-statistics-dashboard)
  - [7.21 Inbox & preferences](#721-inbox-preferences)
  - [7.22 Support desk (user side)](#722-support-desk-user-side)
  - [7.23 Routines, duties & notice board](#723-routines-duties-notice-board)
  - [7.24 Shopping list](#724-shopping-list)
  - [7.25 Kitchen inventory](#725-kitchen-inventory)
  - [7.26 Polls](#726-polls)
  - [7.26b Budgets](#726b-budgets-new-in-s52)
  - [7.27 Legacy summary (deprecated)](#727-legacy-summary-deprecated)
- [8. Endpoint list (one heading per route)](#8-endpoint-list-one-heading-per-route)
- [9. Detailed endpoint reference (by domain)](#9-detailed-endpoint-reference-by-domain)
  - [9.1 Authentication, users & 2FA](#91-authentication-users-2fa)
  - [9.2 Device sessions](#92-device-sessions)
  - [9.3 Platform administration (hidden)](#93-platform-administration-hidden)
  - [9.4 Mess groups, join codes, categories & extras](#94-mess-groups-join-codes-categories-extras)
  - [9.5 Expiring invitations](#95-expiring-invitations)
  - [9.6 Memberships](#96-memberships)
  - [9.7 Meals & guest meals](#97-meals-guest-meals)
  - [9.8 Expenses (legacy CRUD + V2 workflow)](#98-expenses-legacy-crud-v2-workflow)
  - [9.9 Money, balances & fund accounts](#99-money-balances-fund-accounts)
  - [9.10 Policies, periods & statements](#910-policies-periods-statements)
  - [9.11 Recurring expenses](#911-recurring-expenses)
  - [9.12 Reconciliation](#912-reconciliation)
  - [9.13 Disputes](#913-disputes)
  - [9.14 Refundable assets / deposits](#914-refundable-assets-deposits)
  - [9.15 Attachments (receipts)](#915-attachments-receipts)
  - [9.16 Notifications, outbox & WhatsApp](#916-notifications-outbox-whatsapp)
  - [9.17 Statistics & dashboard](#917-statistics-dashboard)
  - [9.18 Inbox & notification preferences](#918-inbox-notification-preferences)
  - [9.19 Support desk (user side)](#919-support-desk-user-side)
  - [9.20 Support desk (platform admin)](#920-support-desk-platform-admin)
  - [9.21 Routines: rosters, duties, swaps, menu, notes, board](#921-routines-rosters-duties-swaps-menu-notes-board)
  - [9.22 Shopping list](#922-shopping-list)
  - [9.23 Kitchen inventory](#923-kitchen-inventory)
  - [9.24 Polls](#924-polls)
  - [9.25 Legacy & deprecated endpoints](#925-legacy-deprecated-endpoints)
- [10. Workflow walkthroughs](#10-workflow-walkthroughs)
  - [10.1 Onboarding a new member](#101-onboarding-a-new-member)
  - [10.2 Daily meal entry](#102-daily-meal-entry)
  - [10.3 Booking and approving an expense](#103-booking-and-approving-an-expense)
  - [10.4 Contributions and settlements](#104-contributions-and-settlements)
  - [10.5 Cash reconciliation](#105-cash-reconciliation)
  - [10.6 Monthly close & statement](#106-monthly-close-statement)
  - [10.7 Support ticket](#107-support-ticket)
  - [10.8 Duty roster & bazar hand-off](#108-duty-roster-bazar-hand-off)
- [11. Implementation notes, inconsistencies & open questions](#11-implementation-notes-inconsistencies-open-questions)
  - [11.1 Verified inconsistencies (plan around them)](#111-verified-inconsistencies-plan-around-them)
  - [11.2 `NEEDS VERIFICATION` items](#112-needs-verification-items)
  - [11.3 Deprecated / duplicate surface (summary)](#113-deprecated-duplicate-surface-summary)
  - [11.4 Frontend integration notes](#114-frontend-integration-notes)
- [12. Schema appendix](#12-schema-appendix)
  - [12.1 Shared primitives](#121-shared-primitives)
  - [12.2 Auth & users](#122-auth-users)
  - [12.3 Groups, join & extras](#123-groups-join-extras)
  - [12.4 Memberships, policies, periods](#124-memberships-policies-periods)
  - [12.5 Meals](#125-meals)
  - [12.6 Expenses & money](#126-expenses-money)
  - [12.7 Statements, recurring, reconciliation, disputes, notifications, sessions](#127-statements-recurring-reconciliation-disputes-notifications-sessions)
  - [12.8 Inbox, support, routines, shopping, kitchen, polls](#128-inbox-support-routines-shopping-kitchen-polls)

---

## 0. How to read this document

* **Verified** means the behaviour below was read directly from the route definition, controller, middleware or Zod schema named in the section.
* **`NEEDS VERIFICATION`** marks behaviour that exists in code but whose runtime result depends on infrastructure that cannot be exercised here (SMTP, WhatsApp Cloud API, ClamAV, CAPTCHA, Google OAuth, replica-set transactions).
* **Deprecated** routes are still mounted and behave as documented, but they are superseded and emit `Deprecation: true` headers. Do not build new features on them.
* Paths are shown **exactly as mounted** in `Server/index.js` (for example `/api/meals/:groupId`). Path segments such as `:groupId` are 24-character hex MongoDB ObjectIds unless the parameter description says otherwise.
* Request/response JSON below is copied from the controller that produces it (variable names expanded into the shape they build). Example values use `65a0000000000000000000xx` style ids and `৳` amounts in **poisha** unless a field is explicitly a "Taka" string.
* All group-scoped routes follow the same access pattern: authentication (`auth`) → group role guard → handler-level checks. A guard failure for a non-member returns **`404 { msg: 'Group not found' }`** (not 403) when the legacy `requireGroupRole` guard is used, and **`403 { msg: 'Not a member of this group' }`** when the membership-based guard `requireGroupRoleV2` is used. Treat both as "no access".

---

## 1. Conventions: URL shape, money, dates, errors

### 1.1 Request format

| Concern | Rule |
|---|---|
| Content type | `application/json` for everything except file uploads (`multipart/form-data`). |
| Body size | Limited to **10 KB** for JSON/urlencoded bodies (`express.json({ limit: '10kb' })`). Oversized bodies are rejected before validation. |
| Query parameters | Validated by Zod and re-exposed on `req.validated.query` (Express 5 makes `req.query` read-only). Unknown query params are ignored unless a schema is `.strip()`ed/`.passthrough()`. |
| Mongo operators | Any body/param key starting with `$` or containing `.` is stripped before validation (NoSQL-injection defense). |
| Parameter pollution | Duplicate query parameters are collapsed by `hpp()`. |
| Base URL | The API has **no version prefix at mount level** - it is `/api/<module>/...`. The integration reference example server listens on `http://localhost:5000`. |

### 1.2 Money

* Every monetary amount in requests and in V2 responses is an **integer number of poisha** (1 BDT = 100 poisha). `12550` means ৳125.50. Floats are rejected (`z.number().int()` = `poisha` schema).
* Many list/detail responses also include a convenience `৳Taka` string computed as `(poisha / 100).toFixed(2)` (for example `balanceTaka: "125.50"`). **Those are strings; never parse them back into numbers.**
* Legacy endpoints (`/api/summary`, `/api/messgroups/calculate`, `/api/messgroups/payment-notes`, `/api/messgroups/entries`) use **float Taka**, not poisha - see [9.25](#925-legacy--deprecated-endpoints).

### 1.3 Dates, months & time zone

| Format | Used for | Example |
|---|---|---|
| `YYYY-MM` | `month`, `costPeriod`, `effectiveFrom`, `effectiveTo` (regex `/^\d{4}-\d{2}$/`) | `"2026-11"` |
| `YYYY-MM-DD` | headcount `date`, menu `weekStart`, response `localDate` (regex `/^\d{4}-\d{2}-\d{2}$/`) | `"2026-11-24"` |
| ISO-8601 datetime | `expiresAt` (polls), note `validFrom`/`validUntil`, `paidAt`, `asOf` | `"2026-12-01T12:00:00Z"` |
| `z.coerce.date()` (any parseable date string) | meal `date`, absence `from`/`to`, expense `date` in legacy schemas | `"2026-11-24"` |

Business-day boundary is **Asia/Dhaka** (`utils/dhakaTime.js`): "today"/"tomorrow" and month bucketing use the Dhaka civil date (UTC+6), not the server's local time.

### 1.4 Standard success & error shapes

There is **no universal envelope**. The two recurring shapes are:

| Kind | Shape | Where |
|---|---|---|
| Bare resource | The document itself, e.g. `201 <group>`, `200 <mealRecord>` | legacy CRUD endpoints (`/api/meals/:groupId`, `/api/messgroups/*`) |
| Message + resource | `{ "msg": "...", "<resource>": {...} }` | most V2 endpoints |
| List | `{ "<plural>": [...] }` | most list endpoints |
| Cursor page | `{ "<plural>": [...], "nextCursor": "<base64 or id>|<null>", "hasMore": true|false }` | expenses, money, inbox, support tickets, admin users, admin tickets, group audit log, **memberships, guest meals, disputes, outbox, polls, assets** (see §1.4.1) |

#### 1.4.1 Cursor list contract (memberships · guest meals · disputes · outbox · polls · assets)

All six lists share the same query/response contract, implemented with `utils/pagination.js#paginateQuery`:

| Query | Meaning |
|---|---|
| `cursor` | Opaque base64 value from the previous `nextCursor`. Omit on the first page. |
| `limit` | Page size, clamped **1–100** (default 50). |
| `all=true` | Escape hatch for exports: returns every row, `hasMore: false`, `nextCursor: null`. |

* **Memberships** `GET /api/memberships/groups/:groupId/memberships` → `{ memberships, active, nextCursor, hasMore }` (`_id` ascending).
* **Guest meals** `GET /api/meals/:groupId/guests` → `{ guests, nextCursor, hasMore }` (`createdAt` descending). **Legacy shape:** without `cursor`/`limit` the response is still the bare array, so old clients are unaffected.
* **Disputes** `GET /api/disputes/groups/:groupId/disputes` → `{ disputes, nextCursor, hasMore }` (`createdAt` descending).
* **Outbox** `GET /api/notifications/groups/:groupId/notifications` → `{ messages, nextCursor, hasMore }`. Rows in the internal `processing` lease state are never returned unless you ask for that state explicitly (which the query validator rejects).
* **Polls** `GET /api/polls/groups/:groupId` → `{ polls, nextCursor, hasMore }`.
* **Assets** `GET /api/assets/groups/:groupId` → `{ assets, nextCursor, hasMore }`.

Legacy `GET /api/meals/:groupId` and `GET /api/expenses/:groupId` accept the same `cursor`/`limit` pair **opt-in**: supply `cursor` and they answer `{ meals|expenses, nextCursor, hasMore }`; omit it and the historic bare array is returned unchanged.

**Errors:**

| Status | Body | Produced by |
|---|---|---|
| 400 | `{ "msg": "Validation failed", "errors": [ { "field": "lines.0.amount", "message": "Amount must be integer poisha = 1" } ] }` | `validate()` middleware (Zod) |
| 400 | `{ "msg": "<specific message>" }` | controller business checks (e.g. `Invalid Credentials`) |
| 401 | `{ "msg": "No token, authorization denied" }` / `{ "msg": "Token is not valid" }` / `{ "msg": "Account unavailable" }` | `auth` middleware |
| 403 | `{ "msg": "Account suspended" }` | `auth` middleware / login / refresh |
| 403 | `{ "msg": "CSRF check failed: missing or mismatched token" }` / `{ "msg": "CSRF check failed: Origin not allowed" }` | `csrfProtection` |
| 403 | `{ "msg": "Auditor access is read-only" }` | `requireGroupRoleV2` |
| 403 | `{ "msg": "Forbidden: requires <role> role" }` | role guards |
| 403 | `{ "msg": "Not a member of this group" }` | `requireGroupRoleV2` (no effective role) |
| 404 | `{ "msg": "Route not found" }` | global 404 handler **and** the hidden admin guard |
| 404 | `{ "msg": "Group not found" }` | legacy guard / membership rows with a deleted group |
| 409 | `{ "msg": "<conflict message>" }` | state-machine conflicts, idempotency conflicts, duplicate keys |
| 422 | `{ "msg": "<business rule message>" }` | domain rules (allocations, self-approval, period finalized, slot not enabled, …) |
| 429 | `{ "msg": "Too many attempts, try again in 15 minutes" }` (auth) or express-rate-limit default text | rate limiters |
| 500 | `{ "msg": "Server error" }` | global error handler - **internal messages are never leaked** |

Some controllers attach a machine-readable `code` to an error (for example `{ "msg": "Ticket state changed, retry", "code": "TICKET_STATE_CHANGED" }`). Codes appear only where the controller sets them; do not assume every error has one.

Every JSON response to a request that carried a cookie or an authenticated user also gets `Cache-Control: no-store`.

---

## 2. Authentication & session lifecycle

### 2.1 Transport

The access token is accepted from three places, in this order (`middleware/auth.js`):

1. `mm_at` **HttpOnly cookie** (browser / BFF path).
2. `x-auth-token` header.
3. `Authorization: Bearer <token>` header.

Missing token → `401 { msg: 'No token, authorization denied' }`. Failed verify → `401 { msg: 'Token is not valid' }`. The token payload must contain `user.id` matching a 24-hex ObjectId. Every authenticated request performs a user lookup; a deleted user → `401 { msg: 'Account unavailable' }`, a suspended user → `403 { msg: 'Account suspended' }`.

### 2.2 Tokens & cookies

| Cookie / token | Where it is set | Flags | Lifetime |
|---|---|---|---|
| `mm_at` (access JWT) | Login/refresh/register when the request has header **`X-Client: web`** | `HttpOnly`, `Path=/`, `SameSite=Lax` (dev) / `Strict` (prod), `Secure` in prod | **1 hour** |
| `refreshToken` (refresh JWT) | Same as above | `HttpOnly`, `Path=/api` (web/BFF), `SameSite=Lax`/`Strict`, `Secure` in prod | **7 days** |
| `refreshToken` (non-web clients) | Any login/refresh without `X-Client: web` | `HttpOnly`, `Path=/api/users` | 7 days |
| `mm_csrf` | Login/register/refresh when `X-Client: web` | **readable by JS** (no HttpOnly), `Path=/`, `SameSite=Lax`/`Strict` | session cookie (no Max-Age) |

Additional facts verified in `utils/tokens.js` and `controllers/userController.js`:

* The refresh JWT carries `type: 'refresh'`, a unique `jti`, and a `fam` claim (family id). The server stores only its **sha256 hash** on the `Session.currentTokenHash` field of the matching `Session` family row; presenting a token whose hash does not match the stored hash is rejected (this is what makes rotation one-token-at-a-time).
* Access JWTs carry `user.id` and, when 2FA was used, `user.amr` containing `'otp'`.
* **Web clients get no tokens in the JSON body** - only `{ user: {...} }`. Non-web clients also receive `accessToken` and `refreshToken` in the body. The cookie value is `familyId:rawToken` where `familyId` identifies the session family and `rawToken` is the refresh JWT.
* `user` in a login/register/refresh response is exactly `{ id, username, email, phone, profilePic, isVerified }` (`safeUser`).
* `mm_at` cookies cannot be revoked before expiry: logout clears cookies and revokes the Session family, but an already-issued access token keeps working until its 1-hour expiry.

### 2.3 Login flow

1. `POST /api/users/login` with `{ email, password }` and header `X-Client: web`.
2. If the account has 2FA enabled, the response is `200 { twoFactorRequired: true, challengeToken, msg: '2FA verification required' }` **and no cookies/tokens are issued**. Continue with step 3.
3. `POST /api/users/login/2fa` with `{ challengeToken, code }` (or an 8-char recovery code). On success the normal auth response (cookies + `user`) is returned.
4. Otherwise the login response is the normal `200 { user }` (web) with cookies set.

`POST /api/users/login/2fa-challenge` is an additional entry point that performs the password step and returns the challenge; `POST /api/users/login` performs the same check inline. Both return the same `twoFactorRequired` shape.

Challenges live in an **in-process map** with a 5-minute TTL (see `controllers/totpController.js`), so a server restart or a second instance drops a pending 2FA login. `NEEDS VERIFICATION` for multi-instance deployments.

### 2.4 Refresh & rotation

* `POST /api/users/refresh` reads the refresh token from **`req.body.refreshToken` first, then the `refreshToken` cookie**. The cookie value is `familyId:rawToken`. No body and no cookie → `400 { msg: 'Refresh token required' }`.
* The refresh is a conditional-update CAS on `Session.currentTokenHash`: the presented `rawToken`'s hash must equal `currentTokenHash`. On success a new token is issued in the same family and the old hash is archived to `previousTokenHashes`. The cookie is updated to `familyId:newToken`. Invalid, expired, or replayed (stale) token → `401 { msg: 'Invalid or expired refresh token' }`. A stale replay revokes the whole family.
* Legacy format: a plain JWT refresh token stored in `User.refreshToken` (no `familyId:` prefix) is still accepted until the `LEGACY_REFRESH_SUNSET` env date, after which it is rejected with `401 { msg: 'Legacy refresh tokens no longer accepted' }`. On successful legacy refresh the token is migrated to a new Session family.
* Success → a **new** access + refresh pair (the old refresh hash is archived, so the old refresh token is dead) and the same response shape as login. **Replace all cookies from the `Set-Cookie` headers; preserve each `Set-Cookie` separately when proxying (BFF).**
* Cookie-authenticated clients must send `X-Client: web` and the CSRF header (see §3) - the refresh cookie alone triggers the CSRF check.

### 2.5 Logout

`POST /api/users/logout`. Reads the refresh token from body or cookie (format `familyId:rawToken`), verifies it, revokes the matching Session family, clears `User.refreshToken` (legacy), and clears `refreshToken` (both `Path=/api/users` and `Path=/api`), `mm_at`, and `mm_csrf`. Always answers `200 { msg: 'Logged out' }`.

### 2.6 Device sessions (`/api/sessions`)

* `GET /api/sessions/users/sessions` lists **active `Session` rows** for the caller (`listSessions`).
* `DELETE /api/sessions/users/sessions/:familyId` revokes one; `DELETE /api/sessions/users/sessions` revokes all except an optional `exceptFamilyId`.
* Login/refresh now issue a `Session` family (familyId + hashed token in `currentTokenHash`) and the refresh cookie carries `familyId:rawToken`. Revoking a device revokes the matching family, so the device list is authoritative (D1). Legacy `User.refreshToken` is kept only for back-compat through the `LEGACY_REFRESH_SUNSET` window.

### 2.7 Google OAuth

* `GET /api/users/auth/google` → Passport redirect to Google with scopes `profile`, `email`.
* `GET /api/users/auth/google/callback` → on failure redirects to `${FRONTEND_URL}/login`; on success it sets auth cookies and redirects to `${FRONTEND_URL}/login/success`. Suspended accounts → `403 { msg: 'Account suspended' }`.
* The OAuth handshake uses `express-session` with a MongoDB-backed store and a 10-minute cookie, so `SESSION_SECRET` must be set.
* For accounts with 2FA enabled, the Google callback currently sends the user back to `/login` for password step-up; a Google-only OTP continuation is not implemented. `NEEDS VERIFICATION` end-to-end (requires a deployed OAuth app).

### 2.8 Two-factor (TOTP)

`setup` → returns a secret + `otpauth://` URL (provision it in an authenticator app) → `verify` with the first 6-digit code → the response contains **recovery codes shown once** → `disable` requires password **and** the current 6-digit code or an 8-character recovery code. Platform admins must use 2FA: their access token must carry `amr: ['otp']` or the hidden admin plane answers `404` (`middleware/amrGate.js`).

---

## 3. CSRF, cookies & CORS

**CSRF rules (`middleware/csrf.js`), evaluated on every non-`GET/HEAD/OPTIONS` request:**

1. If the request carries **neither** `mm_at` **nor** `refreshToken` cookies, the check is skipped (e.g. a token-only API client).
2. Otherwise the `x-csrf-token` header must equal the `mm_csrf` cookie → else `403 { msg: 'CSRF check failed: missing or mismatched token' }`.
3. Then the `Origin` header (or the origin part of `Referer`) must be empty or in the `FRONTEND_URL` allowlist → else `403 { msg: 'CSRF check failed: Origin not allowed' }`.

Practical consequence for a browser client: after login/refresh read `mm_csrf` from `document.cookie` and send it as `x-csrf-token` on every POST/PUT/PATCH/DELETE. `bearer`-only clients skip this.

**CORS (`index.js`):**

* Origin allowlist = `FRONTEND_URL` split on commas (default `http://localhost:5174`); no wildcard; `credentials: true`.
* Methods: `GET, POST, PUT, DELETE, PATCH`.
* `Access-Control-Allow-Headers`: `Content-Type`, `Authorization`, `x-auth-token`, `x-csrf-token`, `x-client`, `Idempotency-Key`, `X-Admin-Key`. **A new custom header must be added server-side or the browser preflight fails.**
* `Access-Control-Expose-Headers`: `Deprecation`, `Sunset`, `Link`, `X-Request-Id`.

**Request correlation:** every response carries an `X-Request-Id` header. If the client sends a well-formed one (`[A-Za-z0-9_-]{8,64}`) it is echoed, otherwise the server generates a UUID. The same id is stamped on `AuditEvent.requestId` rows written during that request, so a response, a log line and an audit entry can be joined.

**Other response headers** applied globally: Helmet CSP (`default-src 'self'`, images from self/data/Cloudinary, `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone/geolocation disabled), HSTS in production, and `Cache-Control: no-store` on authenticated JSON.

**Client header conventions**

| Header | When |
|---|---|
| `X-Client: web` | Send on **login, register and refresh** from a browser. Switches to cookie transport and omits tokens from JSON. |
| `x-csrf-token` | Every cookie-authenticated mutation (see above). |
| `Idempotency-Key` | Optional on idempotent routes (§5.1). |
| `X-Request-Id` | Optional; correlation id echoed back and stored in audit rows. |
| `X-Admin-Key` | Only if the deployment sets `ADMIN_PANEL_KEY`; required on every `/api/admin*` call then. |

---

## 4. Roles & permission matrix

Two guards exist (`middleware/roles.js`):

* **`requireGroupRoleV2(minRole)`** - the V2 guard. Resolves the caller's effective role from the `Membership` interval active *now* (`startDate <= now < endDate|null`), falling back to the legacy `MessGroup.admin` treated as `owner`. Rank: `member(0) < auditor(1) < treasurer(2) < manager(3) < owner(4)`; a higher rank satisfies a lower minimum. **An `auditor` is read-only in every module** - any non-GET request is refused `403 { msg: 'Auditor access is read-only' }`. If a `Membership` exists but the group document is gone → `404 { msg: 'Group not found' }`.
* **`requireGroupRole('admin'|'member')`** - the legacy guard. Reads the embedded `MessGroup.admin` / `MessGroup.members[]` arrays. Legacy admin satisfies both levels. Used by the legacy endpoints only (§9.25).

| Capability | member | auditor | treasurer | manager | owner |
|---|:--:|:--:|:--:|:--:|:--:|
| Read group data (meals, expenses, money, statements, periods, policies, reconciliation list, disputes, outbox own, routines, shopping, kitchen, polls, assets, attachments own/privileged) | → | → | → | → | → |
| Log meals, guest meals, submit expenses, submit money transactions, open/respond to disputes, upload attachments, routines notes/tasks/swaps, shopping list, kitchen inventory, polls | → | → (403) | → | → | → |
| Approve/reject/reverse expenses, confirm/reject/reverse money, close checklist, create funds, create/update recurring rules, create reconciliations, resolve reconciliations, create/update assets + refunds | → | → | → | → | → |
| Manage memberships (create/update/depart), begin review / return to open / record correction, resend outbox, manual share links, rosters/duties reassign/menu, delete category | → | → | → | → | → |
| Finalize statement, publish policy, change fund custodian | → | → | → | → | → |
| Platform admin plane (`/api/admin*`) | separate guard (email allowlist + `amr: otp`, optional `X-Admin-Key`) - not a group role |
| Legacy admin endpoints (`/api/messgroups/*` admin actions) | legacy `MessGroup.admin` only |

Extra per-endpoint rules that further restrict access (all verified):

* **Auditor read-only** applies to every group module.
* **Attachment download** is limited to uploader, `owner|manager|treasurer|auditor`, creator of the linked expense receipt, or submitter of linked payment evidence.
* **Outbox list/detail** is limited to the caller's own messages unless the caller is `owner|manager`.
* **Group audit log** requires `owner|manager|treasurer|auditor` (enforced inside the controller).
* **Emergency broadcast** requires `owner|manager` (enforced inside the controller).
* **Notes** are edited/deleted by their author or `owner|manager` (enforced inside the controller); pinned notes are capped at 3.
* **Platform admin** endpoints answer `404 { msg: 'Route not found' }` to non-admins and are audit-logged on denial.

---

## 5. Idempotency, rate limits, uploads

### 5.1 Idempotency

Routes marked **idempotent** wrap `middleware/idempotency.js`:

| | Behaviour |
|---|---|
| Header | Optional. Without `Idempotency-Key` the request runs normally (no protection). |
| Scope | Uniqueness is on `(groupId, actorId, operation, key)`; the request hash is sha256 of `JSON.stringify(body) + JSON.stringify(params)`. |
| Replay | Same key + same hash + stored response → that response is returned with HTTP 200 (or the stored ≤400 status) and `"__idempotentReplay": true` appended. |
| Conflict | Same key + different body → `409 { msg: 'Idempotency key reused with a different request body' }`. |
| In flight | Same key while the first request has not stored a result → `409 { msg: 'Request with this key is still processing' }`. Duplicate concurrent insert → `409 { msg: 'Duplicate idempotency key - retry shortly' }`. |
| Lease recovery | A record claimed by a crashed process carries `leaseUntil`; the hourly `idempotency cleanup` job clears expired leases so a key can never be stuck "processing" forever. |
| Retention | 24 hours (`IdempotencyRecord.expiresAt`, TTL index). |

Use a fresh UUID per logical operation and reuse it for retries of that operation. Idempotent routes: `POST /api/expenses/groups/:groupId/expenses`, `.../approve`, `.../reverse`, `POST /api/money/groups/:groupId/money`, `.../confirm`, `.../reverse`, `POST /api/memberships/groups/:groupId/memberships`, `POST /api/statements/groups/:groupId/statements/:month/finalize`, `POST /api/reconciliation/groups/:groupId/reconciliations`, `POST /api/recurring/groups/:groupId/recurring/:ruleId/generate`, `POST /api/support/tickets`.

### 5.2 Rate limits

| Scope | Limit | Response |
|---|---|---|
| Everything under `/api/users` (router-level, includes register/login/refresh/logout/2FA/OAuth) | 50 requests / 15 min / IP | `429 { msg: 'Too many attempts, try again in 15 minutes' }` |
| General limiter on `/api/messgroups`, `/api/meals`, `/api/expenses`, `/api/summary`, `/api/stats`, `/api/memberships`, `/api/policies`, `/api/periods`, `/api/money`, `/api/statements`, `/api/recurring`, `/api/reconciliation`, `/api/disputes`, `/api/notifications`, `/api/sessions`, `/api/attachments`, `/api/assets`, `/api/inbox`, `/api/support`, `/api/routines`, `/api/shopping-list`, `/api/kitchen-inventory`, `/api/polls`, `/api/invite` | 300 / 15 min / IP | express-rate-limit default |
| `POST /api/support/actions/:token` | 20 / 15 min / IP | `429 { msg: 'Too many attempts' }` |
| `POST /api/support/appeal` | 1 / 24 h / IP | `429 { msg: 'Appeal already submitted today' }` |
| `POST /api/support/tickets/:ticketId/messages` | 10 / min / IP (+ 50 messages per ticket, per user) | `429 { code: 'TICKET_MESSAGE_LIMIT' }` |
| `POST /api/invite/join-by-code` | Per-user **5-failure lockout** implemented in the controller with exponential backoff (15 min * 2^failures/5), in-memory. Failed attempts return a neutral `200`; only a locked user gets `429 { msg: 'Too many failed attempts, try again later' }`. | The `joinCodeLimiter` middleware in `middleware/rateLimiters.js` exists but is **mounted nowhere** - do not rely on its 10/15 min IP limit. |
| `GET /api/health`, `GET /api/admin/health` | No limiter (probe endpoints; `X-Request-Id` still echoed). | - |
| `/api/admin*` | **No dedicated limiter** (only whatever the proxy applies). | - |

Limiter state for join-code lockouts and TOTP challenges is per-process (in-memory); horizontal scaling multiplies effective limits. `NEEDS VERIFICATION` for multi-instance deployments.

TOTP login challenges are stored in MongoDB (`TOTPChallenge`, TTL index), not in a process `Map`, so a restart or a second instance does not drop a pending 2FA login.

### 5.3 File uploads

**Receipts / evidence - `POST /api/attachments/groups/:groupId/upload`** (`middleware/receiptUpload.js`):

* Field name: **`file`** (multipart/form-data). Send `Content-Type: multipart/form-data` with the boundary set by the HTTP client.
* Allowed MIME (client-declared): `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Anything else → multer error surfaced as `400`/`500` depending on the handler branch; the controller responds `400 { msg: 'No file uploaded' }` when no file was parsed. `NEEDS VERIFICATION` of the exact multer-error status in the current branch.
* Max size **10 MiB**.
* The server verifies **magic bytes** against the declared MIME → mismatch `400 { msg: 'File signature does not match claimed MIME type (rejected)' }`.
* Optional ClamAV scan: if `clamscan` is installed and finds malware → `400 { msg: 'File failed antivirus scan (rejected)' }`; if `clamscan` is not installed the file is accepted with `scanStatus: 'pending'`.
* Stored in Cloudinary as an **authenticated** resource; responses expose `url: '/api/attachments/groups/:groupId/<attachmentId>'`, and downloads 302-redirect to a signed URL valid for 1 hour.
* `sha256` of the bytes is returned for de-duplication insight.

**Profile picture - `POST /api/users/profile-pic`**: field name `image`, images only (`image/jpeg`, `image/png`, `image/webp`), **max 5 MiB**, uploaded to Cloudinary as a public image.

**Quarantine note:** a `scanStatus: 'pending'` attachment is currently downloadable by authorized callers (quarantine is a recommended future fix, not current behaviour).

---

## 6. Real-time (Socket.IO)

**Handshake:** the client connects to the Socket.IO URL with `withCredentials: true`. The server reads the **`mm_at` cookie** from the handshake headers; query-string tokens are rejected. No cookie → `next(new Error('Authentication required'))`; invalid token → `Invalid token`; missing/suspended user → `Invalid account`. The socket is force-disconnected when the access token expires.

**Rooms joined automatically:** `user:<userId>` - receives the caller's inbox events.

**Client → server events**

| Event | Payload | Authorization |
|---|---|---|
| `join-group` | `groupId` (24-hex string) | Silent no-op if malformed. Joins `group:<groupId>` only if the caller has an active `Membership` **or** is the legacy `MessGroup.admin`. |
| `leave-group` | `groupId` | Always succeeds. |

**Server → client events** (all verified in source; payloads are the objects passed to `emit` - most controllers emit **after** sending the HTTP response, so the originator receives both):

| Event | Emitted by | Room | Payload |
|---|---|---|---|
| `inbox-new` | `services/inboxService.notify()` (used by many controllers) | `user:<id>` | `{ id, type, title, link: { kind, id } \| null }` |
| `meal-updated` | `POST /api/meals/:groupId` | `group:<id>` | `{ groupId, mealId, userId }` |
| `shoppingList-updated` | shopping list add/toggle/remove | `group:<id>` | `{ groupId, listId }` |
| `note-created` | create note | `group:<id>` | `{ groupId, noteId, kind }` |
| `note-updated` | update/delete/ack note & tasks | `group:<id>` | `{ groupId, noteId[, state: 'deleted'] }` |
| `emergency-broadcast` | emergency broadcast | `group:<id>` | `{ groupId, noteId, title }` |
| `duty-updated`, `menu-updated` | duty/menu handlers | `group:<id>` | `{ groupId, ... }` - `NEEDS VERIFICATION` of exact payload fields |

**Frontend rules:** join the current group's room on navigation into a group, leave it on exit, and re-join after a reconnect (a token refresh rotates `mm_at`, but an existing socket is disconnected only at token expiry - reconnect after refresh to pick up the new token). Treat `inbox-new` as a signal to refetch the inbox/unread count, not as the full notification object.

---

## 7. Endpoint index (code-addressable)

Every mounted route, one row each. `Middleware` is the exact guard chain in execution order (router-level guards included). The handler link is relative to this file (`docs/`), so it opens the controller at the defining line.

### 7.0 Health probe (unauthenticated)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/health` | - | [`health`](../routes/healthRoutes.js) |

Returns `{status, uptimeSec, db:{ok,latencyMs}, scheduler:{running,lastTickAt,staleSec}, time}`; `503` when the DB ping fails. No tenant data.

### 7.1 Authentication, users & 2FA

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/users/auth/google/callback` | passport.authenticate('google', { failureRedirect: ${process.env.FRONTEND_URL}/login }) | [`googleAuth`](../controllers/userController.js#L348) |
| `GET` | `/api/users/auth/google` | - | passport.authenticate('google',{scope:['profile','email']}) |
| `GET` | `/api/users/download-my-data` | - | [`downloadMyData`](../controllers/userController.js#L366) |
| `GET` | `/api/users/groups/:groupId/members` | validate(objectIdParamSchema, 'params') | [`getGroupMembersDirectory`](../controllers/userController.js#L198) |
| `GET` | `/api/users/profile` | - | [`getProfile`](../controllers/userController.js#L220) |
| `GET` | `/api/users/verify-email/:token` | - | [`verifyEmail`](../controllers/userController.js#L279) |
| `POST` | `/api/users/2fa/disable` | auth, validate(disableSchema) | [`disable`](../controllers/totpController.js#L116) |
| `POST` | `/api/users/2fa/setup` | auth, validate(setupSchema) | [`setup`](../controllers/totpController.js#L54) |
| `POST` | `/api/users/2fa/verify` | auth, validate(verifySchema) | [`verify`](../controllers/totpController.js#L80) |
| `POST` | `/api/users/change-password` | - | [`changePassword`](../controllers/userController.js#L295) |
| `POST` | `/api/users/forgot-password` | - | [`forgotPassword`](../controllers/userController.js#L231) |
| `POST` | `/api/users/login/2fa-challenge` | validate(loginSchema) | [`loginChallenge`](../controllers/totpController.js#L158) |
| `POST` | `/api/users/login/2fa` | validate(login2faSchema) | [`login2fa`](../controllers/totpController.js#L183) |
| `POST` | `/api/users/login` | - | [`login`](../controllers/userController.js#L95) |
| `POST` | `/api/users/logout` | - | [`logout`](../controllers/userController.js#L145) |
| `POST` | `/api/users/profile-pic` | upload.single('image') | [`uploadProfilePic`](../controllers/userController.js#L318) |
| `POST` | `/api/users/refresh` | - | [`refresh`](../controllers/userController.js#L128) |
| `POST` | `/api/users/register` | - | [`register`](../controllers/userController.js#L56) |
| `POST` | `/api/users/reset-password` | - | [`resetPassword`](../controllers/userController.js#L252) |
| `PUT` | `/api/users/profile` | - | [`updateProfile`](../controllers/userController.js#L174) |

### 7.2 Device sessions

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/sessions/users/sessions/:familyId` | validate(familyIdParam, 'params') | [`revokeOne`](../controllers/sessionController.js#L15) |
| `DELETE` | `/api/sessions/users/sessions` | validate(revokeAllSchema) | [`revokeAll`](../controllers/sessionController.js#L25) |
| `GET` | `/api/sessions/users/sessions` | - | [`getSessions`](../controllers/sessionController.js#L7) |

### 7.3 Support desk (platform admin)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/admin/support/canned-replies/:replyId` | validate(z.object({ replyId: objectId }), 'params') | [`deleteCannedReply`](../controllers/supportAdminController.js#L253) |
| `GET` | `/api/admin/support/canned-replies` | - | [`listCannedReplies`](../controllers/supportAdminController.js#L234) |
| `GET` | `/api/admin/support/stats` | - | [`adminStats`](../controllers/supportAdminController.js#L197) |
| `GET` | `/api/admin/support/tickets/:ticketId` | validate(idParam, 'params') | [`adminGetTicket`](../controllers/supportAdminController.js#L52) |
| `GET` | `/api/admin/support/tickets` | validate(adminTicketListQuery, 'query') | [`adminListTickets`](../controllers/supportAdminController.js#L24) |
| `PATCH` | `/api/admin/support/tickets/:ticketId` | validate(idParam, 'params'), validate(adminTicketPatchSchema) | [`adminPatchTicket`](../controllers/supportAdminController.js#L138) |
| `POST` | `/api/admin/support/canned-replies` | validate(cannedReplySchema) | [`createCannedReply`](../controllers/supportAdminController.js#L240) |
| `POST` | `/api/admin/support/tickets/:ticketId/assign` | validate(idParam, 'params'), validate(adminAssignSchema) | [`adminAssign`](../controllers/supportAdminController.js#L126) |
| `POST` | `/api/admin/support/tickets/:ticketId/close` | validate(idParam, 'params'), validate(adminRedactSchema.partial({ reason: true })) | [`adminAction`](../controllers/supportAdminController.js#L158) |
| `POST` | `/api/admin/support/tickets/:ticketId/internal-note` | validate(idParam, 'params'), validate(adminReplySchema) | [`adminInternalNote`](../controllers/supportAdminController.js#L112) |
| `POST` | `/api/admin/support/tickets/:ticketId/messages/:messageId/redact` | validate(msgParam, 'params'), validate(adminRedactSchema) | [`adminRedactMessage`](../controllers/supportAdminController.js#L181) |
| `POST` | `/api/admin/support/tickets/:ticketId/reopen` | validate(idParam, 'params'), validate(adminRedactSchema) | [`adminAction`](../controllers/supportAdminController.js#L158) |
| `POST` | `/api/admin/support/tickets/:ticketId/reply` | validate(idParam, 'params'), validate(adminReplySchema) | [`adminReply`](../controllers/supportAdminController.js#L72) |
| `POST` | `/api/admin/support/tickets/:ticketId/resolve` | validate(idParam, 'params'), validate(adminRedactSchema.partial({ reason: true })) | [`adminAction`](../controllers/supportAdminController.js#L158) |
| `PUT` | `/api/admin/support/canned-replies/:replyId` | validate(z.object({ replyId: objectId }), 'params'), validate(cannedReplySchema) | [`updateCannedReply`](../controllers/supportAdminController.js#L246) |

### 7.4 Platform administration (hidden)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/admin/groups/:groupId` | validate(z.object({ groupId: objectId }), 'params') | [`adminDeleteGroup`](../controllers/adminController.js#L208) |
| `GET` | `/api/admin/audit` | - | [`listAuditEvents`](../controllers/adminController.js#L106) |
| `GET` | `/api/admin/groups/:groupId` | validate(z.object({ groupId: objectId }), 'params') | [`adminGetGroup`](../controllers/adminController.js#L197) |
| `GET` | `/api/admin/groups` | - | [`adminListGroups`](../controllers/adminController.js#L175) |
| `GET` | `/api/admin/health` | - | [`getHealth`](../controllers/adminController.js) |
| `GET` | `/api/admin/jobs` | - | [`listJobStatuses`](../controllers/jobController.js#L4) |
| `GET` | `/api/admin/overview` | - | [`getOverview`](../controllers/adminController.js#L58) |
| `GET` | `/api/admin/traffic` | - | [`getTraffic`](../controllers/adminController.js#L84) |
| `GET` | `/api/admin/users/:userId` | validate(z.object({ userId: objectId }), 'params') | [`adminGetUser`](../controllers/adminController.js#L144) |
| `GET` | `/api/admin/users` | - | [`adminListUsers`](../controllers/adminController.js#L120) |
| `PATCH` | `/api/admin/users/:userId` | validate(z.object({ userId: objectId }), 'params') | [`adminUpdateUser`](../controllers/adminController.js#L157) |

### 7.5 Mess groups, join codes, categories & extras

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/messgroups/categories/:groupId/:categoryId` | validate(objectIdAndIdParamSchema, 'params'), requireGroupRole('admin') | [`deleteCategory`](../controllers/expenseCategoryController.js#L131) |
| `DELETE` | `/api/messgroups/extras/:groupId/:extraId` | validate(objectIdAndExtraParamSchema, 'params'), requireGroupRole('admin') | [`removeExtra`](../controllers/messGroupController.js#L410) |
| `DELETE` | `/api/messgroups/remove-member/:groupId/:userId` | validate(groupAndUserParamSchema, 'params'), requireGroupRole('member') | [`removeMember`](../controllers/messGroupController.js#L432) |
| `GET` | `/api/messgroups/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getGroupById`](../controllers/messGroupController.js#L137) |
| `GET` | `/api/messgroups/audit-log/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getGroupAuditLog`](../controllers/messGroupController.js#L587) |
| `GET` | `/api/messgroups/calculate/:groupId` | deprecate({ successor: '/api/summary' }), validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`calculate`](../controllers/messGroupController.js#L237) |
| `GET` | `/api/messgroups/categories/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getCategories`](../controllers/expenseCategoryController.js#L87) |
| `GET` | `/api/messgroups/code/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`getJoinCode`](../controllers/messGroupController.js#L348) |
| `GET` | `/api/messgroups/entries/:groupId` | deprecate({ successor: '/api/meals, /api/expenses' }), validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getEntries`](../controllers/messGroupController.js#L224) |
| `GET` | `/api/messgroups/export/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`excelExport`](../controllers/messGroupController.js#L294) |
| `GET` | `/api/messgroups/extras/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getExtras`](../controllers/messGroupController.js#L422) |
| `GET` | `/api/messgroups/feature-flags/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getFeatureFlags`](../controllers/messGroupController.js#L561) |
| `GET` | `/api/messgroups/my-groups` | - | [`getAllGroups`](../controllers/messGroupController.js#L158) |
| `GET` | `/api/messgroups/payment-note/:groupId/:userId/:month` | - | [`getPaymentNote`](../controllers/paymentNoteController.js#L63) |
| `GET` | `/api/messgroups/payment-notes/:groupId/:month` | requireGroupRole('admin') | [`getAllPaymentNotes`](../controllers/paymentNoteController.js#L90) |
| `GET` | `/api/messgroups/pdf/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`pdfExport`](../controllers/messGroupController.js#L482) |
| `PATCH` | `/api/messgroups/feature-flags/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`updateFeatureFlags`](../controllers/messGroupController.js#L570) |
| `POST` | `/api/messgroups/add-entry/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin | [`addEntry`](../controllers/messGroupController.js#L178) |
| `POST` | `/api/messgroups/add-member/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`addMember`](../controllers/messGroupController.js#L114) |
| `POST` | `/api/messgroups/approve/:groupId/:userId` | validate(groupAndUserParamSchema, 'params'), requireGroupRole('admin') | [`approveRequest`](../controllers/messGroupController.js#L97) |
| `POST` | `/api/messgroups/categories/:groupId/seed` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`seedCategoriesEndpoint`](../controllers/expenseCategoryController.js#L47) |
| `POST` | `/api/messgroups/categories/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`createCategory`](../controllers/expenseCategoryController.js#L58) |
| `POST` | `/api/messgroups/create` | - | [`createGroup`](../controllers/messGroupController.js#L23) |
| `POST` | `/api/messgroups/extras/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`addExtra`](../controllers/messGroupController.js#L397) |
| `POST` | `/api/messgroups/invite/:groupId` | validate(objectIdParamSchema, 'params'), validate(inviteSchema), requireGroupRole('admin') | [`inviteByEmail`](../controllers/messGroupController.js#L467) |
| `POST` | `/api/messgroups/join-by-code` | - | [`joinByCode`](../controllers/inviteController.js#L19) |
| `POST` | `/api/messgroups/join-request/:groupId` | validate(objectIdParamSchema, 'params') | [`sendJoinRequest`](../controllers/messGroupController.js#L81) |
| `POST` | `/api/messgroups/regenerate-code/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`regenerateCode`](../controllers/messGroupController.js#L360) |
| `PUT` | `/api/messgroups/categories/:groupId/:categoryId` | validate(objectIdAndIdParamSchema, 'params'), requireGroupRole('admin') | [`updateCategory`](../controllers/expenseCategoryController.js#L100) |
| `PUT` | `/api/messgroups/payment-note/:groupId/:userId/:month` | requireGroupRole('admin') | [`upsertPaymentNote`](../controllers/paymentNoteController.js#L22) |

### 7.6 Expiring invitations

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/invite/codes/:groupId` | auth, validate(z.object({ groupId: z.string().min(1), }), 'params') | [`getInviteCodeMetadata`](../controllers/inviteController.js#L130) |
| `POST` | `/api/invite/codes` | auth, validate(z.object({ groupId: z.string().min(1), maxUses: z.number().int().min(1).max(1000).optional(), ttlDays: z.number().int().min(1).max(365).optional(), }), 'body') | [`createInviteCode`](../controllers/inviteController.js#L94) |
| `POST` | `/api/invite/join-by-code` | auth, validate(z.object({ code: z.string().min(1), groupId: z.string().min(1), }), 'body') | [`joinByCode`](../controllers/inviteController.js#L19) |

### 7.7 Memberships

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/memberships/groups/:groupId/memberships/active` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listActive`](../controllers/membershipController.js#L135) |
| `GET` | `/api/memberships/groups/:groupId/memberships/month/:month` | validate(monthParam, 'params'), requireGroupRoleV2('member') | [`listForMonth`](../controllers/membershipController.js#L143) |
| `GET` | `/api/memberships/groups/:groupId/memberships` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listMemberships`](../controllers/membershipController.js#L11) |
| `PATCH` | `/api/memberships/groups/:groupId/memberships/:membershipId` | validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(updateMembershipSchema) | [`updateMembership`](../controllers/membershipController.js#L62) |
| `POST` | `/api/memberships/groups/:groupId/memberships/:membershipId/depart` | validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(departSchema) | [`departMembership`](../controllers/membershipController.js#L106) |
| `POST` | `/api/memberships/groups/:groupId/memberships` | validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(createMembershipSchema), idempotent('membership.create') | [`createMembership`](../controllers/membershipController.js#L21) |

### 7.8 Meals & guest meals

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/meals/entry/:id` | validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin | [`deleteMeal`](../controllers/mealController.js#L315) |
| `GET` | `/api/meals/:groupId/bazar-forecast` | validate(bazarForecastQuerySchema, 'query'), requireGroupRole('member') | [`getBazarForecast`](../controllers/mealController.js) |
| `GET` | `/api/meals/:groupId/:month` | validate(monthParamSchema, 'params'), requireGroupRole('member') | [`getMealsByMonth`](../controllers/mealController.js#L288) |
| `GET` | `/api/meals/:groupId/guests` | validate(objectIdParamSchema, 'params'), validate(cursorListQuery, 'query'), requireGroupRole('member') | [`listGuestMeals`](../controllers/mealController.js#L125) |
| `GET` | `/api/meals/:groupId/headcount/tomorrow` | validate(headcountQuerySchema, 'query'), requireGroupRole('member') | [`getTomorrowHeadcount`](../controllers/mealController.js#L365) |
| `GET` | `/api/meals/:groupId` | validate(mealFilterQuerySchema, 'query'), requireGroupRole('member'), resolveHistoryWindow | [`getMeals`](../controllers/mealController.js#L334) |
| `POST` | `/api/meals/:groupId/absence/apply` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`applyAbsence`](../controllers/mealController.js#L210) |
| `POST` | `/api/meals/:groupId/absence/preview` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`previewAbsence`](../controllers/mealController.js#L190) |
| `POST` | `/api/meals/:groupId/bulk/apply` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`applyBulkMeals`](../controllers/mealController.js#L171) |
| `POST` | `/api/meals/:groupId/bulk/preview` | validate(objectIdParamSchema, 'params'), requireGroupRole('admin') | [`previewBulkMeals`](../controllers/mealController.js#L162) |
| `POST` | `/api/meals/:groupId/guests` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`createGuestMeal`](../controllers/mealController.js#L102) |
| `POST` | `/api/meals/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`addMeal`](../controllers/mealController.js#L53) |
| `PUT` | `/api/meals/entry/:id` | validate(idParamSchema, 'params') | [`updateMeal`](../controllers/mealController.js#L82) |

### 7.9 Expenses (legacy CRUD + V2 workflow)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/expenses/entry/:id` | validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin | [`deleteExpense`](../controllers/expenseController.js#L458) |
| `GET` | `/api/expenses/:groupId/:month` | validate(monthParamSchema, 'params'), requireGroupRole('member') | [`getExpensesByMonth`](../controllers/expenseController.js#L444) |
| `GET` | `/api/expenses/:groupId` | validate(expenseFilterQuerySchema, 'query'), requireGroupRole('member'), resolveHistoryWindow | [`getExpenses`](../controllers/expenseController.js#L416) |
| `GET` | `/api/expenses/groups/:groupId/expenses` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listExpenseQuery, 'query') | [`listExpenses`](../controllers/expenseController.js#L323) |
| `POST` | `/api/expenses/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`addExpense`](../controllers/expenseController.js#L356) |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/approve` | validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.approve') | [`approveExpense`](../controllers/expenseController.js#L159) |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/reject` | validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody) | [`rejectExpense`](../controllers/expenseController.js#L256) |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/reverse` | validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.reverse') | [`reverseExpense`](../controllers/expenseController.js#L274) |
| `POST` | `/api/expenses/groups/:groupId/expenses/import/preview` | importLimiter, validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), importUpload.single('file') | [`previewExpenseImport`](../controllers/expenseImportController.js) |
| `POST` | `/api/expenses/groups/:groupId/expenses/import/apply` | importLimiter, validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(importApplySchema), importUpload.single('file'), idempotent('expense.import') | [`applyExpenseImport`](../controllers/expenseImportController.js) |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/submit` | validate(expenseIdParam, 'params'), requireGroupRoleV2('member') | [`submitExpense`](../controllers/expenseController.js#L128) |
| `POST` | `/api/expenses/groups/:groupId/expenses` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(createExpenseSchema), idempotent('expense.create') | [`createExpense`](../controllers/expenseController.js#L57) |
| `PUT` | `/api/expenses/entry/:id` | validate(idParamSchema, 'params') | [`updateExpense`](../controllers/expenseController.js#L390) |

### 7.10 Money, balances & fund accounts

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/money/groups/:groupId/funds` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listFunds`](../controllers/moneyController.js#L235) |
| `GET` | `/api/money/groups/:groupId/memberships/:membershipId/balance` | validate(balanceParam, 'params'), requireGroupRoleV2('member') | [`getBalance`](../controllers/moneyController.js#L222) |
| `GET` | `/api/money/groups/:groupId/money` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listMoneyQuery, 'query') | [`listTransactions`](../controllers/moneyController.js#L191) |
| `POST` | `/api/money/groups/:groupId/funds/:fundId/custodian` | validate(groupIdParam, 'params'), requireGroupRoleV2('owner'), validate(custodianSchema) | [`changeCustodian`](../controllers/moneyController.js#L264) |
| `POST` | `/api/money/groups/:groupId/funds` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(fundSchema) | [`createFund`](../controllers/moneyController.js#L248) |
| `POST` | `/api/money/groups/:groupId/money/:txId/confirm` | validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), idempotent('money.confirm') | [`confirmTransaction`](../controllers/moneyController.js#L95) |
| `POST` | `/api/money/groups/:groupId/money/:txId/reject` | validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody) | [`rejectTransaction`](../controllers/moneyController.js#L138) |
| `POST` | `/api/money/groups/:groupId/money/:txId/reverse` | validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('money.reverse') | [`reverseTransaction`](../controllers/moneyController.js#L153) |
| `POST` | `/api/money/groups/:groupId/money` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(moneySchema), idempotent('money.submit') | [`submitTransaction`](../controllers/moneyController.js#L22) |

### 7.11 Group policies

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/policies/groups/:groupId/policies` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listPolicies`](../controllers/policyController.js#L7) |
| `POST` | `/api/policies/groups/:groupId/policies` | validate(groupIdParam, 'params'), requireGroupRoleV2('owner'), validate(publishPolicySchema) | [`publishPolicy`](../controllers/policyController.js#L15) |

### 7.12 Periods & review

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/periods/groups/:groupId/periods/:month/checklist` | validate(monthParam, 'params'), requireGroupRoleV2('treasurer') | [`closeChecklist`](../controllers/periodController.js#L74) |
| `GET` | `/api/periods/groups/:groupId/periods/:month/preview` | validate(monthParam, 'params'), requireGroupRoleV2('member') | [`previewStatement`](../controllers/periodController.js#L25) |
| `GET` | `/api/periods/groups/:groupId/periods/:month` | validate(monthParam, 'params'), requireGroupRoleV2('member') | [`getPeriod`](../controllers/periodController.js#L17) |
| `GET` | `/api/periods/groups/:groupId/periods` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listPeriods`](../controllers/periodController.js#L10) |
| `POST` | `/api/periods/groups/:groupId/periods/:month/begin-review` | validate(monthParam, 'params'), requireGroupRoleV2('manager') | [`startReview`](../controllers/periodController.js#L49) |
| `POST` | `/api/periods/groups/:groupId/periods/:month/correct` | validate(monthParam, 'params'), requireGroupRoleV2('manager'), validate(correctionSchema) | [`recordCorrection`](../controllers/periodController.js#L89) |
| `POST` | `/api/periods/groups/:groupId/periods/:month/return-to-open` | validate(monthParam, 'params'), requireGroupRoleV2('manager') | [`reopenPeriod`](../controllers/periodController.js#L60) |

### 7.13 Statements & finalization

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/statements/groups/:groupId/statements/:month` | validate(monthParam, 'params'), requireGroupRoleV2('member') |
| `GET` | `/api/statements/groups/:groupId/statements/:month/explain` | validate(monthParam, 'params'), validate(explainQuery, 'query'), requireGroupRoleV2('member') | [`explainBill`](../controllers/statementController.js) |
| `GET` | `/api/statements/groups/:groupId/statements/id/:statementId` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`getStatementById`](../controllers/statementController.js#L94) |
| `GET` | `/api/statements/groups/:groupId/statements` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listStatements`](../controllers/statementController.js#L85) |
| `POST` | `/api/statements/groups/:groupId/statements/:month/finalize` | validate(monthParam, 'params'), requireGroupRoleV2('owner'), validate(finalizeSchema), idempotent('statement.finalize') | [`finalize`](../controllers/statementController.js#L10) |
| `POST` | `/api/statements/groups/:groupId/statements/:month/reminders` | validate(monthParam, 'params'), requireGroupRoleV2('treasurer'), idempotent('statement.reminders') | [`remindDebtors`](../controllers/statementController.js) |

### 7.14 Recurring expenses

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/recurring/groups/:groupId/recurring` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listRules`](../controllers/recurringController.js#L11) |
| `POST` | `/api/recurring/groups/:groupId/recurring/:ruleId/generate` | validate(ruleIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(generateSchema), idempotent('recurring.generate') | [`generateDraft`](../controllers/recurringController.js#L56) |
| `POST` | `/api/recurring/groups/:groupId/recurring/generate-all` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer') | [`generateAllDrafts`](../controllers/recurringController.js#L115) |
| `POST` | `/api/recurring/groups/:groupId/recurring` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(recurringSchema) | [`createRule`](../controllers/recurringController.js#L18) |
| `PUT` | `/api/recurring/groups/:groupId/recurring/:ruleId` | validate(ruleIdParam, 'params'), requireGroupRoleV2('treasurer') | [`updateRule`](../controllers/recurringController.js#L42) |

### 7.15 Reconciliation

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/reconciliation/groups/:groupId/reconciliations/equation` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer') | [`accountingEquation`](../controllers/reconciliationController.js#L79) |
| `GET` | `/api/reconciliation/groups/:groupId/reconciliations/suggestions` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(suggestionQuery, 'query') | [`listReconciliationSuggestions`](../controllers/reconciliationController.js) |
| `GET` | `/api/reconciliation/groups/:groupId/reconciliations` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listReconciliationQuery, 'query') | [`listReconciliations`](../controllers/reconciliationController.js#L40) |
| `POST` | `/api/reconciliation/groups/:groupId/reconciliations/:recId/resolve` | validate(recIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(resolveReconciliationSchema) | [`resolveReconciliation`](../controllers/reconciliationController.js#L50) |
| `POST` | `/api/reconciliation/groups/:groupId/reconciliations` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reconciliationSchema), idempotent('reconciliation.create') | [`createReconciliation`](../controllers/reconciliationController.js#L10) |

### 7.16 Disputes

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/disputes/groups/:groupId/disputes` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeListQuery, 'query') | [`listDisputes`](../controllers/disputeController.js#L24) |
| `POST` | `/api/disputes/groups/:groupId/disputes/:disputeId/resolve` | validate(disputeIdParam, 'params'), requireGroupRoleV2('manager'), validate(disputeResolveSchema) | [`resolveDispute`](../controllers/disputeController.js#L48) |
| `POST` | `/api/disputes/groups/:groupId/disputes/:disputeId/respond` | validate(disputeIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeRespondSchema) | [`respondToDispute`](../controllers/disputeController.js#L36) |
| `POST` | `/api/disputes/groups/:groupId/disputes` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeSchema) | [`openDispute`](../controllers/disputeController.js#L8) |

### 7.17 Refundable assets / deposits

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/assets/groups/:groupId` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listAssets`](../controllers/depositAssetController.js#L9) |
| `POST` | `/api/assets/groups/:groupId/:assetId/refund` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer') | [`recordAssetRefund`](../controllers/depositAssetController.js#L58) |
| `POST` | `/api/assets/groups/:groupId` | validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer') | [`createAsset`](../controllers/depositAssetController.js#L18) |

### 7.18 Attachments (receipts)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/attachments/groups/:groupId/:attachmentId` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`downloadAttachment`](../controllers/attachmentController.js#L141) |
| `POST` | `/api/attachments/groups/:groupId/upload` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), receiptMulter.single('file') | [`uploadAttachment`](../controllers/attachmentController.js#L47) |

### 7.19 Notifications & outbox

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/notifications/groups/:groupId/notifications/:messageId` | validate(messageIdParam, 'params'), requireGroupRoleV2('member') | [`getOutboxMessage`](../controllers/notificationController.js#L28) |
| `GET` | `/api/notifications/groups/:groupId/notifications` | validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(outboxQuery, 'query') | [`listOutbox`](../controllers/notificationController.js#L15) |
| `GET` | `/api/notifications/whatsapp/webhook` | - | [`whatsappWebhookVerify`](../controllers/notificationController.js#L76) |
| `POST` | `/api/notifications/groups/:groupId/notifications/:messageId/resend` | validate(messageIdParam, 'params'), requireGroupRoleV2('manager') | [`resend`](../controllers/notificationController.js#L37) |
| `POST` | `/api/notifications/groups/:groupId/notifications/manual-share` | validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(manualShareSchema) | [`manualShareLinks`](../controllers/notificationController.js#L53) |
| `POST` | `/api/notifications/whatsapp/webhook` | - | [`whatsappWebhookReceive`](../controllers/notificationController.js#L91) |
| `PUT` | `/api/notifications/whatsapp/consent` | - | [`setWhatsappConsent`](../controllers/notificationController.js#L122) |

### 7.20 Statistics & dashboard

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/stats/:groupId` | validate(objectIdParamSchema, 'params'), requireGroupRole('member') | [`getStats`](../controllers/statsController.js#L45) |
| `GET` | `/api/stats/groups/:groupId/dashboard` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`getV2Dashboard`](../controllers/statsController.js#L191) |

### 7.21 Inbox & preferences

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/inbox/preferences` | - | [`getPreferences`](../controllers/inboxController.js#L53) |
| `GET` | `/api/inbox/unread-count` | - | [`unreadCount`](../controllers/inboxController.js#L29) |
| `GET` | `/api/inbox` | validate(inboxListQuery, 'query') | [`listInbox`](../controllers/inboxController.js#L11) |
| `POST` | `/api/inbox/read` | validate(inboxReadSchema) | [`markRead`](../controllers/inboxController.js#L37) |
| `PUT` | `/api/inbox/preferences` | validate(inboxPrefsSchema) | [`updatePreferences`](../controllers/inboxController.js#L61) |

### 7.22 Support desk (user side)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/support/tickets/:ticketId` | - | [`getTicketThread`](../controllers/supportController.js#L129) |
| `GET` | `/api/support/tickets` | validate(ticketListQuery, 'query') | [`listMyTickets`](../controllers/supportController.js#L115) |
| `POST` | `/api/support/actions/:token` | actionLimiter | [`publicAction`](../controllers/supportController.js#L234) |
| `POST` | `/api/support/appeal` | appealLimiter, validate(appealSchema) | [`appeal`](../controllers/supportController.js#L260) |
| `POST` | `/api/support/tickets/:ticketId/close` | validate(ticketTransitionSchema) | [`ticketAction`](../controllers/supportController.js#L207) |
| `POST` | `/api/support/tickets/:ticketId/messages` | messageLimiter, validate(ticketMessageSchema) | [`addMessage`](../controllers/supportController.js#L143) |
| `POST` | `/api/support/tickets/:ticketId/rate` | validate(ticketRateSchema) | [`ticketAction`](../controllers/supportController.js#L207) |
| `POST` | `/api/support/tickets/:ticketId/reopen` | validate(ticketTransitionSchema) | [`ticketAction`](../controllers/supportController.js#L207) |
| `POST` | `/api/support/tickets/:ticketId/resolve` | validate(ticketTransitionSchema) | [`ticketAction`](../controllers/supportController.js#L207) |
| `POST` | `/api/support/tickets` | validate(ticketCreateSchema), idempotent('support.ticket.create') | [`createTicket`](../controllers/supportController.js#L64) |

### 7.23 Routines, duties & notice board

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/routines/groups/:groupId/notes/:noteId` | validate(noteIdParam, 'params'), requireGroupRoleV2('member') | [`deleteNote`](../controllers/routinesController.js#L330) |
| `GET` | `/api/routines/groups/:groupId/bazar-spend-rotation` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`bazarSpendRotation`](../controllers/routinesController.js#L519) |
| `GET` | `/api/routines/groups/:groupId/board/today` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`boardToday`](../controllers/routinesController.js#L399) |
| `GET` | `/api/routines/groups/:groupId/duties/fairness` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`dutyFairnessBoard`](../controllers/routinesController.js#L473) |
| `GET` | `/api/routines/groups/:groupId/duties` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listDuties`](../controllers/routinesController.js#L141) |
| `GET` | `/api/routines/groups/:groupId/menu/bazar-suggestions` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`menuBazarSuggestions`](../controllers/routinesController.js#L427) |
| `GET` | `/api/routines/groups/:groupId/menu` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`getMenuPlan`](../controllers/routinesController.js#L260) |
| `GET` | `/api/routines/groups/:groupId/notes/:noteId` | validate(noteIdParam, 'params'), requireGroupRoleV2('member') | [`getNote`](../controllers/routinesController.js#L308) |
| `GET` | `/api/routines/groups/:groupId/notes` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listNotes`](../controllers/routinesController.js#L300) |
| `GET` | `/api/routines/groups/:groupId/rosters/:rosterId` | validate(rosterIdParam, 'params'), requireGroupRoleV2('member') | [`getRoster`](../controllers/routinesController.js#L51) |
| `GET` | `/api/routines/groups/:groupId/rosters` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listRosters`](../controllers/routinesController.js#L44) |
| `PATCH` | `/api/routines/groups/:groupId/notes/:noteId` | validate(noteIdParam, 'params'), validate(noteUpdateSchema), requireGroupRoleV2('member') | [`updateNote`](../controllers/routinesController.js#L316) |
| `PATCH` | `/api/routines/groups/:groupId/rosters/:rosterId` | validate(rosterIdParam, 'params'), validate(rosterUpdateSchema), requireGroupRoleV2('manager') | [`updateRoster`](../controllers/routinesController.js#L59) |
| `POST` | `/api/routines/groups/:groupId/duties/:assignmentId/done` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`markDutyDone`](../controllers/routinesController.js#L155) |
| `POST` | `/api/routines/groups/:groupId/duties/:assignmentId/reassign` | validate(groupIdParam, 'params'), validate(dutyReassignSchema), requireGroupRoleV2('manager') | [`reassignDuty`](../controllers/routinesController.js#L172) |
| `POST` | `/api/routines/groups/:groupId/emergency-broadcast` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`emergencyBroadcast`](../controllers/routinesController.js#L567) |
| `POST` | `/api/routines/groups/:groupId/menu` | validate(groupIdParam, 'params'), validate(menuPlanCreateSchema), requireGroupRoleV2('manager') | [`setMenuPlan`](../controllers/routinesController.js#L245) |
| `POST` | `/api/routines/groups/:groupId/notes/:noteId/ack` | validate(noteIdParam, 'params'), requireGroupRoleV2('member') | [`ackNote`](../controllers/routinesController.js#L344) |
| `POST` | `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/claim` | validate(noteTaskParam, 'params'), requireGroupRoleV2('member') | [`claimTask`](../controllers/routinesController.js#L355) |
| `POST` | `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/done` | validate(noteTaskParam, 'params'), requireGroupRoleV2('member') | [`doneTask`](../controllers/routinesController.js#L375) |
| `POST` | `/api/routines/groups/:groupId/notes` | validate(groupIdParam, 'params'), validate(noteCreateSchema), requireGroupRoleV2('member') | [`createNote`](../controllers/routinesController.js#L286) |
| `POST` | `/api/routines/groups/:groupId/rosters/:rosterId/extend-horizon` | validate(rosterIdParam, 'params'), requireGroupRoleV2('manager') | [`extendHorizon`](../controllers/routinesController.js#L108) |
| `POST` | `/api/routines/groups/:groupId/rosters/:rosterId/publish` | validate(rosterIdParam, 'params'), requireGroupRoleV2('manager') | [`publishRoster`](../controllers/routinesController.js#L72) |
| `POST` | `/api/routines/groups/:groupId/rosters` | validate(groupIdParam, 'params'), validate(rosterCreateSchema), requireGroupRoleV2('manager') | [`createRoster`](../controllers/routinesController.js#L35) |
| `POST` | `/api/routines/groups/:groupId/swaps/:swapId/respond` | validate(groupIdParam, 'params'), validate(swapRespondSchema), requireGroupRoleV2('member') | [`respondSwap`](../controllers/routinesController.js#L210) |
| `POST` | `/api/routines/groups/:groupId/swaps` | validate(groupIdParam, 'params'), validate(swapCreateSchema), requireGroupRoleV2('member') | [`createSwap`](../controllers/routinesController.js#L193) |

### 7.24 Shopping list

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/shopping-list/groups/:groupId/items/:itemId` | validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), requireGroupRoleV2('member') | [`removeItem`](../controllers/shoppingListController.js#L93) |
| `GET` | `/api/shopping-list/groups/:groupId/history` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listHistory`](../controllers/shoppingListController.js#L167) |
| `GET` | `/api/shopping-list/groups/:groupId` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`getShoppingList`](../controllers/shoppingListController.js#L39) |
| `PATCH` | `/api/shopping-list/groups/:groupId/items/:itemId` | validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(itemCheckSchema), requireGroupRoleV2('member') | [`toggleItem`](../controllers/shoppingListController.js#L73) |
| `POST` | `/api/shopping-list/groups/:groupId/items` | validate(groupIdParam, 'params'), validate(itemSchema), requireGroupRoleV2('member') | [`addItem`](../controllers/shoppingListController.js#L52) |
| `POST` | `/api/shopping-list/groups/:groupId/to-expense` | validate(groupIdParam, 'params'), validate(toExpenseSchema), requireGroupRoleV2('member') | [`toExpense`](../controllers/shoppingListController.js#L107) |

### 7.25 Kitchen inventory

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/kitchen-inventory/groups/:groupId/:itemId` | validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), requireGroupRoleV2('member') | [`deleteKitchenItem`](../controllers/kitchenInventoryController.js#L104) |
| `GET` | `/api/kitchen-inventory/groups/:groupId` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listKitchenItems`](../controllers/kitchenInventoryController.js#L30) |
| `PATCH` | `/api/kitchen-inventory/groups/:groupId/:itemId` | validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(itemUpdateSchema), requireGroupRoleV2('member') | [`updateKitchenItem`](../controllers/kitchenInventoryController.js#L64) |
| `POST` | `/api/kitchen-inventory/groups/:groupId/:itemId/refill` | validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(refillSchema), requireGroupRoleV2('member') | [`recordRefill`](../controllers/kitchenInventoryController.js#L80) |
| `POST` | `/api/kitchen-inventory/groups/:groupId` | validate(groupIdParam, 'params'), validate(itemCreateSchema), requireGroupRoleV2('member') | [`createKitchenItem`](../controllers/kitchenInventoryController.js#L50) |

### 7.26 Polls

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/polls/:pollId/results` | requireGroupRoleV2('member') | [`pollResults`](../controllers/pollController.js#L91) |
| `GET` | `/api/polls/groups/:groupId` | validate(groupIdParam, 'params'), requireGroupRoleV2('member') | [`listPolls`](../controllers/pollController.js#L19) |
| `POST` | `/api/polls/:pollId/close` | requireGroupRoleV2('member') | [`closePoll`](../controllers/pollController.js#L75) |
| `POST` | `/api/polls/:pollId/vote` | validate(voteSchema), requireGroupRoleV2('member') | [`votePoll`](../controllers/pollController.js#L47) |
| `POST` | `/api/polls/groups/:groupId` | validate(groupIdParam, 'params'), validate(pollCreateSchema), requireGroupRoleV2('member') | [`createPoll`](../controllers/pollController.js#L28) |

### 7.26b Budgets (new in S5.2)

Planned per-category monthly ceilings with variance computed on read from approved,
non-reversal expenses (`services/budgetRules.js`) — the plan never drifts from the
ledger. `categoryId: null` is the group-wide total for the month; one row per
`(groupId, month, categoryId)` (upsert). Status per line: `on_track` (<80 %),
`near` (≥80 %), `over` (≥100 %, or any spend against a zero budget).

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `DELETE` | `/api/budgets/groups/:groupId/:budgetId` | validate(budgetIdParam, 'params'), requireGroupRoleV2('treasurer') | [`deleteBudget`](../controllers/budgetController.js) |
| `GET` | `/api/budgets/groups/:groupId` | validate(groupIdParam, 'params'), validate(budgetMonthQuery, 'query'), requireGroupRoleV2('member') | [`listBudgets`](../controllers/budgetController.js) |
| `GET` | `/api/budgets/groups/:groupId/variance` | validate(groupIdParam, 'params'), validate(budgetMonthQuery, 'query'), requireGroupRoleV2('member') | [`budgetVariance`](../controllers/budgetController.js) |
| `POST` | `/api/budgets/groups/:groupId` | validate(groupIdParam, 'params'), validate(budgetUpsertSchema), requireGroupRoleV2('treasurer') | [`upsertBudget`](../controllers/budgetController.js) |

### 7.27 Legacy summary (deprecated)

| Method | Path | Middleware | Handler |
|---|---|---|---|
| `GET` | `/api/summary/:groupId/:month` | deprecate({ successor: '/api/statements' }), validate(monthParamSchema, 'params'), requireGroupRole('member') | [`getSummary`](../controllers/summaryController.js#L198) |
| `GET` | `/api/summary/whatsapp/:groupId/:month` | validate(monthParamSchema, 'params'), requireGroupRole('admin') | [`whatsappSummary`](../controllers/summaryController.js#L195) |
| `POST` | `/api/summary/finalize/:groupId/:month` | validate(monthParamSchema, 'params'), requireGroupRole('admin') | [`finalizeSummary`](../controllers/summaryController.js#L219) |

---

## 8. Endpoint list (one heading per route)

Uniform format: `### METHOD` + path in backticks, then the guard chain in execution order and the handler location. Router-level guards (router.use) are included. Generated from the router source; re-verify with `node scripts/auditRoutes.mjs` from `Server/`.


### GET `/api/admin/overview`

Guard: auth, requirePlatformAdmin, requireAdminAMR

Handler: [`getOverview`](../controllers/adminController.js#L58)


### GET `/api/admin/traffic`

Guard: auth, requirePlatformAdmin, requireAdminAMR

Handler: [`getTraffic`](../controllers/adminController.js#L84)


### GET `/api/admin/audit`

Guard: auth, requirePlatformAdmin, requireAdminAMR

Handler: [`listAuditEvents`](../controllers/adminController.js#L106)


### GET `/api/admin/users`

Guard: auth, requirePlatformAdmin, requireAdminAMR

Handler: [`adminListUsers`](../controllers/adminController.js#L120)


### GET `/api/admin/users/:userId`

Guard: auth, requirePlatformAdmin, requireAdminAMR, validate(z.object({ userId: objectId }), 'params')

Handler: [`adminGetUser`](../controllers/adminController.js#L144)


### PATCH `/api/admin/users/:userId`

Guard: auth, requirePlatformAdmin, requireAdminAMR, validate(z.object({ userId: objectId }), 'params')

Handler: [`adminUpdateUser`](../controllers/adminController.js#L157)


### GET `/api/admin/jobs`

Guard: auth, requirePlatformAdmin, requireAdminAMR

Handler: [`listJobStatuses`](../controllers/jobController.js#L4)


### GET `/api/admin/groups`

Guard: auth, requirePlatformAdmin, requireAdminAMR

Handler: [`adminListGroups`](../controllers/adminController.js#L175)


### GET `/api/admin/groups/:groupId`

Guard: auth, requirePlatformAdmin, requireAdminAMR, validate(z.object({ groupId: objectId }), 'params')

Handler: [`adminGetGroup`](../controllers/adminController.js#L197)


### DELETE `/api/admin/groups/:groupId`

Guard: auth, requirePlatformAdmin, requireAdminAMR, validate(z.object({ groupId: objectId }), 'params')

Handler: [`adminDeleteGroup`](../controllers/adminController.js#L208)


### POST `/api/attachments/groups/:groupId/upload`

Guard: auth, validate(groupIdParam, 'params'), requireGroupRoleV2('member'), receiptMulter.single('file')

Handler: [`uploadAttachment`](../controllers/attachmentController.js#L47)


### GET `/api/attachments/groups/:groupId/:attachmentId`

Guard: auth, validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`downloadAttachment`](../controllers/attachmentController.js#L141)


### GET `/api/assets/groups/:groupId`

Guard: auth, validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listAssets`](../controllers/depositAssetController.js#L9)


### POST `/api/assets/groups/:groupId`

Guard: auth, validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer')

Handler: [`createAsset`](../controllers/depositAssetController.js#L18)


### POST `/api/assets/groups/:groupId/:assetId/refund`

Guard: auth, validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer')

Handler: [`recordAssetRefund`](../controllers/depositAssetController.js#L58)


### GET `/api/disputes/groups/:groupId/disputes`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeListQuery, 'query')

Handler: [`listDisputes`](../controllers/disputeController.js#L24)


### POST `/api/disputes/groups/:groupId/disputes`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeSchema)

Handler: [`openDispute`](../controllers/disputeController.js#L8)


### POST `/api/disputes/groups/:groupId/disputes/:disputeId/respond`

Guard: validate(disputeIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeRespondSchema)

Handler: [`respondToDispute`](../controllers/disputeController.js#L36)


### POST `/api/disputes/groups/:groupId/disputes/:disputeId/resolve`

Guard: validate(disputeIdParam, 'params'), requireGroupRoleV2('manager'), validate(disputeResolveSchema)

Handler: [`resolveDispute`](../controllers/disputeController.js#L48)


### POST `/api/expenses/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`addExpense`](../controllers/expenseController.js#L356)


### PUT `/api/expenses/entry/:id`

Guard: validate(idParamSchema, 'params')

Handler: [`updateExpense`](../controllers/expenseController.js#L390)


### GET `/api/expenses/:groupId`

Guard: validate(expenseFilterQuerySchema, 'query'), requireGroupRole('member'), resolveHistoryWindow

Handler: [`getExpenses`](../controllers/expenseController.js#L416)


### GET `/api/expenses/:groupId/:month`

Guard: validate(monthParamSchema, 'params'), requireGroupRole('member')

Handler: [`getExpensesByMonth`](../controllers/expenseController.js#L444)


### DELETE `/api/expenses/entry/:id`

Guard: validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin

Handler: [`deleteExpense`](../controllers/expenseController.js#L458)


### GET `/api/expenses/groups/:groupId/expenses`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listExpenseQuery, 'query')

Handler: [`listExpenses`](../controllers/expenseController.js#L323)


### POST `/api/expenses/groups/:groupId/expenses`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(createExpenseSchema), idempotent('expense.create')

Handler: [`createExpense`](../controllers/expenseController.js#L57)


### POST `/api/expenses/groups/:groupId/expenses/:expenseId/submit`

Guard: validate(expenseIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`submitExpense`](../controllers/expenseController.js#L128)


### POST `/api/expenses/groups/:groupId/expenses/:expenseId/approve`

Guard: validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.approve')

Handler: [`approveExpense`](../controllers/expenseController.js#L159)


### POST `/api/expenses/groups/:groupId/expenses/:expenseId/reject`

Guard: validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody)

Handler: [`rejectExpense`](../controllers/expenseController.js#L256)


### POST `/api/expenses/groups/:groupId/expenses/:expenseId/reverse`

Guard: validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.reverse')

Handler: [`reverseExpense`](../controllers/expenseController.js#L274)


### GET `/api/inbox`

Guard: auth, validate(inboxListQuery, 'query')

Handler: [`listInbox`](../controllers/inboxController.js#L11)


### GET `/api/inbox/unread-count`

Guard: auth

Handler: [`unreadCount`](../controllers/inboxController.js#L29)


### POST `/api/inbox/read`

Guard: auth, validate(inboxReadSchema)

Handler: [`markRead`](../controllers/inboxController.js#L37)


### GET `/api/inbox/preferences`

Guard: auth

Handler: [`getPreferences`](../controllers/inboxController.js#L53)


### PUT `/api/inbox/preferences`

Guard: auth, validate(inboxPrefsSchema)

Handler: [`updatePreferences`](../controllers/inboxController.js#L61)


### POST `/api/invite/join-by-code`

Guard: auth, validate(z.object({ code: z.string().min(1), groupId: z.string().min(1), }), 'body')

Handler: [`joinByCode`](../controllers/inviteController.js#L19)


### POST `/api/invite/codes`

Guard: auth, validate(z.object({ groupId: z.string().min(1), maxUses: z.number().int().min(1).max(1000).optional(), ttlDays: z.number().int().min(1).max(365).optional(), }), 'body')

Handler: [`createInviteCode`](../controllers/inviteController.js#L94)


### GET `/api/invite/codes/:groupId`

Guard: auth, validate(z.object({ groupId: z.string().min(1), }), 'params')

Handler: [`getInviteCodeMetadata`](../controllers/inviteController.js#L130)


### GET `/api/kitchen-inventory/groups/:groupId`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listKitchenItems`](../controllers/kitchenInventoryController.js#L30)


### POST `/api/kitchen-inventory/groups/:groupId`

Guard: validate(groupIdParam, 'params'), validate(itemCreateSchema), requireGroupRoleV2('member')

Handler: [`createKitchenItem`](../controllers/kitchenInventoryController.js#L50)


### PATCH `/api/kitchen-inventory/groups/:groupId/:itemId`

Guard: validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(itemUpdateSchema), requireGroupRoleV2('member')

Handler: [`updateKitchenItem`](../controllers/kitchenInventoryController.js#L64)


### POST `/api/kitchen-inventory/groups/:groupId/:itemId/refill`

Guard: validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(refillSchema), requireGroupRoleV2('member')

Handler: [`recordRefill`](../controllers/kitchenInventoryController.js#L80)


### DELETE `/api/kitchen-inventory/groups/:groupId/:itemId`

Guard: validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`deleteKitchenItem`](../controllers/kitchenInventoryController.js#L104)


### POST `/api/meals/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`addMeal`](../controllers/mealController.js#L53)


### POST `/api/meals/:groupId/guests`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`createGuestMeal`](../controllers/mealController.js#L102)


### GET `/api/meals/:groupId/guests`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`listGuestMeals`](../controllers/mealController.js#L125)


### POST `/api/meals/:groupId/bulk/preview`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`previewBulkMeals`](../controllers/mealController.js#L162)


### POST `/api/meals/:groupId/bulk/apply`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`applyBulkMeals`](../controllers/mealController.js#L171)


### POST `/api/meals/:groupId/absence/preview`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`previewAbsence`](../controllers/mealController.js#L190)


### POST `/api/meals/:groupId/absence/apply`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`applyAbsence`](../controllers/mealController.js#L210)


### PUT `/api/meals/entry/:id`

Guard: validate(idParamSchema, 'params')

Handler: [`updateMeal`](../controllers/mealController.js#L82)


### GET `/api/meals/:groupId`

Guard: validate(mealFilterQuerySchema, 'query'), requireGroupRole('member'), resolveHistoryWindow

Handler: [`getMeals`](../controllers/mealController.js#L334)


### GET `/api/meals/:groupId/bazar-forecast`

Guard: validate(bazarForecastQuerySchema, 'query'), requireGroupRole('member')

Handler: [`getBazarForecast`](../controllers/mealController.js)

Query: `days` (1–60, default 7), `date` (`YYYY-MM-DD`, default tomorrow in Dhaka).

```json
{
  "targetDate": "2026-05-02",
  "window": { "from": "...", "to": "...", "days": 30, "observedUnits": 90000 },
  "headcount": { "breakfast": 3000, "lunch": 3000, "snacks": 0, "dinner": 3000 },
  "days": 7, "dailyUnits": 9000, "totalUnits": 63000,
  "categories": [{ "categoryId": "...", "name": "Bazar", "pricePerPortionPoisha": 7000,
                   "samples": 12, "expectedPoisha": 441000, "lowPoisha": 380000, "highPoisha": 500000 }],
  "expectedPoisha": 441000, "band": { "lowPoisha": 380000, "highPoisha": 500000 },
  "confidence": "high", "insufficientData": false
}
```

Rules (`services/bazarForecastRules.js`, pure + unit-tested): price per portion = **median** of
`categoryAmount × 1000 / observedUnits` over approved food expenses in the trailing 30 days;
expected = `pricePerPortion × dailyUnits × days / 1000`; band = 25th–75th percentile of the same
rates. `confidence` is `high` when every category has ≥7 samples, `medium` at ≥3, else `low`. With
no food history: `insufficientData: true`, `confidence: "none"`, zeros (never a fabricated number).
All amounts are integer poisha.


### GET `/api/meals/:groupId/headcount/tomorrow`

Guard: validate(headcountQuerySchema, 'query'), requireGroupRole('member')

Handler: [`getTomorrowHeadcount`](../controllers/mealController.js#L365)


### GET `/api/meals/:groupId/:month`

Guard: validate(monthParamSchema, 'params'), requireGroupRole('member')

Handler: [`getMealsByMonth`](../controllers/mealController.js#L288)


### DELETE `/api/meals/entry/:id`

Guard: validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin

Handler: [`deleteMeal`](../controllers/mealController.js#L315)


### GET `/api/memberships/groups/:groupId/memberships`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listMemberships`](../controllers/membershipController.js#L11)


### GET `/api/memberships/groups/:groupId/memberships/active`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listActive`](../controllers/membershipController.js#L135)


### GET `/api/memberships/groups/:groupId/memberships/month/:month`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('member')

Handler: [`listForMonth`](../controllers/membershipController.js#L143)


### POST `/api/memberships/groups/:groupId/memberships`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(createMembershipSchema), idempotent('membership.create')

Handler: [`createMembership`](../controllers/membershipController.js#L21)


### PATCH `/api/memberships/groups/:groupId/memberships/:membershipId`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(updateMembershipSchema)

Handler: [`updateMembership`](../controllers/membershipController.js#L62)


### POST `/api/memberships/groups/:groupId/memberships/:membershipId/depart`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(departSchema)

Handler: [`departMembership`](../controllers/membershipController.js#L106)


### POST `/api/messgroups/create`

Guard: public

Handler: [`createGroup`](../controllers/messGroupController.js#L23)


### POST `/api/messgroups/join-by-code`

Guard: public

Handler: [`joinByCode`](../controllers/inviteController.js#L19)


### POST `/api/messgroups/join-request/:groupId`

Guard: validate(objectIdParamSchema, 'params')

Handler: [`sendJoinRequest`](../controllers/messGroupController.js#L81)


### POST `/api/messgroups/approve/:groupId/:userId`

Guard: validate(groupAndUserParamSchema, 'params'), requireGroupRole('admin')

Handler: [`approveRequest`](../controllers/messGroupController.js#L97)


### POST `/api/messgroups/add-member/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`addMember`](../controllers/messGroupController.js#L114)


### GET `/api/messgroups/code/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`getJoinCode`](../controllers/messGroupController.js#L348)


### POST `/api/messgroups/regenerate-code/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`regenerateCode`](../controllers/messGroupController.js#L360)


### POST `/api/messgroups/extras/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`addExtra`](../controllers/messGroupController.js#L397)


### DELETE `/api/messgroups/extras/:groupId/:extraId`

Guard: validate(objectIdAndExtraParamSchema, 'params'), requireGroupRole('admin')

Handler: [`removeExtra`](../controllers/messGroupController.js#L410)


### POST `/api/messgroups/invite/:groupId`

Guard: validate(objectIdParamSchema, 'params'), validate(inviteSchema), requireGroupRole('admin')

Handler: [`inviteByEmail`](../controllers/messGroupController.js#L467)


### POST `/api/messgroups/add-entry/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin

Handler: [`addEntry`](../controllers/messGroupController.js#L178)


### GET `/api/messgroups/my-groups`

Guard: public

Handler: [`getAllGroups`](../controllers/messGroupController.js#L158)


### GET `/api/messgroups/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getGroupById`](../controllers/messGroupController.js#L137)


### GET `/api/messgroups/entries/:groupId`

Guard: deprecate({ successor: '/api/meals, /api/expenses' }), validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getEntries`](../controllers/messGroupController.js#L224)


### GET `/api/messgroups/calculate/:groupId`

Guard: deprecate({ successor: '/api/summary' }), validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`calculate`](../controllers/messGroupController.js#L237)


### GET `/api/messgroups/export/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`excelExport`](../controllers/messGroupController.js#L294)


### GET `/api/messgroups/pdf/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`pdfExport`](../controllers/messGroupController.js#L482)


### GET `/api/messgroups/extras/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getExtras`](../controllers/messGroupController.js#L422)


### DELETE `/api/messgroups/remove-member/:groupId/:userId`

Guard: validate(groupAndUserParamSchema, 'params'), requireGroupRole('member')

Handler: [`removeMember`](../controllers/messGroupController.js#L432)


### PUT `/api/messgroups/payment-note/:groupId/:userId/:month`

Guard: requireGroupRole('admin')

Handler: [`upsertPaymentNote`](../controllers/paymentNoteController.js#L22)


### GET `/api/messgroups/payment-note/:groupId/:userId/:month`

Guard: public

Handler: [`getPaymentNote`](../controllers/paymentNoteController.js#L63)


### GET `/api/messgroups/payment-notes/:groupId/:month`

Guard: requireGroupRole('admin')

Handler: [`getAllPaymentNotes`](../controllers/paymentNoteController.js#L90)


### POST `/api/messgroups/categories/:groupId/seed`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`seedCategoriesEndpoint`](../controllers/expenseCategoryController.js#L47)


### POST `/api/messgroups/categories/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`createCategory`](../controllers/expenseCategoryController.js#L58)


### GET `/api/messgroups/categories/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getCategories`](../controllers/expenseCategoryController.js#L87)


### PUT `/api/messgroups/categories/:groupId/:categoryId`

Guard: validate(objectIdAndIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`updateCategory`](../controllers/expenseCategoryController.js#L100)


### DELETE `/api/messgroups/categories/:groupId/:categoryId`

Guard: validate(objectIdAndIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`deleteCategory`](../controllers/expenseCategoryController.js#L131)


### GET `/api/messgroups/feature-flags/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getFeatureFlags`](../controllers/messGroupController.js#L561)


### PATCH `/api/messgroups/feature-flags/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('admin')

Handler: [`updateFeatureFlags`](../controllers/messGroupController.js#L570)


### GET `/api/messgroups/audit-log/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getGroupAuditLog`](../controllers/messGroupController.js#L587)


### GET `/api/money/groups/:groupId/money`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listMoneyQuery, 'query')

Handler: [`listTransactions`](../controllers/moneyController.js#L191)


### POST `/api/money/groups/:groupId/money`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(moneySchema), idempotent('money.submit')

Handler: [`submitTransaction`](../controllers/moneyController.js#L22)


### POST `/api/money/groups/:groupId/money/:txId/confirm`

Guard: validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), idempotent('money.confirm')

Handler: [`confirmTransaction`](../controllers/moneyController.js#L95)


### POST `/api/money/groups/:groupId/money/:txId/reject`

Guard: validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody)

Handler: [`rejectTransaction`](../controllers/moneyController.js#L138)


### POST `/api/money/groups/:groupId/money/:txId/reverse`

Guard: validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('money.reverse')

Handler: [`reverseTransaction`](../controllers/moneyController.js#L153)


### GET `/api/money/groups/:groupId/memberships/:membershipId/balance`

Guard: validate(balanceParam, 'params'), requireGroupRoleV2('member')

Handler: [`getBalance`](../controllers/moneyController.js#L222)


### GET `/api/money/groups/:groupId/funds`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listFunds`](../controllers/moneyController.js#L235)


### POST `/api/money/groups/:groupId/funds`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(fundSchema)

Handler: [`createFund`](../controllers/moneyController.js#L248)


### POST `/api/money/groups/:groupId/funds/:fundId/custodian`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('owner'), validate(custodianSchema)

Handler: [`changeCustodian`](../controllers/moneyController.js#L264)


### GET `/api/notifications/whatsapp/webhook`

Guard: public

Handler: [`whatsappWebhookVerify`](../controllers/notificationController.js#L76)


### POST `/api/notifications/whatsapp/webhook`

Guard: public

Handler: [`whatsappWebhookReceive`](../controllers/notificationController.js#L91)


### PUT `/api/notifications/whatsapp/consent`

Guard: public

Handler: [`setWhatsappConsent`](../controllers/notificationController.js#L122)


### GET `/api/notifications/groups/:groupId/notifications`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(outboxQuery, 'query')

Handler: [`listOutbox`](../controllers/notificationController.js#L15)


### GET `/api/notifications/groups/:groupId/notifications/:messageId`

Guard: validate(messageIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getOutboxMessage`](../controllers/notificationController.js#L28)


### POST `/api/notifications/groups/:groupId/notifications/:messageId/resend`

Guard: validate(messageIdParam, 'params'), requireGroupRoleV2('manager')

Handler: [`resend`](../controllers/notificationController.js#L37)


### POST `/api/notifications/groups/:groupId/notifications/manual-share`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(manualShareSchema)

Handler: [`manualShareLinks`](../controllers/notificationController.js#L53)


### GET `/api/periods/groups/:groupId/periods`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listPeriods`](../controllers/periodController.js#L10)


### GET `/api/periods/groups/:groupId/periods/:month`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('member')

Handler: [`getPeriod`](../controllers/periodController.js#L17)


### GET `/api/periods/groups/:groupId/periods/:month/preview`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('member')

Handler: [`previewStatement`](../controllers/periodController.js#L25)


### GET `/api/periods/groups/:groupId/periods/:month/checklist`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('treasurer')

Handler: [`closeChecklist`](../controllers/periodController.js#L74)


### POST `/api/periods/groups/:groupId/periods/:month/begin-review`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('manager')

Handler: [`startReview`](../controllers/periodController.js#L49)


### POST `/api/periods/groups/:groupId/periods/:month/return-to-open`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('manager')

Handler: [`reopenPeriod`](../controllers/periodController.js#L60)


### POST `/api/periods/groups/:groupId/periods/:month/correct`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('manager'), validate(correctionSchema)

Handler: [`recordCorrection`](../controllers/periodController.js#L89)


### GET `/api/policies/groups/:groupId/policies`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listPolicies`](../controllers/policyController.js#L7)


### POST `/api/policies/groups/:groupId/policies`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('owner'), validate(publishPolicySchema)

Handler: [`publishPolicy`](../controllers/policyController.js#L15)


### GET `/api/polls/groups/:groupId`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listPolls`](../controllers/pollController.js#L19)


### POST `/api/polls/groups/:groupId`

Guard: validate(groupIdParam, 'params'), validate(pollCreateSchema), requireGroupRoleV2('member')

Handler: [`createPoll`](../controllers/pollController.js#L28)


### POST `/api/polls/:pollId/vote`

Guard: validate(voteSchema), requireGroupRoleV2('member')

Handler: [`votePoll`](../controllers/pollController.js#L47)


### POST `/api/polls/:pollId/close`

Guard: requireGroupRoleV2('member')

Handler: [`closePoll`](../controllers/pollController.js#L75)


### GET `/api/polls/:pollId/results`

Guard: requireGroupRoleV2('member')

Handler: [`pollResults`](../controllers/pollController.js#L91)


### GET `/api/reconciliation/groups/:groupId/reconciliations`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listReconciliationQuery, 'query')

Handler: [`listReconciliations`](../controllers/reconciliationController.js#L40)


### GET `/api/reconciliation/groups/:groupId/reconciliations/equation`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer')

Handler: [`accountingEquation`](../controllers/reconciliationController.js#L79)


### POST `/api/reconciliation/groups/:groupId/reconciliations`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reconciliationSchema), idempotent('reconciliation.create')

Handler: [`createReconciliation`](../controllers/reconciliationController.js#L10)


### POST `/api/reconciliation/groups/:groupId/reconciliations/:recId/resolve`

Guard: validate(recIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(resolveReconciliationSchema)

Handler: [`resolveReconciliation`](../controllers/reconciliationController.js#L50)


### GET `/api/recurring/groups/:groupId/recurring`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listRules`](../controllers/recurringController.js#L11)


### POST `/api/recurring/groups/:groupId/recurring`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(recurringSchema)

Handler: [`createRule`](../controllers/recurringController.js#L18)


### POST `/api/recurring/groups/:groupId/recurring/generate-all`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer')

Handler: [`generateAllDrafts`](../controllers/recurringController.js#L115)


### PUT `/api/recurring/groups/:groupId/recurring/:ruleId`

Guard: validate(ruleIdParam, 'params'), requireGroupRoleV2('treasurer')

Handler: [`updateRule`](../controllers/recurringController.js#L42)


### POST `/api/recurring/groups/:groupId/recurring/:ruleId/generate`

Guard: validate(ruleIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(generateSchema), idempotent('recurring.generate')

Handler: [`generateDraft`](../controllers/recurringController.js#L56)


### GET `/api/routines/groups/:groupId/rosters`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listRosters`](../controllers/routinesController.js#L44)


### POST `/api/routines/groups/:groupId/rosters`

Guard: validate(groupIdParam, 'params'), validate(rosterCreateSchema), requireGroupRoleV2('manager')

Handler: [`createRoster`](../controllers/routinesController.js#L35)


### GET `/api/routines/groups/:groupId/rosters/:rosterId`

Guard: validate(rosterIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getRoster`](../controllers/routinesController.js#L51)


### PATCH `/api/routines/groups/:groupId/rosters/:rosterId`

Guard: validate(rosterIdParam, 'params'), validate(rosterUpdateSchema), requireGroupRoleV2('manager')

Handler: [`updateRoster`](../controllers/routinesController.js#L59)


### POST `/api/routines/groups/:groupId/rosters/:rosterId/publish`

Guard: validate(rosterIdParam, 'params'), requireGroupRoleV2('manager')

Handler: [`publishRoster`](../controllers/routinesController.js#L72)


### POST `/api/routines/groups/:groupId/rosters/:rosterId/extend-horizon`

Guard: validate(rosterIdParam, 'params'), requireGroupRoleV2('manager')

Handler: [`extendHorizon`](../controllers/routinesController.js#L108)


### GET `/api/routines/groups/:groupId/duties`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listDuties`](../controllers/routinesController.js#L141)


### POST `/api/routines/groups/:groupId/duties/:assignmentId/done`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`markDutyDone`](../controllers/routinesController.js#L155)


### POST `/api/routines/groups/:groupId/duties/:assignmentId/reassign`

Guard: validate(groupIdParam, 'params'), validate(dutyReassignSchema), requireGroupRoleV2('manager')

Handler: [`reassignDuty`](../controllers/routinesController.js#L172)


### POST `/api/routines/groups/:groupId/swaps`

Guard: validate(groupIdParam, 'params'), validate(swapCreateSchema), requireGroupRoleV2('member')

Handler: [`createSwap`](../controllers/routinesController.js#L193)


### POST `/api/routines/groups/:groupId/swaps/:swapId/respond`

Guard: validate(groupIdParam, 'params'), validate(swapRespondSchema), requireGroupRoleV2('member')

Handler: [`respondSwap`](../controllers/routinesController.js#L210)


### POST `/api/routines/groups/:groupId/menu`

Guard: validate(groupIdParam, 'params'), validate(menuPlanCreateSchema), requireGroupRoleV2('manager')

Handler: [`setMenuPlan`](../controllers/routinesController.js#L245)


### GET `/api/routines/groups/:groupId/menu`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getMenuPlan`](../controllers/routinesController.js#L260)


### POST `/api/routines/groups/:groupId/notes`

Guard: validate(groupIdParam, 'params'), validate(noteCreateSchema), requireGroupRoleV2('member')

Handler: [`createNote`](../controllers/routinesController.js#L286)


### GET `/api/routines/groups/:groupId/notes`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listNotes`](../controllers/routinesController.js#L300)


### GET `/api/routines/groups/:groupId/notes/:noteId`

Guard: validate(noteIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getNote`](../controllers/routinesController.js#L308)


### PATCH `/api/routines/groups/:groupId/notes/:noteId`

Guard: validate(noteIdParam, 'params'), validate(noteUpdateSchema), requireGroupRoleV2('member')

Handler: [`updateNote`](../controllers/routinesController.js#L316)


### DELETE `/api/routines/groups/:groupId/notes/:noteId`

Guard: validate(noteIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`deleteNote`](../controllers/routinesController.js#L330)


### POST `/api/routines/groups/:groupId/notes/:noteId/ack`

Guard: validate(noteIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`ackNote`](../controllers/routinesController.js#L344)


### POST `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/claim`

Guard: validate(noteTaskParam, 'params'), requireGroupRoleV2('member')

Handler: [`claimTask`](../controllers/routinesController.js#L355)


### POST `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/done`

Guard: validate(noteTaskParam, 'params'), requireGroupRoleV2('member')

Handler: [`doneTask`](../controllers/routinesController.js#L375)


### GET `/api/routines/groups/:groupId/board/today`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`boardToday`](../controllers/routinesController.js#L399)


### GET `/api/routines/groups/:groupId/menu/bazar-suggestions`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`menuBazarSuggestions`](../controllers/routinesController.js#L427)


### GET `/api/routines/groups/:groupId/duties/fairness`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`dutyFairnessBoard`](../controllers/routinesController.js#L473)


### GET `/api/routines/groups/:groupId/bazar-spend-rotation`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`bazarSpendRotation`](../controllers/routinesController.js#L519)


### POST `/api/routines/groups/:groupId/emergency-broadcast`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`emergencyBroadcast`](../controllers/routinesController.js#L567)


### GET `/api/sessions/users/sessions`

Guard: auth

Handler: [`getSessions`](../controllers/sessionController.js#L7)


### DELETE `/api/sessions/users/sessions/:familyId`

Guard: auth, validate(familyIdParam, 'params')

Handler: [`revokeOne`](../controllers/sessionController.js#L15)


### DELETE `/api/sessions/users/sessions`

Guard: auth, validate(revokeAllSchema)

Handler: [`revokeAll`](../controllers/sessionController.js#L25)


### GET `/api/shopping-list/groups/:groupId`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getShoppingList`](../controllers/shoppingListController.js#L39)


### POST `/api/shopping-list/groups/:groupId/items`

Guard: validate(groupIdParam, 'params'), validate(itemSchema), requireGroupRoleV2('member')

Handler: [`addItem`](../controllers/shoppingListController.js#L52)


### PATCH `/api/shopping-list/groups/:groupId/items/:itemId`

Guard: validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(itemCheckSchema), requireGroupRoleV2('member')

Handler: [`toggleItem`](../controllers/shoppingListController.js#L73)


### DELETE `/api/shopping-list/groups/:groupId/items/:itemId`

Guard: validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`removeItem`](../controllers/shoppingListController.js#L93)


### POST `/api/shopping-list/groups/:groupId/to-expense`

Guard: validate(groupIdParam, 'params'), validate(toExpenseSchema), requireGroupRoleV2('member')

Handler: [`toExpense`](../controllers/shoppingListController.js#L107)


### GET `/api/shopping-list/groups/:groupId/history`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listHistory`](../controllers/shoppingListController.js#L167)


### GET `/api/statements/groups/:groupId/statements`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`listStatements`](../controllers/statementController.js#L85)


### GET `/api/statements/groups/:groupId/statements/id/:statementId`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getStatementById`](../controllers/statementController.js#L94)


### GET `/api/statements/groups/:groupId/statements/:month`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('member')

Handler: [`getStatement`](../controllers/statementController.js#L76)


### POST `/api/statements/groups/:groupId/statements/:month/finalize`

Guard: validate(monthParam, 'params'), requireGroupRoleV2('owner'), validate(finalizeSchema), idempotent('statement.finalize')

Handler: [`finalize`](../controllers/statementController.js#L10)


### GET `/api/stats/groups/:groupId/dashboard`

Guard: validate(groupIdParam, 'params'), requireGroupRoleV2('member')

Handler: [`getV2Dashboard`](../controllers/statsController.js#L191)


### GET `/api/stats/:groupId`

Guard: validate(objectIdParamSchema, 'params'), requireGroupRole('member')

Handler: [`getStats`](../controllers/statsController.js#L45)


### GET `/api/summary/:groupId/:month`

Guard: deprecate({ successor: '/api/statements' }), validate(monthParamSchema, 'params'), requireGroupRole('member')

Handler: [`getSummary`](../controllers/summaryController.js#L198)


### POST `/api/summary/finalize/:groupId/:month`

Guard: validate(monthParamSchema, 'params'), requireGroupRole('admin')

Handler: [`finalizeSummary`](../controllers/summaryController.js#L219)


### GET `/api/summary/whatsapp/:groupId/:month`

Guard: validate(monthParamSchema, 'params'), requireGroupRole('admin')

Handler: [`whatsappSummary`](../controllers/summaryController.js#L195)


### GET `/api/admin/support/tickets`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(adminTicketListQuery, 'query')

Handler: [`adminListTickets`](../controllers/supportAdminController.js#L24)


### GET `/api/admin/support/tickets/:ticketId`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params')

Handler: [`adminGetTicket`](../controllers/supportAdminController.js#L52)


### POST `/api/admin/support/tickets/:ticketId/reply`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminReplySchema)

Handler: [`adminReply`](../controllers/supportAdminController.js#L72)


### POST `/api/admin/support/tickets/:ticketId/internal-note`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminReplySchema)

Handler: [`adminInternalNote`](../controllers/supportAdminController.js#L112)


### POST `/api/admin/support/tickets/:ticketId/assign`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminAssignSchema)

Handler: [`adminAssign`](../controllers/supportAdminController.js#L126)


### PATCH `/api/admin/support/tickets/:ticketId`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminTicketPatchSchema)

Handler: [`adminPatchTicket`](../controllers/supportAdminController.js#L138)


### POST `/api/admin/support/tickets/:ticketId/resolve`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminRedactSchema.partial({ reason: true }))

Handler: [`adminAction`](../controllers/supportAdminController.js#L158)


### POST `/api/admin/support/tickets/:ticketId/close`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminRedactSchema.partial({ reason: true }))

Handler: [`adminAction`](../controllers/supportAdminController.js#L158)


### POST `/api/admin/support/tickets/:ticketId/reopen`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(idParam, 'params'), validate(adminRedactSchema)

Handler: [`adminAction`](../controllers/supportAdminController.js#L158)


### POST `/api/admin/support/tickets/:ticketId/messages/:messageId/redact`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(msgParam, 'params'), validate(adminRedactSchema)

Handler: [`adminRedactMessage`](../controllers/supportAdminController.js#L181)


### GET `/api/admin/support/stats`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin)

Handler: [`adminStats`](../controllers/supportAdminController.js#L197)


### GET `/api/admin/support/canned-replies`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin)

Handler: [`listCannedReplies`](../controllers/supportAdminController.js#L234)


### POST `/api/admin/support/canned-replies`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(cannedReplySchema)

Handler: [`createCannedReply`](../controllers/supportAdminController.js#L240)


### PUT `/api/admin/support/canned-replies/:replyId`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(z.object({ replyId: objectId }), 'params'), validate(cannedReplySchema)

Handler: [`updateCannedReply`](../controllers/supportAdminController.js#L246)


### DELETE `/api/admin/support/canned-replies/:replyId`

Guard: auth, requirePlatformAdmin (parent mount), requireAdminAMR (via /api/admin), validate(z.object({ replyId: objectId }), 'params')

Handler: [`deleteCannedReply`](../controllers/supportAdminController.js#L253)


### POST `/api/support/actions/:token`

Guard: actionLimiter

Handler: [`publicAction`](../controllers/supportController.js#L234)


### POST `/api/support/appeal`

Guard: appealLimiter, validate(appealSchema)

Handler: [`appeal`](../controllers/supportController.js#L260)


### POST `/api/support/tickets`

Guard: validate(ticketCreateSchema), idempotent('support.ticket.create')

Handler: [`createTicket`](../controllers/supportController.js#L64)


### GET `/api/support/tickets`

Guard: validate(ticketListQuery, 'query')

Handler: [`listMyTickets`](../controllers/supportController.js#L115)


### GET `/api/support/tickets/:ticketId`

Guard: public

Handler: [`getTicketThread`](../controllers/supportController.js#L129)


### POST `/api/support/tickets/:ticketId/messages`

Guard: messageLimiter, validate(ticketMessageSchema)

Handler: [`addMessage`](../controllers/supportController.js#L143)


### POST `/api/support/tickets/:ticketId/resolve`

Guard: validate(ticketTransitionSchema)

Handler: [`ticketAction`](../controllers/supportController.js#L207)


### POST `/api/support/tickets/:ticketId/close`

Guard: validate(ticketTransitionSchema)

Handler: [`ticketAction`](../controllers/supportController.js#L207)


### POST `/api/support/tickets/:ticketId/reopen`

Guard: validate(ticketTransitionSchema)

Handler: [`ticketAction`](../controllers/supportController.js#L207)


### POST `/api/support/tickets/:ticketId/rate`

Guard: validate(ticketRateSchema)

Handler: [`ticketAction`](../controllers/supportController.js#L207)


### POST `/api/users/2fa/setup`

Guard: auth, validate(setupSchema)

Handler: [`setup`](../controllers/totpController.js#L54)


### POST `/api/users/2fa/verify`

Guard: auth, validate(verifySchema)

Handler: [`verify`](../controllers/totpController.js#L80)


### POST `/api/users/2fa/disable`

Guard: auth, validate(disableSchema)

Handler: [`disable`](../controllers/totpController.js#L116)


### POST `/api/users/login/2fa-challenge`

Guard: validate(loginSchema)

Handler: [`loginChallenge`](../controllers/totpController.js#L158)


### POST `/api/users/login/2fa`

Guard: validate(login2faSchema)

Handler: [`login2fa`](../controllers/totpController.js#L183)


### POST `/api/users/register`

Guard: public

Handler: [`register`](../controllers/userController.js#L56)


### POST `/api/users/login`

Guard: public

Handler: [`login`](../controllers/userController.js#L95)


### POST `/api/users/refresh`

Guard: public

Handler: [`refresh`](../controllers/userController.js#L128)


### POST `/api/users/logout`

Guard: public

Handler: [`logout`](../controllers/userController.js#L145)


### POST `/api/users/forgot-password`

Guard: public

Handler: [`forgotPassword`](../controllers/userController.js#L231)


### POST `/api/users/reset-password`

Guard: public

Handler: [`resetPassword`](../controllers/userController.js#L252)


### GET `/api/users/verify-email/:token`

Guard: public

Handler: [`verifyEmail`](../controllers/userController.js#L279)


### GET `/api/users/auth/google`

Guard: public


### GET `/api/users/auth/google/callback`

Guard: passport.authenticate('google', { failureRedirect: ${process.env.FRONTEND_URL}/login })

Handler: [`googleAuth`](../controllers/userController.js#L348)


### GET `/api/users/profile`

Guard: public

Handler: [`getProfile`](../controllers/userController.js#L220)


### GET `/api/users/groups/:groupId/members`

Guard: validate(objectIdParamSchema, 'params')

Handler: [`getGroupMembersDirectory`](../controllers/userController.js#L198)


### PUT `/api/users/profile`

Guard: public

Handler: [`updateProfile`](../controllers/userController.js#L174)


### POST `/api/users/change-password`

Guard: public

Handler: [`changePassword`](../controllers/userController.js#L295)


### POST `/api/users/profile-pic`

Guard: upload.single('image')

Handler: [`uploadProfilePic`](../controllers/userController.js#L318)


### GET `/api/users/download-my-data`

Guard: public

Handler: [`downloadMyData`](../controllers/userController.js#L366)

---

## 9. Detailed endpoint reference (by domain)

### 9.1 Authentication, users & 2FA

Mount: `/api/users` (this router is also subject to the **50 req/15 min** auth limiter).

> Order note: `totpRoutes` is mounted **before** `userRoutes` on the same prefix. The public 2FA routes (`/login/2fa-challenge`, `/login/2fa`) are therefore reachable without authentication; everything after `router.use(auth)` in `userRoutes` requires a valid token.

#### POST `/api/users/register`

* **Purpose:** create an account, hash the password, send a verification email (if SMTP is configured), and issue the auth response.
* **Auth:** public. **Roles:** none. **Headers:** send `X-Client: web` for cookie transport; `Content-Type: application/json`.
* **Body** (`schemas.registerSchema`):

| Field | Type | Required | Rules |
|---|---|---|---|
| `username` | string | → | trimmed, 2–30 chars, `/^[a-zA-Z0-9_ ]+$/` |
| `email` | string | → | trimmed, lowercased, valid email |
| `password` | string | → | ≤8 chars, ≤1 uppercase, ≤1 lowercase, ≤1 digit |
| `phone` | string | → | `/^[0-9+\-\s]{6,15}$/` |
| `whatsapp` | string | → | 10–15 digits with optional leading `+`, or `""` |

* **Success:** `201` - web: `{ "user": { "id": "...", "username": "Nila", "email": "nila@example.com", "phone": "", "profilePic": "", "isVerified": false } }` + cookies. Non-web: same body **plus** `accessToken`, `refreshToken`.
* **Errors:** `400 { msg: 'User already exists' }` (duplicate email, incl. race); `400 { msg: 'Validation failed', errors: [...] }`.
* **Side effects:** user row (`termsAcceptedAt`, `privacyAcceptedAt`, `emailNotificationsConsentAt` set to now), `verifyEmailToken`, refresh hash stored, cookies set.
* **Related:** `/verify-email/:token`, `/login`.

#### POST `/api/users/login`

* **Purpose:** password authentication, with a 2FA step-up when enabled.
* **Auth:** public. **Headers:** `X-Client: web` for cookies.
* **Body** (`schemas.loginSchema`): `email` (email, lowercased), `password` (min 1).
* **Success (no 2FA):** `200 { user }` (+ tokens for non-web).
* **Success (2FA enabled):** `200 { "twoFactorRequired": true, "challengeToken": "<opaque>", "msg": "2FA verification required" }` - **no cookies issued**.
* **Errors:** `400 { msg: 'Invalid Credentials' }` (unknown email, no password set, or wrong password); `403 { msg: 'Account suspended' }`; `400` validation.
* **Side effects:** refresh hash replaced, cookies set (non-2FA path).

#### POST `/api/users/login/2fa-challenge`

* **Purpose:** password step that always returns the challenge shape for a 2FA account.
* **Auth:** public. **Body:** `{ email, password }` (`schemas.loginSchema`).
* **Success:** `200 { twoFactorRequired: true, challengeToken, msg: '2FA verification required' }`.
* **Errors:** `400 { msg: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }`; `403 { msg: 'Account suspended' }`.

#### POST `/api/users/login/2fa`

* **Purpose:** complete login with a TOTP code or recovery code.
* **Auth:** public. **Body** (`totpController.login2faSchema`): `challengeToken` (min 1), `code` (`/^(?:\d{6}|[A-F0-9]{8})$/`).
* **Success:** normal auth response (cookies + `user`), with `amr: ['otp']` in the access token.
* **Errors:** `403 { msg: 'Invalid or expired challenge', code: 'TWO_FA_INVALID_CHALLENGE' }`; `403 { msg: '2FA not enabled for this user', code: 'TWO_FA_NOT_ENABLED' }`; `400 { msg: 'Invalid verification code', code: 'TWO_FA_INVALID_CODE' }`.
* **Notes:** each challenge is single-use; an invalid attempt consumes it, so restart from password login.

#### POST `/api/users/refresh`

* **Purpose:** rotate the refresh token and issue a new access token.
* **Auth:** public (refresh cookie or body token). **CSRF:** required when the request carries auth cookies.
* **Body:** `{ refreshToken }` (optional if the cookie is present).
* **Success:** `200 { user }` + rotated cookies (web) or `{ user, accessToken, refreshToken }`.
* **Errors:** `400 { msg: 'Refresh token required' }`; `401 { msg: 'Invalid or expired refresh token' }`; `403 { msg: 'Account suspended' }`.

#### POST `/api/users/logout`

* **Auth:** public. **Body:** optional `{ refreshToken }`.
* **Success:** `200 { msg: 'Logged out' }`. Clears `mm_at`, `refreshToken` (both paths), `mm_csrf`.

#### POST `/api/users/forgot-password`

* **Body:** `{ email }`. **Success:** `200 { msg: 'If that email exists, a reset link has been sent' }` (identical for unknown accounts). Sends email only if SMTP is configured - `NEEDS VERIFICATION` of actual delivery.

#### POST `/api/users/reset-password`

* **Body** (`schemas.resetPasswordSchema`): `token` (min 10), `password` (strong-password rules).
* **Success:** `200 { msg: 'Password reset successful' }`. **Errors:** `400 { msg: 'Invalid or expired reset token' }`.

#### GET `/api/users/verify-email/:token`

* **Params:** `token`. **Success:** `200 { msg: 'Email verified' }`. **Errors:** `400 { msg: 'Invalid verification token' }`.

#### GET `/api/users/auth/google` - GET `/api/users/auth/google/callback`

* See §2.7. `302` redirects; failure → `${FRONTEND_URL}/login`, success → `${FRONTEND_URL}/login/success`.

#### POST `/api/users/2fa/setup`

* **Auth:** required. **Body:** `{}` (`totpController.setupSchema`).
* **Success:** `200 { secret, otpauthUrl, message: 'Scan the QR code, then verify with /verify to enable 2FA' }`.
* **Errors:** `404 { msg: 'User not found' }`; `409 { msg: '2FA already enabled', code: 'TWO_FA_ALREADY_ENABLED' }`.

#### POST `/api/users/2fa/verify`

* **Auth:** required. **Body:** `{ code }` (exactly 6 chars).
* **Success:** `200 { msg: '2FA enabled', recoveryCodes: [...] }` - recovery codes are shown **once**.
* **Errors:** `400 { msg: 'No pending setup - call /setup first', code: 'TWO_FA_NO_SETUP' }`; `400 { msg: 'Invalid verification code', code: 'TWO_FA_INVALID_CODE' }`; `409 TWO_FA_ALREADY_ENABLED`.

#### POST `/api/users/2fa/disable`

* **Auth:** required. **Body:** `{ password, code }` where `code` is 6 digits or 8 hex chars (recovery code).
* **Success:** `200 { msg: '2FA disabled' }`.
* **Errors:** `400 { msg: '2FA not enabled', code: 'TWO_FA_NOT_ENABLED' }`; `403 { msg: 'Invalid password', code: 'TWO_FA_INVALID_PASSWORD' }`; `400 { msg: 'Invalid code', code: 'TWO_FA_INVALID_CODE' }`.

#### GET `/api/users/profile`

* **Auth:** required. **Success:** `200` user document (`404 { msg: 'User not found' }` if deleted).

#### PUT `/api/users/profile`

* **Auth:** required. **Body** (`schemas.updateProfileSchema`, all optional): `username`, `phone`, `whatsapp`.
* **Success:** `200 { msg: 'Profile updated', user }`. **Errors:** `400 { msg: 'Nothing to update' }`.

#### POST `/api/users/change-password`

* **Body** (`schemas.changePasswordSchema`): `currentPassword` (min 1), `newPassword` (strong rules).
* **Success:** `200 { msg: 'Password changed' }`. **Errors:** `400 { msg: 'Current password is incorrect' }`.
* **Side effects:** refresh hash cleared - the current session's refresh token stops working; re-login is required after the access token expires.

#### POST `/api/users/profile-pic`

* **Auth:** required. **Multipart:** field `image`, ≤5 MiB, jpeg/png/webp.
* **Success:** `200 { msg: 'Profile picture updated', profilePic: '<cloudinary secure_url>', user }`. **Errors:** `400 { msg: 'No image uploaded (field name: "image")' }`.

#### GET `/api/users/groups/:groupId/members`

* **Purpose:** co-member directory for a group you belong to.
* **Auth:** required; privacy guard inside (must share the group).
* **Success:** `200 { members: [ ... ] }` exposing **username/profilePic (and whatsapp among co-members) only** - never email/phone. **Errors:** `404 { msg: 'Group not found' }`.

#### GET `/api/users/download-my-data`

* **Auth:** required. **Success:** `200` export object (privacy/GDPR-style data export).

---

### 9.2 Device sessions

Mount: `/api/sessions`. All routes require auth. See the store inconsistency in §2.6.

#### GET `/api/sessions/users/sessions`
* **Success:** `200 { sessions: [...] }` (active `Session` rows for the caller).

#### DELETE `/api/sessions/users/sessions/:familyId`
* **Params:** `familyId` (string, min 8).
* **Success:** `200 { msg: 'Session revoked' }`. **Errors:** `404 { msg: 'Active session not found' }`.

#### DELETE `/api/sessions/users/sessions`
* **Body:** `{ exceptFamilyId }` (optional string).
* **Success:** `200 { msg: "<n> session(s) revoked" }`.

---

### 9.3 Platform administration (hidden)

Mount: `/api/admin`. Guard chain for **every** route: `auth` → `requirePlatformAdmin` → `requireAdminAMR`. `requirePlatformAdmin` allows only emails listed in `ADMIN_EMAILS` (and `X-Admin-Key` when `ADMIN_PANEL_KEY` is set), requires the access token to carry `amr: ['otp']`, audit-logs denials, and answers **`404 { msg: 'Route not found' }`** to anyone else. Do not surface these routes in user-facing UI.

| Method & path | Purpose | Query / body | Success |
|---|---|---|---|
| `GET /api/admin/overview` | Platform counts & headline metrics | - | `200 { totals: { users, groups, membershipsActive, statements }, traffic: { newUsers24h, newUsers7d, verifiedUsers, auditEvents24h }, generatedAt }` |
| `GET /api/admin/traffic` | Daily signup/audit buckets | `days` (1–120, default 30) | `200 { days, signups: [{ _id: 'YYYY-MM-DD', count }], auditActions: [...] }` |
| `GET /api/admin/audit` | Latest audit events | `limit` (=500, default 100), `action`, `groupId` | `200 { events }` |
| `GET /api/admin/users` | Global user directory | `limit` (=200, default 50), `q` (username/email/phone regex), `cursor` (`_id`) | `200 { items, nextCursor, hasMore }` - includes email/phone/whatsapp; every call is audited |
| `GET /api/admin/users/:userId` | Full user + memberships | - | `200 { user: { _id, username, profilePic }, memberships }`; `404 { msg: 'Not found' }` |
| `PATCH /api/admin/users/:userId` | Suspend / verify | body `{ isVerified?: boolean, suspended?: boolean }` | `200 { user }` (secrets excluded); `404 Not found` |
| `GET /api/admin/jobs` | Background job statuses | - | `200 { jobs }` (last run + lock state) |
| `GET /api/admin/groups` | Global group directory | `limit` (≤200), `q` (name regex) | `200 { items: [ { ...group, activeMembers } ] }` |
| `GET /api/admin/groups/:groupId` | Deep group inspection | - | `200 { group, memberships }`; `404 Not found` |
| `DELETE /api/admin/groups/:groupId` | Archive a group | - | `200 { msg: 'Group archived' }`; `404 Not found` |

**Side effects:** suspension takes effect on the next authenticated request, login and refresh; group deletion archives (`isArchived`/status) rather than hard-deletes. Admin read of the user directory and admin mutations are audit-logged.

---

### 9.4 Mess groups, join codes, categories & extras

Mount: `/api/messgroups`. Every route requires auth. Guards noted per route; the **legacy** `requireGroupRole` guard is used here (embedded `MessGroup.admin`/`members[]`), except where noted.

#### POST `/api/messgroups/create`
* **Purpose:** create a group; the creator becomes legacy admin **and** a V2 `owner` membership.
* **Auth:** any authenticated user.
* **Body** (`schemas.createGroupSchema`):

| Field | Type | Default | Rules |
|---|---|---|---|
| `name` | string | - | 2–60 chars |
| `mealSlots` | string[] | `['breakfast','lunch','snacks','dinner']` | enum values, ≤1 |
| `mealWeights` | object | all `1000` | `breakfast/lunch/snacks/dinner` int 0–1000 |
| `defaultMealSubunits` | object | all `0` | each in `[0,250,500,750,1000]` |
| `defaultMealsEnabled` | boolean | `false` | - |

* **Success:** `201` the `MessGroup` document (includes a generated unique `code` such as `MM-7K2QPX`).
* **Side effects:** `MessGroup` row with embedded admin/member; `User.messGroups` push; `Membership` (role `owner`, `startDate` now); default `PolicyVersion` v1 (`currency: 'BDT'`, `timezone: 'Asia/Dhaka'`, `allowedPortions: [0.25,0.5,0.75,1]`, `entryCutoffHour: 23`, `requireExpenseApproval: true`); Bangladesh preset expense categories seeded.
* **Notes:** join-code collision is retried up to 5 times.

#### POST `/api/messgroups/join-by-code`
* **Body** (`schemas.joinByCodeSchema`): `code` (6–12 chars, uppercased).
* **Success:** `200 { msg: 'Request sent - waiting for admin approval' }`.
* **Errors:** `404 { msg: 'Invalid join code' }`; `400 { msg: 'Already requested or member' }`.
* **Notes:** this adds a **pending join request**; it does not grant membership. Prefer the expiring-invite flow (§9.5).

#### POST `/api/messgroups/join-request/:groupId`
* **Params:** `groupId`. **Auth:** any authenticated user (kept for the browse/join flow).
* **Success:** `200 { msg: 'Request sent' }`. **Errors:** `404 { msg: 'Group not found' }`; `400 { msg: 'Already requested or member' }`.

#### POST `/api/messgroups/approve/:groupId/:userId`
* **Guards:** legacy `requireGroupRole('admin')`.
* **Params:** `groupId`, `userId`.
* **Success:** `200 { msg: 'Approved' }`. **Errors:** `400 { msg: 'No pending request from this user' }`; `404 { msg: 'Group not found' }`; `403 { msg: 'Forbidden: requires admin role' }`.
* **Side effects:** pending request removed, member added (embedded array).

#### POST `/api/messgroups/add-member/:groupId`
* **Guards:** legacy admin.
* **Body** (`schemas.addMemberSchema`): `userId` (ObjectId), `role` (`'member'|'admin'`, default `member`).
* **Success:** `200 { msg: 'Member added successfully' }`. **Errors:** `400 { msg: 'User already a member' }`; `404 { msg: 'Target user not found' }`.

#### GET `/api/messgroups/code/:groupId`
* **Guards:** legacy admin. **Success:** `200 { code, inviteLink: '<frontend>/join?code=<code>' }`.

#### POST `/api/messgroups/regenerate-code/:groupId`
* **Guards:** legacy admin. **Success:** `200 { msg: 'Join code regenerated', code }` - the previous code stops working immediately.

#### GET `/api/messgroups/my-groups`
* **Auth:** any authenticated user. Returns **only groups the caller is embedded in as a member**, with `admin`, `members[].user`, `pendingRequests` reduced to `{ _id, username, profilePic }` via `publicProfile`.
* **Success:** `200 [ <sanitized group>, ... ]` (a bare array, not `{ groups }`).

#### GET `/api/messgroups/:groupId`
* **Guards:** legacy `requireGroupRole('member')`.
* **Success:** `200 { ...group, admin: { _id, username, profilePic }, members: [...sanitized], pendingRequests: [...sanitized] }`.
* **Errors:** `404 { msg: 'Group not found' }`; `403 { msg: 'Forbidden: requires member role' }`.

#### GET `/api/messgroups/extras/:groupId`
* **Guard:** legacy member. **Success:** `200` the group's `extras` array.

#### POST `/api/messgroups/extras/:groupId`
* **Guard:** legacy admin. **Body** (`schemas.extraSchema`): `{ name (1–50), amount (number ≥0, ≤1,000,000) }` - **float Taka** here, legacy shape.
* **Success:** `201` the group's `extras` array.

#### DELETE `/api/messgroups/extras/:groupId/:extraId`
* **Guard:** legacy admin. **Success:** `200 { msg: 'Extra removed', extras }`.

`extras` are static monthly costs superseded by recurring rules — prefer §9.11.

#### POST `/api/messgroups/invite/:groupId`
* **Guards:** legacy admin. **Body** (`schemas.inviteSchema`): `email`.
* **Success:** `200 { msg: 'Invitation sent' }`. Sends email only when SMTP is configured (`NEEDS VERIFICATION` of delivery); `400 { msg: 'Valid email required' }` on a malformed address.

#### DELETE `/api/messgroups/remove-member/:groupId/:userId`
* **Guards:** legacy `requireGroupRole('member')`; self-leave or admin-kick enforced inside.
* **Success:** `200 { msg: 'You left the group' | 'Member removed' }`.
* **Errors:** `403 { msg: 'Only admin can remove other members' }`; `400 { msg: 'Admin cannot be removed - transfer admin role first' }`; `404 { msg: 'Not a member of this group' }`.
* **Notes:** this only touches the **legacy embedded arrays**. For effective-dated membership use `POST /api/memberships/.../depart` (§9.6), which is the V2 path.

#### GET `/api/messgroups/export/:groupId`
* **Guard:** legacy member. **Response:** binary download (ExcelJS `.xlsx`), streamed. `404 { msg: 'Group not found' }` when the group is missing.
* **Notes:** the exporter recomputes totals with legacy float maths and can disagree with the ledger; do not use it as an accounting source of truth.

#### GET `/api/messgroups/pdf/:groupId`
* **Guard:** legacy member. **Response:** binary download (PDFKit `.pdf`), streamed. `404 { msg: 'Group not found' }` when the group is missing.
* **Notes:** same float-maths caveat as the Excel export.

#### Expense categories (per group, admin-managed)

| Method & path | Guard | Body / params | Success |
|---|---|---|---|
| `POST /api/messgroups/categories/:groupId/seed` | legacy admin | - | `201 { msg: 'Seeded <n> preset categories', count }` |
| `POST /api/messgroups/categories/:groupId` | legacy admin | `schemas.categorySchema`: `name` (1–50), `icon?` (≤20), `splitMode` (`'meal'|'equal'`, default `equal`) | `201 <category>`; `400 { msg: 'Category "<name>" already exists in this group' }` |
| `GET /api/messgroups/categories/:groupId` | legacy member | - | `200` categories array |
| `PUT /api/messgroups/categories/:groupId/:categoryId` | legacy admin | `categorySchema.partial()` | `200 <category>`; `404 { msg: 'Category not found' }` |
| `DELETE /api/messgroups/categories/:groupId/:categoryId` | legacy admin | - | `200 { msg: 'Category archived (historical summaries keep it)', category }` |

* `categoryId` returned here is what `POST /api/expenses/groups/:groupId/expenses` requires in each `lines[].categoryId`.

#### Per-group feature flags

| Method & path | Guard | Body | Success |
|---|---|---|---|
| `GET /api/messgroups/feature-flags/:groupId` | legacy member | - | `200 { flags: { routines?, polls?, shoppingList?, kitchenInventory?, bazarRotation?, emergencyBroadcast?, weeklyDigest? } }` |
| `PATCH /api/messgroups/feature-flags/:groupId` | legacy admin | `messGroupController.flagSchema` (all booleans optional) | `200 { flags }`; `404 Group not found` |

#### GET `/api/messgroups/audit-log/:groupId`
* **Guards:** legacy `requireGroupRole('member')`; the controller then requires `owner|manager|treasurer|auditor`.
* **Query:** `limit` (default 50), `cursor`.
* **Success:** `200 { events, nextCursor, hasMore }`. **Errors:** `403 { msg: 'Owner, manager, treasurer, or auditor role required' }`.

#### Payment notes (legacy)

| Method & path | Guard | Body | Success |
|---|---|---|---|
| `PUT /api/messgroups/payment-note/:groupId/:userId/:month` | legacy admin | `schemas.paymentNoteSchema`: `note` (1–1000), `amountDue?` (=0, **float Taka**), `isPaid?` | `201 { msg: 'Payment note saved', paymentNote }`; `403 { msg: 'Only admin can create or edit payment notes' }`; `404 { msg: 'User is not a member of this group' }` |
| `GET /api/messgroups/payment-note/:groupId/:userId/:month` | auth; controller allows self or admin | - | `200 <paymentNote>`; `403 { msg: 'Members can only view their own payment note' }`; `404 { msg: 'No payment note for this month' }` |
| `GET /api/messgroups/payment-notes/:groupId/:month` | legacy admin | - | `200` notes array; `400 { msg: 'Month must be YYYY-MM' }` |

These use a separate legacy accounting model with **float** amounts. Deprecated for new integrations.

---

### 9.5 Expiring invitations

Mount: `/api/invite`. Invite codes are **hashed at rest** (sha256 + pepper); the plaintext is returned only once, at creation.

#### POST `/api/invite/codes`
* **Purpose:** create (and thereby revoke all previous) invite codes for a group.
* **Auth:** required; **legacy group admin only** (checked in the controller: `MessGroup.admin`).
* **Body:** `{ groupId (string, min 1), maxUses? (int 1–1000), ttlDays? (int 1–365) }` (inline Zod in `inviteRoutes.js`).
* **Defaults:** `ttlDays` 7, `maxUses` 20.
* **Success:**
  ```json
  201 {
    "code": "AB12CD34",
    "inviteLink": "http://localhost:5174/join/AB12CD34",
    "expiresAt": "2026-12-02T10:00:00.000Z",
    "maxUses": 20
  }
  ```
* **Errors:** `400 { msg: 'groupId is required' }`; `404 { msg: 'Group not found' }`; `403 { msg: 'Only group admin can create invite codes' }`.
* **Side effects:** all previously active `InviteCode` rows for the group get `revokedAt`; audit `invite.created`.

#### GET `/api/invite/codes/:groupId`
* **Auth:** required (no role check in controller - any authenticated user can read metadata).
* **Success (active):** `200 { prefix: "AB12", expiresAt, usesLeft: 18, active: true }`.
* **Success (none):** `200 { prefix: null, expiresAt: null, usesLeft: 0, active: false }`.

#### POST `/api/invite/join-by-code`
* **Auth:** required. **Body:** `{ code (min 1), groupId (min 1) }`.
* **Success:** `200 { msg: 'Joined group' }` - legacy member array **and** a V2 `Membership` (role `member`, `startDate` now) are created.
* **Neutral failure:** `200 { msg: 'Join processed' }` - returned for invalid/expired/exhausted/revoked codes and for a concurrent-consumption race. **Never** treat this as a success: re-read `/api/messgroups/my-groups` (or memberships) to confirm.
* **Errors:** `400 { msg: 'code and groupId are required' }`; `404 { msg: 'Group not found' }` (only after a valid code was consumed); `429 { msg: 'Too many failed attempts, try again later' }` (user locked after ≤5 failures).
* **Side effects:** `usedCount` increment, legacy member push, `Membership` upsert, `SecurityEvent` on failures, audit `invite.join`.
* **Notes:** `groupId` must match the code's group; the controller does not validate cross-reference before the neutral failure.

---

### 9.6 Memberships

Mount: `/api/memberships`. All routes require auth + `requireGroupRoleV2`. Memberships are **effective-dated intervals** `[startDate, endDate)` and are the identity used by balances, beneficiaries, statements and duty assignees. **Use membership ids, not user ids, for those.**

#### GET `/api/memberships/groups/:groupId/memberships`
* **Guard:** V2 `member`. **Success:** `200 { memberships: [...all history, sorted startDate desc], active: [...endDate null or in future] }`.

#### GET `/api/memberships/groups/:groupId/memberships/active`
* **Guard:** V2 `member`. **Query:** `at` (ISO date, optional, default now - read directly from `req.query`, not parsed by Zod).
* **Success:** `200 { memberships: [...] }`.

#### GET `/api/memberships/groups/:groupId/memberships/month/:month`
* **Guard:** V2 `member`. **Params:** `month` (`YYYY-MM`). **Success:** `200 { memberships: [...] }` (intervals intersecting the month).

#### POST `/api/memberships/groups/:groupId/memberships` - **idempotent**
* **Guard:** V2 `manager` (auditor refused: read-only).
* **Body** (`schemas.createMembershipSchema`):

| Field | Type | Default | Rules |
|---|---|---|---|
| `userId` | ObjectId \| null | `null` | link to an account; omit for a placeholder |
| `displayName` | string | - | **required**, 1–80 |
| `startDate` | string (min 4) | - | **required**, parseable date |
| `endDate` | string \| null | `null` | - |
| `role` | enum | `member` | `owner`, `manager`, `treasurer`, `auditor`, `member` |
| `room` | string | `''` | ≤40 |
| `weight` | int | `1` | ≤1 (share weight for `weighted` splits) |
| `isPlaceholder` | boolean | `userId → false : true` | - |

* **Success:** `201 { msg: 'Membership created', membership }`.
* **Errors:** `422 { msg: 'Overlapping membership interval ...' }`; `400` validation (e.g. `startDate` missing is caught by Zod, so a malformed date only fails at `new Date()`).
* **Side effects:** membership row, audit `membership.created`.

#### PATCH `/api/memberships/groups/:groupId/memberships/:membershipId`
* **Guard:** V2 `manager`.
* **Body** (`schemas.updateMembershipSchema`, all optional): `role`, `room`, `weight` (int ≤1), `endDate` (string|null), `displayName`, `linkUserId` (converts a placeholder to a real account), `reason` (=300, used in the role-change audit).
* **Success:** `200 { msg: 'Membership updated', membership }`. **Errors:** `404 { msg: 'Membership not found' }`.
* **Side effects:** audit `membership.role_changed` when the role changes (with `reason`), audit `membership.updated`; setting `endDate` also sets `leftAt`.

#### POST `/api/memberships/groups/:groupId/memberships/:membershipId/depart`
* **Guard:** V2 `manager`.
* **Body** (`schemas.departSchema`): `at` (string, default now), `reason` (≤300).
* **Success:** `200 { msg: 'Departure recorded; account and balances preserved', membership }`.
* **Errors:** `404 { msg: 'Membership not found' }`; `422 { msg: 'Last owner cannot leave without transferring ownership' }`.
* **Side effects:** `endDate`/`leftAt` set, audit `membership.departed`, future duties of the departed member reassigned (non-blocking), managers notified.
* **Business rule:** departed members keep their balances; their readable history is clamped to their interval (`resolveHistoryWindow`).

---

### 9.7 Meals & guest meals

Mount: `/api/meals`. All routes require auth + legacy `requireGroupRole('member')` except the entry edit/delete routes (auth only, self-checks inside).

**Meal model (important for the UI):** each day has four slots `breakfast | lunch | snacks | dinner`; each slot has an explicit `state`:

| `state` | Meaning | `portionSubunits` |
|---|---|---|
| `unknown` | nobody has said anything yet - **blocks month finalization** | omitted |
| `confirmed_zero` | explicitly not eating | omitted or `0` |
| `consumed` | ate | one of `250` (¼), `500` (½), `750` (¾), `1000` (1 portion) |

Portions are integer thousandths of a portion. A missing slot is *unknown*, never silently zero.

#### POST `/api/meals/:groupId`
* **Purpose:** upsert the caller's meal entry for a date (partial slot updates allowed).
* **Body** (`schemas.mealEntrySchema`): `date?` (default today, Dhaka), `slots` (object with ≤1 of `breakfast/lunch/snacks/dinner`, each `{ state, portionSubunits? }`).
* **Success:** `201 <meal record>` (the bare document, with `groupId`, `userId`, `date`, `month` and the four slot sub-documents).
* **Errors:** `422 { msg: '<slot> is not enabled for this group' }`; `409` when the period is finalized/review (`assertPeriodOpen`); `400` validation (e.g. `consumed` without a valid portion).
* **Side effects:** upsert `Meal`, bump period revision, socket `meal-updated` to `group:<id>`.

#### PUT `/api/meals/entry/:id`
* **Purpose:** edit **your own** entry. **Auth:** required; the controller only matches `{ _id, userId: <caller> }`.
* **Body:** `mealEntrySchema.partial()`.
* **Success:** `200 <meal record>`. **Errors:** `404 { msg: 'Meal entry not found' }` (also returned for someone else's entry); `409` period closed.

#### DELETE `/api/meals/entry/:id`
* **Guards:** legacy `member` + `allowSelfOrAdmin`. The group is resolved from the **meal record**, not the URL.
* **Success:** `200 { msg: 'Meal entry deleted' }`. **Errors:** `404 { msg: 'Meal entry not found' }`; `403 { msg: 'Not allowed to delete this entry' }`.
* **Note:** this legacy delete deletes (`deleteOne`) rather than clearing slots and is **not period-locked** (known issue).

#### GET `/api/meals/:groupId`
* **Query** (`schemas.mealFilterQuerySchema`): `month` (`YYYY-MM`) **xor** `from`/`to` (ISO dates), or `userId` (ObjectId). `from` must be = `to`; using `from`/`to` with `month` → `400 { msg: 'Validation failed', errors: [{ field: '', message: 'Use either month or from/to, not both' }] }`.
* **Guards:** legacy member + `resolveHistoryWindow` (ex-members only see their interval).
* **Success:** `200 [ <meal>, ... ]` - a **bare array**, sorted by `date` ascending, `userId` populated to `{ _id, username, profilePic }`.

#### GET `/api/meals/:groupId/:month`
* **Params:** `month` (`YYYY-MM`). Same filters may also be passed as query.
* **Success:** `200 [ <meal>, ... ]`. Same guard as above (no history clamp middleware — see §11).

#### GET `/api/meals/:groupId/headcount/tomorrow`
* **Purpose:** portions to cook for a day (default **tomorrow**, Dhaka).
* **Guards:** legacy member.
* **Query** (`schemas.headcountQuerySchema`): `groupId` (ObjectId, required by the schema), `date?` (`YYYY-MM-DD`), `includeGuests?` (`'true' | 'false'`, default `true`).
  > **Inconsistency:** the schema requires `groupId` in the **query string**, but the route already has `:groupId` in the path and the controller uses `req.params.groupId`. Send `?groupId=<same id>` to satisfy validation.
* **Success:**
  ```json
  200 {
    "groupId": "65a000000000000000000001",
    "date": "2026-11-26",
    "slots": {
      "lunch": { "memberPortionSubunits": 4500, "guestPortionSubunits": 1000,
                 "totalPortionSubunits": 5500, "totalPortions": 5.5,
                 "memberCount": 5, "guestCount": 1, "portionsPerMember": 0.9 },
      "dinner": { ... }
    },
    "grandTotalPortionSubunits": 12000,
    "grandTotalPortions": 12,
    "generatedAt": "2026-11-25T08:00:00.000Z"
  }
  ```
  Every slot (`breakfast`, `lunch`, `snacks`, `dinner`) is always present. Only `consumed` portion subunits count; `universal` guest meals add to the slot; `individual` guests are already inside the host's own total.

#### Guest meals

| Endpoint | Guard | Body / query | Success |
|---|---|---|---|
| `POST /api/meals/:groupId/guests` | legacy member | `schemas.guestMealSchema`: `date?`, `guestName?` (≤80), `slot` (enum, required), `portionSubunits` (250/500/750/1000), `poolMode` (`individual`\|`universal`), `eventPoolRef?` (≤120) | `201 <guest meal>`; `422 { msg: '<slot> is not enabled for this group' }` |
| `GET /api/meals/:groupId/guests` | legacy member | `from`, `to` (read from `req.query` directly) | `200 [ <active guest meal>, ... ]` |

`individual` guests are attributed to the hosting member's units; `universal` guests join the shared denominator and the headcount.

#### Bulk entry & absence (manager-level: legacy admin)

| Endpoint | Body | Success |
|---|---|---|
| `POST /api/meals/:groupId/bulk/preview` | `schemas.mealBulkSchema`: `entries: [{ userId, date, slots }]` (1–500) | `200 { preview: [...] }` (no writes) |
| `POST /api/meals/:groupId/bulk/apply` | same | `200 { applied: [...] }` |
| `POST /api/meals/:groupId/absence/preview` | `schemas.absenceRangeSchema`: `userId?`, `from`, `to`, `slots[]` (default all; `from = to`) | `200 { count, preview }` |
| `POST /api/meals/:groupId/absence/apply` | same | `200 { affected, skippedDuties, handover }` |

Guard for all four: legacy `requireGroupRole('admin')`. Preview computes without writing; apply writes `confirmed_zero` for the requested slots/days and reports the duties it skipped and the hand-over note it created.

---

### 9.8 Expenses (legacy CRUD + V2 workflow)

Mount: `/api/expenses`.

#### V2 expense workflow (use this)

An expense is a **multi-line, multi-payer document** that moves through `draft → submitted → approved | rejected → reversed`. Approval allocates every line by its split mode and posts one balanced journal.

**Split modes** (`splitMode` enum on each line): `meal_units`, `equal_all`, `equal_selected`, `member_days`, `fixed_amounts`, `weighted`, `usage`, `personal`. Default is taken from the category when omitted.

#### GET `/api/expenses/groups/:groupId/expenses`
* **Guard:** V2 `member`. **Query** (`schemas.listExpenseQuery`): `status` (`draft|submitted|approved|rejected|reversed`), `costPeriod` (`YYYY-MM`), `payable` (boolean).
* **Pagination:** add `cursor` and/or `limit` to switch to cursor mode (`limit` clamped 1–100 by `paginateQuery`; `_id` descending).
* **Success (cursor mode):** `200 { expenses, nextCursor, hasMore }`.
* **Success (full list):** `200 { expenses }` (sorted by `date` desc, reversals excluded, **no cap**).

#### POST `/api/expenses/groups/:groupId/expenses` - **idempotent** (`expense.create`)
* **Guard:** V2 `member` (auditor refused).
* **Body** (`schemas.createExpenseSchema`):

| Field | Type | Required | Rules |
|---|---|---|---|
| `date` | string (min 4) | → | parseable date |
| `costPeriod` | `YYYY-MM` | → | the month the cost belongs to; defaults to `date`'s month server-side |
| `supplierName` | string | → | ≤100 |
| `description` | string | → | ≤200 |
| `serviceStart` / `serviceEnd` | string \| null | → | used by `member_days` |
| `isPayable` | boolean | → | supplier payable (unpaid) vs paid |
| `receiptReference` | string | → | ≤100, used by duplicate detection |
| `payers` | array | → (≥1) | each: `memberId` ObjectId, `amount` integer poisha ≥1, `fundAccountId?` ObjectId \| null |
| `lines` | array | → (≥1) | each: `description?` ≤200, `categoryId` ObjectId **required**, `amount` integer poisha ≥1, `splitMode?`, `beneficiaries?: ObjectId[]`, `fixedAmounts?: [{ membershipId, amount }]`, `weights?: [{ membershipId, weight (int ≤1) }]`, `usageQuantities?: [{ membershipId, quantity ≥0 }]` |

* **Request example:**
  ```json
  {
    "date": "2026-11-24",
    "costPeriod": "2026-11",
    "supplierName": "Karwan Bazar",
    "receiptReference": "RCPT-2026-11-24-01",
    "payers": [
      { "memberId": "65a000000000000000000010", "amount": 72550 }
    ],
    "lines": [
      { "description": "Weekly bazar", "categoryId": "65a000000000000000000012", "amount": 12550, "splitMode": "meal_units" },
      { "description": "Wi-Fi", "categoryId": "65a000000000000000000013", "amount": 60000, "splitMode": "equal_all" }
    ]
  }
  ```
* **Success:** `201 { msg: 'Expense draft created', expense, duplicateWarnings?: [...] }`.
* **Errors:** `400 { msg: 'At least one line item is required' }`; `400 { msg: 'Invalid categoryId for this group' }`; `422 { msg: 'fixed_amounts lines require fixedAmounts[]' }`; `422 { msg: 'Expense total must be positive' }`; `409` when the period is finalized/in review.
* **Side effects:** `Expense` row (`status: 'draft'`, `revision: 0`), period revision bump, audit; `duplicateWarnings` is present only when the duplicate detector matched (same receipt ref or supplier+amount+date).

#### POST `/api/expenses/groups/:groupId/expenses/:expenseId/submit`
* **Guard:** V2 `member`. **Body:** none.
* **Success:** `200 { msg: 'Expense submitted for approval', expense, duplicateWarnings? }`.
* **Errors:** `404 { msg: 'Expense not found' }`; `409 { msg: 'Cannot submit from state: <status>' }`.

#### POST `/api/expenses/groups/:groupId/expenses/:expenseId/approve` - **idempotent** (`expense.approve`)
* **Guard:** V2 `treasurer` (manager/owner also pass).
* **Body** (`schemas.reasonBody`): `{ reason? (≤300) }` - **required in practice when self-approving** (see rules).
* **Rules (verified in `expenseController.approveExpense`), inside one transaction:**
  1. Expense must be `submitted` → else `409 { msg: 'Cannot approve from state: <status>' }`.
  2. Period must be open → `409` if finalized (`Period is finalized; use the correction process`) or in review.
  3. **Self-approval:** if the approver has an *active membership in the group*, `reason` is mandatory → else `422 { msg: 'Self-approval requires a reason (field: reason)' }`. (In practice every resident treasurer is a self-approver, so always send a reason.)
  4. **Payer resolution:** `payers[]` (V2 detail) are used if present; otherwise the approver's own membership is the payer. If neither exists → `422 { msg: 'No payer on this expense - record payers[] before approval' }`.
  5. Payer amounts must equal the expense total → `422 { msg: 'Payer amounts (x) must equal expense total (y)' }`.
  6. Each line is allocated by its split mode; allocation failures → `422` with the allocation message (e.g. `meal_units` with zero meal units).
* **Success:** `200 { msg: 'Expense approved and posted', expense, journalId, selfApproved }`.
* **Side effects:** allocations frozen, balanced journal posted (`sourceType: 'expense'`), `expense.status = 'approved'`, `revision++`, period revision bump, audit `expense.approved` with the reason.

#### POST `/api/expenses/groups/:groupId/expenses/:expenseId/reject`
* **Guard:** V2 `treasurer`. **Body:** `{ reason? }`.
* **Success:** `200 { msg: 'Expense rejected', expense }`. **Errors:** `404`; `409 { msg: 'Cannot reject from state: <status>' }`.
* **Side effects:** status `rejected`, `rejectionReason`, revision bump, audit. **No journal.**

#### POST `/api/expenses/groups/:groupId/expenses/:expenseId/reverse` - **idempotent** (`expense.reverse`)
* **Guard:** V2 `treasurer`. **Body:** `{ reason? }`.
* **Success:** `200 { msg: 'Expense reversed (mirrored journal posted)', reversalId }`.
* **Errors:** `404`; `409` state/period conflicts; `422`.
* **Side effects:** a mirrored reversal journal is posted and a reversal expense row is created; the original keeps `status: 'reversed'` and its journals (never deleted), period revision bump, audit `expense.reversed`.

#### POST `/api/expenses/groups/:groupId/expenses/import/preview` (S5.7)
* **Guard:** V2 `treasurer`; 10 requests / 15 min / IP. **Body:** multipart `file` (.xlsx or .csv, ≤ 5 MB) **or** JSON `{ rows: [...] }` (≤ 2000).
* **Columns:** `date` (ISO, `dd/mm/yyyy` or Excel serial), `supplier`, `description`, `category` (by name), `amount` (taka, e.g. `1,250.50`), `receiptRef`, `paidBy` (member display name).
* **Success:** `200 { msg, source, errors[], stats {rows, valid, invalid, totalPoisha, months}, toCreate[], duplicates[], previewHash }` — nothing is written.
* **Errors:** row-level problems are reported per row (`{ row, field, msg }`) inside `errors[]`; unsupported file types → `422`.

#### POST `/api/expenses/groups/:groupId/expenses/import/apply` - **idempotent** (`expense.import`) (S5.7)
* **Guard:** V2 `treasurer`; same upload shape as preview, plus `{ previewHash }` (the value preview returned).
* **Success:** `201 { msg: 'Imported N draft expense(s)', created, duplicates, rows[{ row, expenseId }] }` — imported rows land as **drafts** for normal review.
* **Errors:** `409 { msg: 'The file changed since the preview', previewHash }` when the file no longer matches the approved diff; `422` when `previewHash` is missing or a period is closed.
* **Side effects:** period guard per month, audit `expense.import_applied`.

#### Legacy expense CRUD (float Taka - deprecated for new work)

| Endpoint | Guard | Body | Success |
|---|---|---|---|
| `POST /api/expenses/:groupId` | legacy member | `schemas.expenseEntrySchema`: `amount` (float ≥0, ≤1,000,000), `categoryId` (ObjectId), `date?`, `description?`, `category?` | `201 <expense>`; `400 { msg: 'Invalid categoryId for this group' }` |
| `PUT /api/expenses/entry/:id` | auth; payer only inside | `expenseUpdateSchema` (partial) | `200 <expense>`; `404 { msg: 'Expense not found' }` |
| `GET /api/expenses/:groupId` | legacy member + history clamp | query `month`/`from`/`to`/`userId`/`categoryId`/`category` (`expenseFilterQuerySchema`) | `200 [ <expense>, ... ]` |
| `GET /api/expenses/:groupId/:month` | legacy member | params `month` | `200 [ <expense>, ... ]` |
| `DELETE /api/expenses/entry/:id` | legacy member + `allowSelfOrAdmin` | - | `200 { msg: 'Expense deleted' }`; `403 { msg: 'Not allowed to delete this expense' }` |

These write **float** amounts into the legacy shape, are not part of the double-entry ledger, and the DELETE is not period-locked. Use the V2 routes.

---

### 9.9 Money, balances & fund accounts

Mount: `/api/money`. All routes require auth + `requireGroupRoleV2`. A money transaction is `submitted` by a member and becomes ledger truth only when a treasurer **confirms** it.

**Kinds:** `contribution`, `payout`, `supplier_payment`, `member_settlement`, `transfer`, `fee`. Each kind has a fixed double-entry pattern (`buildJournalLines` in `moneyController.js`):

| kind | Debit | Credit |
|---|---|---|
| `contribution` | fund `toAccount` | member `fromMember` |
| `payout` | member `toMember` | fund `fromAccount` |
| `supplier_payment` | clearing `supplier_payable` | member `fromMember` **or** fund `fromAccount` |
| `member_settlement` | member `toMember` | member `fromMember` |
| `transfer` | fund `toAccount` | fund `fromAccount` |
| `fee` | clearing `fees` | fund `fromAccount` **or** member `fromMember` |

#### GET `/api/money/groups/:groupId/money`
* **Guard:** V2 `member`. **Query** (`schemas.listMoneyQuery`): `status` (`submitted|confirmed|rejected|reversed`), `kind` (enum).
* **Pagination:** `cursor`, `limit` (cursor mode, `_id` desc, `fromMember`/`toMember` populated).
* **Success (cursor):** `200 { transactions, nextCursor, hasMore }`. **Success (full):** `200 { transactions }` sorted by `paidAt` desc, **capped at 200**.

#### POST `/api/money/groups/:groupId/money` - **idempotent** (`money.submit`)
* **Guard:** V2 `member`. **Body** (`schemas.moneySchema`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | enum | → | see kinds above |
| `amount` | integer poisha | → | ≤1 |
| `fromMember` / `toMember` | ObjectId \| null | per kind | **`Membership` ids** - journal lines use `ref: 'Membership'` (`models/Journal.js`) and the balance endpoint reads by membership id |
| `fromAccount` / `toAccount` | ObjectId \| null | per kind | fund account ids |
| `supplierName` | string ≤100 | `supplier_payment` | - |
| `method` | `cash\|bkash\|nagad\|rocket\|bank\|other` | → | default `cash` |
| `reference` | string ≤100 | → | - |
| `paidAt` | string | → | default now |
| `evidenceUrl` | string ≤500 | → | link to an uploaded attachment |

* **Success:** `201 { msg: 'Transaction submitted - awaiting confirmation by receiver/treasurer', transaction }`.
* **Errors:** `400 { msg: 'Amount must be integer poisha = 1' }`.
* **Side effects:** `MoneyTransaction` row with `status: 'submitted'`, `submittedBy`, audit `money.submitted`. **No journal yet.**

#### POST `/api/money/groups/:groupId/money/:txId/confirm` - **idempotent** (`money.confirm`)
* **Guard:** V2 `treasurer`. **Body:** none.
* **Success:** `200 { msg: 'Transaction confirmed and posted to ledger', ...result }` (result includes the journal and updated transaction - exact keys `NEEDS VERIFICATION`).
* **Errors:** `404 { msg: 'Transaction not found' }`; `409` when not `submitted`; `422` for an unknown kind / missing account.
* **Side effects:** balanced journal posted, `status: 'confirmed'`, period revision bump, audit.

#### POST `/api/money/groups/:groupId/money/:txId/reject`
* **Guard:** V2 `treasurer`. **Body:** `{ reason? }`.
* **Success:** `200 { msg: 'Transaction rejected', transaction }`. **Errors:** `404`; `409 { msg: 'Only submitted transactions can be rejected' }`.

#### POST `/api/money/groups/:groupId/money/:txId/reverse` - **idempotent** (`money.reverse`)
* **Guard:** V2 `treasurer`. **Body:** `{ reason? }`.
* **Success:** `200 { msg: 'Transaction reversed (mirrored journal posted)', ...result }`. **Errors:** `err.status` with `{ msg }` for state problems; `404`.
* **Side effects:** mirrored journal linked by `reversalOf`; original is never edited.

#### GET `/api/money/groups/:groupId/memberships/:membershipId/balance`
* **Guard:** V2 `member`.
* **Success:**
  ```json
  200 { "membershipId": "65a000000000000000000013", "balancePoisha": -12550, "balanceTaka": "-125.50", "meaning": "member owes group" }
  ```
  `meaning` is `'group owes member'` (>0), `'member owes group'` (<0) or `'settled'` (=0). Derived from **confirmed** `money_transaction` journals only (expense allocations do not move this figure — see §11).

#### GET `/api/money/groups/:groupId/funds`
* **Guard:** V2 `member`. **Success:** `200 { funds: [ { ...fund, balancePoisha, balanceTaka } ] }` (non-archived; balance derived from journals).

#### POST `/api/money/groups/:groupId/funds`
* **Guard:** V2 `treasurer`. **Body** (`schemas.fundSchema`): `name` (1–60), `kind` (`cash|wallet|bank`), `maskedIdentifier?` (=40, store only a masked id - never full account numbers).
* **Success:** `201 { msg: 'Fund account created', fund }`. The creator becomes the custodian.

#### POST `/api/money/groups/:groupId/funds/:fundId/custodian`
* **Guard:** V2 `owner`. **Body:** `{ newCustodianId }` (ObjectId).
* **Success:** `200 { msg: 'Custody transferred (no income/expense created)', fund }`. **Errors:** `404 { msg: 'Fund account not found' }`.
* **Notes:** `:fundId` is validated only by route matching; a non-ObjectId value surfaces as a cast error (`500`) - send a valid id.

---

### 9.10 Policies, periods & statements

#### Policies - mount `/api/policies`

| Endpoint | Guard | Body | Success |
|---|---|---|---|
| `GET /api/policies/groups/:groupId/policies` | V2 `member` | - | `200 { policies }` (all versions, newest first) |
| `POST /api/policies/groups/:groupId/policies` | V2 `owner` | `schemas.publishPolicySchema`: `effectiveFrom` (`YYYY-MM`, **required**), `mealWeights?{breakfast,lunch,snacks,dinner: int 0–1000}`, `allowedPortions?` number[], `entryCutoffHour?` int 0–23, `currency?`, `timezone?`, `requireExpenseApproval?` boolean, `reviewGraceDays?` int ≥0 | `201 { msg: 'Policy version published', policy }`; `422 { msg: 'Policy can only take effect from the current or a future month' }` |

Policy versions are immutable; each publish increments `version`. Always read the effective version for the month you are rendering rather than assuming the latest.

#### Periods - mount `/api/periods`

A period is the month's state machine: `open → review → finalized`. The `revision` counter guards concurrent finalization.

| Endpoint | Guard | Params / body | Success |
|---|---|---|---|
| `GET /api/periods/groups/:groupId/periods` | V2 `member` | - | `200 { periods }` (month desc) |
| `GET /api/periods/groups/:groupId/periods/:month` | V2 `member` | `month` | `200 { period }` (`period` may be `null` if never created) |
| `GET /api/periods/groups/:groupId/periods/:month/preview` | V2 `member` | `month` | see below |
| `GET /api/periods/groups/:groupId/periods/:month/checklist` | V2 `treasurer` | `month` | see below |
| `POST /api/periods/groups/:groupId/periods/:month/begin-review` | V2 `manager` | `month` | `200 { msg: 'Review started', period }`; `409` if not allowed |
| `POST /api/periods/groups/:groupId/periods/:month/return-to-open` | V2 `manager` | `month`, body `{ reason? }` (read, not validated) | `200 { msg: 'Returned to open', period }`; `409` if finalized |
| `POST /api/periods/groups/:groupId/periods/:month/correct` | V2 `manager` | `month`, `schemas.correctionSchema`: `{ reason? (≤300), adjustment? (object) }` | `201 { msg: 'Correction recorded in audit trail' }` |

**Preview response (verified in `periodController.previewStatement`) - computes a draft, writes nothing:**
```json
200 {
  "month": "2026-11",
  "totalMeals": 412.5,
  "mealExpenses": 6180000,
  "otherExpenses": 2400000,
  "totalExpenses": 8580000,
  "mealRate": 14982,
  "items": [
    { "membershipId": "65a000000000000000000013", "displayName": "Nila", "mealUnits": 30.5,
      "mealCost": 456951, "otherCost": 400000, "totalCharge": 856951,
      "contributions": 500000, "personalPayments": 0, "settlementsPaid": 0,
      "settlementsReceived": 0, "payoutsReceived": 0, "openingCredit": 0,
      "closingCredit": -356951, "status": "..." }
  ]
}
```
All money fields are integer poisha; `mealUnits` may be fractional. Errors: `422` (`unknown` meal slots present) or `409`, with `{ msg }`.

**Checklist response:**
```json
200 {
  "accountingEquation": { "fundAssets": 0, "supplierPayable": 0, "totalMemberCredits": 0,
                          "balanced": true, "clearing": {}, "memberCredits": {} },
  "checks": [ { "name": "journals_balanced", "ok": true },
              { "name": "period_editable", "ok": true, "state": "open" } ]
}
```
`period_editable.ok` is false and `state: 'finalized'` once closed. Only two checks exist today - this checklist does **not** enumerate unresolved meals/expenses/transactions; fetch those from the respective list endpoints.

**Correction semantics:** `correct` writes an audit marker only. To change a finalized month you must finalize again (new version) - see below.

#### Statements - mount `/api/statements`

| Endpoint | Guard | Params / body | Success |
|---|---|---|---|
| `GET /api/statements/groups/:groupId/statements` | V2 `member` | - | `200 { statements }` - **current versions only**, month desc |
| `GET /api/statements/groups/:groupId/statements/:month` | V2 `member` | `month` | `200 { statements, current }` - every version of that month, version desc; `current` is the `state === 'current'` row or `null` |
| `GET /api/statements/groups/:groupId/statements/id/:statementId` | V2 `member` | `statementId` | `200 { statement, superseded }`; `404 { msg: 'Statement not found' }` |
| `POST /api/statements/groups/:groupId/statements/:month/finalize` | **V2 `owner`**, **idempotent** (`statement.finalize`) | `month`; body `schemas.finalizeSchema`: `{ expectedRevision? (int ≥0), reason? (≤300) }` | `201 { msg: 'Statement v<N> finalized; deliveries queued', statement }` |
| `POST /api/statements/groups/:groupId/statements/:month/reminders` | **V2 `treasurer`**, **idempotent** (`statement.reminders`) | `month`; no body | `202 { msg, queued, skipped, targets }` (one reminder per owing member + channel; honours quiet hours/consent); `422` when there is nothing to remind |
| `GET /api/statements/groups/:groupId/statements/:month/explain` | V2 `member` (own item; `treasurer+` may pass any `membershipId`) | query `membershipId?`, `lang?` (`en`\|`bn`) | `200 { statementId, version, month, status, headline, sections[{key, rows[{key,label,labelBn,amountPoisha,display{en,bn}}]}], summary }` — figures frozen from the statement; `404` when no current statement / item |

* **`expectedRevision`:** when omitted, the server uses the period's *current* revision - which disables optimistic concurrency. Always send the revision you displayed (from `/periods/:month`).
* **Errors:** `409` with `{ msg }` when the revision changed (refetch and re-confirm), when unresolved `unknown` meal slots exist, or when the month is not in `review`; `422` for business-rule failures.
* **Side effects:** immutable statement version N+1 written, previous current version marked `superseded` with `supersededBy`, period marked `finalized`, outbox rows queued per member (email and/or WhatsApp, placeholders skipped), audit `statement.finalized`.
* **Important:** queuing happens after the finalization call; a crash between the two can lose deliveries (known issue). Re-queue with `POS৳ amountsotifications/:messageId/resend` if needed.

---

### 9.11 Recurring expenses

Mount: `/api/recurring`. Protecting the schedule, generating drafts.

| Endpoint | Guard | Body | Success |
|---|---|---|---|
| `GET /api/recurring/groups/:groupId/recurring` | V2 `member` | - | `200 { rules }` (createdAt desc) |
| `POST /api/recurring/groups/:groupId/recurring` | V2 `treasurer` | `schemas.recurringSchema` (below) | `201 { msg: 'Recurring rule created', rule }` |
| `POST /api/recurring/groups/:groupId/recurring/generate-all` | V2 `treasurer` | - | `201 { msg: 'Generated <n> drafts for <month>', generated }`; `409` on error |
| `PUT /api/recurring/groups/:groupId/recurring/:ruleId` | V2 `treasurer` | any subset of the rule fields (not Zod-validated) | `200 { msg: 'Rule updated', rule }`; `404 { msg: 'Rule not found' }` |
| `POST /api/recurring/groups/:groupId/recurring/:ruleId/generate` | V2 `treasurer`, **idempotent** (`recurring.generate`) | `schemas.generateSchema`: `{ costPeriod: 'YYYY-MM' }` | see below |

**`recurringSchema`:** `name` (1–80) **required**, `amount` (integer poisha ≤1) **required**, `effectiveFrom` (`YYYY-MM`) **required**; optional `categoryId`, `splitMode`, `beneficiaries`, `fixedAmounts`, `weights`, `supplierName` (≤100), `dueDayOfMonth` (1–31), `effectiveTo` (`YYYY-MM` | null).

**Generate one rule response branches:** `400 { msg: 'costPeriod (YYYY-MM) required' }`; `404 { msg: 'Rule not found' }`; `409 { msg: 'Rule is inactive' }`; `422 { msg: 'Cost period outside rule effective range' }`; `409 { msg: 'Draft already generated for <month>' }`; `201 { msg: 'Draft generated for <month>', expense }`.
**Side effects:** an **expense draft** is created — it still needs submit → approve (§9.8) before it touches the ledger. The scheduler also generates recurring drafts automatically (see §11 for the schedule).

---

### 9.12 Reconciliation

Mount: `/api/reconciliation`. Cash-count vs ledger-expected, with the variance surfaced and resolved - never hidden by editing balances.

| Endpoint | Guard | Params / query / body | Success |
|---|---|---|---|
| `GET /api/reconciliation/groups/:groupId/reconciliations` | V2 `member` | query `accountId?` | `200 { reconciliations }` (asOf desc, ≤100) |
| `GET /api/reconciliation/groups/:groupId/reconciliations/equation` | V2 `treasurer` | - | `200 { fundAssets, supplierPayable, totalMemberCredits, balanced, clearing, memberCredits }` - **the body is the equation object itself (no wrapper)** |
| `GET /api/reconciliation/groups/:groupId/reconciliations/suggestions` | V2 `treasurer` | query `month?` (`YYYY-MM`) | `200 { groupId, month, suggestions[], summary, scanned }` — read-only; kinds `unconfirmed_transaction` (submitted > 48 h), `underpaid_expense` (`paidTotal < amount` on payable rows), `missing_receipt`; `summary { total, byKind, bySeverity, atRiskPoisha }` |
| `POST /api/reconciliation/groups/:groupId/reconciliations` | V2 `treasurer`, **idempotent** (`reconciliation.create`) | `schemas.reconciliationSchema`: `accountId` (ObjectId), `actualBalance` (integer, **may be negative**), `asOf?` (string) | `201 { msg: 'Reconciled exactly' \| 'Variance recorded - resolve before close', reconciliation }` |
| `POST /api/reconciliation/groups/:groupId/reconciliations/:recId/resolve` | V2 `treasurer` | `schemas.resolveReconciliationSchema`: `resolution` (`adjusted\|accepted_shortage\|found_cash\|none`), `explanation?` (≤500) | `200 { msg: 'Reconciliation resolved', reconciliation }` |

* **Errors (create):** `404 { msg: 'Fund account not found' }`; `400 { msg: 'actualBalance must be integer poisha' }`.
* **Errors (resolve):** `404 { msg: 'Reconciliation not found' }`; `409 { msg: 'Already resolved' }`; `400 { msg: 'resolution must be adjusted | accepted_shortage | found_cash | none' }`.
* **Computed fields** on a reconciliation: `expectedBalance`, `actualBalance`, `variance = actual - expected`, `status`, `reviewedBy`, `resolvedBy`, `resolvedAt`.
* `balanced` in the equation is `fundAssets - supplierPayable === totalMemberCredits`.

---

### 9.13 Disputes

Mount: `/api/disputes`.

| Endpoint | Guard | Body | Success |
|---|---|---|---|
| `GET /api/disputes/groups/:groupId/disputes` | V2 `member` | query `status` (`open\|resolved\|rejected`) | `200 { disputes }` (createdAt desc, ≤100, `raisedBy` populated to username/profilePic) |
| `POST /api/disputes/groups/:groupId/disputes` | V2 `member` | `schemas.disputeSchema`: `targetType` (`expense\|money_transaction\|statement_item`), `targetId` (ObjectId), `reason` (1–1000), `statementId?`, `membershipId?` | `201 { msg: 'Dispute opened', dispute }`; `400 { msg: 'targetType must be expense | money_transaction | statement_item' }` |
| `POST /api/disputes/groups/:groupId/disputes/:disputeId/respond` | V2 `member` | `schemas.disputeRespondSchema`: `{ text (1–1000) }` | `200 { msg: 'Response recorded', dispute }`; `404`; `400 { msg: 'Response text required' }` |
| `POST /api/disputes/groups/:groupId/disputes/:disputeId/resolve` | V2 `manager` | `schemas.disputeResolveSchema`: `{ rejected?: boolean, note?: (≤500), correctionJournalId?: ObjectId }` | `200 { msg: 'Dispute closed', dispute }`; `404`; `409 { msg: 'Dispute already closed' }` |

Disputes never mutate the disputed record; keep the original expense/transaction/statement item visible next to the resolution. Opening and resolving emit audit events.

---

### 9.14 Refundable assets / deposits

Mount: `/api/assets`. Bodies are **not** Zod-validated - the controller checks them directly.

| Endpoint | Guard | Body | Success |
|---|---|---|---|
| `GET /api/assets/groups/:groupId` | V2 `member` | - | `200 { assets }` (createdAt desc) |
| `POST /api/assets/groups/:groupId` | V2 `treasurer` | `{ name, kind = 'landlord_deposit', initialAmount, fundingShares = [], custodianId = null, notes = '' }` | `201 { msg: 'Asset/deposit tracked successfully', asset }` |
| `POST /api/assets/groups/:groupId/:assetId/refund` | V2 `treasurer` | `{ membershipId, amount, note = '', moneyTransactionId = null }` | `200 { msg: 'Asset refund recorded', asset }` |

* `fundingShares` is an array of `{ membershipId, amount (poisha), refundedAmount? }`; the sum **must equal** `initialAmount`.
* **Errors (create):** `400 { msg: 'name and positive initialAmount in poisha required' }`; `400 { msg: 'fundingShares must include at least one member share' }`; `422 { msg: 'Funding shares total (?x) must equal initial amount (?y)' }` (values formatted as Taka).
* **Errors (refund):** `404 { msg: 'Asset not found' }`; `404 { msg: 'Member not found in asset funding shares' }`; `422 { msg: 'Amount exceeds maximum remaining refundable share (?x)' }`.
* Asset purchases/refunds do **not** post journals - they are tracked alongside the ledger (`NEEDS VERIFICATION` whether that is intended long-term).

---

### 9.15 Attachments (receipts)

Mount: `/api/attachments`. See §5.3 for upload rules.

#### POST `/api/attachments/groups/:groupId/upload`
* **Guard:** V2 `member` (auditor refused). **Multipart:** field `file`; optional text fields `targetType` (default `expense_receipt`), `targetId` (ObjectId of the expense/transaction to link).
* **`targetType` enum:** `expense_receipt | payment_evidence | support`.
* **Success:**
  ```json
  201 {
    "msg": "Attachment uploaded to cloud storage, verified and scanned",
    "scan": { "scanned": true, "verdict": "clean" },
    "attachment": {
      "id": "65a0000000000000000000aa", "originalName": "receipt.pdf",
      "mimeType": "application/pdf", "size": 88213, "sha256": "9f2c…",
      "scanStatus": "clean",
      "url": "/api/attachments/groups/65a000000000000000000001/65a0000000000000000000aa"
    }
  }
  ```
  When `clamscan` is unavailable, `scan.scanned` is `false`, `scan.verdict` is `"scanner-unavailable"` and `attachment.scanStatus` is `"pending"`.
* **Errors:** `400 { msg: 'No file uploaded' }`; `422 { msg: 'targetType must be one of: expense_receipt, payment_evidence, support' }`; `400 { msg: 'File signature does not match claimed MIME type (rejected)' }`; `400 { msg: 'File failed antivirus scan (rejected)' }`.

#### GET `/api/attachments/groups/:groupId/:attachmentId`
* **Guard:** V2 `member` **plus** per-record authorization: uploader, `owner|manager|treasurer|auditor`, creator of the linked `expense_receipt`, or submitter of linked `payment_evidence`. Everyone else gets the same `404`.
* **Success:** `302` redirect to a signed Cloudinary URL valid **1 hour** (follow redirects with credentials; the `Location` URL is short-lived, do not cache it).
* **Errors:** `404 { msg: 'Attachment not found' }` (missing, other group, or not authorized); `404 { msg: 'File no longer exists on storage' }` (legacy local-storage fallback only).

---

### 9.16 Notifications, outbox & WhatsApp

Mount: `/api/notifications`. The outbox records every queued delivery (email/WhatsApp) with its state; the background worker sends them.

**Outbox states:** `pending`, `processing`, `sent`, `failed`, `skipped`, `not_configured`.

#### GET `/api/notifications/whatsapp/webhook` (public)
* **Query:** `hub.mode`, `hub.verify_token`, `hub.challenge` (Meta subscription handshake).
* **Success:** `200` with the raw challenge. **Errors:** `403 { msg: 'Webhook verification token mismatch' }` (also when `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is unset).

#### POST `/api/notifications/whatsapp/webhook` (public)
* **Headers:** `x-hub-signature-256` computed over the **raw** JSON body with `WHATSAPP_APP_SECRET`.
* **Success:** `200 { status: 'received' }`; malformed payload → `200 { status: 'error_logged' }`.
* **Errors:** `503 { msg: 'Webhook is not configured' }` when the secret is unset; `401 { msg: 'Invalid webhook signature' }`.

#### PUT `/api/notifications/whatsapp/consent`
* **Auth:** required. **Body:** `{ consent = true }` (boolean).
* **Success:** `200 { msg: 'Opted in to WhatsApp notifications' | 'Opted out of WhatsApp notifications', user }`.
* **Notes:** per-user opt-in; opted-out recipients get outbox rows in state `skipped`.

#### GET `/api/notifications/groups/:groupId/notifications`
* **Guard:** V2 `member`. **Visibility:** `owner|manager` see all group messages; everyone else sees only their own.
* **Query** (`schemas.outboxQuery`): `statementId?`, `state?` (enum above).
* **Success:** `200 { messages }` (createdAt desc, ≤200).

#### GET `/api/notifications/groups/:groupId/notifications/:messageId`
* **Guard:** V2 `member` + same visibility rule. **Success:** `200 { message }`; `404 { msg: 'Notification not found' }`.

#### POST `/api/notifications/groups/:groupId/notifications/:messageId/resend`
* **Guard:** V2 `manager`. Creates a **new** outbox row (purpose suffixed `_resend`, state `pending`).
* **Success:** `201 { msg: 'Resend queued (new delivery record)', message }`; `404 { msg: 'Notification not found' }`.

#### POST `/api/notifications/groups/:groupId/notifications/manual-share`
* **Guard:** V2 `manager`. **Body:** `{ statementId? }`.
* **Success:** `200 { links: [ { messageId, state, link: 'https://wa.me/<num>?text=…' | null, reason? } ] }`.
* **Use case:** zero-config fallback - open the `wa.me` link to send a bill manually when the Cloud API is not configured.

---

### 9.17 Statistics & dashboard

Mount: `/api/stats`.

#### GET `/api/stats/groups/:groupId/dashboard`
* **Guard:** V2 `member`. **Query:** `month` (`YYYY-MM`, optional - read directly from `req.query`).
* **Success (verified shape from `statsController.getV2Dashboard`):**
  ```json
  200 {
    "groupId": "65a000000000000000000001",
    "month": "2026-11",
    "period": { "state": "open", "revision": 4, "reviewStartedAt": null, "finalizedAt": null },
    "activeMembersCount": 6,
    "expenses": {
      "draft":     { "count": 2, "totalPoisha": 45000, "totalTaka": "450.00" },
      "submitted": { "count": 1, "totalPoisha": 12550, "totalTaka": "125.50" },
      "approved":  { "count": 12, "totalPoisha": 8580000, "totalTaka": "85800.00" },
      "rejected":  { "count": 0 },
      "payablesOutstanding": { "count": 1, "totalPoisha": 300000, "totalTaka": "3000.00" }
    },
    "money": {
      "totalContributionsPoisha": 5000000, "totalContributionsTaka": "50000.00",
      "personalSupplierPaymentsPoisha": 0,
      "pendingTransactions": { "count": 2, "totalPoisha": 100000, "totalTaka": "1000.00" }
    },
    "funds": { "totalAssetsPoisha": 3200000, "totalAssetsTaka": "32000.00", "accounts": [ ... ] },
    "settlement": { ... }
  }
  ```
* **Use:** the group overview screen. Every figure is derived from expenses/journals, not cached.

#### GET `/api/stats/:groupId` (legacy analytics)
* **Guard:** legacy `requireGroupRole('member')`.
* **Query** (`schemas.statsQuerySchema`): `groupId` (required by schema - see the same path/query quirk as headcount), `granularity` (`month|year`, default `month`), `year` (2020–2100), `month` (`YYYY-MM`), `userId?`.
* **Success:** `200 { groupId, granularity, year, month, userId, totals: { totalMeals, totalMealSubunits, totalExpensesPoisha, totalExpensesTaka, mealRatePoisha, mealRateTaka }, mealsSeries, expenseSeries, categoryBreakdown, finalizedMonths }`.
* **Series semantics (verified):** `mealsSeries[].mealSubunits` sums `portionSubunits` of `consumed` slots (thousandths); `.meals` is that ÷ 1000. `expenseSeries[].amountPoisha` and `categoryBreakdown[].totalPoisha` are canonical (a legacy `total`/`amount` in Taka is retained). Only `approved`, non-reversal expenses count. `bucket` is a day-of-month number when `month=` is supplied, otherwise `YYYY-MM`. `mealRatePoisha = round(totalExpenses / totalMeals)` (0 when no units).
* **Errors:** `400 { msg: 'Validation failed', errors }`.

---

### 9.18 Inbox & notification preferences

Mount: `/api/inbox`. All routes require auth; the caller only ever touches their own rows.

| Endpoint | Query / body | Success |
|---|---|---|
| `GET /api/inbox` | `inboxSchemas.inboxListQuery`: `unread?` (`'0'\|'1'`), `cursor?` (≤512), `limit?` (1–100) | `200 { notifications, nextCursor, hasMore }` (`_id` desc) |
| `GET /api/inbox/unread-count` | - | `200 { count }` |
| `POST /api/inbox/read` | `inboxSchemas.inboxReadSchema`: `ids?` (=200 ObjectIds) **or** `all: true` (one is required) | `200 { msg: 'Marked read', count }` |
| `GET /api/inbox/preferences` | - | `200 { preferences: { types, quietHours } }` (defaults: `types: {}`, `quietHours: { from: '22:00', to: '07:00' }`) |
| `PUT /api/inbox/preferences` | `inboxSchemas.inboxPrefsSchema`: `types?` (record of `{ inApp, email }` keyed by type), `quietHours?` `{ from, to }` (`HH:MM`) | `200 { msg: 'Preferences updated', preferences }`; `400 { msg: 'Validation failed', errors }` |

Inbox rows are TTL-expired (90 days). Admin-targeted notifications arrive in the same inbox (scope `admin`) with their own read state.

---

### 9.19 Support desk (user side)

Mount: `/api/support`. Rules: a new ticket is **locked for the user until the admin first replies**; after a reply the user may respond (`answered`), then it locks again (strict turn-taking, `SUPPORT_STRICT_TURNS`); `resolved` can be reopened within 7 days; `closed` is terminal.

| Endpoint | Auth / limit | Body | Success |
|---|---|---|---|
| `POST /api/support/tickets` | auth, **idempotent** (`support.ticket.create`) | `supportSchemas.ticketCreateSchema`: `category` (`account\|bug\|billing_dispute\|feature\|group_access\|appeal\|other`), `subject` (3–120), `body` (10–2000), `groupId?`, `attachContext?`, `attachmentIds?` (≤5) | `201 { msg: 'Ticket created', ticket: { id, ticketNo, status } }`; `429 { msg: 'Too many open or recent tickets', code: 'TICKET_LIMIT' }` (=3 open or ≤5 in 24 h) |
| `GET /api/support/tickets` | auth | `ticketListQuery`: `status?`, `cursor?` | `200 { tickets, nextCursor, hasMore }` (20/page) |
| `GET /api/support/tickets/:ticketId` | auth (own tickets only) | - | `200 { ticket, messages, permissions: { canComment, ... }, slaStage }` (internal notes excluded) |
| `POST /api/support/tickets/:ticketId/messages` | auth, 10/min + 50/ticket | `ticketMessageSchema`: `body` (1–2000), `attachmentIds?` | `201 { msg: 'Message added', status }`; `403 { msg: rule.reason, code }` (e.g. `TICKET_AWAITING_ADMIN`, `TICKET_CLOSED`); `429 { code: 'TICKET_MESSAGE_LIMIT' }`; `409 { msg: 'Ticket state changed, retry', code }` |
| `POST /api/support/tickets/:ticketId/resolve` | auth | `ticketTransitionSchema`: `{ note?, reason? }` (passthrough) | `200 { msg: 'Ticket <action> done', status }`; `409`/`403` with `{ msg, code }` |
| `POST /api/support/tickets/:ticketId/close` | auth | same | same |
| `POST /api/support/tickets/:ticketId/reopen` | auth | same | same; only from `resolved`, within 7 days |
| `POST /api/support/tickets/:ticketId/rate` | auth | `ticketRateSchema`: `{ score (1–5), comment? (≤300) }` | `200 { msg: 'Thanks for the rating' }`; `409 { msg: 'Only resolved tickets can be rated', code: 'TICKET_STATE_CHANGED' }` |
| `POST /api/support/actions/:token` | **public**, 20/15 min | - | Always neutral: `200 { msg: 'This action link is invalid or has expired.' }` or `200 { msg: 'Action completed. Thank you.' }` |
| `POST /api/support/appeal` | **public**, 1/24 h | `appealSchema`: `{ email, message (10–2000), captchaToken? }` | Always `200 { msg: 'If the address matches a suspended account, we will review the appeal.' }` |

`permissions.canComment` is the authoritative signal for whether to show the composer. `captchaToken` is validated by a stub (`verifyCaptcha`) - `NEEDS VERIFICATION` / not enforced today.

---

### 9.20 Support desk (platform admin)

Mount: `/api/admin/support`. Guard: `auth` + `requirePlatformAdmin` (the AMR/2FA check is applied by the parent `/api/admin` mount in `index.js`; this router itself adds only `requirePlatformAdmin`). Non-admins get `404`.

| Endpoint | Body / query | Success |
|---|---|---|
| `GET /api/admin/support/tickets` | `adminTicketListQuery`: `status?`, `priority?`, `assignee?` (`'none'` = unassigned), `category?`, `overdue?` (`'0'\|'1'`), `q?`, `cursor?` | `200 { tickets, nextCursor, hasMore }` |
| `GET /api/admin/support/tickets/:ticketId` | - | `200 { ticket, messages, owner, memberships, slaStage }`; `404 { msg: 'Ticket not found' }` |
| `POST /api/admin/support/tickets/:ticketId/reply` | `adminReplySchema`: `{ body (1–2000), attachmentIds? }` | `201 { msg: 'Reply sent', status }`; `403 { msg, code }`; `409 { code: 'TICKET_STATE_CHANGED' }` |
| `POST /api/admin/support/tickets/:ticketId/internal-note` | `adminReplySchema` | `201 { msg: 'Internal note added' }` |
| `POST /api/admin/support/tickets/:ticketId/assign` | `adminAssignSchema`: `{ assignedAdminId: ObjectId \| null }` | `200 { msg: 'Assigned' }` |
| `PATCH /api/admin/support/tickets/:ticketId` | `adminTicketPatchSchema`: `{ priority?, category?, tags? (≤10) }` (=1 required) | `200 { msg: 'Ticket updated', ticket }` |
| `POST /api/admin/support/tickets/:ticketId/resolve` | `adminRedactSchema.partial({ reason: true })` | `200 { msg: 'Ticket <status>', status }`; `409`/`403` with `{ msg, code }` |
| `POST /api/admin/support/tickets/:ticketId/close` | same | same |
| `POST /api/admin/support/tickets/:ticketId/reopen` | `adminRedactSchema` (`reason` **required**, 3–500) | same |
| `POST /api/admin/support/tickets/:ticketId/messages/:messageId/redact` | `adminRedactSchema` | `200 { msg: 'Message redacted' }`; `404 { msg: 'Message not found' }` |
| `GET /api/admin/support/stats` | - | `200 { byStatus, overdue, medianFirstResponseMinutes, averageRating, ratingCount }` |
| `GET /api/admin/support/canned-replies` | - | `200 { replies }` |
| `POST /api/admin/support/canned-replies` | `cannedReplySchema`: `{ title (2–120), body (2–2000), category? }` | `201 { reply }` |
| `PUT /api/admin/support/canned-replies/:replyId` | `cannedReplySchema` | `200 { reply }`; `404 { msg: 'Canned reply not found' }` |
| `DELETE /api/admin/support/canned-replies/:replyId` | - | `200 { msg: 'Deleted' }`; `404` |

Admin replies and internal notes notify the user/admin inbox respectively; every admin action is audit-logged. Internal notes are never returned to the user thread.

---

### 9.21 Routines: rosters, duties, swaps, menu, notes, board

Mount: `/api/routines`. All routes require auth + `requireGroupRoleV2` (so auditors are read-only). No ledger impact.

**Roster lifecycle:** create (`state: draft`) → publish (generates `DutyAssignment` rows for the next N days, default 30) → optionally extend the horizon → members mark duties done / request swaps; managers reassign.

#### Rosters

| Endpoint | Guard | Body / query | Success |
|---|---|---|---|
| `GET /api/routines/groups/:groupId/rosters` | member | - | `200 { rosters }` (createdAt desc) |
| `POST /api/routines/groups/:groupId/rosters` | manager | `routineSchemas.rosterCreateSchema` (below) | `201 { roster }` |
| `GET /api/routines/groups/:groupId/rosters/:rosterId` | member | - | `200 { roster }`; `404 { msg: 'Roster not found' }` |
| `PATCH /api/routines/groups/:groupId/rosters/:rosterId` | manager | `rosterUpdateSchema` (includes `state`: `draft\|published\|archived`) | `200 { roster }`; `404` |
| `POST /api/routines/groups/:groupId/rosters/:rosterId/publish` | manager | `{ horizonDays?, taskKeys = ['bazar'] }` | `200 { rosterId, state: 'published', dutiesCreated }`; `404`; `409 { msg: 'Already published' }` |
| `POST /api/routines/groups/:groupId/rosters/:rosterId/extend-horizon` | manager | `{ additionalDays }` | `200 { rosterId, horizonExtendedBy, dutiesCreated }`; `404` |

**`rosterCreateSchema`:** `title` (1–80) **required**; `type` (`bazar|cleaning|cooking|custom`) **required**; `rotation` **required** object `{ mode: round_robin|weekly_template|fair|manual, memberOrder?: ObjectId[], weeklyTemplate?: record<string, ObjectId[]>, daysOfWeek?: int[] 0–6 }`; optional `areas` (string ≤40 []), `skipWhenAbsent`, `weekStartsOn` (0–6), `horizonDays` (7–90).
`taskKeys` in publish selects which duty tasks to generate (default `['bazar']`). Duties are created with `origin: 'generated'`; duplicate assignments are ignored.

#### Duties

| Endpoint | Guard | Body / query | Success |
|---|---|---|---|
| `GET /api/routines/groups/:groupId/duties` | member | `localDate?`, `membershipId?`, `status?`, `rosterId?` | `200 { duties }` |
| `POST /api/routines/groups/:groupId/duties/:assignmentId/done` | member | `{ doneNote? (≤200) }` (**not validated** on this route) | `200 { duty }`; `404 { msg: 'Duty not found' }`; `409 { msg: 'Duty already done' }` |
| `POST /api/routines/groups/:groupId/duties/:assignmentId/reassign` | manager | `routineSchemas.dutyReassignSchema`: `{ toMembershipId, reason? }` | `200 { duty }`; `404` |
| `GET /api/routines/groups/:groupId/duties/fairness` | member | `month?` | `200 { month, board, totalUnits, activeMembers, fairness, weights }` — `board[].weightedUnits` (task weights: bazar/cooking 3, cleaning:bathroom 2, else 1), `sharePct`, `fairSharePct`, `balance`; `fairness { gini, level, mostLoaded, leastLoaded }` |

Duty statuses: `scheduled`, `done`, `missed`, `swapped`, `skipped`, `cancelled`.

#### Swaps

| Endpoint | Guard | Body | Success |
|---|---|---|---|
| `POST /api/routines/groups/:groupId/swaps` | member | `routineSchemas.swapCreateSchema`: `{ assignmentId, toMembershipId? (omit = open offer), reason? }` | `201 { swap }`; `404 { msg: 'Duty assignment not found' }` |
| `POST /api/routines/groups/:groupId/swaps/:swapId/respond` | member | `routineSchemas.swapRespondSchema`: `{ accept, reason? }` | `200 { swap }`; `404 { msg: 'Swap request not found' }`; `409 { msg: 'Already resolved' }` |

#### Menu

| Endpoint | Guard | Body / query | Success |
|---|---|---|---|
| `POST /api/routines/groups/:groupId/menu` | manager | `routineSchemas.menuPlanCreateSchema` (below) | `200 { menu }` |
| `GET /api/routines/groups/:groupId/menu` | member | `weekStart?` (`YYYY-MM-DD`) | `200 { menus }` |
| `GET /api/routines/groups/:groupId/menu/bazar-suggestions` | member | `weekStart?` | `200 { weekStart, suggestions, totalItems }` |

**`menuPlanCreateSchema`:** `weekStart` (`YYYY-MM-DD`) **required**; optional `isTemplate`; optional `days: [{ weekday (0–6), slots?: { breakfast?/lunch?/snacks?/dinner?: [{ name (≤60), qtyHint? (≤30) }] }, cookMembershipId?, estCostPoisha? (≥0), note? (≤300) }]`.
Bazar suggestions aggregate the menu items for the week so the bazar shopper can seed the shopping list.

#### Notes & notice board

| Endpoint | Guard | Body / params | Success |
|---|---|---|---|
| `POST /api/routines/groups/:groupId/notes` | member | `routineSchemas.noteCreateSchema` | `201 { note }`; `409 { msg: 'Pin limit reached (max 3)', code: 'PIN_LIMIT' }` |
| `GET /api/routines/groups/:groupId/notes` | member | - | `200 { notes }` (audience-filtered, pinned first) |
| `GET /api/routines/groups/:groupId/notes/:noteId` | member | - | `200 { note }`; `404 { msg: 'Note not found' }` |
| `PATCH /api/routines/groups/:groupId/notes/:noteId` | member | `noteUpdateSchema` | `200 { note }`; `404` (also when not the author and not `owner\|manager`) |
| `DELETE /api/routines/groups/:groupId/notes/:noteId` | member | - | `200 { msg: 'Note deleted' }` (soft delete: `state: 'deleted'`); `404` |
| `POST /api/routines/groups/:groupId/notes/:noteId/ack` | member | - | `200 { msg: 'Acknowledged' }`; `403 { msg: 'Not a member' }` |
| `POST /api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/claim` | member | - | `200 { msg: 'Task claimed' }`; `404`; `403 { msg: 'Not a member' }`; `409 { msg, code }` |
| `POST /api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/done` | member | - | `200 { msg: 'Task done' }`; same errors |

**`noteCreateSchema`:** `title` (1–120) **required**; optional `kind` (`note|announcement|handover|alert`), `body` (≤2000), `audience` `{ type: all|members|role, membershipIds?, roles? }`, `pinned`, `validFrom`/`validUntil` (ISO datetime), `absence` `{ from?, to? }` (used by `handover`), `tasks` (=20 `{ text, assigneeMembershipId?, dueDate? }`).
**`noteUpdateSchema`** adds per-task `_id`, `status` (`open|claimed|done`), `claimedBy`, `doneBy` and note `state` (`active|archived|deleted`).
`taskId` is a string of ≤8 chars. Notes are visible only to their audience; `owner|manager` may edit any note, others only their own.

#### Board & aggregates

| Endpoint | Guard | Query | Success |
|---|---|---|---|
| `GET /api/routines/groups/:groupId/board/today` | member | - | `200 { date, duties, menu, pinnedNotes, activeHandovers }` |
| `GET /api/routines/groups/:groupId/bazar-spend-rotation` | member | `from?`, `to?` | `200 { rotation: [ { membershipId, displayName, role, dutyCount, totalBazarSpentPoisha, totalBazarSpentTaka } ] }` sorted by least spend first |
| `POST /api/routines/groups/:groupId/emergency-broadcast` | V2 `member` at the route, **`owner\|manager` inside the controller** | body `{ title, body }` | `201 { note }`; `400 { msg: 'title and body are required' }`; `403 { msg: 'Only owner or manager can send emergency broadcasts' }` |

Emergency broadcast creates a pinned `alert` note for 24 h, notifies every linked member by inbox, and emits socket `emergency-broadcast` (bypasses quiet hours).

---

### 9.22 Shopping list

Mount: `/api/shopping-list`. All routes require auth + V2 `member`. There is one **open** list per group; `GET` creates one lazily if missing.

| Endpoint | Body / params | Success |
|---|---|---|
| `GET /api/shopping-list/groups/:groupId` | - | `200 { list }` |
| `POST /api/shopping-list/groups/:groupId/items` | `itemSchema`: `{ name (1–120), quantity? (≤40 string), unit? (≤20), estimatedPricePoisha? (int ≥0, default 0), note? (≤300) }` | `201 { list }`; `404 { msg: 'No open shopping list' }` |
| `PATCH /api/shopping-list/groups/:groupId/items/:itemId` | `itemCheckSchema`: `{ itemId (24-hex), checked (boolean) }` - **`itemId` is required in the body as well as the path** | `200 { list }`; `404 { msg: 'No open shopping list' }`; `404 { msg: 'Item not found' }` |
| `DELETE /api/shopping-list/groups/:groupId/items/:itemId` | - | `200 { msg: 'Item removed' }`; `404` |
| `POST /api/shopping-list/groups/:groupId/to-expense` | `toExpenseSchema`: `{ expenseDescription? (default 'Bazar (from shopping list)'), categoryId?, paidBy? }` | `201 { expense, list }` |
| `GET /api/shopping-list/groups/:groupId/history` | - | `200 { lists }` |

**Conversion rules (verified):**
* Only **checked** items convert → else `422 { msg: 'No checked items to convert' }`.
* Every checked item must carry `estimatedPricePoisha > 0`, and a category must resolve (`categoryId` → `Bazar`-prefixed category → food-pool category) → else `422 { msg: 'Select a category and price each checked item before conversion' }`.
* The created expense is a **draft** (`status: 'draft'`, `costPeriod` = current Dhaka month, `isPayable: true`, `paidTotal: 0`, each line `splitMode: 'meal_units'`) and the list becomes `closed` with `expenseDraftId`. Review and submit it through §9.8.

---

### 9.23 Kitchen inventory

Mount: `/api/kitchen-inventory`. All routes require auth + V2 `member`.

| Endpoint | Body / params | Success |
|---|---|---|
| `GET /api/kitchen-inventory/groups/:groupId` | - | `200 { items }` |
| `POST /api/kitchen-inventory/groups/:groupId` | `itemCreateSchema`: `{ name (1–80), unit? (≤20), currentStock? (=0, default 0), reorderThreshold? (=0, default 0), averageConsumptionPerDay? (=0, default 0) }` | `201 { item }`; `409 { msg: 'Item already exists' }` |
| `PATCH /api/kitchen-inventory/groups/:groupId/:itemId` | `itemUpdateSchema`: `{ currentStock?, reorderThreshold?, averageConsumptionPerDay?, isActive? }` | `200 { item }`; `404 { msg: 'Item not found' }` |
| `POST /api/kitchen-inventory/groups/:groupId/:itemId/refill` | `refillSchema`: `{ quantity (>0), unit? (≤20), costPoisha? (=0, default 0), note? (≤200) }` | `200 { item }` (updated stock); `404 { msg: 'Item not found' }` |
| `DELETE /api/kitchen-inventory/groups/:groupId/:itemId` | - | `200 { msg: 'Item archived' }`; `404` |

Stock and consumption are **numbers** (not poisha) - they are quantities in the item's `unit`. Refills do not post journal entries.

---

### 9.24 Polls

Mount: `/api/polls`. All routes require auth + V2 `member`; `:pollId` is resolved by a router param that loads the poll and sets `req.params.groupId` from it (so a poll in another group is `403`/`404` per the guard).

| Endpoint | Body | Success |
|---|---|---|
| `GET /api/polls/groups/:groupId` | - | `200 { polls }` (createdAt desc, ≤50) |
| `POST /api/polls/groups/:groupId` | `pollCreateSchema`: `{ question (1–200), options (2–6 strings, each 1–120), expiresAt (ISO datetime), relatedMenuItem? (≤120) }` | `201 { poll }` |
| `POST /api/polls/:pollId/vote` | `voteSchema`: `{ optionIndex (int 0–5) }` | `200 { poll }`; `409 { msg: 'Poll is closed' }`; `409 { msg: 'Poll has expired' }`; `400 { msg: 'Invalid option' }` |
| `POST /api/polls/:pollId/close` | - | `200 { poll }`; `403 { msg: 'Only the creator or a manager can close this poll' }` |
| `GET /api/polls/:pollId/results` | - | `200 { poll, results, totalVotes }` |

A member's vote replaces their previous choice. Unmatched `pollId` → `400 { msg: 'Invalid poll id' }` / `404 { msg: 'Poll not found' }`. There is no delete route.

---

### 9.25 Legacy & deprecated endpoints

These are mounted and functional but **must not be used for new features**. Deprecation middleware (`middleware/deprecate.js`) sets `Deprecation: true`, a `Link: <successor>; rel="successor-version"` header and (when configured) `Sunset`.

| Method & path | Guard | Deprecation header | Replacement |
|---|---|---|---|
| `GET /api/messgroups/entries/:groupId` | legacy member | `link → /api/meals, /api/expenses` | `/api/meals/:groupId`, `/api/expenses/groups/:groupId/expenses` |
| `GET /api/messgroups/calculate/:groupId` | legacy member | `link → /api/summary` | `/api/stats/groups/:groupId/dashboard` |
| `POST /api/messgroups/add-entry/:groupId` | legacy member + `allowSelfOrAdmin` | - (legacy write path) | `/api/meals/:groupId` |
| `GET /api/summary/:groupId/:month` | legacy member | `link → /api/statements` | `/api/statements/...` |
| `POST /api/summary/finalize/:groupId/:month` | legacy admin | - | retired: `409 { msg: 'Legacy summary is immutable; use /api/statements for a versioned correction' }` / `410 { msg: 'Legacy summary finalization is retired; finalize through /api/statements' }` |
| `GET /api/summary/whatsapp/:groupId/:month` | legacy admin | - | `/api/notifications/.../manual-share` |
| `PUT/GET /api/messgroups/payment-note/...`, `GET /api/messgroups/payment-notes/...` | see §9.4 | - | statement items / disputes |
| `POST/PUT/GET/DELETE /api/expenses/:groupId`, `/entry/:id`, `/:groupId/:month` | see §9.8 | - | V2 expense workflow |
| `GET /api/messgroups/export/:groupId`, `/pdf/:groupId` | legacy member | - | no ledger-faithful replacement yet |

**Deprecated/duplicate notes (from source):**

* `GET /api/messgroups/entries/:groupId` returns the legacy embedded `entries[]` document - the embedded ledger-bypass pattern, not the V2 `Meal`/`Expense` collections.
* `GET /api/messgroups/calculate/:groupId` recomputes with **float** maths and can disagree with the ledger.
* `POST /api/messgroups/add-entry/:groupId` remains a legacy write path that bypasses the period state machine.
* `POST /api/summary/finalize/:groupId/:month` is retired in code (always 409/410).
* `POST /api/users/login` and `POST /api/users/login/2fa-challenge` overlap in behaviour (both perform the password step and return the same challenge body). Use login; treat 2fa-challenge as the documented alternative.
* The `/api/messgroups/extras/*` endpoints are superseded by recurring rules.

---

## 10. Workflow walkthroughs

Each walkthrough lists the exact calls in order, with the state transition after each. Every call below is a verified route.

### 10.1 Onboarding a new member

1. `POST /api/users/register` → `201`, cookies set, `isVerified: false`.
2. `GET /api/users/verify-email/:token` from the email (optional gate).
3. Join with an invite code: `POST /api/invite/codes` (group admin) → share `inviteLink` → `POST /api/invite/join-by-code { code, groupId }` → `200 { msg: 'Joined group' }`. **Confirm** by re-reading `GET /api/messgroups/my-groups`; a `200 { msg: 'Join processed' }` means the code failed.
4. Or the moderated path: `POST /api/messgroups/join-request/:groupId` → admin `POST /api/messgroups/approve/:groupId/:userId`.
5. Placeholder residents (no account): manager `POST /api/memberships/groups/:groupId/memberships` with `displayName` and no `userId`; later `PATCH` with `linkUserId` to attach a real account without losing history.

### 10.2 Daily meal entry

1. `GET /api/messgroups/:groupId` → read `mealSlots` (which slots are enabled).
2. `POST /api/meals/:groupId` with only the slots the member changed:
   ```json
   { "date": "2026-11-25",
     "slots": { "lunch": { "state": "consumed", "portionSubunits": 500 },
                "dinner": { "state": "confirmed_zero" } } }
   ```
3. All other slots stay `unknown`. Fix a past entry with `PUT /api/meals/entry/:id`; a **legacy group admin** can delete another member's entry via `DELETE /api/meals/entry/:id` (a V2 `manager` who is not the legacy admin gets `403`).
4. Before closing the month, **every** slot must be resolved: fetch `GET /api/meals/:groupId/:month` and look for `unknown` slots.

### 10.3 Booking and approving an expense

1. `GET /api/messgroups/categories/:groupId` → pick `categoryId` per line.
2. `POST /api/expenses/groups/:groupId/expenses` (send `Idempotency-Key`) → `201` draft.
3. Upload receipts first if needed: `POST /api/attachments/groups/:groupId/upload` (`targetType: expense_receipt`) → keep `attachment.id`.
4. `POST .../expenses/:expenseId/submit` → `submitted`.
5. Treasurer: `POST .../expenses/:expenseId/approve { "reason": "Receipts checked with the manager" }` (send `Idempotency-Key`) → `approved`, journal posted, `journalId` returned.
   * Expect `422 Self-approval requires a reason` if the treasurer is a resident and forgets `reason`.
   * Expect `422 No payer on this expense` if the approver has no membership and no payers exist.
6. Rejection path: `POST .../reject { reason }` → `rejected`.
7. Correction of an approved expense: `POST .../reverse { reason }` → mirrored journal, original `reversed`; create a corrected expense.

### 10.4 Contributions and settlements

1. `GET /api/money/groups/:groupId/funds` and `GET /api/memberships/.../active` → collect `fund._id` and `membershipId`s.
2. Member: `POST /api/money/groups/:groupId/money`:
   ```json
   { "kind": "contribution", "amount": 500000,
     "fromMember": "<membershipId>", "toAccount": "<fundId>", "method": "bkash", "reference": "TXN8812" }
   ```
   → `201`, status `submitted`, **no journal**.
3. Treasurer confirms actual receipt: `POST .../money/:txId/confirm` → journal posted, status `confirmed`.
4. Balances: `GET .../memberships/:membershipId/balance` → `balancePoisha` negative means the member owes the group.
5. Month-end settlement between members: `kind: "member_settlement"` with `fromMember`/`toMember`, then confirm.

### 10.5 Cash reconciliation

1. Treasurer: `GET /api/reconciliation/groups/:groupId/reconciliations/equation` → check `balanced`.
2. `POST /api/reconciliation/groups/:groupId/reconciliations { "accountId": "<fundId>", "actualBalance": 4123000 }` → returns `variance`.
3. Investigate (pending transactions, unpaid payable expenses, missing receipts).
4. `POST .../reconciliations/:recId/resolve { "resolution": "accepted_shortage", "explanation": "Three receipts missing, manager approved deduction" }`.

### 10.6 Monthly close & statement

1. Everyone resolves meal slots; `GET /api/periods/groups/:groupId/periods/:month` → note `state` and `revision`.
2. Manager: `POST .../periods/:month/begin-review` → edits to that month are now refused with `409`.
3. Treasurer: `GET .../periods/:month/preview` → verify per-member charges; `GET .../periods/:month/checklist` → confirm `journals_balanced`.
4. Owner: `POST /api/statements/groups/:groupId/statements/:month/finalize { "expectedRevision": <revision> }` (send `Idempotency-Key`).
   * `201` → immutable statement vN, outbox deliveries queued.
   * `409` → something changed (revision, unresolved meals, period not in review): refetch and restart from step 1.
5. Delivery: `GET /api/notifications/groups/:groupId/notifications?statementId=<id>` → states; `POST .../notifications/:messageId/resend` for failures; `POST .../notifications/manual-share` for `wa.me` links.
6. Correction: `POST .../periods/:month/correct` (audit marker) and finalize again with `reason` → vN+1; the previous version becomes `superseded`.

### 10.7 Support ticket

1. `POST /api/support/tickets { category, subject, body, groupId, attachContext: true }` (send `Idempotency-Key`).
2. `GET /api/support/tickets/:ticketId` → render `permissions.canComment` and `slaStage`; hide the composer when `canComment` is false (`TICKET_AWAITING_ADMIN`).
3. User reply: `POST .../messages { body }`.
4. User marks it resolved: `POST .../resolve` → rate via `POST .../rate { score: 5 }`.
5. Reopen within 7 days: `POST .../reopen`.

### 10.8 Duty roster & bazar hand-off

1. Manager: `POST /api/routines/groups/:groupId/rosters` → draft.
2. `POST .../rosters/:rosterId/publish { "taskKeys": ["bazar", "cleaning"] }` → duties generated for 30 days.
3. Members: `GET .../board/today`, `POST .../duties/:assignmentId/done { doneNote }`.
4. Swap: `POST .../swaps { assignmentId, toMembershipId }` → target `POST .../swaps/:swapId/respond { accept: true }`.
5. Bazar week: `GET .../menu/bazar-suggestions` → add items via `POST /api/shopping-list/.../items` → check them → `POST /api/shopping-list/.../to-expense` → approve the draft (§10.3).

---

## 11. Implementation notes, inconsistencies & open questions

These were found while verifying the documentation against source. **Nothing in the backend was changed to match this document.**

### 11.1 Verified inconsistencies (plan around them)

| # | Finding | Practical impact |
|---|---|---|
| 1 | **Two refresh-token stores** (resolved in S1). Login/refresh now issue a `Session` family and the refresh cookie carries `familyId:rawToken`. Legacy `User.refreshToken` is accepted only until `LEGACY_REFRESH_SUNSET`, then rejected. | Revocation, device management and reuse detection are now truthful through the `Session` family. |
| 2 | **`joinCodeLimiter` is mounted nowhere.** `middleware/rateLimiters.js` exports it, but `inviteRoutes.js` uses per-controller lockout instead. | The documented 10/15 min IP limit does not exist; only the 5-failure user lockout applies. |
| 3 | **Money `fromMember`/`toMember` are Membership ids, despite the name and the `moneySchema` comment.** Journal lines use `ref: 'Membership'`. | Sending a `User` id posts a journal line that no balance lookup will match. Always send membership ids. |
| 4 | **`GET /api/meals/:groupId/headcount/tomorrow` requires `groupId` in the query** (schema) even though it is in the path. | Send `?groupId=<id>` or you get `400 Validation failed` (`field: "groupId"`). |
| 5 | **Member balance ignores expense charges.** `getMemberBalance` only reads `sourceType: 'money_transaction'` journals. | `balancePoisha` is "contributions/payments minus payouts/settlements", not the full member dues shown on a statement. |
| 6 | **Expense approval defaults to the approver as payer** when no `payers[]` exists. | A treasurer approving someone else's expense without payers records themselves as having paid. Always record `payers[]` (recommendation tracked in improvements). |
| 7 | **Idempotency records are written outside the business transaction** and results saved fire-and-forget. | A crash can leave a key "still processing" for 24 h; conversion/approval retries may duplicate if the first call crashed after commit. |
| 8 | **Legacy entry routes are not period-locked** (`DELETE /api/meals/entry/:id`, `DELETE /api/expenses/entry/:id`, `POST /api/messgroups/add-entry/:groupId`). | A legacy client can mutate a finalized month. |
| 9 | **`POST /api/summary/finalize/...`** is permanently retired (409/410). | Do not call; finalize through `/api/statements`. |
| 10 | **`GET /api/invite/codes/:groupId` has no role check** in the controller (only `auth`). | Any authenticated user who knows a group id can read code metadata (prefix, expiry, uses left) - not the plaintext. |
| 11 | **`GET /api/meals/:groupId/:month` does not run `resolveHistoryWindow`** (unlike `GET /api/meals/:groupId`). | An ex-member's history clamp is not applied on the month route. `NEEDS VERIFICATION` whether this is reachable (the guard is the legacy membership check). |
| 12 | **Duplicate `POST /api/users/login/2fa-challenge` vs `login`.** | Two routes, same effect; document/use one (`/login`). |
| 13 | **Duplicate removal paths: `DELETE /api/messgroups/remove-member/:groupId/:userId` vs membership `depart`.** | Only the latter updates effective-dated memberships. |
| 14 | **Scheduled and explicit recurring generation.** `generate-all` and the hourly scheduler both generate drafts; a draft only exists once per rule/month. | Expect `409 Draft already generated` if the scheduler ran first. |
| 15 | **Feature-flag route is `PATCH` only:** a `PUT` to `/api/messgroups/feature-flags/:groupId` returns `404`. | Use `PATCH`. |
| 16 | **`PATCH /api/shopping-list/.../items/:itemId` requires `itemId` in the body** (in addition to the path). | Send `{ itemId, checked }`. |
| 17 | **Poll voting is capped at 6 options** (`optionIndex` 0–5); more options cannot be voted on even if stored. | Create ≤6 options (schema enforces 2–6). |
| 18 | **`kind`-specific fields are not enforced** by `moneySchema`. A `transfer` without accounts posts journal lines with `accountId: null`. | Validate client-side before submitting; an incorrect confirm still posts (and may need `reverse`). |
| 19 | **Admin list endpoints are not idempotent/paginated by cursor consistently.** `GET /api/admin/groups` takes `limit`/`q` but returns no `nextCursor`. | Fetch-with-limit only. |
| 20 | **Rate limiting and TOTP challenges are per-process.** | Multi-instance deployments need Redis (see recommendations). |

### 11.2 `NEEDS VERIFICATION` items

* Delivery of email (SMTP) and WhatsApp messages: outbox rows can succeed, fail or be `not_configured`. Not testable without provider credentials.
* Google OAuth callback behaviour through a deployed BFF, and 2FA step-up after Google sign-in.
* ClamAV behaviour (the scanner is optional); `scanStatus: 'pending'` files are served before a verdict.
* CAPTCHA verification (`verifyCaptcha` is a stub that accepts any token).
* Real `withTransaction()` atomicity: on a standalone MongoDB the helper falls back to non-transactional execution (see `utils/transaction.js`). Production needs a replica set.
* Exact multer error status/body for oversize or wrong-MIME uploads.
* Exact response keys of `confirm`/`reverse` money results (the controllers spread a `result` object).
* `duty-updated` / `menu-updated` socket payloads.

### 11.3 Deprecated / duplicate surface (summary)
![alt text](image.png)
`/api/messgroups/entries|calculate|add-entry|extras`, `/api/summary/*`, `/api/messgroups/payment-note*`, legacy `/api/expenses/:groupId` CRUD, legacy `/api/meals` DELETE, `login/2fa-challenge` (duplicate of `login`). See §9.25.

### 11.4 Frontend integration notes

1. **Never store tokens in `localStorage`.** Web clients rely on HttpOnly cookies. Refresh goes through your BFF/route handler, which must relay `Set-Cookie`.
2. **Read `mm_csrf` and forward it as `x-csrf-token`** on every mutation when cookies are present.
3. **Treat `404` on a group route as "no access"**, not "route missing". The hidden admin plane also answers `404` to non-admins.
4. **Always pass membership ids** where the API wants `membershipId`, `fromMember`, `toMember`, beneficiaries, `fixedAmounts[].membershipId`, `weights[].membershipId`, `usageQuantities[].membershipId`, duty `toMembershipId`.
5. **All money is poisha integers.** Do not send `125.50`; send `12550`. Format for display only.
6. **Use `Idempotency-Key` on every idempotent mutation**, and keep it stable across retries.
7. **On `409`** (period locked, statement revision changed, ticket state changed, recurring already generated) refetch the resource and re-present the action.
8. **Preserve unsent form values** when a mutation returns `400`/`409`/`422`.
9. **Distinguish "empty list" from "denied"**: an empty `200 []`/`{ items: [] }` is valid; `404`/`403` means no access.
10. **Socket:** connect with credentials, join the current group, re-join after reconnect/refresh; treat `inbox-new` as a nudge to refetch.

---

## 12. Schema appendix

Definitions copied from `validation/` and the inline schemas in route/controller files. "Inline" schemas are not reused by other routes.

### 12.1 Shared primitives

* `objectId` / `objectIdSchema`: `z.string().regex(/^[0-9a-fA-F]{24}$/)`.
* `passwordSchema`: `z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/)`.
* `whatsappSchema`: `z.string().trim().regex(/^\+?[0-9]{10,15}$/).or(z.literal(''))`.
* `month`: `z.string().regex(/^\d{4}-\d{2}$/)` - `monthStr`: same.
* `poisha`: `z.number().int().min(1)`.
* `MEAL_SLOTS`: `['breakfast','lunch','snacks','dinner']` - `PORTION_SUBUNITS`: `[0,250,500,750,1000]`.
* `splitMode`: `z.enum(['meal_units','equal_all','equal_selected','member_days','fixed_amounts','weighted','usage','personal'])`.

### 12.2 Auth & users

* `registerSchema`: `{ username (2–30, /^[a-zA-Z0-9_ ]+$/), email (email, lowercased), password, phone? (/^[0-9+\-\s]{6,15}$/), whatsapp? }`.
* `loginSchema`: `{ email, password (min 1) }`.
* `updateProfileSchema`: `{ username?, phone?, whatsapp? }`.
* `forgotPasswordSchema`: `{ email }` - `resetPasswordSchema`: `{ token (min 10), password }` - `changePasswordSchema`: `{ currentPassword, newPassword }`.
* TOTP inline: `verifySchema { code: length 6 }`; `disableSchema { password (min 1), code: /^(\d{6}|[A-F0-9]{8})$/ }`; `login2faSchema { challengeToken (min 1), code: /^(\d{6}|[A-F0-9]{8})$/ }`.

### 12.3 Groups, join & extras

* `createGroupSchema`: `{ name (2–60), mealSlots (enum[], default all), mealWeights {breakfast..dinner int 0–1000 default 1000}, defaultMealSubunits {.. in PORTION_SUBUNITS default 0}, defaultMealsEnabled (bool, default false) }`.
* `objectIdParamSchema`: `{ groupId }` - `groupAndUserParamSchema`: `{ groupId, userId }` - `addMemberSchema`: `{ userId, role: 'member'|'admin' default 'member' }`.
* `joinByCodeSchema`: `{ code (6–12, uppercased) }` - `inviteSchema`: `{ email }` - `extraSchema`: `{ name (1–50), amount (=0, ≤1e6) }`.
* `categorySchema`: `{ name (1–50), icon? (≤20), splitMode: 'meal'|'equal' default 'equal' }` - `objectIdAndIdParamSchema`: `{ groupId, categoryId }` - `objectIdAndExtraParamSchema` = same shape (`categoryId` key carries `extraId`).
* `paymentNoteSchema`: `{ note (1–1000), amountDue? (≥0), isPaid? }`.
* Inline feature-flag schema: `{ routines?, polls?, shoppingList?, kitchenInventory?, bazarRotation?, emergencyBroadcast?, weeklyDigest? }` (booleans).

### 12.4 Memberships, policies, periods

* `createMembershipSchema`, `updateMembershipSchema`, `departSchema`: see §9.6.
* `publishPolicySchema`: see §9.10.
* `correctionSchema`: `{ reason? (≤300), adjustment? (record) }` - `finalizeSchema`: `{ expectedRevision? (int ≥0), reason? (≤300) }`.

### 12.5 Meals

* `mealSlotSchema`: `{ state: 'unknown'|'confirmed_zero'|'consumed', portionSubunits? (int 0–1000) }` with refinements: `consumed` → `portionSubunits → {250,500,750,1000}`; `confirmed_zero` → `0` or omitted.
* `mealEntrySchema`: `{ date? (coerced date), slots: { breakfast?, lunch?, snacks?, dinner? } }`, at least one slot.
* `guestMealSchema`: `{ date?, guestName? (≤80), slot, portionSubunits (250/500/750/1000), poolMode: 'individual'|'universal', eventPoolRef? (≤120) }`.
* `mealBulkSchema`: `{ entries: [{ userId, date, slots }] (1–500) }`.
* `absenceRangeSchema`: `{ userId?, from, to, slots (enum[], min 1, default all) }`, `from = to`.
* `mealFilterQuerySchema`: `{ month?, from?, to?, userId? }`; not both `month` and `from/to`.
* `headcountQuerySchema`: `{ groupId, date? (/^\d{4}-\d{2}-\d{2}$/), includeGuests?: 'true'|'false' }`.
* `idParamSchema`: `{ id }` - `monthParamSchema`: `{ groupId, month }`.

### 12.6 Expenses & money

* `createExpenseSchema`, `expenseIdParam`: see §9.8 - `listExpenseQuery`: `{ status?, costPeriod?, payable? }` - `reasonBody`: `{ reason? (≤300) }`.
* Legacy: `expenseEntrySchema` (`{ date?, amount (positive ≤1e6), description? (≤200), categoryId, category? (≤50) }`), `expenseUpdateSchema` (partial), `expenseFilterQuerySchema` (`{ month?, from?, to?, userId?, categoryId?, category? }`).
* `moneySchema`, `listMoneyQuery`, `fundSchema`, `custodianSchema`, `balanceParam`, `txIdParam`: see §9.9.

### 12.7 Statements, recurring, reconciliation, disputes, notifications, sessions

* `recurringSchema`, `generateSchema { costPeriod }`, `ruleIdParam { groupId, ruleId }`.
* `reconciliationSchema { accountId, asOf?, actualBalance (int) }` - `listReconciliationQuery { accountId? }` - `resolveReconciliationSchema { resolution enum, explanation? (≤500) }` - `recIdParam`.
* `disputeSchema`, `disputeIdParam`, `disputeRespondSchema { text (1–1000) }`, `disputeResolveSchema { rejected?, note? (≤500), correctionJournalId? }`, `disputeListQuery { status? }`.
* `outboxQuery { statementId?, state? }` - `messageIdParam { groupId, messageId }` - `manualShareSchema { statementId? }`.
* `familyIdParam { familyId (min 8) }` - `revokeAllSchema { exceptFamilyId? }`.
* `statsQuerySchema { groupId, granularity ('month'|'year'), year? (2020–2100), month?, userId? }`.

### 12.8 Inbox, support, routines, shopping, kitchen, polls

* `inboxListQuery { unread?: '0'|'1', cursor? (≤512), limit? (1–100) }` - `inboxReadSchema { ids? (≤200), all? }` (one required) - `inboxPrefsSchema { types?: record<string,{inApp,email}>, quietHours?: {from,to} HH:MM }`.
* `ticketCreateSchema`, `ticketCategoryEnum`, `ticketListQuery`, `ticketMessageSchema`, `ticketTransitionSchema { note?, reason? }` (passthrough), `ticketRateSchema { score 1–5, comment? }`, `appealSchema`, `adminTicketListQuery`, `ticketPriorityEnum ('low'|'normal'|'high'|'urgent')`, `adminReplySchema`, `adminAssignSchema { assignedAdminId (nullable) }`, `adminTicketPatchSchema`, `adminRedactSchema { reason (3–500) }`, `cannedReplySchema`, `supportAdminRoutes.msgParam { ticketId, messageId }` - full literals in `validation/supportSchemas.js`.
* Routines: full literals in `validation/routineSchemas.js` (reproduced inline in §9.21).
* Shopping list, kitchen inventory, polls, TOTP 2FA, admin id params and invite bodies: literals now live in `validation/featureSchemas.js` (re-exported where previously imported from a controller), reproduced inline in §9.22–§9.24.

## 11. Generated route table (machine-checked)

> Regenerated by `node scripts/auditRoutes.mjs --write-table`; only this block is
touched, the prose above is hand-maintained. `--write-table --check` fails when it
is stale (CI runs it).

<!-- BEGIN:generated:routes -->

<!-- generated from routes/ by scripts/auditRoutes.mjs — 231 routes -->

### Health probe (unauthenticated)

| Method | Path |
|---|---|
| `GET` | `/api/health` |

### Authentication, users & 2FA

| Method | Path |
|---|---|
| `GET` | `/api/users/auth/google` |
| `GET` | `/api/users/auth/google/callback` |
| `GET` | `/api/users/download-my-data` |
| `GET` | `/api/users/groups/:groupId/members` |
| `GET` | `/api/users/profile` |
| `GET` | `/api/users/verify-email/:token` |
| `POST` | `/api/users/2fa/disable` |
| `POST` | `/api/users/2fa/setup` |
| `POST` | `/api/users/2fa/verify` |
| `POST` | `/api/users/change-password` |
| `POST` | `/api/users/forgot-password` |
| `POST` | `/api/users/login` |
| `POST` | `/api/users/login/2fa` |
| `POST` | `/api/users/login/2fa-challenge` |
| `POST` | `/api/users/logout` |
| `POST` | `/api/users/profile-pic` |
| `POST` | `/api/users/refresh` |
| `POST` | `/api/users/register` |
| `POST` | `/api/users/reset-password` |
| `PUT` | `/api/users/profile` |

### Admin support desk

| Method | Path |
|---|---|
| `DELETE` | `/api/admin/support/canned-replies/:replyId` |
| `GET` | `/api/admin/support/canned-replies` |
| `GET` | `/api/admin/support/stats` |
| `GET` | `/api/admin/support/tickets` |
| `GET` | `/api/admin/support/tickets/:ticketId` |
| `PATCH` | `/api/admin/support/tickets/:ticketId` |
| `POST` | `/api/admin/support/canned-replies` |
| `POST` | `/api/admin/support/tickets/:ticketId/assign` |
| `POST` | `/api/admin/support/tickets/:ticketId/close` |
| `POST` | `/api/admin/support/tickets/:ticketId/internal-note` |
| `POST` | `/api/admin/support/tickets/:ticketId/messages/:messageId/redact` |
| `POST` | `/api/admin/support/tickets/:ticketId/reopen` |
| `POST` | `/api/admin/support/tickets/:ticketId/reply` |
| `POST` | `/api/admin/support/tickets/:ticketId/resolve` |
| `PUT` | `/api/admin/support/canned-replies/:replyId` |

### Platform administration (hidden)

| Method | Path |
|---|---|
| `DELETE` | `/api/admin/groups/:groupId` |
| `GET` | `/api/admin/audit` |
| `GET` | `/api/admin/groups` |
| `GET` | `/api/admin/groups/:groupId` |
| `GET` | `/api/admin/health` |
| `GET` | `/api/admin/jobs` |
| `GET` | `/api/admin/overview` |
| `GET` | `/api/admin/traffic` |
| `GET` | `/api/admin/users` |
| `GET` | `/api/admin/users/:userId` |
| `PATCH` | `/api/admin/users/:userId` |

### Mess groups, join codes, categories & extras

| Method | Path |
|---|---|
| `DELETE` | `/api/messgroups/categories/:groupId/:categoryId` |
| `DELETE` | `/api/messgroups/extras/:groupId/:extraId` |
| `DELETE` | `/api/messgroups/remove-member/:groupId/:userId` |
| `GET` | `/api/messgroups/:groupId` |
| `GET` | `/api/messgroups/audit-log/:groupId` |
| `GET` | `/api/messgroups/calculate/:groupId` |
| `GET` | `/api/messgroups/categories/:groupId` |
| `GET` | `/api/messgroups/code/:groupId` |
| `GET` | `/api/messgroups/entries/:groupId` |
| `GET` | `/api/messgroups/export/:groupId` |
| `GET` | `/api/messgroups/extras/:groupId` |
| `GET` | `/api/messgroups/feature-flags/:groupId` |
| `GET` | `/api/messgroups/my-groups` |
| `GET` | `/api/messgroups/payment-note/:groupId/:userId/:month` |
| `GET` | `/api/messgroups/payment-notes/:groupId/:month` |
| `GET` | `/api/messgroups/pdf/:groupId` |
| `PATCH` | `/api/messgroups/feature-flags/:groupId` |
| `POST` | `/api/messgroups/add-entry/:groupId` |
| `POST` | `/api/messgroups/add-member/:groupId` |
| `POST` | `/api/messgroups/approve/:groupId/:userId` |
| `POST` | `/api/messgroups/categories/:groupId` |
| `POST` | `/api/messgroups/categories/:groupId/seed` |
| `POST` | `/api/messgroups/create` |
| `POST` | `/api/messgroups/extras/:groupId` |
| `POST` | `/api/messgroups/invite/:groupId` |
| `POST` | `/api/messgroups/join-by-code` |
| `POST` | `/api/messgroups/join-request/:groupId` |
| `POST` | `/api/messgroups/regenerate-code/:groupId` |
| `PUT` | `/api/messgroups/categories/:groupId/:categoryId` |
| `PUT` | `/api/messgroups/payment-note/:groupId/:userId/:month` |

### Meals & guest meals

| Method | Path |
|---|---|
| `DELETE` | `/api/meals/entry/:id` |
| `GET` | `/api/meals/:groupId` |
| `GET` | `/api/meals/:groupId/:month` |
| `GET` | `/api/meals/:groupId/bazar-forecast` |
| `GET` | `/api/meals/:groupId/guests` |
| `GET` | `/api/meals/:groupId/headcount/tomorrow` |
| `POST` | `/api/meals/:groupId` |
| `POST` | `/api/meals/:groupId/absence/apply` |
| `POST` | `/api/meals/:groupId/absence/preview` |
| `POST` | `/api/meals/:groupId/bulk/apply` |
| `POST` | `/api/meals/:groupId/bulk/preview` |
| `POST` | `/api/meals/:groupId/guests` |
| `PUT` | `/api/meals/entry/:id` |

### Expenses (V2) & legacy entries

| Method | Path |
|---|---|
| `DELETE` | `/api/expenses/entry/:id` |
| `GET` | `/api/expenses/:groupId` |
| `GET` | `/api/expenses/:groupId/:month` |
| `GET` | `/api/expenses/groups/:groupId/expenses` |
| `POST` | `/api/expenses/:groupId` |
| `POST` | `/api/expenses/groups/:groupId/expenses` |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/approve` |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/reject` |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/reverse` |
| `POST` | `/api/expenses/groups/:groupId/expenses/:expenseId/submit` |
| `POST` | `/api/expenses/groups/:groupId/expenses/import/apply` |
| `POST` | `/api/expenses/groups/:groupId/expenses/import/preview` |
| `PUT` | `/api/expenses/entry/:id` |

### Legacy monthly summary

| Method | Path |
|---|---|
| `GET` | `/api/summary/:groupId/:month` |
| `GET` | `/api/summary/whatsapp/:groupId/:month` |
| `POST` | `/api/summary/finalize/:groupId/:month` |

### Statistics

| Method | Path |
|---|---|
| `GET` | `/api/stats/:groupId` |
| `GET` | `/api/stats/groups/:groupId/dashboard` |

### Memberships

| Method | Path |
|---|---|
| `GET` | `/api/memberships/groups/:groupId/memberships` |
| `GET` | `/api/memberships/groups/:groupId/memberships/active` |
| `GET` | `/api/memberships/groups/:groupId/memberships/month/:month` |
| `PATCH` | `/api/memberships/groups/:groupId/memberships/:membershipId` |
| `POST` | `/api/memberships/groups/:groupId/memberships` |
| `POST` | `/api/memberships/groups/:groupId/memberships/:membershipId/depart` |

### Policy versions

| Method | Path |
|---|---|
| `GET` | `/api/policies/groups/:groupId/policies` |
| `POST` | `/api/policies/groups/:groupId/policies` |

### Periods

| Method | Path |
|---|---|
| `GET` | `/api/periods/groups/:groupId/periods` |
| `GET` | `/api/periods/groups/:groupId/periods/:month` |
| `GET` | `/api/periods/groups/:groupId/periods/:month/checklist` |
| `GET` | `/api/periods/groups/:groupId/periods/:month/preview` |
| `POST` | `/api/periods/groups/:groupId/periods/:month/begin-review` |
| `POST` | `/api/periods/groups/:groupId/periods/:month/correct` |
| `POST` | `/api/periods/groups/:groupId/periods/:month/return-to-open` |

### Money & funds

| Method | Path |
|---|---|
| `GET` | `/api/money/groups/:groupId/funds` |
| `GET` | `/api/money/groups/:groupId/memberships/:membershipId/balance` |
| `GET` | `/api/money/groups/:groupId/money` |
| `POST` | `/api/money/groups/:groupId/funds` |
| `POST` | `/api/money/groups/:groupId/funds/:fundId/custodian` |
| `POST` | `/api/money/groups/:groupId/money` |
| `POST` | `/api/money/groups/:groupId/money/:txId/confirm` |
| `POST` | `/api/money/groups/:groupId/money/:txId/reject` |
| `POST` | `/api/money/groups/:groupId/money/:txId/reverse` |

### Statements

| Method | Path |
|---|---|
| `GET` | `/api/statements/groups/:groupId/statements` |
| `GET` | `/api/statements/groups/:groupId/statements/:month` |
| `GET` | `/api/statements/groups/:groupId/statements/:month/explain` |
| `GET` | `/api/statements/groups/:groupId/statements/id/:statementId` |
| `POST` | `/api/statements/groups/:groupId/statements/:month/finalize` |
| `POST` | `/api/statements/groups/:groupId/statements/:month/reminders` |

### Recurring rules

| Method | Path |
|---|---|
| `GET` | `/api/recurring/groups/:groupId/recurring` |
| `POST` | `/api/recurring/groups/:groupId/recurring` |
| `POST` | `/api/recurring/groups/:groupId/recurring/:ruleId/generate` |
| `POST` | `/api/recurring/groups/:groupId/recurring/generate-all` |
| `PUT` | `/api/recurring/groups/:groupId/recurring/:ruleId` |

### Reconciliation

| Method | Path |
|---|---|
| `GET` | `/api/reconciliation/groups/:groupId/reconciliations` |
| `GET` | `/api/reconciliation/groups/:groupId/reconciliations/equation` |
| `GET` | `/api/reconciliation/groups/:groupId/reconciliations/suggestions` |
| `POST` | `/api/reconciliation/groups/:groupId/reconciliations` |
| `POST` | `/api/reconciliation/groups/:groupId/reconciliations/:recId/resolve` |

### Disputes

| Method | Path |
|---|---|
| `GET` | `/api/disputes/groups/:groupId/disputes` |
| `POST` | `/api/disputes/groups/:groupId/disputes` |
| `POST` | `/api/disputes/groups/:groupId/disputes/:disputeId/resolve` |
| `POST` | `/api/disputes/groups/:groupId/disputes/:disputeId/respond` |

### Notifications & outbox

| Method | Path |
|---|---|
| `GET` | `/api/notifications/groups/:groupId/notifications` |
| `GET` | `/api/notifications/groups/:groupId/notifications/:messageId` |
| `GET` | `/api/notifications/whatsapp/webhook` |
| `POST` | `/api/notifications/groups/:groupId/notifications/:messageId/resend` |
| `POST` | `/api/notifications/groups/:groupId/notifications/manual-share` |
| `POST` | `/api/notifications/whatsapp/webhook` |
| `PUT` | `/api/notifications/whatsapp/consent` |

### Sessions

| Method | Path |
|---|---|
| `DELETE` | `/api/sessions/users/sessions` |
| `DELETE` | `/api/sessions/users/sessions/:familyId` |
| `GET` | `/api/sessions/users/sessions` |

### Attachments

| Method | Path |
|---|---|
| `GET` | `/api/attachments/groups/:groupId/:attachmentId` |
| `POST` | `/api/attachments/groups/:groupId/upload` |

### Deposit assets

| Method | Path |
|---|---|
| `GET` | `/api/assets/groups/:groupId` |
| `POST` | `/api/assets/groups/:groupId` |
| `POST` | `/api/assets/groups/:groupId/:assetId/refund` |

### Inbox

| Method | Path |
|---|---|
| `GET` | `/api/inbox` |
| `GET` | `/api/inbox/preferences` |
| `GET` | `/api/inbox/unread-count` |
| `POST` | `/api/inbox/read` |
| `PUT` | `/api/inbox/preferences` |

### Support tickets

| Method | Path |
|---|---|
| `GET` | `/api/support/tickets` |
| `GET` | `/api/support/tickets/:ticketId` |
| `POST` | `/api/support/actions/:token` |
| `POST` | `/api/support/appeal` |
| `POST` | `/api/support/tickets` |
| `POST` | `/api/support/tickets/:ticketId/close` |
| `POST` | `/api/support/tickets/:ticketId/messages` |
| `POST` | `/api/support/tickets/:ticketId/rate` |
| `POST` | `/api/support/tickets/:ticketId/reopen` |
| `POST` | `/api/support/tickets/:ticketId/resolve` |

### Routines, board, duties

| Method | Path |
|---|---|
| `DELETE` | `/api/routines/groups/:groupId/notes/:noteId` |
| `GET` | `/api/routines/groups/:groupId/bazar-spend-rotation` |
| `GET` | `/api/routines/groups/:groupId/board/today` |
| `GET` | `/api/routines/groups/:groupId/duties` |
| `GET` | `/api/routines/groups/:groupId/duties/fairness` |
| `GET` | `/api/routines/groups/:groupId/menu` |
| `GET` | `/api/routines/groups/:groupId/menu/bazar-suggestions` |
| `GET` | `/api/routines/groups/:groupId/notes` |
| `GET` | `/api/routines/groups/:groupId/notes/:noteId` |
| `GET` | `/api/routines/groups/:groupId/rosters` |
| `GET` | `/api/routines/groups/:groupId/rosters/:rosterId` |
| `PATCH` | `/api/routines/groups/:groupId/notes/:noteId` |
| `PATCH` | `/api/routines/groups/:groupId/rosters/:rosterId` |
| `POST` | `/api/routines/groups/:groupId/duties/:assignmentId/done` |
| `POST` | `/api/routines/groups/:groupId/duties/:assignmentId/reassign` |
| `POST` | `/api/routines/groups/:groupId/emergency-broadcast` |
| `POST` | `/api/routines/groups/:groupId/menu` |
| `POST` | `/api/routines/groups/:groupId/notes` |
| `POST` | `/api/routines/groups/:groupId/notes/:noteId/ack` |
| `POST` | `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/claim` |
| `POST` | `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/done` |
| `POST` | `/api/routines/groups/:groupId/rosters` |
| `POST` | `/api/routines/groups/:groupId/rosters/:rosterId/extend-horizon` |
| `POST` | `/api/routines/groups/:groupId/rosters/:rosterId/publish` |
| `POST` | `/api/routines/groups/:groupId/swaps` |
| `POST` | `/api/routines/groups/:groupId/swaps/:swapId/respond` |

### Shopping list

| Method | Path |
|---|---|
| `DELETE` | `/api/shopping-list/groups/:groupId/items/:itemId` |
| `GET` | `/api/shopping-list/groups/:groupId` |
| `GET` | `/api/shopping-list/groups/:groupId/history` |
| `PATCH` | `/api/shopping-list/groups/:groupId/items/:itemId` |
| `POST` | `/api/shopping-list/groups/:groupId/items` |
| `POST` | `/api/shopping-list/groups/:groupId/to-expense` |

### Kitchen inventory

| Method | Path |
|---|---|
| `DELETE` | `/api/kitchen-inventory/groups/:groupId/:itemId` |
| `GET` | `/api/kitchen-inventory/groups/:groupId` |
| `PATCH` | `/api/kitchen-inventory/groups/:groupId/:itemId` |
| `POST` | `/api/kitchen-inventory/groups/:groupId` |
| `POST` | `/api/kitchen-inventory/groups/:groupId/:itemId/refill` |

### Polls

| Method | Path |
|---|---|
| `GET` | `/api/polls/:pollId/results` |
| `GET` | `/api/polls/groups/:groupId` |
| `POST` | `/api/polls/:pollId/close` |
| `POST` | `/api/polls/:pollId/vote` |
| `POST` | `/api/polls/groups/:groupId` |

### Budgets

| Method | Path |
|---|---|
| `DELETE` | `/api/budgets/groups/:groupId/:budgetId` |
| `GET` | `/api/budgets/groups/:groupId` |
| `GET` | `/api/budgets/groups/:groupId/variance` |
| `POST` | `/api/budgets/groups/:groupId` |

### Invite codes

| Method | Path |
|---|---|
| `GET` | `/api/invite/codes/:groupId` |
| `POST` | `/api/invite/codes` |
| `POST` | `/api/invite/join-by-code` |

<!-- END:generated:routes -->
