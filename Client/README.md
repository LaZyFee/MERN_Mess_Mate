# MealMate — Frontend (`Client`)

Meal, expense and money tracking for shared living, backed by a real double-entry
ledger, versioned month-end statements and audited financial workflows.

Next.js **App Router** (JavaScript) as a BFF in front of the Express/MongoDB API in
`../Server`. Browser code never talks to the backend directly: every request goes
through the same-origin proxy at `/api/bff/*`, and first-load data is fetched in
Server Components.

## Requirements

- Node.js 20+
- The backend running on `http://localhost:5000` (see `../Server`)
- MongoDB reachable by the backend

## Setup

```bash
cd Client
npm install
copy .env.example .env.local     # PowerShell: Copy-Item .env.example .env.local
npm run dev                      # http://localhost:5174
```

### Environment (`Client/.env.local`)

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Server-only backend origin. **Never** prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | Public origin of this app (invite links, OAuth redirects). |
| `SOCKET_ORIGIN` | Comma-separated origin(s) allowed in the CSP `connect-src`. |
| `ADMIN_PANEL_KEY` | Optional defense-in-depth key for `/admin/*`; must match the backend's `ADMIN_PANEL_KEY`. Empty when unused. |

Auth is **cookie-only**: `mm_at` (access, HttpOnly, `/`), `refreshToken`
(refresh, HttpOnly, `/api`), `mm_csrf` (double-submit, readable).
**There is no `mm_rt` cookie** — anything that looks for one sees a logged-out user.
No token ever reaches JavaScript, and no auth or user data is stored in
`localStorage`, `sessionStorage` or IndexedDB.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port **5174**. |
| `npm run build` | Production build (source maps off, `poweredByHeader: false`). |
| `npm run start` | Serve the production build on 5174. |
| `npm run lint` | ESLint (includes the no-inline-style / no-literal-color rules). |
| `npm run audit:colors` | Fails loudly if a hex/rgb/hsl literal appears outside `globals.css`. |
| `npm run audit:svg` | Fails if inline `<svg>` or `.svg` assets appear. |

## Structure

```
Client/
  middleware.js                 edge cookie gate + CSP/security headers
  src/app/
    layout.jsx                  root: theme pre-paint script, viewport, fonts
    globals.css                 design tokens (light + dark) — the only color source
    (public)/                   login, register, forgot/reset, verify-email, join
    (app)/                      protected layout (session → redirect) + AppChrome
      page.jsx                  home (my groups)
      groups/[groupId]/         overview · meals · expenses · money · statements
                                · board · charts · members · more
      support/ · inbox/ · profile/
    (admin)/admin/              hidden platform-admin plane (probed, 404 otherwise)
    api/bff/[...path]/route.js  allowlist proxy to BACKEND_URL
  src/lib/
    actions/                    Layer 1 — server-only reads (one file per domain)
    api/                        serverApi (SSR) · browserApi (/api/bff) · domain clients
    store/                      zustand: authStore (no persist), groupStore, uiStore
    utils/                      format.js (formatPoisha/parseTaka/month/Dhaka-day)
  src/components/               shared UI (Button, Card, Modal, Table, Toast, …)
  src/features/                 interactive domain components
```

### The three layers (§8.9)

1. **`src/lib/actions/<domain>.js`** — server-only query helpers wrapping `serverApi`.
2. **`app/…/page.jsx`** — React Server Component; **never** `"use client"`. Fetches
   the first screen server-side and passes `initialXxx` props.
3. **`app/…/<Name>Client.jsx`** — `"use client"`; seeds `useState(initialXxx)`,
   mutates through `lib/api/<domain>.js` → `/api/bff`, re-fetches only on user action.

Layouts follow the same split: `layout.jsx` (server) → `<XxxShell>` (client) that
owns context and renders `{children}`.

## Conventions (non-negotiable)

- **Colors:** CSS variables only, from `app/globals.css` (both themes). No hex,
  `rgb()`, named colors, Tailwind palette classes or inline color styles.
- **Styling:** Tailwind `className` utilities; no `style={{ … }}` for visuals.
  Dynamic values use a CSS custom property (`style={{ "--v": n }}`).
- **Icons:** `react-icons/lu` only. No inline SVG, no `.svg` imports, no emoji icons.
- **Charts:** Chart.js via `react-chartjs-2`, client-only, colors read from CSS vars.
- **Mobile-first:** 360 px first; verify 320/360/390/768/1024/1280; ≥44 px targets;
  modals are bottom sheets; tables stack below `md`; no horizontal page scroll.
- **Money:** integer poisha to the server; render with `formatPoisha` (`tabular-nums`).
- **State:** server-owned data stays server-owned; zustand only for cross-route UI
  state (no persisted or duplicated API data).
- **Every data view** has loading, empty and error states; mutations toast their result.

## Hidden admin plane

`/admin/*` is server-probed through `GET /api/admin/overview` (plus the backend's
mandatory 2FA `amr` check). A non-admin gets `notFound()`, so the section does not
exist for them, and no user-facing link points to it. The BFF attaches
`X-Admin-Key` (server env only) when `ADMIN_PANEL_KEY` is set.

## Reference

- `TODO.md` — task ledger and decisions (session memory).
- `COMPONENTS.md` — shared component inventory with props.
- `FRONTEND_BUILD_PROMPT.md` — build brief.
- `../Server/docs/API_DOCUMENTATION.md` — backend contract.
