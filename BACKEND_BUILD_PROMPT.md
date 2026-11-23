# MealMate Backend Extension: Build & Test Prompt (paste into IDE AI)

## 0. ROLE AND GOAL

You are a senior Node.js engineer working inside the existing MealMate backend (`/Server`: Express 5, Mongoose 8, Zod 4, Socket.IO, ES modules, tests with `node --test`).

Build the following **new backend features** and **prove each one works with automated tests**:

| Phase | Feature | Short description |
|---|---|---|
| B0 | Foundations | In-app notification inbox, safe cron jobs (locks + run log), notification preferences |
| B1 | Support Desk | Members raise tickets to the platform admin, with strict comment-lock rules and admin alerts |
| B2 | Routine & Notice Board | Bazar / cleaning / cooking duty rosters, weekly menu, notes and "I am away" handovers |
| B3 | Security hardening | Hashed invite codes, 2FA for admins, anomaly events, headers, retention |
| B4 | Cookie-only auth | Web clients get tokens in HttpOnly cookies only, never in JSON or JS |

Do the phases **in order** (B1 and B2 may swap after B0). **Do not start the next phase until the current one's tests pass.**

Reference docs: `readme.md` (API), `plan.md` (deep design; Part B sections 14-21 describe these features). If this prompt and `plan.md` ever disagree, **this prompt wins**.

---

## 1. HARD RULES (never break)

1. **Do not break existing behaviour.** `npm test` currently passes 26/26. It must still pass after every task. Run it after every task.
2. **Follow existing conventions.** Before writing anything new, read the top ~60 lines of one existing file of the same kind and copy its style:
   - controller: `controllers/disputeController.js` (group-scoped, threaded responses)
   - routes: `routes/disputeRoutes.js`; middleware stack: `auth`, `requireGroupRoleV2`, `validate`, `idempotency`
   - validation: add Zod schemas to a NEW file per feature (`validation/supportSchemas.js`, `validation/routineSchemas.js`, ...), reuse helpers from `validation/schemas.js` (ObjectId regex etc.)
   - services hold business rules (pure functions where possible); controllers stay thin
   - pagination: `utils/pagination.js` (`paginateQuery`); time: `utils/dhakaTime.js`; transactions: `utils/transaction.js`; audit: the existing `audit()` helper; admin guard: `requirePlatformAdmin` in `adminController.js`
3. **Money is never touched** by these features. No Journal postings, no floats.
4. **Privacy rules stay:** group data is 404-masked for non-members; ex-members read only inside their interval (`resolveHistoryWindow`); never return `email`/`phone` of other users; admin routes answer the generic **404** to non-admins.
5. **Every input is Zod-validated** (body, params, query). Strip Mongo operators as the existing validator does. Free text is stored as plain text and capped (see limits per feature). Never render or store HTML.
6. **Every state change writes an `AuditEvent`** (dotted action names given below) and never breaks the request path if auditing fails (same as the existing helper).
7. **Mutations that create things accept `Idempotency-Key`** (reuse `middleware/idempotency.js`).
8. **Rules live in one pure function per feature** (e.g. `canUserComment`), so they are unit-tested without a database. Controllers call those functions; they never re-implement the rule.
9. **No new dependencies** except: `otplib` (B3 TOTP), `qrcode` (B3, optional), `cookie` only if not already present, and `mongodb-memory-server` as a **devDependency** for integration tests (see 2.3). Ask before adding anything else. No `console.log` in source; use the existing logger/pattern.
10. **Every new collection gets explicit indexes** (listed below) and a TTL index where noted.
11. **Error format** stays the existing one: `{ msg, code?, errors? }`. New business errors always include a machine-readable `code` (listed below) so the frontend can react.
12. **Do not edit `readme.md` / `plan.md` by hand at the end**; instead, as the final task (T-DOC), append a short "implemented" note per phase to `readme.md` (endpoints + env vars) and tick the roadmap boxes.

---

## 2. RESUME-SAFE WORKFLOW AND TEST STRATEGY

### 2.1 TODO file (your memory across sessions)

Create `Server/TODO_BACKEND.md` first. Format:

```
# Backend Extension TODO
Last Session: (none) -> B0.1
- [ ] B0.1 ...
```

