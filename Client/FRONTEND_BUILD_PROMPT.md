# MealMate Frontend — Build Prompt (paste into IDE AI)

> Follow §8.9 for the three application layers. Maintain the P0–P12 TODO across sessions and use the API reference in §4.

## 0. ROLE & GOAL

You are a senior React engineer. Build the complete frontend for **MealMate**, a mess (shared-living) meal & cost tracker backed by a real double-entry ledger, versioned month-end statements, and audited financial workflows. The audited backend lives in `/Server` (Express 5 + MongoDB). The frontend lives in `/Client` (Next.js App Router + React). Use Server/API_DOCUMENTATION.md for integration and the root assessment for open release gates.

**Priorities, in order:** (1) follow the rules below, (2) **mobile responsiveness — top priority for every screen and component**, (3) token efficiency, (4) working code, (5) modern UI polish.

**Fixed stack decisions:** Next.js App Router + React · **zustand** for state · **react-icons** for all icons (no SVG) · Chart.js (canvas) for charts · CSS variables from `app/globals.css` for all colors. New backend modules covered: Invite Codes, TOTP 2FA, In-App Inbox, Support Desk, Routine & Board, Shopping List, Kitchen Inventory, Polls, cookie-only auth (`mm_at`/`mm_csrf` cookies).

---

## 1. HARD RULES (never break)

### 1.1 Colors

- **Tailwind classNames only for layout and visual styling.** Do not use `style={{ ... }}` in JSX; use `className` with Tailwind utilities and CSS-variable arbitrary values.
- **Never use `className={[...].join(" ")}` array-join pattern.** Use a plain string `className="a b c"` for static classes, or a template literal `` className={`a b ${cond ? "c" : "d"}`} `` for conditional classes. Do not wrap class strings in arrays and join them.
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

