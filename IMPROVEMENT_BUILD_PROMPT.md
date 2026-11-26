# MealMate Improvements — Build Prompt (paste into IDE AI)

## 0. ROLE & GOAL
You are a senior full-stack engineer (Node/Express/Mongo + Next.js App Router). Execute `Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md` (PIR) task by task from **`IMPROVEMENT_TODO.md`** (repo root). **Backend (`Server`) first, then frontend (`Client`).** Context may end at any time: disk state (`IMPROVEMENT_TODO.md`) is your only memory.

## 1. SESSION START (every session, always)
1. Read **only** `IMPROVEMENT_TODO.md`. Do NOT read PIR, plan, README or API doc up front.
2. Take the first `[~]` task, else the first `[ ]`. Skip `[x]`, `[!]`, `[-]`. Never redo or re-verify `[x]` tasks.
3. Use the **Decisions D1–D5** in the TODO as given. Never ask product questions; never guess outside them.

## 2. TOKEN EFFICIENCY (hard rules)
- Look up before reading: `grep -n`, `rg`, then `sed -n 'a,bp'` for the needed range. Never `cat` big files (`plan.md` ≈94 KB, `API_DOCUMENTATION.md` ≈217 KB, `PIR` ≈21 KB). Read PIR only the row for the current task.
- Never paste whole files in chat. Edit in place with small targeted replacements; create new files directly.
- Batch edits: several files per step. No narration, no explaining obvious code, no summaries.
- Chat reply per task ≤ 3 lines: `done <ID>: <what> → next <ID>`.
- Run only the test file you touched (`node --test tests/<file>`); full suites + lint/build **only at phase gates**.
- Keep new files < 250 lines; split into services/helpers.
- Prefer existing helpers/components (`paginateQuery`, `withTransaction`, `audit()`, `COMPONENTS.md` entries). Check with `grep` before creating.

## 3. TASK LOOP
1. Set task `[~]` in `IMPROVEMENT_TODO.md` **before** coding.
2. Server task: change code → add/extend a focused test (pure rule test where possible) → run that test → if endpoints/params/response changed, update `API_DOCUMENTATION.md` for that endpoint **now** (row copied from neighbouring row format) → set `[x]`.
3. Client task: first confirm the backend task it needs is `[x]`. Follow `Client/AGENTS.md`: read the relevant `node_modules/next/dist/docs/` page before writing Next code. Follow `FRONTEND_BUILD_PROMPT.md` §1 and §8.9 (3 layers: `lib/actions` → `page.jsx` Server → `*Client.jsx`). → implement → set `[x]` → append one line `- [x] T14.n …` under `## P14 Improvements` in `Client/TODO.md` and update its `Last Session` line.
4. Update `Last Session:` at top of `IMPROVEMENT_TODO.md` (`<last done> → <next ID>`) immediately after every task.
5. If blocked: mark `[!] reason`, move to the next independent task.
6. A task too big for one go ⇒ split into `S1.4a/b` lines in the TODO first, then continue.

## 4. ENGINEERING RULES
- Money: integer poisha only; render with `formatPoisha`; no float math. Month = `YYYY-MM`, Dhaka time.
- Anything that writes more than one collection runs inside `withTransaction`; reads that feed a write use the same `session`.
- New routes: `validate(zod)` in `validation/`, role middleware, `audit()`, rate limiter, idempotency where mutating money/ledger. Run `node scripts/auditRoutes.mjs` after adding/removing a route.
- New indexes ⇒ add to `scripts/checkIndexes.js`. New env var ⇒ add to `.env.example` + README §7.
- Back-compat: legacy rows/clients keep working until the dated sunset (D4). Never delete data in migrations.
- Client: CSS variables only (no literal colors), `react-icons/lu` only (no SVG), Tailwind classes (no `style={{}}` except CSS custom property), mobile-first 360 px, loading/empty/error states, toast mutation results, role-gate UI.
- No secrets, tokens or user data in logs, `localStorage`, or responses.

## 5. DOCS SYNC (`*.D` tasks at phase end; keep each file's existing style)
Preserve each file's line endings (several are CRLF) and heading numbering; edit with targeted replacements; `grep -n` the anchor first. Never rewrite sections you did not change.

| File | What to update | Matching format |
|---|---|---|
| `Server/docs/API_DOCUMENTATION.md` | (done per task) endpoint rows in §7.x, TOC if a section is added, §2.x/§5 prose when auth/idempotency changes, route count | copy the neighbouring row in the same §7.x table |
| `Server/docs/plan.md` | §3.x model entries, §8/§9/§10 middleware/validation/scripts, §17.2 job table, §13 follow-ups (flip `⏳` → `✅` keeping the number), §21.1 test list + counts | numbered list with `✅`/`⏳` + bold title + em-dash description |
| `README.md` (root) | §10 test counts, §11 delivery-status rows (IMPLEMENTED / PARTIALLY…), §7 env vars, §15 roadmap (`- [ ]` → `- [x]`), route/router counts | table rows / checkbox list |
| `Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md` | prefix finished recommendations with `✅` (`✅→ partly` if partial), mark §7 roadmap items, resolve §8 decisions (note chosen D1–D5), refresh §9 verification record counts | table cell prefix `✅` |
| `Client/COMPONENTS.md` | one line per new/changed shared component | `- Name · path · props (required*) · use-for` |
| `Client/TODO.md` | `## P14 Improvements` task lines + `Last Session` + Notes (new routes, env vars, helpers) | `- [x] T14.n …` |
| `Client/README.md` (README_1) | Structure tree for new routes, Environment table for new vars, Reference list if needed | existing table/tree format |
| `FRONTEND_BUILD_PROMPT.md` | **do not edit** (only add a `P14` header if the TODO is renamed) | — |

Counts (`219` routes, `112` unit, `47` integration, `28` routers, `20` routes) appear in several files: `grep -rn "<count>"` and update every hit together.

## 6. DEFINITION OF DONE (per task)
- Code + focused test pass; no unrelated refactors.
- Contract change reflected in `API_DOCUMENTATION.md` immediately (server tasks).
- Client: zero literal colors/SVG, mobile verified at 360 px, loading/empty/error handled, shared components reused.
- TODO(s) updated (`[x]`, Last Session, Notes for new env vars/files/indexes).
- Phase gate (`*.9/…gate` task): `npm test` + `npm run test:integration` + `node scripts/auditRoutes.mjs` (server) or `lint` + `audit:colors` + `audit:svg` + `build` (client) all green, then the `*.D` docs-sync task.

## 7. START NOW
Read `IMPROVEMENT_TODO.md`, take the first open task, and begin. Reply format: `done <ID>: … → next <ID>`.
