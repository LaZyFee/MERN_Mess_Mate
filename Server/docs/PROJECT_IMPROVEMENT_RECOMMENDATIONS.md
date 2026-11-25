# MealMate — Project Improvement Recommendations

> **Status:** independent technical assessment produced by the backend/frontend audit.
> It is **not** an implementation prompt. Every "current situation" below was verified in source; items that were
> fixed during the audit are marked ✅ and listed under "confirmed bugs fixed" in [`Server/docs/plan.md`](plan.md) history and this file's verification record.
>
> Related: [project README](../../README.md) · [API reference](API_DOCUMENTATION.md) · [plan & architecture](plan.md)

The API is in good shape for frontend integration: 219 documented endpoints match the router table exactly, 112 unit
tests and 47 integration tests pass, and the Next.js client builds 20 routes. The release-blocking risks are
**accounting reproducibility** (one month close must see one frozen input set) and **session/refresh unification**
(the device list does not govern the token actually in use). Those two are the only *Critical* items.

---

## 1. Essential security and correctness fixes

| Recommendation | Current situation | Problem / opportunity | Proposed solution | Benefits | Priority | Complexity | Dependencies |
|---|---|---|---|---|---|---|---|
| Unify the two refresh-token stores | Login/refresh rotate `User.refreshToken`; `/api/sessions` manages separate `Session` family rows | The device list can be empty while a refresh token still works; "revoke all devices" does not revoke the live token; password change only clears the `User` hash | Issue a `Session` family at login, rotate with a conditional update (`currentTokenHash` CAS), keep legacy tokens valid through a dated sunset window, then drop `User.refreshToken` | Revocation, device management and reuse detection become truthful | **Critical** | High | `User`, `Session`, `sessionService`, `userController`, BFF refresh route |
| Bind each approval to an immutable input set | `finalizeStatement` recomputes the draft inside its transaction, but `buildStatementDraft` reads outside the session, and outbox enqueues happen after commit | A finalize racing an expense approval can freeze a statement that disagrees with the journals it claims to summarise; a crash after commit but before enqueue loses bills | Require a replica set in production; read meals/expenses/transactions with `.session(session)`; write an `outbox` record (unique `dedupeKey`) inside the same transaction; publish after commit | A statement that is reproducible from its frozen inputs | **Critical** | High | Mongo replica set, `statementService`, `periodService`, `notificationController` |
| Stop the auto-fallback payer ✅→ partly | Approval defaults the payer to the approver when `payers[]` is empty (now refused if the approver has no membership) | Still implicit: the UI should never rely on the fallback | Make `payers[]` required in `createExpenseSchema`; keep the fallback only for legacy rows | Every posted journal names its payer | High | Low | `expenseController`, `schemas.createExpenseSchema`, expense draft builder |
| Validate all cross-references against the URL group | Money/expense lines accept arbitrary `membershipId`, `categoryId`, `accountId`; some handlers trust them | A valid ObjectId from another group is not ownership; mis-scoped lines corrupt allocations | Resolve every referenced id with `{ groupId }` (and effective date for memberships) before writing | Tenant isolation by construction | High | Medium | `moneyController`, `expenseController`, `allocationService` |
| Make idempotency transactional | `IdempotencyRecord` is created before the handler and its result is saved in a fire-and-forget `updateOne` | A crash leaves a key with no result ("still processing" forever); a shop-conversion crash can create duplicate drafts | Add `leaseUntil` + a reconciler job; store `sourceId` on the record; run conversion + list close + record update in one transaction | Safe retries after disconnects | High | Medium | `idempotency`, `shoppingListController`, `schedulerService` |
| Constrain legacy entry DELETE/edit to the period | `/api/expenses/entry/:id` and `/api/meals/entry/:id` are guarded by the legacy role check, not the period state machine | A legacy client can delete a posted entry in a finalized month | Resolve the group from the entry, then `ensureOpen({groupId, month})`; add a `410` sunset for legacy writes | No silent mutation of closed months | High | Medium | `expenseController`, `mealController`, `deprecate` |
| Quarantine receipts with `scanStatus: pending` | Upload accepts the file when clamscan is unavailable and serves any clean-looking receipt to authorized readers | Pending files are served before a verdict | Block download while `pending` (serve a "not yet scanned" placeholder) and add a rescan job | No unscanned binaries leave the system | High | Low | `attachmentController`, `attachmentRoutes`, worker |
| Enforce invite-code capacity atomically ✅→ partly | `InviteCode` increments `usedCount` then writes membership separately | Consumption can succeed while the join fails, burning a use | Wrap increment + membership upsert in one transaction; consume only after a successful join | Accurate expiry/uses-left counters | Medium | Medium | `inviteController`, `Membership` |
| Add real CAPTCHA + TOTP challenge persistence | `verifyCaptcha` accepts any token; TOTP challenges live in an in-process `Map` | A restart drops a pending 2FA login; a flag alone cannot prove a human | Integrate Turnstile/hCaptcha; store challenges in `Session`/Redis with a short TTL | Consistent identity checks across instances | High | Medium | `supportController`, `totpController`, config |
| Evict sockets on membership/account change | Handshake + `join-group` authorize once; JWT expiry disconnects | A kicked or suspended user keeps receiving realtime events until token expiry | `io.in(room).disconnectSockets()` on leave/kick/suspend | Immediate realtime revocation | High | Low | `index.js`, `membershipController`, `adminController` |

