# MealMate Frontend TODO
Last Session: Fixed build-blocking defects (useGroup import path → GroupShell, missing src/lib/utils/profileUtils, invalid react-icons/lu names, Select.jsx react-phone-number-input/flags import). Build now PASSES (lint 0 errors, color/SVG audits clean). → Next: review remaining P9–P13 tasks

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
- [x] T4.2 Expense draft builder: multi-line lines[] (category, ৳→poisha, per-line split mode + beneficiaries/fixed/weights/usage), payer, supplier, receiptReference, isPayable; duplicate warnings in amber Alert. Files: ExpenseDraftForm.jsx, ExpenseLineEditor.jsx, expenseHelpers.js, lib/utils/money.js (SPLIT_MODES).
- [x] T4.3 Workflow actions: submit/approve/reject/reverse with reason modal (ExpenseActions.jsx), role-gated (owner/manager/treasurer).
- [x] T4.4 Receipt upload + authenticated download links (ReceiptsPanel.jsx, attachmentsApi in lib/api/expenses.js, ≤10MB jpeg/png/webp/pdf).
- [x] T4.5 Legacy simple CRUD behind "Advanced" tab (LegacyExpensePanel.jsx, treasurer+).
- [x] T5.1 Money tab: cursor list + status/kind filters (MoneyClient.jsx, TransactionCard.jsx).
- [x] T5.2 Submit transaction form with per-kind from/to member & fund pickers, method, TrxID, evidence (TransactionForm.jsx).
- [x] T5.3 Confirm/reject/reverse with reason modal, treasurer-gated (TransactionCard.jsx).
- [x] T5.4 Funds panel: ledger balances, masked ids, custody history, create fund, owner handover (FundsPanel.jsx + fundKinds.js).
- [x] T5.5 My balance card from /money/.../balance with owes/receives status (MyBalanceCard.jsx).
- [x] T6.1 Statements tab: list + detail totals + per-member items (desktop table / mobile stacked cards) — StatementList.jsx, StatementDetail.jsx.
- [x] T6.2 Version history chips (superseded vs current) in StatementDetail.
- [x] T6.3 Close workflow: month picker, checklist, preview (no persist), begin-review / return-to-open, finalize modal w/ expectedRevision, 409 refresh-and-retry toast, 422 unresolved chips — ClosePanel.jsx.
- [x] T6.4 Corrections path: finalized months show "corrections create a new version"; refinalize with reason allowed (server versions N+1).
- [x] T7.1 Notifications outbox panel (state filter, resend, manual wa.me links) — more/NotificationsPanel.jsx.
- [x] T7.2 WhatsApp consent toggle on /profile (ProfileClient.jsx + notificationsApi.setWhatsappConsent).
- [x] T7.3 Disputes panel: open/respond/resolve|reject with note — more/DisputesPanel.jsx.
- [x] T7.4 Reconciliation panel: equation health, record count, variance colors, resolve select — more/ReconciliationPanel.jsx.
- [x] T8.1 Charts tab: granularity month/year + year/month/user filters, meals bar, expense line, category doughnut (CSS-var colors) — charts/ChartsClient.jsx + ChartCanvas.jsx.
- [x] T8.2 Profile page (/profile): edit username/phone/whatsapp, avatar upload, change password (partial — 2FA/inbox prefs pending).

## P9 Routine & Board (§8.7) T9.1–T9.10
- [x] T9.1 Board widget on group Overview (SSR boardToday → BoardWidget.jsx; duties, menu, pinned notes, handover banner).
- [x] T9.2 Duties calendar + mark done + swap request / accept / decline (DutiesClient.jsx implemented: month grid, mark-done, swap offer/respond, fairness card, realtime invalidate; builds cleanly)
- [ ] T9.3 Rosters admin (manager): create/edit roster, publish, extend horizon
- [ ] T9.4 Weekly menu: week view + template editor; today's menu card with cook
- [ ] T9.5 Notice board: feed, create note/announcement/alert, pin, audience, seen receipts, archive
- [ ] T9.6 Handover composer: absence window + task checklist; claim/done on tasks; active banner
- [ ] T9.7 Realtime: duty-updated / menu-updated / note-created / shoppingList / kitchenInventory → refresh
- [ ] T9.8 Shopping list → convert to expense draft
- [ ] T9.9 Kitchen inventory: staple stock + refills
- [ ] T9.10 Polls: quick menu decisions with voting

## P10 Support T10.1–T10.7
- [ ] T10.1 My tickets list + New ticket form
- [ ] T10.2 Ticket thread page (composer driven by permissions.canComment)
- [ ] T10.3 Email-action landing page /support/action/[token]
- [ ] T10.4 Public appeal page (suspended users)
- [ ] T10.5 Admin Support queue
- [ ] T10.6 Admin ticket view (reply / internal note / canned replies / assign / priority / transitions)
- [ ] T10.7 Admin support stats cards

## P11 Inbox T11.1–T11.4
- [ ] T11.1 TopBar bell + unread badge (inbox-new socket event) + dropdown list
- [ ] T11.2 Inbox page (cursor list, mark read / all, deep-link)
- [ ] T11.3 Notification preferences (per type, email toggle, quiet hours) on Profile
- [ ] T11.4 Admin bell reuses the same component + toast on new support ticket