Markers: `[ ]` not started, `[~]` in progress (add one line: what's left), `[x]` done, `[!]` blocked (reason). Mark `[~]` before starting, `[x]` right after finishing, and update `Last Session`. At session start, read **only** this file and continue at the first `[ ]`/`[~]`. Keep a `## Notes & Decisions` section for choices you made (append only).

### 2.2 Per-task loop (always)

1. Read the minimum code needed (top of the similar file).
2. Write the **test first** (or alongside), then the code.
3. Run only the relevant test file: `node --test tests/<file>.test.js`.
4. Run the full suite `npm test` before marking `[x]`.
5. Reply in <= 5 lines: what was done, tests added, next task. Do not paste whole files in chat.

### 2.3 Test layers

| Layer | How | Used for |
|---|---|---|
| **Unit (pure)** | `node --test`, no DB, fixed "now" injected as a parameter | rule functions: `canUserComment`, ticket transitions, roster generation, note audience filter, invite-code validation, TOTP window, job lock decision |
| **Integration (DB)** | `mongodb-memory-server` (replica-set mode so `withTransaction` is real), in `tests/integration/*.test.js`, run by `npm run test:integration` | uniqueness/race behaviour (two claimers, two scheduler runners, max-uses invite), TTL/indexes exist, full endpoint flows through `supertest` (add as devDependency if absent) |
| **Smoke (manual script)** | `scripts/smoke/<phase>.sh` using `curl` against a running dev server | final proof per phase; script prints PASS/FAIL lines |

Add npm scripts: `"test": "node --test tests/*.test.js"` (unchanged), `"test:integration": "node --test tests/integration/*.test.js"`. Every phase ends with both passing.

Time handling in tests: every service function that depends on "now" takes `now` as an argument (default `new Date()`), so tests pass a fixed Dhaka time. Never `Date.now()` inside a rule.

---

## 3. PHASE B0: FOUNDATIONS

### B0.1 InboxNotification

Model `InboxNotification`: `userId`, `scope: 'user'|'admin'`, `groupId?`, `type` (string enum, extendable), `title` (<=120), `body` (<=300), `link: { kind, id }`, `readAt?`, `dedupeKey?` (sparse unique with userId), `createdAt`, `expiresAt` (TTL 90 days).
Indexes: `(userId, readAt, createdAt:-1)`, TTL on `expiresAt`, sparse unique `(userId, dedupeKey)`.

Service `inboxService.notify({ userIds, scope, groupId, type, title, body, link, dedupeKey, io })`: inserts one row per user (ignore duplicate-key on dedupe), then emits `inbox-new` `{ id, type, title, link }` to room `user:<id>` for each. `notifyAdmins(payload)` resolves `ADMIN_EMAILS` to user ids and calls `notify` with `scope:'admin'`.

Socket: after the JWT handshake, every socket joins `user:<userId>`. (Never a shared admin room.)

API `/api/inbox` (auth only):
- `GET /` -> `?unread=1&cursor=&limit=` cursor-paginated, newest first
- `GET /unread-count` -> `{ count }`
- `POST /read` -> `{ ids: [..] } | { all: true }`, only touches the caller's rows
- `GET/PUT /preferences` -> `User.notificationPrefs = { types: { [type]: { inApp, email } }, quietHours: { from:'22:00', to:'07:00' } }` (validate HH:MM, defaults all on)

Tests:
- notify creates rows for exactly the given users; duplicate `dedupeKey` creates one row.
- user A cannot read or mark user B's rows (mark-read of B's id leaves it unread, returns count 0).
- `notifyAdmins` only reaches users whose email is in `ADMIN_EMAILS`; a normal user never gets an admin-scope row.
- unread-count updates after `POST /read`; `all:true` marks all.
- TTL index exists on `expiresAt`.

### B0.2 Safe cron

Create `JobLock { name (unique), lockedUntil, owner }` and `JobRun { name, startedAt, finishedAt, status:'ok'|'failed', processed, failed, error?, createdAt (TTL 30d) }`.

Service `jobRunner.runJob(name, fn, { ttlMs, now })`:
1. Try to claim: `findOneAndUpdate({ name, lockedUntil: { $lt: now } }, { lockedUntil: now+ttlMs, owner }, { upsert })` and treat a duplicate-key error as "someone else holds it" -> skip silently.
2. Run `fn()` inside try/catch; record a `JobRun`; release the lock.
3. Skip the tick if the previous run is still locked (overlap guard).

Refactor **every existing job** in `services/schedulerService.js` (recurring drafts, default meals, deadline reminders, idempotency cleanup, outbox) to go through `runJob`. Each job function must be exported, take `now`, process items in a per-item try/catch, and return `{ processed, failed }`. Declare cron with `timezone: 'Asia/Dhaka'`. Start the scheduler only when `ENABLE_SCHEDULER !== 'false'`. On `SIGTERM`, stop cron and let the in-flight job finish.
Add `GET /api/admin/jobs` (hidden admin): last run per job, status, locked-until.

Tests:
- (integration) two concurrent `runJob('x', fn)` calls: `fn` executes exactly once.
- a throwing `fn` records `status:'failed'` and releases the lock.
- an expired lock can be reclaimed; an active lock cannot.
- each existing job function is callable with a fixed `now` and is idempotent (second call processes 0 new items).
- one failing item does not stop the others (`failed:1, processed:n-1`).

