# Backend Extension TODO
Last Session: 1 -> B1.1 (B0 complete)

## Phase B0: Foundations
- [x] B0.1 InboxNotification model + inboxService.notify/notifyAdmins + socket rooms + /api/inbox routes + prefs + tests
- [x] B0.2 JobLock/JobRun + jobRunner.runJob + refactor schedulerService through runJob + /api/admin/jobs + tests

## Phase B1: Support Desk
- [x] B1.1 services/supportRules.js pure functions + tests/supportRules.test.js
- [x] B1.2 Models SupportTicket/SupportMessage/SupportActionToken/SupportCannedReply/Counter + validation/supportSchemas.js
- [x] B1.3 User endpoints /api/support (create/list/thread/messages/transitions/action token/appeal)
- [x] B1.4 Admin endpoints /api/admin/support (tickets/reply/internal-note/assign/patch/redact/stats/canned-replies)
- [x] B1.5 Notifications + SLA/autoclose jobs through runJob
- [ ] B1.6 tests/integration/support.test.js + smoke b1.sh

## Phase B2: Routine & Notice Board
- [ ] B2.1 services/routineRules.js pure + tests/rosterGeneration.test.js
- [ ] B2.2 Models Roster/DutyAssignment/SwapRequest/MenuPlan/Note + validation/routineSchemas.js
- [ ] B2.3 tests/noteVisibility.test.js
- [ ] B2.4 Routes/controllers /api/routines (rosters, duties, swaps, menu, notes, board)
- [ ] B2.5 Jobs rosterHorizon/dutyReminders/markMissed/noteExpiry + departure hook
- [ ] B2.6 tests/integration/routines.test.js + smoke b2.sh

## Phase B3: Security hardening
- [ ] B3.1 InviteCode hashing + join limiter + migration script + tests
- [ ] B3.2 2FA TOTP setup/verify/disable + login step-up + admin amr gate + tests
- [ ] B3.3 SecurityEvent + anomalySweep job + tests
- [ ] B3.4 Helmet CSP, privacy regression test, retention job, consent timestamps, socket query-token rejection, RUNBOOK_BACKUP.md + smoke b3.sh

## Phase B4: Cookie-only auth
- [ ] B4.1 Cookie helpers + auth from mm_at + X-Client:web token omission + CSRF gate + logout + socket cookie
- [ ] B4.2 tests/integration/cookies.test.js + smoke b4.sh

## Final
- [ ] T-VER final verification (audit, greps, checkIndexes.js, smoke run)
- [ ] T-DOC readme.md implemented notes + roadmap ticks

## Notes & Decisions
- (append only)
- Session 1: Started B0.1.
- B0.1 done: model+service+routes mounted; rules split into inboxService.rules.js; npm test 28/28.
- B0.2 done: JobLock/JobRun models, jobRunner+rules, scheduler jobs wrapped in runJob, /api/admin/jobs, ENABLE_SCHEDULER + SIGTERM. Unit 33/33, integration 9/9. Added devDeps mongodb-memory-server, supertest. smoke b0.sh written (needs live server).
- Session 2 (backlog cleanup): Uninstalled bcryptjs, pdfmake, express-validator, express-mongo-sanitize (verified no imports; bcrypt+pdfkit retained). Added middleware/deprecate.js with Deprecation/Sunset/Link headers on /api/messgroups/entries|calculate and /api/summary/:g/:m. Extended migrateLegacyData.js with a legacy 2-slot float meal migration (idempotent, skips already-migrated slot objects) + tests/legacyMealMigration.test.js. Unit 37/37, integration 9/9.
- Also: exceljs pinned to 4.4.0 + uuid override ^11.1.1 -> npm audit --omit=dev now reports 0 vulnerabilities.
