# MealMate Frontend — Build Prompt (paste into IDE AI)

> **READ §8 FIRST.** §8 (Amendments) overrides §1.5 (persist), §2 tasks T0.3–T0.7, §4 "Auth model", and §5 `src/` layout wherever they conflict. New phases P9–P11 are in §8.7.

## 0. ROLE & GOAL

You are a senior React engineer. Build the complete frontend for **MealMate**, a mess (shared-living) meal & cost tracker backed by a real double-entry ledger, versioned month-end statements, and audited financial workflows. The backend is finished and lives in `/Server` (Express 5 + MongoDB). The frontend lives in `/Client` (Next.js App Router + React). Backend docs: root `readme.md` (API reference) and `plan.md` (per-file deep dive) — they are the source of truth.

**Priorities, in order:** (1) follow the rules below, (2) **mobile responsiveness — top priority for every screen and component**, (3) token efficiency, (4) working code, (5) modern UI polish.

**Fixed stack decisions:** Next.js App Router + React · **zustand** for state · **react-icons** for all icons (no SVG) · Chart.js (canvas) for charts · CSS variables from `app/globals.css` for all colors. New backend modules covered: Invite Codes, TOTP 2FA, In-App Inbox, Support Desk, Routine & Board, Shopping List, Kitchen Inventory, Polls, cookie-only auth (`mm_at`/`mm_csrf` cookies).

---

## 1. HARD RULES (never break)

### 1.1 Colors

- **Tailwind classNames only for layout and visual styling.** Do not use `style={{ ... }}` in JSX; use `className` with Tailwind utilities and CSS-variable arbitrary values.
- Dynamic values that cannot be static classes must use a CSS variable via `style={{ "--value": ... }}` plus a Tailwind/CSS class; never set literal colors, dimensions, margins, positioning, or other visual properties directly as inline style objects.
- Add the mandatory Tailwind rule to every component, page, and future task. Existing inline styles must be migrated during touch-up tasks; no new inline style usage is allowed.

- **Only** use CSS variables defined in `app/globals.css`.
- **Forbidden anywhere in `src/` and `app/` except `app/globals.css` variable definitions:** hex (`#fff`), `rgb()/rgba()/hsl()`, named colors (`red`, `white`…), Tailwind palette classes (`bg-blue-500`), inline `style={{ color/background/border… }}` with literal colors, and any literal color on icons (icons inherit text color via `currentColor`; set that color with a variable-based class).
- Allowed: `var(--name)` references (e.g. `className="bg-[var(--surface)]"` or `.my-class { color: var(--text) }`).
- If a needed color/shade doesn't exist: **add a new variable to `app/globals.css` for BOTH light and dark themes**, then use it. Never inline it.
- Chart colors (Chart.js) must be read from variables at runtime via `getComputedStyle(document.documentElement).getPropertyValue('--x')`.
- Verify at the end of every phase with:
  `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" Client/src Client/app --include=*.jsx --include=*.js --include=*.css | grep -v "globals.css"` → must return nothing.

### 1.2 Reuse components

- Reusable components already exist in `Client/src/components/{shared,modals,guards,socket}`. **You MUST use them. Do NOT create new buttons, inputs, modals, tables, cards, badges, toasts, tabs, pagination, skeletons, avatars, etc.**
- Before creating any UI piece, check `Client/COMPONENTS.md` (see §3). If something is close, **extend it via props** — don't fork or duplicate.
- Only create a new component when nothing existing fits; put it in `components/shared` (generic) or `features/<name>/components` (domain-specific), and add it to `COMPONENTS.md`.
- Known near-duplicates (pick ONE and note it in `COMPONENTS.md`): `Breadcrumb.jsx` vs `Breadcrumbs.js`, `FileInput.jsx` vs `FileUpload.js` vs `ImageUpload.js`, `ConfirmationModal.jsx` vs `DeleteConfirmationModal.js`, `RateLimitCatcher.jsx` vs `RateLimitListener.jsx`.
- Wire existing infra instead of rebuilding: `ToastProvider/Toast` (all notifications), `PermissionGuard` (role-gated UI), `SocketInitializer` (realtime), `RateLimitCatcher/Listener` (429 handling), `ThemeToggle`, `ModalStepper`, `Skeleton`, `Loading`, `Pagination`, `Table`, `Tabs`, `StatusBadge`, `PasswordStrengthMeter`, `ProfileAvatarUpload`, `TopBar`.

### 1.3 Token efficiency

- **Never** re-read the whole repo or the whole readme. Read only the file you need, only when you need it, and prefer reading the top ~40 lines of a component to learn its props.
- **Never** paste full files in chat. Write files directly; chat replies ≤ 5 lines per task (what was done + next task).
- Batch: create/edit multiple files per step. Don't narrate, don't explain obvious code, no long summaries.
- Don't run full builds after every task. Run `npm run lint` / `npm run build` only at the end of a phase.
- Don't re-verify finished tasks. Trust `TODO.md`.
- Keep files small (< 250 lines). Split into hooks/subcomponents instead of long files.

### 1.4 Icons — NO SVG, react-icons only