Acceptance B0: `npm test` and `npm run test:integration` green; `scripts/smoke/b0.sh` shows inbox feed + unread count + admin jobs list.

---

## 4. PHASE B1: SUPPORT DESK

### 4.1 The comment-lock rules (the heart of this phase)

States: `open`, `answered`, `awaiting_admin`, `resolved`, `closed`.

Implement these as pure functions in `services/supportRules.js` (no DB access):

```js
// returns { allowed: boolean, code?: string, reason?: string }
canUserComment(ticket, { strict = true } = {})
canAdminComment(ticket)
nextStatusAfterMessage(ticket, authorType)   // user|admin -> new status or throws
canTransition(ticket, action, actorType, now) // actions: resolve, close, reopen, autoClose
```

Rule table (strict = true, the default; `SUPPORT_STRICT_TURNS=false` switches to "locked only until the first admin reply"):

| Status | User comment | Admin comment | Notes |
|---|---|---|---|
| open | **denied** `TICKET_AWAITING_ADMIN` | allowed -> `answered`, set `firstAdminReplyAt` | |
| answered | allowed -> `awaiting_admin` | allowed (stays `answered`) | |
| awaiting_admin | **denied** `TICKET_AWAITING_ADMIN` (strict) / allowed (non-strict) | allowed -> `answered` | |
| resolved | **denied** `TICKET_CLOSED`-like code `TICKET_RESOLVED` (tell user to Reopen) | allowed -> back to `answered` | |
| closed | **denied** `TICKET_CLOSED` | **denied** `TICKET_CLOSED` (admin must `reopen` first) | terminal for users |

Transitions: user `resolve` from `answered|awaiting_admin|open`; admin `resolve` from any non-closed; either `close` from `resolved` (user may also close from `answered`); user `reopen` only from `resolved` and only within 7 days of `resolvedAt`, result `awaiting_admin`, `reopenCount++`; admin `reopen` from `closed|resolved` requires a reason, result `answered`; system `autoClose` for `resolved` older than 72h (`closedBy:'system'`, adds a system message). Closed tickets cannot be reopened by the user; they create a new ticket with `relatedTicketId`.

All writes use an optimistic guard: `updateOne({ _id, status: expectedStatus, revision }, ...)`. If it matches 0 rows, return `409 TICKET_STATE_CHANGED`.

### 4.2 Models

- `SupportTicket`: `ticketNo` (unique, `MM-T-000123` from `Counter`), `userId`, `groupId?`, `category` (`account|bug|billing_dispute|feature|group_access|appeal|other`), `subject` (<=120), `status`, `priority` (`low|normal|high|urgent`, default `normal`, **only admins can change**), `assignedAdminId?`, `firstAdminReplyAt?`, `lastUserMessageAt`, `lastAdminMessageAt`, `firstResponseDueAt` (created + 24h normal / 4h urgent, recomputed on priority change), `resolvedAt?`, `closedAt?`, `closedBy?`, `resolutionNote?`, `reopenCount`, `relatedTicketId?`, `rating?{score 1-5, comment<=300}`, `contextSnapshot?` (only when the user ticked consent), `revision`.
  Indexes: unique `ticketNo`; `(userId, createdAt:-1)`; `(status, priority, firstResponseDueAt)`; `(assignedAdminId, status)`.
- `SupportMessage`: `ticketId`, `authorType: user|admin|system`, `authorId?`, `body` (<=2000), `isInternal` (admin only), `attachmentIds[]` (reuse `Attachment`, add target `support_ticket`), `createdAt`. **No update or delete route.** Admin `redact` replaces the body with "[removed]" and audit-logs it. Index `(ticketId, createdAt)`.
- `SupportActionToken`: `ticketId`, `userId`, `purpose: resolve|close|rate`, `tokenHash` (sha256, unique), `expiresAt` (TTL, 7 days), `usedAt?`. Token = 32 random bytes, hex; only the hash is stored.
- `SupportCannedReply`: `title`, `body`, `category?`, `createdBy`.
- `Counter`: `_id: 'ticket'`, `seq` (atomic `$inc`).

### 4.3 Endpoints

User, `/api/support` (auth). A user only ever sees **their own** tickets; someone else's ticket id returns **404**.

