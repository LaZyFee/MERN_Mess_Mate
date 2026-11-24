# MealMate Frontend TODO
Last Session: T0.15 complete inline-style migration done → T4.2 (expense draft builder)

## P0 Recon & Foundation (Next.js per §8)
- [x] T0.1 Recon done; deps installed (next, socket.io-client, chart.js, react-chartjs-2). Icon family: react-icons/lu.
- [x] T0.2 COMPONENTS.md written (props per component, SVG flags, duplicate picks, broken-alias warning).
- [x] T0.3 app/ structure, .env (BACKEND_URL=http://localhost:5000, NEXT_PUBLIC_APP_URL), .env.example, port 5174.
- [x] T0.4 lib/api/serverApi.js + browserApi.js (§8.4) + app/api/bff/[...path]/route.js allowlist proxy (§8.3).
- [x] T0.5 authStore (no persist) + AuthHydrator + createDomainStore factory.
- [x] T0.6 Root route scaffold done: app/layout+page+error+not-found+loading. (public)/(app)/(admin) groups created in P1 as pages land.
- [x] T0.7 groupStore/uiStore(mm_theme)/useGroupRole/Protected/requireRole.
- [x] T0.11 middleware.js cookie gate + CSP headers.
- [x] T0.13 next.config.js (no source maps, poweredByHeader:false). Backend port confirmed 5000.
- [x] T0.10 lib/utils/format.js (formatPoisha/parseTaka/month/Dhaka helpers).
- [x] T0.14 ESLint no-restricted rules added; localStorage removed from Sidebar/RoleBasedLayout/i18n; package.json cleaned (vite/sweetalert2/lucide/react-router removed, next dev -p 5174).
- [x] T0.15 Migrated ALL inline style={} to Tailwind classNames (§1.1) — DateTimePicker, RateLimitCatcher, Skeleton, Modal, Tabs, Avatar, MultiSelect, Progress, Sectionheader, Input, Select, Textarea, TextEditor, Toast, ScrollReveal (dynamic values via CSS vars + arbitrary-value classes; Sectionheader.js restored from corruption)
- [x] T0.8 Shared components modernized: all inline SVG → react-icons/lu (Button, Toast, Alert, Modal, Checkbox, MultiSelect, Select, Progress, Breadcrumb, ProtectedComponent, ConfirmationModal, FileInput); broken alias imports fixed to real flat paths; literal palette classes swept to CSS vars; Avatar initials from var palette; ThemeToggle rebuilt on uiStore+mm_theme cookie; StatusBadge extended with expense/money/period/statement_item/outbox/ticket configs; Modal 90dvh.
- [x] T0.9 Root layout (globals.css tokens light+dark incl. status/chart vars, viewport meta, theme pre-paint script, not-found/error/loading, temp home page): viewport meta, favicon (no svg), dvh/safe-area CSS, fonts.
## P1 Auth & Sessions (server/client splits)
- [x] T1.1 Register · T1.2 Login (+2FA challenge step) · T1.3 Google callback (cookies→redirect /) · T1.4 Forgot/Reset · T1.5 Verify email · T1.6 Sessions page
  → REFACTORED to 3-layer SSR/CSR (§8.9): page.jsx=Server, *Form.jsx=Client, lib/actions/auth.js

## P2 Groups & Memberships
- [x] T2.1 Home dashboard (SSR page → HomeClient) + T2.2 Create group + T2.3 Join by code + T2.4 Group layout (SSR GroupShell) + T2.5 Overview + T2.6 Members + T2.7 Settings (invite codes, categories) + T2.8 Policy editor
  → REFACTORED to 3-layer SSR/CSR: lib/actions/groups.js + SSR pages + Client shells

## P3 Meals · P4 Expenses · P5 Money · P6 Statements · P7 Notifications & Disputes · P8 Stats/Profile/Polish
- [x] T3.1 Meals tab: month picker, Dhaka day strip, slot-state quick entry, and refresh.
- [x] T3.2 Guest meal entry: guest date/slot/portion/pool form and active guest-meal list.
- [x] T3.3 Group month grid: member × day × slot matrix with sticky member column.
- [x] T3.4 Absence and bulk entry: preview/apply workflows for absence windows and bulk JSON entries.
- [x] T3.5 Edit/delete rules: own entry delete, cutoff-hour lock warning and disabled mutations.
- [x] T4.1 Expenses tab: cursor list, status/costPeriod/payable filters, and load more.

## P9 Routine & Board (§8.7) T9.1–T9.10
## P10 Support T10.1–T10.7
## P11 Inbox T11.1–T11.4
## P12 Security UX T12.1–T12.3

## Notes & Decisions
- Mandatory UI implementation rule: use Tailwind `className` utilities for layout and presentation. `style={{ ... }}` is prohibited for JSX components; dynamic CSS values use a CSS custom property such as `style={{ "--progress": value }}` only when no Tailwind arbitrary-value form is practical. All colors remain CSS-variable based.
- Completed the §8.9 split for the remaining auth/group routes: `page.jsx` files are Server Components, interactive forms/views live in client components, and SSR reads use `src/lib/actions/{auth,groups}.js`; clients seed state from `initial*` props and use browser APIs only for mutations/refreshes.
- Stack per §8: Next.js App Router (JavaScript). zustand (authStore NO persist). react-icons family: `lucide-react` already installed but rule says react-icons → use **react-icons/lu** (Lu = Lucide) everywhere.
- Existing CSS vars (app/globals.css :root/[data-theme=dark], both themes): --background --foreground --p --p2 --p3 --p4 --p5 (primary green shades) --pale --pale2 (tints) --gold --bg --bgs (surface) --bgm --bgl --bd --bd2 --bd3 (borders) --tp --ts --tm --tl (text primary/secondary/muted/light) --gl --glb (glass) --expo --ease (easings) --font-display --font-body --r-md/--r-lg/--r-xl/--r-2xl/--r-pill (radius) --shadow-md/--lg/--xl. Tailwind @theme: --color-primary #85bd19, --color-primary-dark, --color-primary-hover, --color-primary-active, --color-secondary. Theme via `data-theme` attr on html.
- Deprecated vite deps (sweetalert2, lucide-react) not to be used.
- API layer (T0.4 rework): fetch-based lib/api/browserApi.js (baseURL /api/bff, mm_at/mm_rt/mm_csrf cookies, mealmate: auth-token-expired / rate-limit-exceeded events, single-flight 401 refresh → /login) + lib/api/serverApi.js (BACKEND_URL/api, next/headers cookies, typed NotFound/Forbidden/Unauthorized, no public-endpoint caching per §4 privacy model, single-flight refresh) + new lib/api/serverActions.js ('use server' serverGet/Post/Put/Patch/Delete returning {ok,data,error}); app/api/bff/[...path]/route.js now forwards the authorization header too.
- New auth helpers: lib/auth/userCache.js (server-side mm_at-hash cache, 2-min TTL), lib/auth/authHelpers.js (withAuth/getAccessToken/requireAccessToken/verifyToken/withOptionalAuth/invalidateAuthCache, mealmate_rate_limit cookie on 429), lib/utils/query.js (buildQueryString).
- **ARCHITECTURE RULE (§8.9, mandatory):** Every page follows 3-layer split: (1) lib/actions/<domain>.js wraps serverApi → plain objects; (2) app/…/page.jsx = Server Component, NO "use client", calls actions, passes initialXxx to client; (3) app/…/<Name>Client.jsx = "use client", receives initialXxx as useState seed, mutations via browserApi. Layouts (groups/profile/admin) are Server Components that render a *Shell client for context. Verification: `grep -rl '"use client"' Client/src/app --include="page.jsx"` must return nothing.
