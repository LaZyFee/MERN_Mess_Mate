<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## MealMate Project Rules (read first)

Before writing or modifying any code:

1. **Read `Client/docs/COMPONENTS.md` first** — it is the single source of truth for all shared components, their props, and usage. Follow it exactly; do not invent new component APIs.
2. **Design according to project context and theme** — use CSS variables (`var(--bg)`, `var(--bgs)`, `var(--tp)`, `var(--ts)`, `var(--bd)`, `var(--pale)`, `var(--bgm)`, `var(--danger)`, etc.), not hardcoded colors.
3. **Always use the project's shared components** — import from `@/components/shared/...` flat paths (see COMPONENTS.md for the real paths; aliased subfolders are legacy and will be fixed in T0.8).
4. **Theme: use `Client/src/components/shared/ThemeToggle.jsx`** — light/dark toggle backed by `uiStore` + `mm_theme` cookie. Never hardcode theme colors.
5. **i18n: use `Client/src/lib/i18n/LangProvider.jsx`** — `useT()` / `useLang()` for all user-facing text. Locale lives in `mm_lang` cookie; never hardcode English-only strings.
6. **Notifications: use `Client/src/components/shared/ToastProvider.jsx`** — `useToast().showToast({ status, title, description })` for all success/error/warning/info messages. **Do not use the `Alert` component** (it has been removed; all inline notices are now toasts).
7. **Auth cookies are HttpOnly** — `mm_at`, `refreshToken`, `mm_csrf` are never readable by JS. Use `credentials: "include"` and the BFF (`/api/bff/*`) for all API calls.
8. **CSRF double-submit** — state-changing requests must send `x-csrf-token` header matching the `mm_csrf` cookie (except public auth endpoints: register/login/forgot-password/reset-password).
9. **Route groups** — `(app)` = authenticated app shell (`/dashboard`, `/groups/…`); `(public)` = login/register/etc. (`/login`, `/register`). Post-login redirect goes to `/dashboard`, never `/`.