| Method | Path | Behaviour |
|---|---|---|
| POST | `/tickets` | create `{ category, subject, body, groupId?, attachContext?, attachmentIds? }`. Idempotent. Limits: max 3 tickets in `open|answered|awaiting_admin`, max 5 created per 24h -> `429 TICKET_LIMIT`. First message stored as a `SupportMessage`. Creates admin alert. |
| GET | `/tickets` | mine, `?status=&cursor=` |
| GET | `/tickets/:id` | thread (internal messages **excluded**) + `permissions: { canComment, reason, code, canResolve, canClose, canReopen }` computed by the pure functions |
| POST | `/tickets/:id/messages` | `{ body, attachmentIds? }` -> uses `canUserComment`; max 50 messages per ticket (`429 TICKET_MESSAGE_LIMIT`); 10 messages/min rate limit |
| POST | `/tickets/:id/resolve` `/close` `/reopen` `/rate` | per transition table |
| POST | `/actions/:token` | **public**, rate limited (20/15 min/IP). Looks up the hash, checks expiry and `usedAt`, performs `resolve|close|rate` via `canTransition`, sets `usedAt`. Always returns the same neutral message on any failure. Never returns ticket content. |
| POST | `/appeal` | **public** for suspended users: `{ email, message }`, requires a CAPTCHA token hook (stub the verifier behind an env switch), 1/day/IP, creates an `appeal` ticket for that user if the email matches, otherwise still returns the same neutral 200. |

Admin, `/api/admin/support` (inherits `requirePlatformAdmin`: non-admins get the generic 404):

| Method | Path | Behaviour |
|---|---|---|
| GET | `/tickets` | filters `status, priority, assignee, category, overdue=1, q` (ticketNo or subject), default sort: overdue first, then priority desc, then `createdAt` asc |
| GET | `/tickets/:id` | full thread including internal notes + user context (username, role in the referenced group, never email/phone unless admin already has it in the admin user view) |
| POST | `/tickets/:id/reply` | public reply via `canAdminComment` |
| POST | `/tickets/:id/internal-note` | `isInternal:true`; does not change status |
| POST | `/tickets/:id/assign`, PATCH `/tickets/:id` | assign admin; set `priority/category/tags` |
| POST | `/tickets/:id/resolve` `/close` `/reopen` `/messages/:mid/redact` | reopen and redact require `reason` |
| GET | `/stats` | counts by status, overdue count, median first-response minutes (last 30 days), average rating |
| CRUD | `/canned-replies` | |

Error codes: `TICKET_AWAITING_ADMIN` (403), `TICKET_CLOSED` (403), `TICKET_RESOLVED` (403), `TICKET_STATE_CHANGED` (409), `TICKET_LIMIT` (429), `TICKET_MESSAGE_LIMIT` (429), `REOPEN_WINDOW_EXPIRED` (403).
Audit actions: `support.ticket.created|replied|assigned|resolved|closed|reopened|redacted`.

### 4.4 Notifications and jobs

- On create: `inboxService.notifyAdmins({ type:'support.ticket_created', link:{kind:'support_ticket', id} , dedupeKey:'support:created:'+ticketId })` + email to admins via the outbox, deduped per 10-minute bucket (`support:email:<bucket>`; one digest, not one mail per event).
- On user reply or reopen: notify assignee, else all admins (`support.user_replied`).
- On admin reply / resolve / close: notify the ticket owner (in-app + email). Emails for `resolved` and `answered` include action-token buttons (resolve / close / rate) built from `FRONTEND_URL/support/action/<token>`.
- Jobs through `runJob`: `supportSlaWatcher` every 10 min (alerts at 75% and 100% of `firstResponseDueAt` while `firstAdminReplyAt` is null; dedupe keys `support:sla75:<id>`, `support:sla100:<id>`), `supportAutoClose` hourly (resolved > 72h -> closed by system; 48h warning to the user).

### 4.5 Tests (all required)

Unit, `tests/supportRules.test.js`:
- Full matrix: every status x {user, admin} x {comment, resolve, close, reopen} against the table above, including non-strict mode.
- New ticket: user comment -> `TICKET_AWAITING_ADMIN`.
- After admin reply: user comment allowed and status becomes `awaiting_admin`; second user comment -> denied (strict) / allowed (non-strict).
- Closed: user and admin comment denied with `TICKET_CLOSED`; admin reopen with reason works; without reason fails.
- Reopen: allowed at day 6 after `resolvedAt`, denied at day 8 (`REOPEN_WINDOW_EXPIRED`); denied from `closed`.
- `autoClose` picks `resolved` older than 72h only.

