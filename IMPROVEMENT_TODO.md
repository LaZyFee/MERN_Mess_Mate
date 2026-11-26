# MealMate Improvement TODO
Last Session: T14.5 → T14.11

> Source: `Server/docs/PROJECT_IMPROVEMENT_RECOMMENDATIONS.md` (PIR). Order = PIR §7 roadmap. **Backend (Server) first, then frontend (Client).**
> Markers: `[ ]` todo · `[~]` in progress (add what's left) · `[x]` done · `[!]` blocked (reason) · `[-]` deferred (needs measured trigger / human infra)
> IDs: `S*` = Server task · `T14.*` = Client task (mirrored as one line in `Client/TODO.md` under `## P14 Improvements`) · `*.D` = docs-sync task (run at phase end, see prompt §5).
> Each task = ≤3 files + its test. Tests: run only the new/affected `node --test tests/<file>`; full suites at phase end.

## Decisions (PIR §8 — edit before starting; AI uses these defaults, never guesses)
- D1 Device list becomes authoritative after S1 (revoke-all/one really kills refresh). 
- D2 Self-approval: keep "reason required", no solo-member bypass.
- D3 Receipt privacy: keep strict (owner/manager/treasurer/auditor/creator).
- D4 Legacy sunset: env `LEGACY_SUNSET_DATE=2027-03-31`. Before it: `Deprecation`/`Sunset` headers + period guard. After: HTTP 410.
- D5 TOTP for owner/treasurer: optional; add env flag `REQUIRE_TOTP_MONEY_ROLES` (default `false`), enforce only when `true`.

## S0 Baseline
- [x] S0.1 Run `npm test` + `npm run test:integration` + `node scripts/auditRoutes.mjs` once; record counts (unit/integration/routes) in Notes. Do not fix unrelated failures.

## S1 Critical correctness (PIR §1 rows 1,2 + idempotency)
- [x] S1.1 Issue a `Session` family at login / Google callback / 2FA completion (`sessionService`, `userController`); refresh cookie carries familyId+secret.
- [x] S1.2 Refresh = conditional-update CAS on `Session.currentTokenHash`; reuse ⇒ revoke family; legacy `User.refreshToken` still accepted until `LEGACY_REFRESH_SUNSET` env date, then rejected. Test `sessionFamily.test.js`.
- [x] S1.3 Logout, revoke-one, revoke-all, password change, suspend ⇒ revoke Session families (+ clear legacy hash). Extend `sessionFamily.test.js`.
- [x] S1.4 `buildStatementDraft` + helpers read meals/expenses/transactions with `.session(session)`; persist `sourceHash` of the frozen input set. Test `statementFrozenInputs.test.js`.
- [x] S1.5 Finalize writes outbox rows (unique `dedupeKey`) inside the same transaction; publish/send only after commit. Test `outboxTxn.test.js`.
- [x] S1.6 Production boot guard in `config/db.js`: `NODE_ENV=production` without replica set ⇒ exit with clear message (dev/test fallback unchanged).
- [x] S1.7 `IdempotencyRecord`: add `leaseUntil` + `sourceId`; reconciler job in `schedulerService` clears expired leases. Test `idempotencyLease.test.js`.
- [x] S1.8 Shopping-list→expense conversion: conversion + list close + idempotency update in ONE transaction.
- [x] S1.9 Phase gate: unit + integration + auditRoutes green.
- [x] S1.D Docs sync (API §2.2/2.4/2.5/2.6, §5.1; plan §13 #14/#19; PIR; README §11/§15; counts).

## S2 High-priority correctness & security (PIR §1 rows 3–10)
- [x] S2.1 `payers[]` required in `createExpenseSchema`; fallback kept only for legacy rows.
- [x] S2.2 Helper `resolveGroupRefs({groupId, membershipIds, categoryIds, accountIds, effectiveDate})`; use in `moneyController`, `expenseController`, `allocationService`. Test `crossGroupRefs.test.js`.
- [x] S2.3 Legacy `/api/expenses/entry/:id` + `/api/meals/entry/:id`: resolve group from entry → `ensureOpen({groupId, month})`; after D4 date ⇒ 410 via `deprecate`.
- [x] S2.4 Receipts with `scanStatus: pending` are not downloadable (return placeholder payload `{scanStatus:'pending'}`); add rescan job.
- [x] S2.5 Invite consumption atomic (usedCount increment + membership upsert in one txn; consume only after successful join).
- [x] S2.6 Real CAPTCHA in `supportController.verifyCaptcha` (Turnstile; env `TURNSTILE_SECRET`; explicit `CAPTCHA_DEV_BYPASS` for dev/test only).
- [x] S2.7 TOTP login challenges stored in Mongo (TTL) instead of in-process `Map`; keep API shape. Update `totp.test.js`.
- [x] S2.8 Evict sockets on leave/kick/suspend: `io.in(room).disconnectSockets()` in `membershipController` + `adminController`.
- [x] S2.9 Enforce D5 flag in money-handler role checks (no-op when flag false).
- [x] S2.10 Phase gate: unit + integration + auditRoutes green.
- [x] S2.D Docs sync (API §7.5–7.12/7.18/7.22, §5; plan §3.x models, §13 #20; PIR; README).

## S3 Operations & maintainability (PIR §3, §4)
- [x] S3.1 `GET /api/health` (unauthenticated, no data): DB ping + scheduler heartbeat.
- [x] S3.2 `NotificationOutbox.leasedUntil`; worker reclaims expired leases; drop `processing` from user-facing enum. Test `outboxLease.test.js`.
- [x] S3.3 Nightly job: accounting equation per group; alert (admin inbox) when `balanced === false`. Register in job table.
- [x] S3.4 Admin health endpoint: job age, outbox depth/oldest pending, variance total, `scanStatus` counts, `JobLock` holders.
- [x] S3.5 Request ids: middleware in `index.js` → `audit()` fills `AuditEvent.requestId`; expose `X-Request-Id`.
- [x] S3.6 Move inline Zod schemas (polls, shopping, kitchen, TOTP, admin id params) into `validation/`; re-export.
- [x] S3.7 Extract `services/exportService.js` (PDF/Excel from ledger-derived figures); slim `messGroupController`.
- [x] S3.8 `toDecimalString()` at response boundary for legacy `summaryController` / `paymentNoteController`; no inline `/100).toFixed`.
- [x] S3.9 CI `.github/workflows/ci.yml`: `node --check` all files + module-import smoke + `auditRoutes.mjs` + both suites on a replica set.
- [x] S3.10 `auditRoutes.mjs --write-table` generates the route table section for the API doc (prose untouched).
- [x] S3.11 Phase gate.
- [x] S3.D Docs sync (API §7.20/new health + admin endpoints; plan §3.8/§17.2 job table/§13; PIR; README §10/§12).

## S4 Scalability & performance (PIR §2)
- [x] S4.1 `auth` middleware: per-process LRU cache `{id, suspended}` ~30 s keyed by token `iat`; invalidated on suspend.
- [x] S4.2 Cursor pagination via `paginateQuery`: `listMemberships`, `listGuestMeals`, `listDisputes` (+ `?all=true` for exports).
- [x] S4.3 Cursor pagination: `listOutbox`, `listPolls`, `listAssets`.
- [x] S4.4 Cursor pagination: legacy `getMeals` / `getExpenses` (opt-in, backward compatible).
- [x] S4.5 Batch statement build: preload categories once, prior statements in one query, memoize allocations per expense. Golden tests must stay identical.
- [x] S4.6 `statsController`: replace `$regex` month with range on `costPeriod`; add `(groupId, month)` Meal index; update `scripts/checkIndexes.js`.
- [x] S4.7 Phase gate.
- [x] S4.D Docs sync (API list endpoints' query/response, §1.4 pagination; plan §8/§10; PIR §2 ✅; README).

## S5 Product features — backend (PIR §5)
- [x] S5.1 `GET /api/meals/:groupId/bazar-forecast?days=7` (portions × trailing-30d median per category + band). Pure rule file + test.
- [x] S5.2 `Budget {groupId, month, categoryId, amountPoisha}` model + CRUD + variance endpoint.
- [x] S5.3 Post-finalize debtor reminders via outbox (dedupeKey per statement+member; honour quiet hours/consent).
- [x] S5.4 Duty fairness: task weights + rolling share/Gini in `dutyFairnessBoard`.
- [x] S5.5 Reconciliation suggestions: unconfirmed transactions, `paidTotal < amount` expenses, missing receipts.
- [x] S5.6 "Explain my bill": structured breakdown (en + bn) from frozen statement item.
- [x] S5.7 Excel import: preview → dry-run diff → apply (reuse bulk-preview pattern).
- [x] S5.8 Phase gate.
- [x] S5.D Docs sync (API new endpoints + TOC; plan §3 Budget model, §14/§20; PIR §5 ✅; README §2/§15; route count).

## C Client (start only after S1–S5 for that feature are `[x]`)
- [x] T14.0 Read `AGENTS.md` + relevant `node_modules/next/dist/docs/` page once; note in Notes. Re-read `FRONTEND_BUILD_PROMPT.md` §1 + §8.9 once; note in Notes.
- [x] T14.1 Sessions page: remove "informational" notice; revoke-one/all now authoritative (needs S1).
- [x] T14.2 Expense draft: `payers[]` required (default = me); remove fallback reliance (needs S2.1).
- [x] T14.3 Receipts: `scanStatus: pending` placeholder + disabled download (needs S2.4).
- [x] T14.4 Turnstile widget on support/appeal forms; `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; CSP allow-list (needs S2.6).
- [x] T14.5 Load-more: members, guest meals, disputes (needs S4.2).
- [x] T14.6 Load-more: outbox, polls, assets (needs S4.3).
- [x] T14.7 Handle legacy `410` in `LegacyExpensePanel` + legacy meal calls: toast + steer to V2 flow (needs S2.3).
- [x] T14.8 Admin health panel (`/admin` overview section) (needs S3.4).
- [x] T14.9 Group "Activity" tab from `getGroupAuditLog` with action/actor filters; add to GroupShell TABS (existing API).
- [x] T14.10 Bazar forecast card on Overview/Board (needs S5.1).
- [ ] T14.11 Budgets panel: per-category variance with `Progress` (needs S5.2).
- [ ] T14.12 Duty fairness: weighted share display in DutiesClient (needs S5.4).
- [ ] T14.13 ReconciliationPanel: suggestion list (needs S5.5).
- [ ] T14.14 StatementDetail: "Explain my bill" drawer (needs S5.6).
- [ ] T14.15 Excel import wizard with `ModalStepper` (needs S5.7).
- [ ] T14.16 Notification prefs: add "payment reminder" type on Profile (needs S5.3).
- [ ] T14.17a Bengali i18n infra: dictionary loader, `mm_lang` cookie, bn digit/currency in `lib/utils/format.js`, language toggle.
- [ ] T14.17b Translate shell + auth + home.
- [ ] T14.17c Translate group tabs (one tab per sub-step; split further if >3 files).
- [ ] T14.18 Phase gate: `npm run lint`, `audit:colors`, `audit:svg`, `npm run build`.
- [ ] T14.D Docs sync (Client: COMPONENTS.md, README_1 → `Client/README.md`, TODO.md; plus root docs touched by client features).

## Deferred `[-]` (only with a measured trigger — do not start)
- [-] S6.1 Redis rate-limit store + `@socket.io/redis-adapter` (second instance needed).
- [-] S6.2 Standalone outbox worker process.
- [-] S6.3 Read-model monthly rollups (verified vs `getAccountingEquation`).
- [-] S6.4 `/api/v2` ledger surface (after v1 frozen).
- [-] S6.5 `// @ts-check` + JSDoc on `services/` then `models/`.
- [-] T14.19 PWA offline meal drafts (policy review required first).
- [-] H1 Human: restore drill on isolated replica set + RTO record · H2 Human: replica-set race drill + 50-member load test · H3 Human: run `migrateInviteCodes.js` in prod · H4 Human: real SMTP/WhatsApp, secret rotation.

## Notes & Decisions
- Baseline: unit 112 pass, integration 47 pass, routes 219/219 match (auditRoutes green).
- After S1: unit 130 pass (18 new tests across sessionFamily, statementFrozenInputs, outboxTxn, idempotencyLease, shoppingListConversion), integration 47 pass, routes 219/219 match.
- New env vars: `LEGACY_REFRESH_SUNSET` (unset = legacy tokens always accepted, dev default).
- New test files: `tests/sessionFamily.test.js` (8 tests), `tests/statementFrozenInputs.test.js` (4 tests), `tests/outboxTxn.test.js` (2 tests), `tests/idempotencyLease.test.js` (3 tests), `tests/shoppingListConversion.test.js` (4 tests).
- New env var documented: `LEGACY_REFRESH_SUNSET` in `.env` (commented, unset=dev default).
- `resetPassword` now calls `revokeAllSessions` + clears legacy `refreshToken` hash.
- `adminUpdateUser` suspend path already revokes all sessions + clears legacy hash.
- Docs synced: API_DOCUMENTATION §2.2/2.4/2.5/2.6 updated, finding #1 marked resolved; plan.md §13 #19 flipped ⏳→✅; PIR recommendation marked ✅; README security hardening → IMPLEMENTED.
- After S2+S3 (phase gate): unit **176** pass, integration **53** pass, routes **221/221** match, import smoke 0 failures, `--write-table --check` clean.
- New env vars (S2/S3): none required. Optional: `OUTBOX_LEASE_MS` (default 120000), `ENABLE_SCHEDULER=false` to skip scheduling.
- New files (S2/S3): `routes/healthRoutes.js`, `validation/featureSchemas.js`, `services/exportService.js`, `utils/requestContext.js`, `scripts/importSmoke.mjs`, `.github/workflows/ci.yml`; tests `outboxLease`, `accountingEquationJob`, `adminHealth`, `featureSchemas`, `exportService`, `moneyBoundary`, `moduleGuards`, integration `health`, integration `requestId`.
- New routes: `GET /api/health`, `GET /api/admin/health` → doc §7.0 + §7.4 and generated table §11.
- Model changes: `NotificationOutbox.leasedUntil` + `lastAttemptAt` + `(state,leasedUntil)` index; `IdempotencyRecord.sourceId` no longer single-field indexed (covered by the unique key). Run `scripts/checkIndexes.js` on deploy.
- Fixed regression: `allocateExpense` now validates membership overlap with the *service period* (`resolveGroupRefs` gained `effectiveRange`), so mid-month joins don't 422; zero-cost meal lines no longer divide by zero.
- Docs sync: README §10/§11/§12/§15 + `routes/ 29 routers`; plan §10 test counts, §17.2 job table, §21.1; PIR §1-§4 ✅ marks, §7 items 3-7 ✅, §8 decisions D1-D5 resolved, §9 verification record.
- After S5 (phase gate): unit **238** pass, integration **59** pass, routes **231/231** match, import smoke 161 modules / 0 failures, `--write-table --check` clean.
- New S5 files: `models/Budget.js`, `controllers/budgetController.js`, `routes/budgetRoutes.js`, `validation/budgetSchemas.js`, `services/budgetRules.js`; `services/reminderRules.js` + `services/reminderService.js`; `services/dutyFairnessRules.js`; `services/reconciliationSuggestionRules.js` + `services/reconciliationSuggestions.js`; `services/billExplanationRules.js`; `services/expenseImportRules.js` + `services/expenseImportFile.js`, `controllers/expenseImportController.js`.
- New S5 tests: `budgetRules`, `reminderRules`, `dutyFairness`, `reconciliationSuggestions`, `billExplanation`, `expenseImport` (6 files, 41 tests).
- New S5 routes (+7): budgets (4), `POST /api/statements/groups/:groupId/statements/:month/reminders`, `GET .../:month/explain`, `POST /api/expenses/groups/:groupId/expenses/import/preview`, `.../import/apply`.
- New S5 job: `debtorReminders` in the scheduler job table (quiet hours + consent honoured, one reminder per statement revision+member+channel).
- `dutyFairnessBoard` response is additive: now also returns `totalUnits`, `activeMembers`, `fairness {gini, level, mostLoaded, leastLoaded}`, `weights`, and per-row `weightedUnits`/`sharePct`/`fairSharePct`/`balance`; `cleaningCount` now matches any `cleaning:*` key.
- Expense import cap: 5 MB upload, 2000 rows, 10 requests / 15 min / IP; rows land as `draft` expenses (approval unchanged).