## 2. Scalability and performance

| Recommendation | Current situation | Problem / opportunity | Proposed solution | Benefits | Priority | Complexity | Dependencies |
|---|---|---|---|---|---|---|---|
| Trim per-request DB work in `auth` | Every authenticated request does `User.findById` for the suspension flag | Doubles the query count of every API call | Cache `{id, suspended}` for ~30 s in a per-process LRU keyed by token `iat`, or carry a `ver` claim invalidated on suspend | Lower p95 latency across the app | High | Low | `middleware/auth`, `adminController` suspend path |
| Add cursor pagination to remaining lists | `/api/money` and `/api/expenses` V2 support cursors; `listMemberships`, `listGuestMeals`, `listDisputes`, `listOutbox`, `listPolls`, `listAssets`, `getMeals/getExpenses` return whole arrays | A 3-year-old 20-member group returns thousands of rows in one response | Reuse `paginateQuery`; keep an `?all=true` opt-in for exports | Predictable payload size and latency | High | Medium | `utils/pagination`, list controllers |
| Batch the statement build | `buildStatementDraft` runs `Expense`→`allocateExpense`→`Statement.findOne` **per membership**, and `allocateLine` imports `ExpenseCategory` inside a loop | Close latency grows O(members × lines); N+1 category reads | Preload categories once, load all prior statements in one query (`month < X`, grouped), memoize allocations per expense | Faster month close; fewer round trips | High | Medium | `statementService`, `allocationService` |
| Benchmark the meal-unit aggregation | `/api/stats` now sums `portionSubunits` in Mongo ✅ | Still runs three aggregations per call with a `$regex` month match | Replace the regex with `costPeriod: { $gte, $lte }` string range; add `(groupId, month)` to the `Meal` index set | Index-backed chart queries | Medium | Low | `statsController`, `Meal` indexes |
| Recover stuck outbox leases | Leases are `state: 'processing'` with no owner/expiry | A crash mid-send leaves the row stuck forever | Add `leasedUntil`; reclaim rows older than the lease; drop the unused `state: 'processing'` from the user-facing enum | Delivery never silently stalls | High | Low | `outboxWorker`, `NotificationOutbox` |
| Extract the PDF/Excel exporters | `pdfExport`/`excelExport` live in `messGroupController` and recompute totals with float maths | Duplicate calculation logic that can disagree with the ledger; makes the controller 600+ lines | Move to `services/exportService.js` with ledger-derived figures | One source of exported truth | Medium | Medium | `messGroupController`, `ledgerService` |
| Shared state for limits and sockets | Rate limiters, join lockouts, invite buckets and TOTP challenges are per-process `Map`s; Socket.IO is single-instance | A second instance silently doubles the effective limits and breaks room fanout | Adopt `@socket.io/redis-adapter` and a Redis rate-limit store **only when a second instance is measured to be needed** | Safe horizontal scale | Medium | Medium | Redis, deployment topology |