Integration, `tests/integration/support.test.js` (supertest):
- User A creates a ticket; user B gets 404 on it; a non-admin gets **404** (not 403) on `/api/admin/support/*`.
- The thread endpoint never contains internal notes for the user, and always contains them for the admin.
- Concurrency: two simultaneous admin replies produce one `answered` transition without corrupting `revision` (loser gets success without a double state jump, or 409, never a 500).
- Limits: 4th open ticket -> 429 `TICKET_LIMIT`; 51st message -> 429.
- Idempotency: same `Idempotency-Key` twice creates one ticket.
- Action token: valid token resolves once; reuse -> neutral failure; expired -> neutral failure; token for ticket X cannot affect ticket Y; the hash (not the token) is what is stored.
- Admin alert: creating a ticket produces an `InboxNotification(scope:'admin')` for each admin and none for normal users; an SLA tick at 75% creates exactly one alert even if the job runs twice.
- `priority` in a user-supplied create/PATCH body is ignored or rejected.
- Suspended user: normal routes fail, `/appeal` works and returns the same response for unknown emails.

Acceptance B1: all green + `scripts/smoke/b1.sh` walks: create ticket -> user comment blocked -> admin reply -> user reply -> user blocked -> admin resolve -> user reopen -> admin close -> user comment blocked.

---

## 5. PHASE B2: ROUTINE AND NOTICE BOARD

Prefix `/api/routines`, all routes group-scoped with the existing membership gate (404-masked for outsiders). Roles: any member reads, creates notes, claims tasks, requests swaps; `manager+` manages rosters, menus, reassign, pins, archives others' notes; `auditor` read-only.

### 5.1 Models

- `Roster`: `groupId`, `type: bazar|cleaning|cooking|custom`, `title`, `areas[]` (cleaning), `rotation: { mode: 'round_robin'|'weekly_template'|'fair'|'manual', memberOrder[membershipId], weeklyTemplate: { sat..fri -> membershipId[] }, daysOfWeek[] }`, `skipWhenAbsent`, `weekStartsOn` (default `sat`), `horizonDays` (default 30, max 90), `state: draft|published|archived`, `revision`. Unique `(groupId, title)`.
- `DutyAssignment`: `groupId`, `rosterId`, `taskKey`, `localDate` (`YYYY-MM-DD` Dhaka), `membershipId`, `status: scheduled|done|missed|swapped|skipped|cancelled`, `doneAt?`, `doneNote?` (<=200), `linkedExpenseId?`, `origin: generated|manual|swap|reassign`. **Unique `(rosterId, taskKey, localDate)`**; indexes `(groupId, localDate)`, `(membershipId, localDate)`.
- `SwapRequest`: `assignmentId`, `fromMembershipId`, `toMembershipId|null`, `status: pending|accepted|declined|cancelled|expired`, `reason?`, `expiresAt` (TTL = the duty date end).
- `MenuPlan`: `groupId`, `weekStart`, `isTemplate`, `days[{ weekday, slots:{ breakfast[],lunch[],snacks[],dinner[] }, cookMembershipId?, estCostPoisha?, note? }]`. Item = `{ name <=60, qtyHint? <=30 }`; max 8 items per slot. Unique `(groupId, weekStart)`. A concrete week overrides the template.
- `Note`: `groupId`, `authorMembershipId`, `kind: note|announcement|handover|alert`, `title` (<=120), `body` (<=2000, plain text), `audience:{ type:'all'|'members'|'role', membershipIds[], roles[] }`, `pinned`, `validFrom`, `validUntil`, `absence?:{from,to}`, `tasks[{ _id, text<=200, assigneeMembershipId|null, dueDate?, status:'open'|'claimed'|'done', claimedBy?, doneBy?, doneAt? }]` (max 20), `readBy[{membershipId, at}]`, `state: active|archived|deleted`.

### 5.2 Pure rules (services/routineRules.js, no DB)

`generateAssignments({ roster, memberships, from, to, history, absentDays, now })` returns the list of `{ localDate, taskKey, membershipId }`. Rules:
- never generates dates before `today(now)`; never touches past dates
- eligible member = membership whose interval contains that date (reuse `isEligibleOn`)
- `round_robin`: walk `memberOrder`, continue from the member after the last assigned one in `history`
- `weekly_template`: weekday -> listed members (rotate if several)
- `fair`: pick the eligible member with the fewest **done** duties in the last 60 days; tie -> earlier position in `memberOrder`
- `skipWhenAbsent`: if a member has no consumed slot-state that day (all `confirmed_zero`), skip them for that day and pick the next eligible
- if nobody is eligible that day, emit nothing (and report the date in `warnings[]`)

`filterNotesForMember(notes, membership, now)`: applies `audience`, `state==='active'`, `validFrom <= today <= validUntil` (null = open ended), and the ex-member window.
`canClaimTask(note, task, membership)`, `canSwap(assignment, now)` (only future `scheduled` duties), `applyDeparture(assignments, membershipId, now)` -> future duties needing reassignment.