- Hydrate the in-memory Zustand authStore with user and roles. Clear user and group data on sign-out or group change.
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
- [ ] T0.1 Read src/app/globals.css → list all CSS variables (names + purpose) in Notes. Read package.json → note styling lib and router (Next.js App Router). Install missing deps: axios, socket.io-client, zustand, react-icons, chart.js, react-chartjs-2. Choose ONE react-icons family and record it in Notes.
- [ ] T0.2 Create Client/COMPONENTS.md: for each file in components/*, one line: name · path · props · when to use. (Read only the top of each file.) Flag components containing inline SVG.
- [ ] T0.3 Verify existing src/app and src/lib structure, server-only BACKEND_URL and dev port 5174.
- [ ] T0.4 lib/api/serverApi.js + lib/api/browserApi.js (§8.4) + app/api/bff/[...path]/route.js allowlist proxy (§8.3). baseURL /api/bff (browser) or BACKEND_URL (server).
- [ ] T0.5 Hydrate user and roles from the protected layout. Keep tokens out of Zustand.
- [ ] T0.6 routes: app/ App Router with protected layout + public layout groups (lazy-loaded pages + Skeleton fallback), 404 page, wrap ToastProvider + RateLimit listener in layout.
- [ ] T0.7 store/groupStore (current group, myRole from 5-tier roles) + store/uiStore (theme, sheets) + hooks/useGroupRole feeding PermissionGuard.
- [ ] T0.8 Modernize shared components ONCE: design tokens in app/globals.css (light+dark); replace inline SVG with react-icons; Modal → bottom sheet on mobile; Table → stacked cards <md; 44px targets; focus-visible rings; Button/Input/Card/Badge/Tabs/Skeleton polish; add StatusBadge variants for the new statuses (§1.7). Update COMPONENTS.md.
- [ ] T0.9 app/layout.js + app/globals.css: viewport meta, theme pre-paint script, safe-area + dvh base CSS, font setup, base responsive utilities; public/favicon.ico (no svg).
- [ ] T0.10 utils/format.js: formatPoisha (poisha→৳ string), parseTaka (৳→integer poisha), month helpers (toMonthString, formatMonth, monthRange), day helpers (Dhaka civil date via Intl timeZone 'Asia/Dhaka').

## P1 Auth & Sessions
- [ ] T1.1 Register page (username, email, phone?, whatsapp?, password + PasswordStrengthMeter, confirm)
- [ ] T1.2 Login page (+ Google button → GET /api/users/auth/google)
- [ ] T1.3 On /login/success, load the profile from cookies. Verify cookie scope and the registered OAuth callback through the deployment proxy.
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
- [ ] T6.3 Close workflow (manager/owner): period detail GET /api/periods/…/:month; Preview statement (draft, no persist); close checklist (GET …/checklist); Begin review / Return to open buttons; Finalize modal with expectedRevision (handle 409 conflict message "data changed, refresh and retry" and 422 text identifying the first unresolved member, slot and date)
- [ ] T6.4 Corrections: capture a reason and require explicit owner confirmation before finalizing a new version.

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

## 4. Backend contract

Integrate from [Server/API_DOCUMENTATION.md](../Server/API_DOCUMENTATION.md). Strip the leading /api when the transport supplies it. Keep legacy taka amounts separate from v2 integer poisha. Display unknown meal slots separately from confirmed zeros.

## 5. ARCHITECTURE RULES

```
src/app/          Pages, protected layouts, route handlers and loading/error boundaries
src/lib/actions/  Server Actions and serializable mutation results
src/lib/api/      Server transport, same-origin browser transport and domain functions
src/lib/store/    Ephemeral Zustand state scoped to user, group and month
src/components/   Existing shared inputs, dialogs, tables and permission guards
src/features/     Interactive domain components and hooks
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
- Cookies (set by the backend through the BFF, `HttpOnly; Secure; SameSite=Strict`): `mm_at` (access), `refreshToken` (refresh), `mm_csrf` (readable, double-submit). Web requests send `X-Client: web` so the backend omits tokens from JSON bodies.
- Theme preference: a plain non-sensitive cookie `mm_theme` (so SSR renders the right theme without flash) — the only non-HttpOnly cookie besides `mm_csrf`.

### 8.3 BFF layer

`app/api/bff/[...path]/route.js` — a catch-all handler that: validates the path against an **allowlist of backend route prefixes**, forwards method/body/query to `${BACKEND_URL}/api/...`, forwards `Cookie`, `Idempotency-Key`, `X-CSRF-Token`, streams blobs (attachments, xlsx, pdf), relays `Set-Cookie`, strips hop-by-hop and server headers, and adds `X-Client: web`. Refresh is handled here (single-flight per request chain). The admin key, if still used, is attached here only for `/api/admin/*`.

### 8.4 Two axios instances (replaces T0.4)

| File | Used from | Behaviour |
|---|---|---|
| `lib/api/serverApi.js` | Server Components, layouts, route handlers | baseURL `process.env.BACKEND_URL`; builds the `Cookie` header from `cookies()` (`next/headers`); on 401 delegates refresh to a Route Handler or Server Action that can relay Set-Cookie; throws typed errors (`NotFound`, `Forbidden`, `Unauthorized`) so `notFound()` / `redirect()` can be used |
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
middleware.js   ← edge: cheap gate only — if mm_at is absent, pass through the refresh handler under /api;
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

Extend P0 once with T0.11 edge routing and headers, T0.12 shared role guards, T0.13 production configuration and T0.14 a token-storage and public-secret check.

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
- [ ] T12.3 Extend T1.6 with a device-family coverage notice. Hide new-device history until a user-scoped endpoint exists.
```

### 8.8 Definition of Done additions

- Zero tokens in JS-reachable storage (grep rule T0.14). Zero `NEXT_PUBLIC_` secrets.
- Protected pages tested logged-out (redirect), wrong role (hidden/404), other group (`notFound()`).
- Support composer never enabled when `permissions.canComment` is false; closed tickets show read-only thread.
- SSR first paint verified for Overview, Board, Support list (no client fetch flash for initial data).




### 8.9 SSR/CSR/Actions — MANDATORY 3-LAYER SPLIT (overrides any implied CSR-only approach)

Every feature MUST be split into exactly three layers. **This is not optional and overrides any earlier section that implies putting fetch logic in client components.**

#### Layer 1 — Server Action file: `src/lib/actions/<domain>.js`
- Keep SSR query helpers server-only in the action layer. A function invoked exclusively by a Server Component needs no "use server" directive. Any action exported to a client needs that directive and must validate its session and input.
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
- Send interactive mutations through browserApi domain functions to the same-origin BFF. The BFF validates session and scope and forwards to Express. Keep the backend transport server-only.
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


## Feature integration inventory

Use existing routes and components before adding screens. Group pages share the protected group layout and obtain current membership on the server. Use the corresponding operation names and full paths in the API reference.

| Page or group tab | Feature components and first-load dependencies | Mutation permissions and completion checks |
|---|---|---|
| Public auth and profile/sessions | Credential form, OTP challenge, enrollment, session list. Load profile and sessions. | Test challenge expiry, refresh and sign-out. Device revocation applies to Session rows. |
| Home and group overview | Group switcher, agenda and totals from my-groups, dashboard, board and inbox | Handle a user with zero groups and clear prior-group data on switching. |
| Members and invitations | Directory, approval queue, invite metadata, membership history | Separate legacy admin approval from v2 manager actions. Show invite plaintext once. |
| Meals | Slot grid, absence preview, guest form, next-day headcount | Members enter meals. Legacy admins apply bulk or absence changes after preview. Keep unknown slots visible. |
| Expenses and categories | Category selector, line editor, queue and receipt viewer | Show payer, split and amount before treasurer approval. Surface duplicate warnings. |
| Money and funds | Transaction form, balances, custodian history and fund selector | Treasurer confirms, owner transfers custody. Use membership IDs for individual balances. |
| Statements, reports and period close | Version history, charges, review checklist and export | Manager starts review, owner finalizes. Refresh preview on revision conflicts and preserve prior versions. |
| Policies and recurring rules | Effective policy, split editor, rules list and generation result | Owner publishes policy. Treasurer generates drafts. Link generated drafts to expense review. |
| Reconciliation and assets | Fund selector, expected/count comparison, variance, refund history | Treasurer records counts and resolutions. Display signed variance and explanations. |
| Disputes | Target selector, evidence, conversation and resolution | Member opens/responds, manager resolves. Re-fetch thread after mutation. |
| Routine and board | Roster editor, duties, swap response, menu, scoped note and handover tasks | Manager publishes. Show read-only auditor UI and task conflicts. |
| Shopping, inventory and polls | Checked basket, draft link, stock/refill form, options and results | Reload current stock or poll after a conflict. Show empty open basket explicitly. |
| Inbox and delivery | Feed, unread badge, preferences and delivery history | Personal inbox and group outbox have distinct scopes. Managers resend. Socket events invalidate scoped data. |
| Support | Ticket list, thread and permission-aware composer | Use permissions.canComment and reason. Render internal notes only on the hidden admin surface. |
| Platform admin | Overview, accounts, audit, jobs and support queue | Probe platform access and OTP in a separate server layout. Group ownership grants no platform access. |

Use Skeleton, Select, DateTimePicker, ConfirmationModal and the existing table/form controls where their documented props fit. Each task covers SSR first paint, a successful empty result, validation errors, denied access, pending mutation and authoritative success. Verify keyboard navigation and a narrow viewport. Test unrelated-member access and group switching. Run lint and production build at phase boundaries.

The refreshToken cookie is scoped to /api. Page middleware cannot infer logout from its absence on a page request. Route an expired session through a same-origin handler under /api that can relay each rotated cookie. Use a request-scoped client for SSR. Keep refresh coordination isolated per user. Server Components read cookies. Route Handlers and Server Actions can write them. Pass only safe initial props to the browser. Cookie-authenticated state changes require CSRF even through the BFF. Preserve Origin on forwarded requests and validate same-origin requests before any server-side CSRF header injection.