## P12 Security UX T12.1–T12.3
- [ ] T12.1 2FA setup (QR from backend) + login step-up screen
- [ ] T12.2 Invite code one-time reveal dialog (moved into T9.12 settings work)
- [ ] T12.3 Sessions page device-family coverage notice

## P13 Polish backlog
- [x] T13.3 T8.5 color+SVG grep, lint, build (lint 0 errors; color audit clean; SVG audit clean; production build passes)
- [ ] T13.4 T8.6 co-member directory · T13.5 T8.7 leave/kick · T13.6 T8.8 hidden admin shell · T13.7 T8.9 README
- [ ] T13.8 Fix remaining implementation defects found in review (invite dialog duplicate state, orphaned notifications panel, server actions param names, missing member roster for routines, socket initializer wiring, Badge warning solid class, BottomNav/TopBar missing, admin detail/audit pages).

## Notes & Decisions
- Mandatory UI implementation rule: use Tailwind `className` utilities for layout and presentation. `style={{ ... }}` is prohibited for JSX components; dynamic CSS values use a CSS custom property such as `style={{ "--progress": value }}` only when no Tailwind arbitrary-value form is practical. All colors remain CSS-variable based.
- Completed the §8.9 split for the remaining auth/group routes: `page.jsx` files are Server Components, interactive forms/views live in client components, and SSR reads use `src/lib/actions/{auth,groups}.js`; clients seed state from `initial*` props and use browser APIs only for mutations/refreshes.
- Stack per §8: Next.js App Router (JavaScript). zustand (authStore NO persist). react-icons family: **react-icons/lu** everywhere (fi still used by a few legacy shared widgets; new code uses lu).
- Existing CSS vars (app/globals.css :root/[data-theme=dark]): --background --foreground --p --p2 --p3 --p4 --p5 --pale --pale2 --gold --bg --bgs --bgm --bgl --bd --bd2 --bd3 --tp --ts --tm --tl --gl --glb --expo --ease --font-display --font-body --r-md/--r-lg/--r-xl/--r-2xl/--r-pill --shadow-md/--lg/--xl --success/--danger/--warning/--info (+ -bg variants) --chart-1..5 --space-1/2/3/4/6/8 --transition. Theme via `data-theme` attr on html.
- API layer: fetch-based lib/api/browserApi.js (baseURL /api/bff, mm_at/mm_rt/mm_csrf cookies, mealmate: auth-token-expired / rate-limit-exceeded events, single-flight 401 refresh) + lib/api/serverApi.js (BACKEND_URL/api, next/headers cookies, typed NotFound/Forbidden/Unauthorized). `apiClient.request(endpoint, {method, body, headers, isFormData})`.
- **ARCHITECTURE RULE (§8.9, mandatory):** lib/actions/<domain>.js (server reads) → app/…/page.jsx (Server Component, no "use client") → app/…/<Name>Client.jsx ("use client", seeds useState from initialXxx, mutations via browserApi).
- Group routes: layout.jsx → GroupShell (client) provides `GroupContext` (`useGroup()` → `{group, groupId, reload}`) AND syncs `useGroupStore` (group/groupId/myRole). Group tabs live in GroupShell TABS (add new tabs there).
- Backend port 5000, client port 5174. Socket.IO authenticates from the `mm_at` cookie (no token payload), rooms `user:<id>` / `group:<id>`; events: meal-updated, expense-updated, inbox-new, duty-updated, menu-updated, note-created, note-updated, shoppingList-updated, kitchenInventory-updated, roster-published.
- Backend response shapes used by new P9–P12 code: inbox → `{notifications, nextCursor, hasMore}`, unread → `{count}`, prefs → `{preferences:{types,quietHours}}`; support → `{tickets,...}`, thread → `{ticket, messages, permissions:{canComment,reason,code,canResolve,canClose,canReopen}, slaStage}`; shopping → `{list}`; inventory → items array/`{items}`; polls → `{polls}`; routines board → `{date,duties,menu,pinnedNotes,activeHandovers}`, duties → `{duties}` with `{localDate,status,membershipId,taskKey,...}`, notes → `{notes}`.
- Build defects fixed this session: (1) MembersClient.jsx & PolicyClient.jsx imported `useGroup` from `../layout` (Server Component, no export) → changed to `../GroupShell` (exports `useGroup` via GroupContext). (2) Created `src/lib/utils/profileUtils.js` (`getAvatarUrl`) and repointed Avatar.jsx / ProfileAvatarUpload.js imports from `@/utils/profileUtils` → `@/lib/utils/profileUtils`. (3) Replaced invalid react-icons/lu names: GroupShell.jsx `LuBarChart2`→`LuLayoutDashboard`, `LuMoreHorizontal`→`LuMenu`; ChartsClient.jsx `LuBarChart3`→`LuChartBar`. (4) Select.jsx removed `import flags from "react-phone-number-input/flags"` (pkg not installed) → CountryFlag now renders ISO text chip.
- Verification: `npm run lint` → 0 errors; `audit:colors` → clean; `audit:svg` → clean; `npm run build` → PASSES (compiled successfully, all routes render). Dev-server warnings removed: `@custom-variant dark` dropped from globals.css (unused; codebase uses explicit `[data-theme="dark"]` classes) and obsolete `eslint` key dropped from next.config.js.
