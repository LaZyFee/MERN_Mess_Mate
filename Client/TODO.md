# MealMate Frontend TODO
Last Session: P0 foundation complete (T0.1–T0.14, audits clean) → T1.1

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
- [x] T0.8 Shared components modernized: all inline SVG → react-icons/lu (Button, Toast, Alert, Modal, Checkbox, MultiSelect, Select, Progress, Breadcrumb, ProtectedComponent, ConfirmationModal, FileInput); broken alias imports fixed to real flat paths; literal palette classes swept to CSS vars; Avatar initials from var palette; ThemeToggle rebuilt on uiStore+mm_theme cookie; StatusBadge extended with expense/money/period/statement_item/outbox/ticket configs; Modal 90dvh.
- [x] T0.9 Root layout (globals.css tokens light+dark incl. status/chart vars, viewport meta, theme pre-paint script, not-found/error/loading, temp home page): viewport meta, favicon (no svg), dvh/safe-area CSS, fonts.
## P1 Auth & Sessions (server/client splits)
- [ ] T1.1 Register · T1.2 Login (+2FA challenge step) · T1.3 Google callback (cookies→redirect /) · T1.4 Forgot/Reset · T1.5 Verify email · T1.6 Sessions page

## P2 Groups & Memberships
- T2.1–T2.8 per §2 (Home dashboard, create/join, group layout+tabs, Overview V2 dashboard, Members, Settings incl. invite codes, Policy editor)

## P3 Meals · P4 Expenses · P5 Money · P6 Statements · P7 Notifications & Disputes · P8 Stats/Profile/Polish
- Per seed §2 T3.x–T8.x

## P9 Routine & Board (§8.7) T9.1–T9.10
## P10 Support T10.1–T10.7
## P11 Inbox T11.1–T11.4
## P12 Security UX T12.1–T12.3

## Notes & Decisions
- Stack per §8: Next.js App Router (JavaScript). zustand (authStore NO persist). react-icons family: `lucide-react` already installed but rule says react-icons → use **react-icons/lu** (Lu = Lucide) everywhere.
- Existing CSS vars (app/globals.css :root/[data-theme=dark], both themes): --background --foreground --p --p2 --p3 --p4 --p5 (primary green shades) --pale --pale2 (tints) --gold --bg --bgs (surface) --bgm --bgl --bd --bd2 --bd3 (borders) --tp --ts --tm --tl (text primary/secondary/muted/light) --gl --glb (glass) --expo --ease (easings) --font-display --font-body --r-md/--r-lg/--r-xl/--r-2xl/--r-pill (radius) --shadow-md/--lg/--xl. Tailwind @theme: --color-primary #85bd19, --color-primary-dark, --color-primary-hover, --color-primary-active, --color-secondary. Theme via `data-theme` attr on html.
- Deprecated vite deps (sweetalert2, lucide-react) not to be used.