## 3. Maintainability and developer experience

| Recommendation | Current situation | Problem / opportunity | Proposed solution | Benefits | Priority | Complexity | Dependencies |
|---|---|---|---|---|---|---|---|
| Consolidate Zod schemas | Validators exist in `validation/` **and** inline in routes/controllers (polls, shopping, kitchen, TOTP, admin id params) | Contract drift; hard to review | Move every inline schema into `validation/` and re-export | One place to audit the contract | High | Low | route files |
| Make contract drift visible in CI | No CI. Before this audit, five backend modules could not parse (so their routes were dead) while `npm test` still passed, because pure rule tests never import the route files | A dead route can ship unnoticed | CI: `node --check` on every file **plus** a module-import smoke test **plus** the route↔doc diff (`Server/scripts/auditRoutes.mjs`) **plus** both test suites on a replica set | Green build means loadable, wired and consistent | High | Low | CI, the audit script |
| One money-formatting path | V2 uses integer poisha; legacy `MonthlySummary`/`PaymentNote` use floats; some handlers do `(x/100).toFixed(2)` inline | Two rounding conventions | Keep poisha as the only storage type; add `toDecimalString()` at the response boundary | No float drift | Medium | Medium | `summaryController`, `paymentNoteController` |
| Request correlation IDs | `AuditEvent.requestId` exists but nothing populates it | Hard to join an audit row to a log line | Attach a request id in `index.js`, pass it through `audit()` | Traceable incidents | Medium | Low | `index.js`, `AuditEvent` |
| Documented API generation | `API_DOCUMENTATION.md` is hand-written but matches 219/219 routes | Drift risk as routes evolve | Generate the route/middleware table from the router files; keep the prose | Always-current reference | Medium | Medium | `Server/scripts/auditRoutes.mjs` |
| Type safety | 100% JavaScript, no JSDoc types, large controllers | Refactors are risky in financial code | `// @ts-check` + JSDoc on `services/` and `models/` first, then controllers | Early error detection without a rewrite | Low | Medium | — |

## 4. Administration and manageability

| Recommendation | Current situation | Problem / opportunity | Proposed solution | Benefits | Priority | Complexity | Dependencies |
|---|---|---|---|---|---|---|---|
| Operational exception view | Hidden admin has overview/traffic/audit/jobs | An operator cannot see *what is stuck*: last successful job run, oldest pending outbox row, unresolved reconciliation, pending scans | Add a "health" panel: job age, outbox depth, variance total, `attachment.scanStatus` counts, `JobLock` holders | Faster triage | High | Medium | `adminController`, `jobController`, `outboxWorker` |
| Readiness endpoint | `GET /` returns a static string | No signal for a load balancer | `GET /api/health` (unauthenticated, no data): DB ping + scheduler heartbeat | Safe liveness/readiness probes | High | Low | `index.js` |
| Integrity report | `getAccountingEquation` exists per group | No scheduled cross-group check | Nightly job computing the equation per group; alert when `balanced === false` | Early detection of corruption | High | Low | `ledgerService`, `schedulerService` |
| Export/restore runbook evidence | `docs/RUNBOOK_BACKUP.md` is referenced but not verified in this audit | Restoring journals + authenticated receipts is untested | Restore a snapshot into an isolated replica set; recompute balances; compare `Statement.sourceHash`; record RTO | Confidence in recoverability | High | Medium | backup owner, storage |
| Group-level activity log | `getGroupAuditLog` exists (owner/manager/treasurer/auditor) | The frontend only exposes it inside Settings | Promote to a first-class "Activity" tab with filters by action and actor | Transparency for residents | Medium | Low | frontend |

## 5. Product and feature improvements