### 5.3 Endpoints

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/groups/:groupId/rosters` | create = draft |
| PATCH | `/groups/:groupId/rosters/:rosterId` | edit/archive; bumps revision |
| POST | `/groups/:groupId/rosters/:rosterId/publish` | state -> published and generate horizon |
| POST | `/groups/:groupId/rosters/:rosterId/generate` | `{from,to}` <= 90 days, idempotent |
| GET | `/groups/:groupId/duties` | `?from=&to=&type=&membershipId=&cursor=` |
| GET | `/groups/:groupId/duties/mine` | upcoming for me |
| POST | `/groups/:groupId/duties/:id/complete` | assignee or manager; body `{note?}` |
| POST | `/groups/:groupId/duties/:id/reassign` | manager, `{membershipId, reason}` |
| POST | `/groups/:groupId/duties/:id/swap-requests` | assignee, `{toMembershipId?}` |
| POST | `/groups/:groupId/swap-requests/:id/accept|decline|cancel` | accept creates a NEW assignment (`origin:'swap'`) and marks the old one `swapped` inside `withTransaction` |
| GET/PUT | `/groups/:groupId/menu/weeks/:weekStart` and `/menu/template` | PUT = manager |
| GET | `/groups/:groupId/menu/today` | merges concrete week over template |
| GET/POST | `/groups/:groupId/notes` | `?kind=&state=&cursor=` |
| PATCH/DELETE | `/groups/:groupId/notes/:noteId` | author or manager; DELETE is soft |
| POST | `/groups/:groupId/notes/:noteId/ack` | idempotent per member |
| POST | `/groups/:groupId/notes/:noteId/tasks/:taskId/claim|done` | atomic update (see tests) |
| GET | `/groups/:groupId/board/today` | `{ duties, menu, pinnedNotes, activeHandovers }` in one call |

Limits: a member may have <= 20 active notes; pinned notes per group <= 3 (`409 PIN_LIMIT`). Error codes: `ROSTER_NOT_PUBLISHED`, `DUTY_NOT_SWAPPABLE`, `TASK_ALREADY_CLAIMED` (409), `PIN_LIMIT` (409), `HORIZON_TOO_LONG` (422).
Audit: `roster.published`, `duty.reassigned`, `duty.swapped`, `menu.published`, `note.deleted`.
Realtime on `group:<id>`: `duty-updated`, `menu-updated`, `note-created`, `note-updated`.

### 5.4 Jobs (via `runJob`, timezone Asia/Dhaka)

- 01:00 `rosterHorizon`: extend every published roster to `horizonDays` ahead (idempotent).
- 20:00 and 07:00 `dutyReminders`: inbox `duty.reminder` (dedupe `duty:<assignmentId>:eve|day`) + outbox email if enabled in preferences; respect quiet hours.
- 00:10 `markMissed`: yesterday's `scheduled` -> `missed`; notify managers once.
- 00:20 `noteExpiry`: archive past `validUntil`; for handovers whose `absence.to` is yesterday and tasks still `open|claimed`, notify the author once.
- Departure hook in the membership depart flow: call `applyDeparture`, reassign each future duty to the next eligible member in rotation, notify managers (`duty.reassigned_auto`).
- Bazar completion helper: `complete` returns `{ suggestExpenseDraft: { date, categoryHint:'Bazar' } }` (the frontend uses it; the backend does not create the draft).

### 5.5 Tests (all required)

Unit, `tests/rosterGeneration.test.js` (fixed `now`, Dhaka dates):
- 3 members A,B,C, round-robin, 7 days from a Saturday -> `A B C A B C A`. Running generation again with the same inputs creates **zero** new rows; extending by 3 days continues `B C A`.
- Member B departs on day 3 -> days >= 3 contain no B; rotation continues with A,C only; days 1-2 unchanged.
- Member joined on day 4 is not assigned before day 4.
- `skipWhenAbsent`: A absent on day 1 -> day 1 goes to B; A is not skipped on day 2.
- `fair`: member with 0 done duties is chosen over one with 3; ties follow `memberOrder`.
- `weekly_template` Friday -> [C]; cleaning with 3 `areas` creates 3 `taskKey`s per day.
- Past dates are never generated; the Dhaka midnight boundary (23:59 +06 vs 00:01 +06) assigns the right civil day.
- No eligible members -> no rows and a `warnings` entry.

Unit, `tests/noteVisibility.test.js`:
- `audience:'members'` hides the note from others; `role` audience works; expired and archived hidden; future `validFrom` hidden.
- ex-member only sees notes created inside their interval.
- body containing `<script>` is stored as plain text and returned unchanged (never interpreted); over-length title/body/tasks rejected by Zod.

Integration, `tests/integration/routines.test.js`:
- Publishing a roster generates exactly `horizonDays` of assignments; re-publish is a no-op; unique index prevents duplicates even under two parallel `generate` calls.
- **Task claim race:** two members claim the same open task at the same time -> exactly one 200 and one `409 TASK_ALREADY_CLAIMED`.
- Swap accept: old assignment `swapped`, exactly one new `swap` assignment, both in one transaction; accepting twice -> second call fails safely; swapping a past or done duty -> `DUTY_NOT_SWAPPABLE`.
- Non-member gets 404 on every route; `auditor` gets 403 on every mutation; plain member gets 403 on roster publish/reassign.
- 4th pinned note -> `409 PIN_LIMIT`.
- `board/today` returns today's duties, the merged menu (concrete week overrides template), pinned notes and only handovers whose window contains today.
- `markMissed` flips yesterday's duties once and notifies managers once even if run twice.
- `dutyReminders` creates one inbox row per assignment and per slot (eve/day) even if run twice; quiet hours suppress email but not the inbox row.
- Soft-deleted note disappears from the feed but its audit event exists.

Acceptance B2: green + `scripts/smoke/b2.sh` creates a roster, publishes, lists duties, swaps one, posts a handover with 2 tasks, claims one, and reads `board/today`.

---

## 6. PHASE B3: SECURITY HARDENING

### B3.1 InviteCode
Model `InviteCode { groupId, codeHash (sha256 of code+pepper from env), prefix (first 4 chars), expiresAt (default INVITE_DEFAULT_TTL_DAYS=7), maxUses (default 20), usedCount, revokedAt?, createdBy }`, unique `codeHash`.
- Create/regenerate: revoke all previous active codes for the group, store the new hash, return the **plaintext once** in the response `{ code, inviteLink, expiresAt, maxUses }`. `GET /code/:groupId` now returns metadata only `{ prefix, expiresAt, usesLeft, active }`.
- `joinByCode`: hash input, find active code, atomic `findOneAndUpdate({ codeHash, revokedAt:null, expiresAt:{$gt:now}, $expr:{$lt:['$usedCount','$maxUses']} }, { $inc:{usedCount:1} })`. Any failure returns the same generic message.
- Keep legacy `MessGroup.code` working through a one-time migration script that hashes existing codes (`scripts/migrateInviteCodes.js`, idempotent).
- Limiter on `/join-by-code`: 10 per 15 min per IP and 20 per hour per user; after 5 consecutive failures, lock the user for 15 min with exponential growth.

Tests: expired, revoked, max-uses (two parallel joins on the last slot -> exactly one succeeds), regenerate kills old code, plaintext never stored (assert DB value != code), limiter returns 429 after the threshold, wrong and expired codes produce identical responses.

### B3.2 2FA (TOTP)
`User.twoFactor { secretEnc (AES-256-GCM with TWO_FA_ENC_KEY), enabledAt?, recoveryCodesHash[] }`. Endpoints under `/api/users/2fa`: `POST /setup` (returns otpauth URI + QR data URI), `POST /verify` (enables, returns 8 recovery codes once), `POST /disable` (needs password + code), login step-up: when 2FA is enabled, login returns `{ twoFactorRequired:true, challengeToken }` (short-lived, single purpose JWT) and `POST /login/2fa { challengeToken, code|recoveryCode }` issues the real session. Access tokens carry `amr:['pwd','otp']`.
Platform admin routes require `amr` containing `otp`; otherwise the generic **404**. Window = +-1 step; reject code reuse within the same step.
Tests: valid code, off-by-one step accepted, two steps off rejected, replayed code rejected, recovery code works once, admin without 2FA gets 404 on `/api/admin/*`, admin with 2FA gets 200, secret is encrypted at rest, challenge token cannot be used as an access token.

### B3.3 SecurityEvent + anomaly sweep
`SecurityEvent { userId, type, ip, ua, meta, createdAt (TTL 90d) }`. Record: `login.new_device`, `login.failed`, `refresh.reuse` (hook the existing detection), `2fa.failed`, `join.failed`, `device.burst`. Job `anomalySweep` every 15 min: more than 5 `login.failed` for one user in 10 min, or more than 3 new devices in 1 hour -> `InboxNotification` for the user and admins + email "new sign-in". Dedupe per user per hour.
Tests: events written on each trigger; sweep raises one alert per condition per hour even if run twice; TTL index exists.

### B3.4 Headers, minimisation, retention, consent
- Helmet CSP (`default-src 'self'`; `img-src 'self' data: https://res.cloudinary.com`; `connect-src 'self'` + `FRONTEND_URL`; `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS in production. Test: response headers present.
- `publicProfile()` applied to **every** populate of User in group payloads. Regression test `tests/privacyPayload.test.js`: serialise group detail, memberships, notes, duties, support thread (member view) and assert no key named `email`, `phone`, `password`, `refreshToken` anywhere in the JSON (recursive walk).
- Retention job weekly: anonymise tickets closed > 18 months (subject/body -> "[removed]", keep counts), archive AuditEvents > 24 months. Test with fixed `now`.
- Consent timestamps on User: `termsAcceptedAt`, `privacyAcceptedAt`, `supportContextConsentAt`, `emailNotificationsConsentAt`; set on register and on toggle.
- Socket handshake: reject `?token=` in the query string; accept cookie or `auth.token` only.
- `Cache-Control: no-store` on authenticated JSON; changing password revokes all other sessions; changing email requires re-verification.
- Write `docs/RUNBOOK_BACKUP.md` (nightly dump, encrypted off-site copy, quarterly restore drill, post-restore check = accounting-equation endpoint healthy).

Acceptance B3: all green + `scripts/smoke/b3.sh` (create code, join, regenerate, old code fails, 2FA enrol, admin 404 before/200 after).

---

## 7. PHASE B4: COOKIE-ONLY AUTH (backend side)

Goal: the web app never sees a token. Non-browser clients keep working.

- Cookies: `mm_at` (access, `HttpOnly; Secure(prod); SameSite=Strict(prod)/Lax(dev); Path=/`), `mm_rt` (refresh, same flags, path `/api/users` plus the BFF refresh path from `BFF_REFRESH_PATH` env), `mm_csrf` (readable, random).
- `middleware/auth.js`: read the access token from `mm_at`, fall back to `x-auth-token`. Everything else (suspension check, roles) unchanged.
- When the request has header `X-Client: web`: register/login/refresh/google callback set the three cookies and **omit** `accessToken`/`refreshToken` from the JSON body (return `{ user }`). Without the header, behaviour is unchanged.
- CSRF: for cookie-authenticated mutating requests, require `x-csrf-token === mm_csrf` **and** the existing Origin check. Bearer-header clients skip it.
- Logout clears all three cookies and revokes the session family.
- Socket.IO handshake reads `mm_at` from the cookie header (with CORS credentials) as well.

Tests (integration, supertest with a cookie jar):
- login with `X-Client: web` -> three `Set-Cookie`, flags correct, body has no tokens; without the header body still has tokens (back-compat).
- request with only `mm_at` is authenticated; tampered cookie -> 401; suspended user -> 403/401 as today.
- POST without `x-csrf-token` while using cookies -> 403; with the correct token -> 200; Bearer clients unaffected.
- refresh rotation works through the cookie; replaying an old `mm_rt` revokes the family (existing behaviour kept).
- logout clears cookies; subsequent request -> 401.
- socket connects with the cookie and joins `user:<id>`; connection with `?token=` is rejected.

Acceptance B4: all green; `scripts/smoke/b4.sh` proves no token appears in a web-style login response.

---

## 8. FINAL VERIFICATION (run at the very end)

1. `npm test` and `npm run test:integration` -> 0 failures. Report the new totals.
2. `npm audit --omit=dev` -> no high/critical.
3. Start the server (`ENABLE_SCHEDULER=true`) and run every `scripts/smoke/*.sh`; paste the PASS/FAIL summary.
4. Grep checks: no `console.log` in `Server/` (excluding scripts/tests); no `localStorage`; no new `float` money; every new router is mounted in `index.js` behind `auth`.
5. Confirm indexes: write a tiny script `scripts/checkIndexes.js` that connects and asserts every index listed in this prompt exists (including TTL indexes). Run it.
6. Update `readme.md` (endpoint tables, env vars: `SUPPORT_STRICT_TURNS, SUPPORT_SLA_NORMAL_HOURS, SUPPORT_SLA_URGENT_HOURS, SUPPORT_AUTOCLOSE_HOURS, TWO_FA_ENC_KEY, INVITE_DEFAULT_TTL_DAYS, ENABLE_SCHEDULER, BFF_REFRESH_PATH, COOKIE_DOMAIN`) and tick the roadmap.

## 9. DEFINITION OF DONE (per task)

- Test written first or together with the code, and passing; full `npm test` still green.
- Rule logic lives in a pure, exported function with unit tests; controller is thin.
- Zod validation, role gate, 404-masking, audit event, idempotency (where creating) all present.
- Indexes and TTLs created; race-prone operations use atomic updates or unique indexes (never "read then write").
- Error responses carry a `code` from the list above.
- `TODO_BACKEND.md` updated.

## 10. START NOW

1. If `Server/TODO_BACKEND.md` does not exist, create it with one task per bullet in sections 3-7 (split anything larger than ~3 files), then begin **B0.1**.
2. Stop and ask me only if a rule here conflicts with existing code in a way that would break current tests.