- Install `react-icons`. Pick **one family** (e.g. `react-icons/lu` or `/fi`) in T0.1 and use it everywhere; record the choice in Notes.
- **Forbidden:** inline `<svg>` markup, `.svg` file imports, `<img src="*.svg">`, `vite.svg` / `react.svg` usage, and emoji as UI icons. (Exception: the backend's `ExpenseCategory.icon` emoji and preset-category icons are user data — render as text.)
- Any existing shared component that contains inline SVG must be converted to react-icons (task T0.8).
- Icons inherit color through `currentColor` (set via variable-based text color classes); size via the `size` prop or a size class.
- Charts: use **Chart.js + react-chartjs-2 (canvas)**. Do **not** use Recharts/D3-SVG or any lib that renders SVG.
- Favicon: use `public/favicon.ico` or `public/favicon.png`; remove any `vite.svg` / `react.svg` references.
- Verify at the end of every phase: `grep -rniE "<svg|\.svg" Client/src Client/app Client/public` → must return nothing.

### 1.5 State management — zustand only

- Install `zustand`. All global/shared state lives in `src/store/` as zustand stores: `authStore` (user + access token, `persist` middleware), `groupStore` (current group + my role), `uiStore` (theme, sheets/drawers). Domain stores follow one consistent pattern: `{ data, loading, error, fetch, mutate, invalidate }`, cached by key (`groupId` + `month`) to avoid refetching.
- **No React Context for app state, no Redux.** Local, component-only state stays in `useState`.
- Always use selectors (`useStore(s => s.x)`; `useShallow` for multiple fields) to prevent re-renders. Don't store derived data — compute it via selectors/memo.
- Non-React code (axios interceptors, socket client) reads state with `useAuthStore.getState()`.
- Create one tiny reusable helper for the `{data, loading, error}` fetch pattern instead of repeating it in every store.
- Socket events (`meal-updated`, `expense-updated`) call the matching store's `invalidate/fetch`.

### 1.6 Mobile-first — TOP PRIORITY

- Design every screen at **360px first**, then enhance with `sm / md / lg`. Must work at **320, 360, 390, 768, 1024, 1280** widths. Never allow horizontal page scroll.
- Touch targets **≥ 44×44px**; input font-size **≥ 16px** (prevents iOS zoom); primary actions in the thumb zone (sticky bottom action bar or FAB).
- **Navigation:** mobile = bottom nav (Home · Meals · Expenses · Summary · More) + horizontally scrollable group tabs; desktop = sidebar/top bar.
- **Modals → bottom sheets on mobile** (full width, rounded top corners, `max-height: 90dvh`, internal scroll); centered dialog from `md` up. Implement by extending `Modal.jsx`, not by creating new modals.
- **Tables → stacked cards below `md`.** Wide grids (member × day meals, statement item columns) use an `overflow-x-auto` container with a sticky first column. Extend `Table.jsx` for this rather than building custom tables.
- Use `dvh` (not `vh`), `env(safe-area-inset-*)`, proper viewport meta, `min-w-0` + truncation to stop overflow, responsive grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- No hover-only interactions; tooltips must work on tap. Use native-friendly date/month/select inputs on mobile.
- Charts: `maintainAspectRatio: false` inside fixed-height responsive containers; legends below on mobile.
- Mobile performance: lazy-load routes (`React.lazy` + `Suspense` with `Skeleton`), code-split charts, memoize lists.

### 1.7 Modern UI & component design

- Clean, card-based layouts with generous whitespace; 4/8px spacing scale; consistent radius scale; layered soft shadows; subtle borders. Define **design tokens as variables in `app/globals.css`** (`--radius-*`, `--shadow-*`, `--space-*`, `--transition`, font sizes). Shadows and gradients also use color variables only (e.g. `color-mix(in srgb, var(--surface) 80%, transparent)` for frosted/blurred sticky headers).
- Typography: one font family, clear scale, `tabular-nums` for money.
- Interactions: 150–200ms transitions on hover/focus/press, subtle press feedback, `:focus-visible` rings via variable, skeleton shimmer, light route fade. Respect `prefers-reduced-motion`.
- Components: pill chips for filters, segmented controls for month/year toggles, avatars with initials fallback, status Badges with **icon + color** (never color alone) — statuses everywhere: expense `draft/submitted/approved/rejected/reversed`, money `submitted/confirmed/rejected/reversed`, period `open/review/finalized`, statement item `owes/receives/settled`, outbox `pending/sent/delivered/read/failed/skipped`. Empty states with icon + message + CTA.
- Money is the hero: prominent "Total due" / balance card (meal cost + other costs breakdown) on Summary and Home; show ৳ amounts from **integer poisha** (`amount / 100`, always 2 decimals, `Intl.NumberFormat('en-BD', {currency:'BDT'})` helper `formatPoisha`).
- Dark mode is first-class, not an afterthought.
- Modernize the **shared components once, centrally** (T0.8) so every page inherits the design language instead of restyling per page.

---

## 2. RESUME-SAFE WORKFLOW (the TODO system)

Create and maintain **`Client/TODO.md`** — this is your memory across sessions. Context/tokens may run out at any moment, so state must always be on disk.

### Session start protocol (every session, always)

1. Read **only** `Client/TODO.md` (and `Client/COMPONENTS.md` if you need component props).
2. Find the first task marked `[ ]` or `[~]` and continue from there.
3. Do **not** re-scan the project or redo `[x]` tasks.

### Task status markers

- `[ ]` not started · `[~]` in progress (add a one-line note of what's left) · `[x]` done · `[!]` blocked (reason)

### Rules for updating

- Mark `[~]` **before** starting a task; mark `[x]` **immediately** after finishing (before starting the next).
- Update TODO.md after **each task**, not each phase.
- Tasks must be small enough to finish in one go (≈ 1–3 files). If a task is big, split it.
- Keep an `## Notes & Decisions` section at the bottom (chosen duplicates, helper names, env vars, gotchas, the CSS variable list). Append, don't rewrite.
- Keep a `## Last Session` line: `<what was last completed> → <next task id>`.

### Seed TODO.md (create this first, then start T0.1)

```
# MealMate Frontend TODO
Last Session: (none) → T0.1

## P0 Recon & Foundation
- [ ] T0.1 Read app/globals.css → list all CSS variables (names + purpose) in Notes. Read package.json → note styling lib and router (Next.js App Router). Install missing deps: axios, socket.io-client, zustand, react-icons, chart.js, react-chartjs-2. Choose ONE react-icons family and record it in Notes.
- [ ] T0.2 Create Client/COMPONENTS.md: for each file in components/*, one line: name · path · props · when to use. (Read only the top of each file.) Flag components containing inline SVG.
- [ ] T0.3 Folder structure: app/ + src/{api,store,hooks,routes,pages,features,utils}. Create .env (BACKEND_URL + NEXT_PUBLIC_APP_URL) + .env.example. Dev port 5174 set in package.json dev script.
- [ ] T0.4 lib/api/serverApi.js + lib/api/browserApi.js (§8.4) + app/api/bff/[...path]/route.js allowlist proxy (§8.3). baseURL /api/bff (browser) or BACKEND_URL (server).
- [ ] T0.5 store/authStore (zustand, NO persist per §8.2: user, accessToken; login/logout/loadProfile actions) + AuthHydrator + tiny fetch-state helper for data stores.
- [ ] T0.6 routes: app/ App Router with protected layout + public layout groups (lazy-loaded pages + Skeleton fallback), 404 page, wrap ToastProvider + RateLimit listener in layout.
- [ ] T0.7 store/groupStore (current group, myRole from 5-tier roles) + store/uiStore (theme, sheets) + hooks/useGroupRole feeding PermissionGuard.
- [ ] T0.8 Modernize shared components ONCE: design tokens in app/globals.css (light+dark); replace inline SVG with react-icons; Modal → bottom sheet on mobile; Table → stacked cards <md; 44px targets; focus-visible rings; Button/Input/Card/Badge/Tabs/Skeleton polish; add StatusBadge variants for the new statuses (§1.7). Update COMPONENTS.md.
- [ ] T0.9 app/layout.js + app/globals.css: viewport meta, theme pre-paint script, safe-area + dvh base CSS, font setup, base responsive utilities; public/favicon.ico (no svg).
- [ ] T0.10 utils/format.js: formatPoisha (poisha→৳ string), parseTaka (৳→integer poisha), month helpers (toMonthString, formatMonth, monthRange), day helpers (Dhaka civil date via Intl timeZone 'Asia/Dhaka').

## P1 Auth & Sessions
- [ ] T1.1 Register page (username, email, phone?, whatsapp?, password + PasswordStrengthMeter, confirm)
- [ ] T1.2 Login page (+ Google button → GET /api/users/auth/google)
- [ ] T1.3 Google callback page (inspect userController.googleAuth redirect params, store tokens)
- [ ] T1.4 Forgot password + Reset password (token from URL) pages
- [ ] T1.5 Verify email page (/verify-email/:token)
- [ ] T1.6 Sessions page (profile sub-tab): GET /api/sessions/users/sessions device list; revoke one (`DELETE /:familyId`) and revoke-all with ConfirmationModal.

## P2 Groups & Memberships
- [ ] T2.1 Home dashboard: my groups (Card grid, Skeleton, empty state, create/join buttons)
- [ ] T2.2 Create group form: name + meal slots checkboxes (breakfast/lunch/snacks/dinner) + per-slot weights (0–1000) + default meal subunits (0/250/500/750/1000) + defaultMealsEnabled toggle
- [ ] T2.3 Join by code (input "MM-XXXXXX", pending-approval state) + handle `/join?code=…` deep link query param auto-fill
- [ ] T2.4 Group layout: header + Tabs (Overview, Meals, Expenses, Money, Statements, Charts, Members, More); useGroup hook; socket join-group/leave-group
- [ ] T2.5 Overview tab: V2 dashboard GET /api/stats/groups/:groupId/dashboard — period state badge, expense pipeline counts, money totals, fund balances, latest statement link
- [ ] T2.6 Members tab: membership list (Avatar, role Badge owner/manager/treasurer/auditor/member, active interval), manager+: create membership (member or placeholder with displayName), edit role/room/weight, depart; placeholders marked with a chip
- [ ] T2.7 Settings tab: join code view + **copyable inviteLink** (copy button + navigator.share) + regenerate (confirm), email invite, categories manager (CRUD + 8 splitMode picker + archive), recurring rules CRUD (+ generate drafts), deposits/assets list + create + refund, extras CRUD (legacy)
- [ ] T2.8 Policy editor (owner): GET/POST /api/policies/groups/:groupId/policies — mealWeights, entryCutoffHour, reviewGraceDays; version history list

## P3 Meals (slot-state)
- [ ] T3.1 Meals tab: month picker + day strip; my quick-entry: 4 slot cards (breakfast/lunch/snacks/dinner) each a segmented control — Unknown / Absent (confirmed_zero) / portion (¼ ½ ¾ 1) — POST /api/meals/:groupId { date, slots }
- [ ] T3.2 Guest meal entry: slot + portion + poolMode radio (individual | universal) + guestName; list my guest meals
- [ ] T3.3 Group month grid: member × day × slot matrix (overflow-x-auto, sticky first column); cells show portion icon or ✕ for zero or ? for unknown (danger color variable)
- [ ] T3.4 Absence & bulk (admin): absence form (from/to date, slots, preview → apply showing change count); bulk entry with preview/apply (dry-run diff rendered)
- [ ] T3.5 Edit/delete rules: own entries editable; cutoff-hour awareness (show lock note if past entryCutoffHour)

## P4 Expenses (workflow)
- [ ] T4.1 Expenses tab (workflow mode): list GET /api/expenses/groups/:groupId/expenses with StatusBadge (draft/submitted/approved/rejected/reversed), filters (status, costPeriod, payable), "load more" via nextCursor
- [ ] T4.2 Expense draft builder: multi-line lines[] (description, category select, amount in ৳ → poisha, per-line split mode + beneficiaries/fixed/weights when needed), payer(s), supplier, receiptReference, isPayable toggle; duplicate warnings shown as amber banners (not blocking)
- [ ] T4.3 Workflow actions: submit (member), approve/reject with reason (treasurer), reverse with reason; self-approval prompt for a reason
- [ ] T4.4 Receipt upload: POST /api/attachments/groups/:groupId/upload (multipart 'file', ≤10MB jpeg/png/webp/pdf) + authenticated download link rendering
- [ ] T4.5 Legacy simple CRUD kept under an "Advanced/Legacy" collapse for old data (POST /:groupId, entry edit/delete)

## P5 Money & Funds
- [ ] T5.1 Money tab: transaction list (cursor pagination, filters status/kind), StatusBadge, kind icons (contribution/payout/supplier_payment/member_settlement/transfer/fee), method chip (bkash/nagad/rocket/cash/bank)
- [ ] T5.2 Submit transaction form: kind select, amount (৳→poisha), from/to member or fund account pickers (dynamic per kind), method, reference (TrxID), paidAt, evidence link
- [ ] T5.3 Confirm/reject/reverse actions (treasurer) with reason inputs
- [ ] T5.4 Funds panel: fund accounts with ledger balances, masked identifiers, custodian + history; treasurer: create fund; owner: custody handover
- [ ] T5.5 My balance card: GET /api/money/groups/:groupId/memberships/:membershipId/balance with owes/receives status

## P6 Statements & Month-End Close
- [ ] T6.1 Statements tab: list current statements GET /api/statements/groups/:groupId/statements; statement detail: totals (meals, meal/other/total expenses, mealRate), per-member items table (mealUnits, mealCost, otherCost, contributions, closingCredit, owes/receives/settled badge), policy snapshot summary
- [ ] T6.2 Version history: GET /:month returns versions with supersedes chain; badge "superseded"; view any version
- [ ] T6.3 Close workflow (manager/owner): period detail GET /api/periods/…/:month; Preview statement (draft, no persist); close checklist (GET …/checklist); Begin review / Return to open buttons; Finalize modal with expectedRevision (handle 409 conflict message "data changed, refresh and retry" and 422 unknown-meals list rendering member/slot/date chips)
- [ ] T6.4 Corrections: finalize with reason creates version N+1 (auto after viewing a finalized month)

## P7 Notifications & Disputes
- [ ] T7.1 Notifications panel (manager+): outbox list GET /api/notifications/groups/:groupId/notifications with state filters + StatusBadge (pending/sent/delivered/read/failed/skipped/not_configured), resend action, manual-share wa.me links
- [ ] T7.2 WhatsApp consent toggle on own profile (PUT /api/notifications/whatsapp/consent)
- [ ] T7.3 Disputes: list/create dispute (targetType expense|money_transaction|statement_item, target picker, reason), threaded responses, manager resolve/reject with note + optional correctionJournalId
- [ ] T7.4 Reconciliation (treasurer): create (fund, asOf, counted amount), variance display (green/red from variables), resolve with resolution select; accounting-equation health card

## P8 Stats & Profile & Polish
- [ ] T8.1 Charts tab: granularity (month/year), year/month/user filters; meals line/bar, expense series, category pie (colors from CSS vars)
- [ ] T8.2 Profile page: edit username/phone/whatsapp, ProfileAvatarUpload, change password
- [ ] T8.3 Theme (light/dark) check on every page; mobile-first audit at 320/360/390/768/1024/1280 (no horizontal scroll, 44px targets, bottom sheets, stacked tables)
- [ ] T8.4 Loading/empty/error states audit; a11y pass; reduced-motion check
- [ ] T8.5 Color audit (grep §1.1) + SVG audit (grep §1.4), lint, build; fix issues
- [ ] T8.6 Members directory UI: co-member cards from `GET /api/users/groups/:groupId/members` (Avatar, username, optional whatsapp link); NO email/phone display (server never returns them)
- [ ] T8.7 Leave-group (self, ConfirmationModal explaining history-cutoff) + kick (admin) with post-leave redirect; handle ex-member "history clamped" notice state
- [ ] T8.8 Hidden admin shell: `/admin/*` lazy routes (Overview cards + Chart.js traffic line, Users table w/ suspend toggle, Groups table w/ archive, Audit feed); probe `GET /api/admin/overview` — on 404 render nothing and never show the route
- [ ] T8.9 Write Client/README.md (setup, env, structure, scripts)

## Notes & Decisions
(append here)
```

---

## 3. COMPONENTS.md (created in T0.2)

One line per component: `Name · path · props (required*/optional) · use-for`. Group by folder. This file lets you (and future sessions) use components **without re-opening them**. Update it whenever you add or change a component's props.

---

## 4. BACKEND CONTRACT (compact — don't re-read server code unless a detail is missing)

**Base:** browser calls `/api/bff` (proxy to `${BACKEND_URL}/api`); server calls `${BACKEND_URL}/api` directly · Header: `x-auth-token: <accessToken>` · Backend CORS allows `http://localhost:5174` → port 5174 set in package.json dev script. Include `credentials: true` on axios (HttpOnly cookies: `mm_at` access token Path=/, `mm_rt` refresh Path=/api/users, `mm_csrf` CSRF double-submit).

### Auth model

- Login/register return `{ user, accessToken, refreshToken }` and also set an HttpOnly cookie. Access = 1h, refresh = 7d (**rotating**: each `POST /users/refresh` returns a new pair; replaying an old refresh token revokes the whole session **family** → 401 → force logout).
- **TOTP 2FA:** if user has 2FA enabled, login returns `{twoFactorRequired: true, challengeToken}`. Call `POST /users/login/2fa-challenge {email,password}` → then `POST /users/login/2fa {challengeToken, code}` to get tokens with `amr: ['pwd','otp']`. 2FA setup: `POST /users/2fa/setup` → verify `POST /users/2fa/verify {code}` → disable `POST /users/2fa/disable {password, code}`. Admin routes require `amr: otp` (404-masked if not enrolled).
- On 401: call `POST /users/refresh` once (with `credentials: 'include'`), retry the original request. Queue parallel requests during refresh. On failure: logout + redirect to login.
- Sessions are per-device: list via `GET /sessions/users/sessions`, revoke via `DELETE /sessions/users/sessions/:familyId` or all via `DELETE /sessions/users/sessions`.
- Rate limits: 50/15min auth, 300/15min general → friendly 429 message (RateLimitCatcher).
- **Roles (5-tier, V2):** `owner > manager > treasurer > auditor > member`, resolved from effective-dated Memberships (legacy groups: group admin → owner). Gate UI with `PermissionGuard`; the server is the real authority. Members may hold different roles in different groups.
- **Idempotency:** financial mutations accept an optional `Idempotency-Key` header. Send a generated UUID on create/submit/approve/reverse/confirm/finalize to make retries safe. Key reuse with a different body → 409.

**Privacy model (must be reflected in UI):**

1. **No global discovery** — no user or group search/browse UI anywhere for regular users. Group detail returns 404 to outsiders; render as "Group not found".
2. **User info is group-scoped** — only the co-members directory exposes profiles (username/profilePic/whatsapp). No email/phone display across members.
3. **Invite-only joining (hashed codes):** join codes are hashed at rest (sha256 + pepper). `GET /invite/codes/:groupId` returns only metadata `{prefix, expiresAt, usesLeft}` — no plaintext. Plaintext is shown **once** at creation via `POST /invite/codes`. Join via `POST /invite/join-by-code {code, groupId}` (rate-limited, failure lockout). Admin can regenerate (kills old links).
4. **Leave/kick cuts instantly** — after departure the member loses access; if they somehow revisit, group data 404s. Their own historic data remains via interval-clamped reads only if the server permits (it clamps automatically).
5. **Hidden admin panel** — `/admin` shell exists only for platform admins (env `ADMIN_EMAILS`); any 404 from `/api/admin/*` → user is not admin → never render the route/link.

### Money format — CRITICAL

All monetary fields are **integer poisha** (100 poisha = ৳1). Send integers; display `formatPoisha(n)` = `৳ (n/100)` with 2 decimals. Legacy endpoints (summary/calculate/stats/extras) still use floats — do not mix helpers.

### Endpoints by domain

**/users:** POST `/register` `/login` `/refresh` `/logout` `/change-password {currentPassword,newPassword}` `/forgot-password {email}` `/reset-password {token,password}` `/profile-pic` (multipart field `image`) · GET `/profile` `/verify-email/:token` `/auth/google(/callback)` · PUT `/profile {username?,phone?,whatsapp?}` · POST `/2fa/setup` `/2fa/verify {code}` `/2fa/disable {password, code}` · POST `/login/2fa-challenge {email,password}` `/login/2fa {challengeToken, code}`.
**Privacy rule:** other users' profiles are visible ONLY inside shared groups — `GET /users/groups/:groupId/members` returns `{members:[{_id, username, profilePic, whatsapp}]}` or **404** if you don't belong. Never build global user search/browse UI.
Password rule: 8+ chars, upper + lower + digit.

**/sessions:** GET `/users/sessions` · DELETE `/users/sessions/:familyId` · DELETE `/users/sessions`.

**/messgroups:** POST `/create {name, mealSlots?, mealWeights?, defaultMealSubunits?, defaultMealsEnabled?}` · `/join-request/:groupId` · `/approve/:groupId/:userId`(admin) · `/add-member/:groupId`(admin) · `/invite/:groupId {email}`(admin) · `/extras/:groupId`(admin) · `/categories/:groupId`(admin; splitMode 8 values) · `/categories/:groupId/seed`(admin, re-seed BD presets)
GET `/my-groups` · `/:groupId` (**404-masked for non-members — handle as "group not found", never reveal existence**) · `/code/:groupId`(admin → legacy `{code, inviteLink}`, superseded by `/invite/codes/:groupId`) · `/extras/:groupId` · `/categories/:groupId` · `/calculate/:groupId`(legacy) · `/export/:groupId`(xlsx blob) · `/pdf/:groupId`(pdf blob)
PUT/DELETE categories (`DELETE` archives), payment-notes (legacy), remove-member (**kick or self-leave**; after leaving, history reads are auto-clamped to the member's interval by the server — reflect this in UI with a "viewing history until <date>" notice for ex-members).

**Invite-link UX:** admin settings shows the code in a mono chip with copy-to-clipboard button AND the full `inviteLink` (`{FRONTEND_URL}/join?code=…`) with a separate Copy + native share (navigator.share when available). `GET /code/:groupId` → `{ code:'MM-XXXXXX', inviteLink:'https://…/join?code=MM-XXXXXX' }`. `GET /invite/codes/:groupId` → `{ prefix:'MM-ABCD', expiresAt, usesLeft, active }` (no plaintext).

**Hidden admin app-shell (platform admins only):** lazy route `/admin/*` guarded by membership in `ADMIN_EMAILS` (returned as `user.isAdmin` from `/profile` or a probe `GET /api/admin/overview` — 404 means hide the route entirely). Panels: Overview/traffic cards + line chart (signups & activity per day, colors from CSS vars), Users table (search `q`, cursor pagination, suspend/verify toggles with ConfirmationModal), Groups table (name, admin, activeMembers, archive action), Audit feed (filter by action). The route must NOT appear in any nav for non-admins; treat any 404 from `/api/admin/*` as "not an admin".
**/memberships (V2 source of truth):** GET `/groups/:groupId/memberships` (+ `/active`, `/month/:month`) · POST `/groups/:groupId/memberships {displayName, startDate, userId? (null ⇒ placeholder), role?, room?, weight?}`(manager) · PATCH `/:membershipId {role?, room?, weight?, endDate?, linkUserId?}`(manager) · POST `/:membershipId/depart {at?, reason?}`(manager).

**/meals (slot-state):** POST `/:groupId {date?, slots: { lunch?: {state:'unknown'|'confirmed_zero'|'consumed', portionSubunits?}, … }}` (upsert own day; consumed requires portionSubunits ∈ 250/500/750/1000) · PUT/DELETE `/entry/:id`(owner[/admin]) · GET `/:groupId?month=|from=&to=&userId=` or `/:groupId/:month`
Guests: POST/GET `/:groupId/guests {date?, slot, portionSubunits, poolMode:'individual'|'universal', guestName?}`
Bulk (admin): POST `/:groupId/bulk/preview` → `/bulk/apply` `{entries:[{userId,date,slots}]}` (preview returns the change set — render a diff)
Absence (admin): POST `/:groupId/absence/preview` → `/absence/apply` `{userId?, from, to, slots[]}` (≤366 days).

**/expenses:** Workflow base `/groups/:groupId/expenses` — GET (cursor: `?status=&costPeriod=&payable=&cursor=&limit=`) · POST draft `{supplierName?, date, costPeriod?, isPayable?, receiptReference?, lines:[{categoryId, amount(poisha), description?, splitMode?, beneficiaries?, fixedAmounts?, weights?, usageQuantities?}]}` → create returns `duplicateWarnings[]` · POST `/:expenseId/submit|approve|reject|reverse` (approve/reject/reverse = treasurer, `{reason}`; approve/reverse idempotent). Legacy simple CRUD at `POST /:groupId`, `/entry/:id`.

**/money:** GET/POST `/groups/:groupId/money` (POST idempotent; cursor list with `?status=&kind=`) · POST `/:txId/confirm|reject|reverse`(treasurer) · GET `/groups/:groupId/memberships/:membershipId/balance` · GET/POST `/groups/:groupId/funds` · POST `/funds/:fundId/custodian {newCustodianId}`(owner).

**/memberships balances, /policies:** GET `/groups/:groupId/policies` · POST(owned) `{effectiveFrom:'YYYY-MM', mealWeights?, entryCutoffHour?, …}`.

**/periods:** GET `/groups/:groupId/periods` · `/:month` · `/:month/preview` (draft statement, no persist) · `/:month/checklist`(treasurer) · POST `/:month/begin-review` / `return-to-open` / `correct`(manager).

**/statements:** GET `/groups/:groupId/statements` · `/id/:statementId` · `/:month` (version history) · POST `/:month/finalize {expectedRevision?, reason?}`(**owner**, idempotent). Errors: 409 revision conflict; 422 `{unresolved:[{userId,slot,date}]}` unknown meal slots.

**/recurring:** GET/POST `/groups/:groupId/recurring` · PUT `/:ruleId` · POST `/:ruleId/generate {costPeriod}` / `/generate-all`(treasurer).

**/reconciliation:** GET `/groups/:groupId/reconciliations`(+`/equation`) · POST(create `{accountId, actualBalance(poisha), asOf?}`) · POST `/:recId/resolve {resolution:'adjusted'|'accepted_shortage'|'found_cash', explanation?}`.

**/disputes:** GET/POST `/groups/:groupId/disputes {targetType:'expense'|'money_transaction'|'statement_item', targetId, reason, statementId?, membershipId?}` · POST `/:disputeId/respond {text}` · POST `/:disputeId/resolve {rejected?, note?, correctionJournalId?}`(manager).

**/notifications:** GET `/groups/:groupId/notifications(?statementId=&state=)` · `/:messageId` · POST `/:messageId/resend` · POST `/manual-share`(manager) · PUT `/whatsapp/consent {whatsappConsent}`(self) · Public webhook routes (no UI needed).

**/attachments:** POST `/groups/:groupId/upload` (multipart field `file`, ≤10MB jpeg/png/webp/pdf) · GET `/groups/:groupId/:attachmentId` (authenticated binary — use axios `responseType:'blob'` + object URL).

**/assets:** GET/POST `/groups/:groupId` · POST `/:assetId/refund`(treasurer).

**/stats:** GET `/groups/:groupId/dashboard` (**V2** — build the Overview tab on this) · GET `/:groupId?granularity=month|year&year=&month=&userId=` (legacy charts) → `{ mealsSeries, expenseSeries, categoryBreakdown, totals }`.

**/summary (LEGACY, floats):** GET `/:groupId/:month` · POST `/finalize/…` (now returns 410/409 — **direct users to the Statements tab**) · GET `/whatsapp/:groupId/:month`.
**NEW — /inbox:** GET `/` (cursor list `?unread=1&cursor=&limit=`) · GET `/unread-count` · POST `/read {ids[]|all:true}` · GET/PUT `/preferences` {types: {…}, quietHours:{from,to}}.

**NEW — /support (user side):** Public POST `/actions/:token` (neutral responses) · Public POST `/appeal {email,message,captchaToken?}` · Auth POST `/tickets {category,subject,body,groupId?,attachContext?}` (idempotent) · GET `/tickets` · GET `/tickets/:ticketId` → `{ticket, messages, permissions:{canComment, reason, code}, slaStage}` · POST `/tickets/:ticketId/messages {body, attachmentIds?}` · POST `/tickets/:ticketId/resolve|close|reopen|rate {score?, comment?, note?, reason?}`.

**NEW — /admin/support (hidden, requirePlatformAdmin + 2FA):** GET/POST `/tickets` · GET/PATCH `/tickets/:ticketId` · POST `/tickets/:ticketId/reply|internal-note|assign|resolve|close|reopen` · POST `/tickets/:ticketId/messages/:messageId/redact {reason}` · GET `/stats` · GET/POST/PUT/DELETE `/canned-replies`.

**NEW — /routines (B2):** Rosters GET/POST `/groups/:groupId/rosters` · GET/PATCH/POST(publish)/POST(extend-horizon) `/groups/:groupId/rosters/:rosterId` · Duties GET `/groups/:groupId/duties` · POST done/reassign `/groups/:groupId/duties/:assignmentId/…` · Swaps POST `/groups/:groupId/swaps` · POST respond `/groups/:groupId/swaps/:swapId/respond` · Menu GET/POST `/groups/:groupId/menu` · Notes GET/POST/PATCH/DELETE `/groups/:groupId/notes/…` · POST ack/claim/done tasks · GET `/groups/:groupId/board/today` · `/menu/bazar-suggestions` · `/duties/fairness` · `/bazar-spend-rotation` · POST `/emergency-broadcast`.

**NEW — /shopping-list:** GET `/groups/:groupId` · POST items · PATCH/DELETE items/:itemId · POST `/to-expense` · GET `/history`.

**NEW — /kitchen-inventory:** GET/POST `/groups/:groupId` · PATCH/DELETE `/groups/:groupId/:itemId` · POST `/:itemId/refill`.

**NEW — /polls:** GET/POST `/groups/:groupId` · POST `/:pollId/vote {optionIndex}` · POST `/:pollId/close` · GET `/:pollId/results`.

**NEW — /invite:** POST `/join-by-code {code,groupId}` (rate-limited) · POST `/codes {groupId,maxUses?,ttlDays?}` (admin) · GET `/codes/:groupId` (metadata only).

**Socket.IO:** connect with `auth: { token: accessToken }` (reconnect with the new token after refresh). Emit `join-group`/`leave-group` (groupId). Listen: `meal-updated`, `expense-updated`, `inbox-new` (room `user:<id>`), `duty-updated`, `menu-updated`, `note-created`, `note-updated`, `shoppingList-updated`, `kitchenInventory-updated` (room `group:<id>`). Use the existing `SocketInitializer`.

| PATCH | `/admin/users/:userId` | `{isVerified?, suspended?}` — suspension kills login/refresh/all requests. |
| GET | `/admin/groups?q=&limit=` | **All** groups + active member counts + admins. |
| GET | `/admin/groups/:groupId` | Deep inspection: group + memberships populated. |
| DELETE | `/admin/groups/:groupId` | Archive (audit-logged). |
| GET | `/admin/jobs` | Last run + lock state per background job. |

### Key shapes (UI rendering)

- **Cursor lists:** `{ items, nextCursor, hasMore, count }` → "Load more" button while `hasMore`.
- **Statement item:** `{ membershipId, displayName, mealUnits, mealCost, otherCost, totalCharge, contributions, closingCredit, status:'owes'|'receives'|'settled' }` — `closingCredit > 0` → group owes member.
- **Meal doc:** `{ userId, date, breakfast/lunch/snacks/dinner: {state, portionSubunits?, source}, totalMealSubunits, totalMeals }`.
- **Membership:** `{ displayName, isPlaceholder, role, startDate, endDate, room, weight, leftAt }`.
- **Expense:** `{ status, lines[], payers[], supplierName, receiptReference, costPeriod, isPayable, paidTotal }`.
- **Support ticket:** `{ ticketNo:'MM-T-000123', status:'open'|'answered'|'awaiting_admin'|'resolved'|'closed', category, subject, priority, permissions:{canComment, reason} }`.
- **Inbox notification:** `{ id, type, title, body, link:{kind,id}, readAt }`.
- **Roster/Duty/Note/Menu/Swap/Poll:** see `plan.md` §14; statuses use StatusBadge with icon + color.
- **Zod validation errors:** 400 `{ msg:'Validation failed', errors:[{field:'lines.0.amount', message}] }` → map onto fields by path.

### Errors

Server returns generic messages; show them via Toast. Field errors per above. Forgot-password always 200 — neutral message. Finalize 409 → "Month data changed — refresh and retry". Any 422 listing unresolved meals → render chips. Support: `403 TICKET_AWAITING_ADMIN`, `403 TICKET_CLOSED`, `409 TICKET_STATE_CHANGED`. Invite: `429 JOIN_CODE_RATE_LIMITED` / `JOIN_CODE_LOCKED`. Admin: any 404 from `/api/admin/*` → not an admin.
## 5. ARCHITECTURE RULES

```
src/
  api/        axiosClient.js + one file per domain (auth.js, sessions.js, groups.js, memberships.js,
              meals.js, guests.js, expenses.js, money.js, funds.js, policies.js, periods.js, statements.js,
              recurring.js, reconciliation.js, disputes.js, notifications.js, attachments.js, assets.js, stats.js,
              admin.js)
  store/      zustand stores: authStore, groupStore, uiStore + domain stores (meals, expenses, money,
              statements, periods, memberships, notifications, categories, stats)
  hooks/      thin selectors/wrappers over stores: useGroupRole, usePoisha, useMeals, useExpenses …
  routes/     AppRoutes, ProtectedRoute, PublicRoute
  pages/      thin route-level pages (compose features)
  features/   <domain>/components/*  (domain-specific UI built from shared components)
  utils/      formatPoisha/parseTaka, month & Dhaka-day helpers, idempotency-key generator, constants
```

- Pages are thin; logic lives in hooks; HTTP lives only in `api/`.
- Every data view needs: loading (Skeleton/Loading), empty state, error state, and Toast on mutation result.
- Forms: controlled, client-side validation matching the server rules (poisha integers, password rules, slot constraints), disable submit while pending.
- Destructive actions (reverse, finalize, regenerate code, remove member, refund) always use the confirmation modal — reversal/finalize ask for a **reason**.
- Mobile-first, fully responsive; both themes must work (variables only).
- No `console.log`, no dead code, no TODO comments in source (TODOs live in `TODO.md`).
- One currency helper (`formatPoisha`), one month helper (`toMonthString`/`formatMonth`), one Dhaka-day helper — never `new Date().toLocaleDateString()` ad hoc.
- Memoize heavy lists/charts/grids; debounce filter inputs; cursor lists accumulate pages.

---

## 6. DEFINITION OF DONE (per task)

- Uses existing components (listed in `COMPONENTS.md`) — no duplicates.
- Zero literal colors (variables only) and zero SVG (react-icons only).
- Shared state in zustand stores (selectors used), no React Context for app state.
- **Mobile verified at 360px first** (no horizontal scroll, 44px targets), then tablet/desktop; light + dark both fine.
- Follows the modern design language from §1.7 using shared components; statuses always icon + color.
- Money rendered via `formatPoisha`; integers sent to the server.
- Handles loading / empty / error; handles 409/422 finalize semantics where relevant.
- Role-gated UI where relevant (owner/manager/treasurer vs member); privacy-gated (no cross-group profile leakage, no group enumeration).
- Invite link surfaced with copy-to-clipboard + share; join flow consumes `?code=` query param.
- TODO.md updated (`[x]` + Last Session line).

---

## 7. START NOW

1. If `Client/TODO.md` does not exist → create it from the seed in §2, then begin **T0.1**.
2. If it exists → follow the session-start protocol and continue from the first unfinished task.
3. After each task reply with ≤ 5 lines: `✔ <task id> done — <1 line>. Next: <task id>`. Then continue automatically until tokens run out or a phase ends; at a phase end, run lint/build and the color grep, fix issues, update TODO.md.


---

## 8. AMENDMENTS (override earlier sections)

### 8.1 Stack change: Next.js App Router as BFF

Vite SPA cannot provide server middleware, protected server layouts or SSR. Move to **Next.js (App Router, JS or TS — pick one in Notes)**. Unchanged: zustand, react-icons (one family), Chart.js via `react-chartjs-2` (client components, `dynamic(..., { ssr:false })`), CSS variables only, shared components, mobile-first, TODO.md workflow. `Client/` stays the folder name. Port 5174 stays for dev.

**Honest scope of "hiding APIs":** DevTools always shows requests the browser makes. Goals are: (a) no token readable by JS, (b) browser only calls same-origin `/api/bff/*`, (c) backend URL, admin key and secrets exist only in server env (`BACKEND_URL`, never `NEXT_PUBLIC_*`), (d) first-load data is fetched on the server (never appears in the browser network tab), (e) `productionBrowserSourceMaps: false`. Do **not** add fake obfuscation; the backend remains the security authority.

### 8.2 Auth, cookies, storage

- **No `localStorage` / `sessionStorage` / IndexedDB for auth or user data.** Remove zustand `persist` from `authStore`. The store holds `{ user, roles }` only, hydrated from server-rendered props; **tokens are never in JS**.
- Cookies (set by the backend through the BFF, `HttpOnly; Secure; SameSite=Strict`): `mm_at` (access), `mm_rt` (refresh), `mm_csrf` (readable, double-submit). Web requests send `X-Client: web` so the backend omits tokens from JSON bodies.
- Theme preference: a plain non-sensitive cookie `mm_theme` (so SSR renders the right theme without flash) — the only non-HttpOnly cookie besides `mm_csrf`.

### 8.3 BFF layer

`app/api/bff/[...path]/route.js` — a catch-all handler that: validates the path against an **allowlist of backend route prefixes**, forwards method/body/query to `${BACKEND_URL}/api/...`, forwards `Cookie`, `Idempotency-Key`, `X-CSRF-Token`, streams blobs (attachments, xlsx, pdf), relays `Set-Cookie`, strips hop-by-hop and server headers, and adds `X-Client: web`. Refresh is handled here (single-flight per request chain). The admin key, if still used, is attached here only for `/api/admin/*`.

### 8.4 Two axios instances (replaces T0.4)

| File | Used from | Behaviour |
|---|---|---|
| `lib/api/serverApi.js` | Server Components, layouts, route handlers | baseURL `process.env.BACKEND_URL`; builds the `Cookie` header from `cookies()` (`next/headers`); on 401 calls refresh once and re-sets cookies; throws typed errors (`NotFound`, `Forbidden`, `Unauthorized`) so `notFound()` / `redirect()` can be used |
| `lib/api/browserApi.js` | Client components, zustand actions | baseURL `/api/bff`; `withCredentials: true`; attaches `x-csrf-token` from the `mm_csrf` cookie; **single-flight** 401 → `POST /api/bff/users/refresh` → retry queue; on refresh failure → `router.replace('/login?next=…')` and clear stores; 429 → RateLimit handler; always adds an `Idempotency-Key` helper for financial mutations |

One domain file per area under `lib/api/` (auth, groups, meals, …, **support, routines, inbox**) exporting functions that take the axios instance as a parameter or use a small `apiFor(context)` helper so the same function runs on server and client.

### 8.5 Routing, middleware, protected layout / component (replaces T0.6)

```
app/
  (public)/    login, register, forgot/reset, verify-email, join?code=
  (app)/       layout.js  ← PROTECTED LAYOUT (server): getSession() → redirect('/login?next=…') if none
    page.js (home) · groups/[groupId]/(overview|meals|expenses|money|statements|charts|members|board|more)
    support/ · inbox/ · profile/
  (admin)/admin/   layout.js ← PLATFORM-ADMIN LAYOUT: probe GET /api/admin/overview (+ 2FA verified);
                     on 404/403 call notFound() so the section does not exist for non-admins
  api/bff/[...path]/route.js
middleware.js   ← edge: cheap gate only — if no `mm_at`/`mm_rt` cookie on a protected matcher → redirect to /login;
                  redirect logged-in users away from /login; set CSP + Referrer-Policy headers; never trust it for authorisation
```

- **Protected layout** is the real gate: it loads the session/profile server-side and passes `initialUser` to a tiny client `<AuthHydrator>` that seeds `authStore`. Group routes also load the membership/role server-side and call `notFound()` on 404 (privacy rule: never reveal existence).
- **`<Protected roles={[…]} fallback="hide|404|message">`** (client) and `requireRole(session, roles)` (server) both wrap the existing `PermissionGuard` logic — one source of truth for the 5-tier roles. UI gating is cosmetic; the server enforces.
- Loading/error: `loading.js` uses `Skeleton`; `error.js` + `not-found.js` use existing shared components.

### 8.6 SSR and data-fetching rules

- Fetch the first screen's data in Server Components via `serverApi`, pass as `initialData` to client components that then own it in zustand (`{ data, loading, error, fetch, mutate, invalidate }` unchanged). Do not double-fetch on mount when `initialData` is present.
- Anything role- or time-sensitive (statement state, support `permissions.canComment`) is re-validated on mutation; the server response is authoritative.
- Charts, socket client, `navigator.share`, `clipboard` → client components only.
- Socket.IO connects with `withCredentials` (cookie handshake, no token in URL/auth payload); after refresh, reconnect.
- Security headers via `middleware.js`/`next.config`: CSP (`default-src 'self'`; `connect-src 'self' wss:<socket origin>`; `img-src 'self' data: res.cloudinary.com`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options`, `frame-ancestors 'none'`.

### 8.7 Task list changes

**Replace** in the seed TODO: T0.3 (create `app/` structure, `.env` with `BACKEND_URL` + `NEXT_PUBLIC_APP_URL` only, `.env.example`), T0.4 (§8.3–8.4), T0.5 (`authStore` **without persist**, `AuthHydrator`), T0.6 (§8.5), T0.7 (`groupStore`/`useGroupRole` seeded from server props). T1.x pages become server/client splits; T1.3 Google callback: backend sets cookies → redirect to `/` (no tokens in URL). Add **T0.11** `middleware.js` + headers, **T0.12** `<Protected>` / `requireRole`, **T0.13** `next.config` (no prod source maps, `poweredByHeader:false`), **T0.14** ESLint rule/grep: no `localStorage|sessionStorage|document.cookie` outside `mm_theme`/`mm_csrf` helpers, no `NEXT_PUBLIC_` secrets.

**Add phases:**

```
## P9 Routine & Board (plan.md §14)
- [ ] T9.1 Board widget on group Overview: GET /routines/groups/:id/board/today → today's duties, menu, pinned notes, active hand-overs
- [ ] T9.2 Duties calendar (month/week strip; my duties highlighted; mobile = agenda list) + mark done + swap request / accept / decline
- [ ] T9.3 Rosters admin (manager): create/edit roster (type, areas, rotation mode, member order drag/arrows), publish, extend horizon
- [ ] T9.4 Weekly menu: week view + template editor; today's menu card with cook
- [ ] T9.5 Notice board: feed, create note/announcement/alert, pin, audience picker, "seen" receipts, archive
- [ ] T9.6 Handover composer: absence window + task checklist; claim / done on tasks; banner while active
- [ ] T9.7 Realtime: duty-updated / menu-updated / note-created → store invalidate
- [ ] T9.8 Shopping list: shared bazar list → convert to expense draft (GET/POST /shopping-list/groups/:id, items, to-expense)
- [ ] T9.9 Kitchen inventory: staple stock + refills (GET/POST /kitchen-inventory/groups/:id, /:itemId/refill)
- [ ] T9.10 Polls: quick menu decisions with voting (GET/POST /polls/groups/:id, /:pollId/vote, /results)

## P10 Support (plan.md §15)
- [ ] T10.1 My tickets list (StatusBadge: open/answered/awaiting_admin/resolved/closed, unread dot) + New ticket form (category, subject, body, optional group context consent, attachments)
- [ ] T10.2 Ticket thread page: messages timeline; composer driven ONLY by `permissions.canComment` + `reason` (disabled with explanation: "Waiting for admin to reply" / "Ticket is closed"); resolve / close / reopen (ConfirmationModal) / rate
- [ ] T10.3 Email-action landing page /support/action/[token] → POST /support/actions/:token, neutral result message
- [ ] T10.4 Public appeal page for suspended users (CAPTCHA, email)
- [ ] T10.5 Admin Support queue (/admin/support): filters (status, priority, assignee, overdue), SLA countdown chips, unread, search by ticketNo
- [ ] T10.6 Admin ticket view: reply, internal note (visually distinct), canned replies, assign, priority, resolve/close/reopen with reason, user context panel
- [ ] T10.7 Admin support stats cards (open, awaiting_admin, overdue, median first response, CSAT)

## P11 Inbox & notifications (plan.md §16)
- [ ] T11.1 TopBar bell + unread badge (socket `inbox-new`, count from /inbox/unread-count) + dropdown/bottom-sheet list
- [ ] T11.2 Inbox page (cursor list, mark read / all, deep-link via `link.kind/id`)
- [ ] T11.3 Notification preferences (per type, email toggle, quiet hours) on Profile
- [ ] T11.4 Admin bell reuses the same component (scope comes from the server); toast on new `support.ticket_created`

## P12 Security UX (plan.md §18)
- [ ] T12.1 2FA setup (QR via canvas/img data-URI from backend, verify code, recovery codes shown once) + login step-up screen; admin enrolment gate
- [ ] T12.2 Invite code dialog: one-time reveal with copy/share, shows expiry + uses left; regenerate confirms and warns old links die
- [ ] T12.3 Sessions page: highlight "new device" events from SecurityEvent
```

### 8.8 Definition of Done additions

- Zero tokens in JS-reachable storage (grep rule T0.14). Zero `NEXT_PUBLIC_` secrets.
- Protected pages tested logged-out (redirect), wrong role (hidden/404), other group (`notFound()`).
- Support composer never enabled when `permissions.canComment` is false; closed tickets show read-only thread.
- SSR first paint verified for Overview, Board, Support list (no client fetch flash for initial data).




### 8.9 SSR/CSR/Actions — MANDATORY 3-LAYER SPLIT (overrides any implied CSR-only approach)

Every feature MUST be split into exactly three layers. **This is not optional and overrides any earlier section that implies putting fetch logic in client components.**

#### Layer 1 — Server Action file: `src/lib/actions/<domain>.js`
- No directive — runs only on the server (Node.js runtime).
- Wraps `serverApi` calls; returns plain serialisable JS objects (no class instances, no Dates unless stringified).
- Throws typed errors from serverApi so callers can call `notFound()` / `redirect('/login')`.
- One file per domain: `auth.js`, `groups.js`, `memberships.js`, `meals.js`, `expenses.js`, `money.js`, `statements.js`, `periods.js`, `stats.js`, `notifications.js`, `disputes.js`, `reconciliation.js`, `support.js`, `inbox.js`, `routines.js`, `shopping.js`, `inventory.js`, `polls.js`, `admin.js`.
- Example:
  ```js
  // src/lib/actions/groups.js
  import { serverApi } from "@/lib/api/serverApi";
  export async function getMyGroups() {
    const data = await serverApi.get("/messgroups/my-groups");
    return data?.groups || data || [];
  }
  export async function getGroup(groupId) {
    const data = await serverApi.get(`/messgroups/${groupId}`);
    return data?.group || data;
  }
  ```

#### Layer 2 — SSR Page: `app/…/page.jsx` (Server Component)
- **NO `"use client"` directive ever.** This is a React Server Component.
- Calls Layer-1 action functions to fetch the first screen's data server-side (data never appears in browser network tab as a separate fetch).
- Error handling: `NotFound`/404 → `notFound()`. `Unauthorized`/401 → `redirect('/login?next=…')`. `Forbidden`/403 → `notFound()` (privacy masking — never reveal group existence to outsiders).
- Passes fetched data as `initialXxx` props to the Layer-3 client component.
- Exports `metadata` / `generateMetadata`.
- Example:
  ```jsx
  // app/(app)/page.jsx  — Server Component (NO "use client")
  import { getMyGroups } from "@/lib/actions/groups";
  import HomeClient from "./HomeClient";
  export const metadata = { title: "Home — MealMate" };
  export default async function HomePage() {
    const initialGroups = await getMyGroups();
    return <HomeClient initialGroups={initialGroups} />;
  }
  ```

#### Layer 3 — CSR Component: `app/…/<Name>Client.jsx` (Client Component)
- **MUST have `"use client"` as the very first line.**
- Receives `initialXxx` props; seeds into local `useState(initialXxx)` — NOT in `useEffect` to avoid flash.
- All mutations (POST/PUT/DELETE/PATCH) go through `browserApi` domain files (`src/lib/api/<domain>.js`) — never `serverApi` from client.
- Uses zustand stores for shared/cross-component state; seeds zustand from `initialData` in a `useEffect` only when needed for cross-component sharing.
- Does NOT re-fetch on mount when `initialData` is present; re-fetches on user action (refresh button, mutation callback) via `browserApi`.
- Example:
  ```jsx
  // app/(app)/HomeClient.jsx  — Client Component
  "use client";
  import { useState, useCallback } from "react";
  import { groupsApi } from "@/lib/api/groups";
  export default function HomeClient({ initialGroups }) {
    const [groups, setGroups] = useState(initialGroups ?? []);
    const refresh = useCallback(async () => {
      const data = await groupsApi.myGroups();
      setGroups(data?.groups || data || []);
    }, []);
    // mutations: call groupsApi.xxx(), then refresh() or setGroups(...)
  }
  ```

#### Layout SSR pattern for group/profile/admin routes
- `layout.jsx` = Server Component. Fetches scoped data (group metadata, user role) via Layer-1 actions.
- Renders a `<XxxShell initialXxx={…}>` **client** component that owns React context, navigation state, and `{children}`.
- The shell hydrates from props: `const [group, setGroup] = useState(initialGroup)`.
- Example:
  ```jsx
  // app/(app)/groups/[groupId]/layout.jsx — Server Component
  import { getGroup } from "@/lib/actions/groups";
  import GroupShell from "./GroupShell";
  export default async function GroupLayout({ children, params }) {
    const { groupId } = await params;
    const group = await getGroup(groupId);   // throws NotFound → 404
    return <GroupShell initialGroup={group}>{children}</GroupShell>;
  }
  ```

#### Naming conventions (enforced)
| File | Layer | Directive |
|---|---|---|
| `src/lib/actions/<domain>.js` | Server Actions | none |
| `src/lib/api/<domain>.js` | Browser API client | `"use client"` or none |
| `app/…/page.jsx` | SSR Page | **none — Server Component** |
| `app/…/layout.jsx` | SSR Layout | **none — Server Component** |
| `app/…/<Name>Client.jsx` | CSR interactive | `"use client"` |
| `app/…/<Name>Form.jsx` | CSR form | `"use client"` |
| `src/features/<domain>/components/<Name>.jsx` | CSR feature | `"use client"` |

#### Verification (run after every phase — must return nothing)
```bash
# No page.jsx may contain "use client"
grep -rl '"use client"' Client/src/app --include="page.jsx"
# No layout.jsx may contain "use client"
grep -rl '"use client"' Client/src/app --include="layout.jsx"
```