> Each item below was checked against the backend: none of these analytics/predictions exist today. Headcount
> (`/api/meals/:groupId/headcount/tomorrow`), bazar suggestions, duty-fairness board, shopping list, kitchen inventory
> and polls **do** exist — these are the next layer on top of them.

| Recommendation | Current situation | Problem / opportunity | Proposed solution | Benefits | Priority | Complexity | Dependencies |
|---|---|---|---|---|---|---|---|
| Bazar budget forecast | `headcount/tomorrow` + recent approved poisha prices exist | Managers still decide purchases by feel; over/under-buying | `GET …/bazar-forecast?days=7`: portions × trailing 30-day median price per category, with a confidence band | Less waste; predictable month | High | Medium | headcount, approved expenses, `stats` |
| Budget planning per month | No budget entity | No "we are 80 % through the budget on day 12" signal | `Budget {groupId, month, categoryId, amountPoisha}` + variance endpoint | Proactive cost control | High | Medium | new model |
| Payment reminders for debtors | `checkPeriodDeadlines` reminds managers only | Residents forget to pay | Reuse the outbox: after finalize, enqueue per-member "you owe ৳X" reminders with dedupe keys (respect quiet hours/consent) | Faster settlement | Medium | Low | outbox, consents |
| Duty fairness analytics | `dutyFairnessBoard` returns counts | Counts hide the *time* imbalance (cooking > trash) | Weight tasks, show a Gini/rolling share in the board | Fairer rotas | Medium | Low | `routinesController` |
| Reconciliation assistant | Reconciliation stores expected vs actual | Explaining a variance means reading the ledger manually | Suggest likely causers: unconfirmed transactions, expenses with `paidTotal < amount`, receipts missing | Faster resolution | Medium | Medium | ledger, expenses |
| Bengali localisation | English-only UI strings | Bangladeshi messes are Bengali-first | `next-intl`-style dictionary + Bengali number/currency formatting; backend already stores ৳ data | Adoption | High | Medium | frontend only |
| PWA + offline meal drafts | Slot-state entry exists | Poor connectivity on mobile | Offline queue storing **only** group/month/date/portions (no tokens, encrypted per user), synced through the BFF | Entries captured on the spot | Medium | High | frontend, policy review |
| Import from Excel | `migrateLegacyData.js` is a one-shot script | New groups have spreadsheets | Upload preview → dry-run diff → apply (reusing the bulk-preview pattern) | Low-friction onboarding | Medium | Medium | `mealBulkSchema`, expenses |
| "Explain my bill" narrative | Statement items contain every component | Residents dispute what they do not understand | Generate a plain-language (or Bengali) breakdown from the frozen statement item in both email and UI | Fewer disputes | Medium | Low | statement snapshot |

## 6. Long-term architectural ideas (only with a measured trigger)

| Recommendation | Current situation | Problem / opportunity | Proposed solution | Benefits | Priority | Complexity | Dependencies |
|---|---|---|---|---|---|---|---|
| Separate the outbox worker | Worker runs inside the API process | API restarts interrupt deliveries; scaling the API multiplies workers | Run it as a separate small process sharing the same code | Independent scaling | Low | Medium | deployment |
| Read-model snapshots | Dashboard recomputes from journals | Multi-year groups will slow down | Periodic per-month rollups written by a job, verified against journals | Fast dashboards | Low | High | `getAccountingEquation` as the verifier |
| API versioning | Single unversioned surface; deprecation headers on legacy routes | Breaking changes are risky | Mount `/api/v2` for the ledger surface only once v1 is frozen | Safe evolution | Low | Medium | routing |

## 7. Prioritized roadmap

**Immediate (correctness + security)**
1. ✅ Bug fixes from the repo audit (five modules that could not even load, stats aggregation, attachment authorization, self-approval, CORS, auditor scope).
2. ✅ Client auth: replace the non-existent `mm_rt` cookie with `mm_at`/`refreshToken` (refresh now works).
3. Unify refresh-token storage; bind statement finalize to a frozen input set; make idempotency transactional.
4. Require `payers[]`; validate every cross-group reference.

**Short term (maintainability + operations)**
5. CI running syntax check + route/doc diff + both test suites on a replica set.
6. Readiness endpoint, outbox lease recovery, pending-scan quarantine, scheduled accounting-equation check, operational health panel.
7. Consolidate Zod schemas; extract export service.

**Medium term (product)**
8. Bengali localisation; bazar budget forecast; monthly budgets; payment reminders; "explain my bill".
9. Cursor pagination on the remaining list endpoints.

**Long term (scale — only when measured)**
10. Redis adapter + shared limiter state at the second instance.
11. Standalone outbox worker; read-model rollups for multi-year groups.

## 8. Items requiring a product decision (do not guess)

- **Device management semantics:** is "log out other devices" expected to work today, or is the device list informational until the session-family migration? (It is currently informational.)
- **Self-approval in single-resident messes:** the new rule requires a reason even when the approver is the only person who could approve. Acceptable, or should a solo-member group bypass it?
- **Receipt privacy:** should ordinary members see *any* other member's receipt (audit transparency), or only money-handlers? The audit chose the stricter option (owner/manager/treasurer/auditor/creator).
- **Legacy surface sunset date:** `/api/messgroups/entries|calculate`, `/api/summary`, `/api/messgroups/payment-note*` and `/api/expenses/entry/:id` still work. Set a date once no client uses them.
- **TOTP for owners/treasurers:** mandatory for platform admins; currently optional for group money-handlers. Make it mandatory?

## 9. Audit inventory

Files inspected in this audit (source, not proof of behaviour — every behavioural claim above was traced by hand):

- **Server root** — `index.js`, `package.json`, `.gitignore`
- **Server/config** — `cloudinary.js`, `db.js`, `mongoSessionStore.js`, `passportJs.js`
- **Server/middleware** — `amrGate.js`, `auth.js`, `csrf.js`, `deprecate.js`, `idempotency.js`, `privacy.js`, `rateLimiters.js`, `receiptUpload.js`, `roles.js`, `upload.js`
- **Server/controllers (31)** — admin, attachment, depositAsset, dispute, expenseCategory, expense, inbox, invite, job, kitchenInventory, meal, membership, messGroup, money, notification, paymentNote, period, policy, poll, reconciliation, recurring, routines, session, shoppingList, statement, stats, summary, supportAdmin, support, totp, user
- **Server/services (19)** — allocation, duplicateDetection, inboxService(.rules), jobRunner(.rules), ledger, membership, outboxWorker, period, retentionRules, routineJobs, routineRules, scheduler, security, session, statement, supportJobs, supportRules
- **Server/models (~38)** — every model referenced in the source inventory of `PROJECT_IMPROVEMENT_RECOMMENDATIONS` (prior pass) plus `Meal`, `Poll`, `Statement`, `Period`, `Membership`, `Expense`, `User`, `AuditEvent`
- **Server/routes (29)** — all router files (route table reconciled: 219 routes = 219 documented)
- **Server/utils** — dhakaTime, mailer, money, pagination, tokens, totp, transaction, whatsapp
- **Server/validation** — inboxSchemas, routineSchemas, schemas, supportSchemas, validate
- **Server/scripts** — checkIndexes, migrateInviteCodes, migrateLegacyData, smoke/*
- **Server/tests** — 17 unit files + 5 integration files (all executed)
- **Client** — `middleware.js`, `src/app/api/bff/[...path]/route.js`, `src/lib/api/{browserApi,serverApi,auth}.js`, `src/app` route tree (20 built routes), `package.json`

**Verification record**

| Check | Result |
|---|---|
| `node --check` on every server file | pass |
| Module import smoke (all routes/controllers/services/models) | 0 failures |
| Unit tests `npm test` | **112 pass / 0 fail** |
| Integration tests `npm run test:integration` | **47 pass / 0 fail** |
| Route ↔ API doc diff (`Server/scripts/auditRoutes.mjs` vs `Server/docs/API_DOCUMENTATION.md`) | **219 asserted = 219 documented**, 0 missing each way |
| `next build` (Client) | **success**, 20 routes |
