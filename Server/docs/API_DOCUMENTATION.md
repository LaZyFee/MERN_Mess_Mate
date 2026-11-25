# MealMate API integration reference

Each operation below includes its full Express path. Substitute IDs with 24-character MongoDB ObjectIds and months with YYYY-MM. Guards execute in the order shown. An empty guard list denotes a public route. Legacy admin means MessGroup.admin. The v2 minimum-role order is member, auditor, treasurer, manager, owner. Controller-specific ownership and lifecycle checks can further restrict access.

**Role semantics (verified in `middleware/roles.js`):**

- `requireGroupRoleV2(min)` ranks roles `member(0) < auditor(1) < treasurer(2) < manager(3) < owner(4)`; a higher rank always satisfies a lower minimum.
- **Auditor is read-only everywhere.** Any non-`GET/HEAD/OPTIONS` request from a user whose effective role is `auditor` is refused with `403 { msg: 'Auditor access is read-only' }` â€” in every group module, not only routines.
- `requireGroupRole('admin'|'member')` (no `V2`) is the **legacy** guard: it reads the embedded `MessGroup.members[]`/`admin` arrays. Legacy admin satisfies both.
- A valid membership row whose `MessGroup` was deleted yields `404 { msg: 'Group not found' }`, not a role error.
- The platform-admin plane (`/api/admin*`) uses a different guard (`requirePlatformAdmin` + 2FA) and is entirely separate from group roles.

Use application/json unless a multipart field or download is shown. Send X-Client: web on all web authentication calls. Registration (201), login, refresh and successful OTP verification set mm_at (HttpOnly, /), refreshToken (HttpOnly, /api) and mm_csrf (readable, /). Successful web JSON contains user with id, username, email, phone, profilePic and isVerified. Non-web callers can receive token fields. For cookie mutations copy mm_csrf into x-csrf-token. Preserve each Set-Cookie separately in the BFF. Access lasts one hour and refresh seven days. Retry refresh once per request chain. Logout clears cookies and the stored refresh hash. Issued access JWTs can survive logout until expiry.

**The refresh cookie is named `refreshToken`, not `mm_rt`.** There is no `mm_rt` cookie anywhere in the backend â€” code that looks for one will always see a logged-out user. Both `mm_at` and `refreshToken` are HttpOnly and therefore unreadable from JavaScript; send requests with credentials so the browser attaches them.

**CORS note:** the backend sends an explicit `Access-Control-Allow-Headers` allowlist (`Content-Type`, `Authorization`, `x-auth-token`, `x-csrf-token`, `x-client`, `Idempotency-Key`, `X-Admin-Key`). Any new custom request header must be added there or the browser preflight will block the call.

On routes marked idempotent, send an optional Idempotency-Key for each logical mutation, keep it for retries and use a fresh key for changed input. An in-flight request or mismatched replay can return 409. A saved response replay adds __idempotentReplay. Authentication can return 401, group restrictions 403, concealed administration 404, validation 400 with {msg, errors:[{field,message}]}, and rate limits 429. The global handler returns {msg:"Server error"}. Paginated and unpaginated envelopes differ by route. Preserve a successful empty list, distinguish denied access from empty state and retain unsent form values on conflicts.

Request schema names below resolve to the schema appendix. The appendix preserves Zod types, defaults, enums and bounds. In response shapes, unquoted identifiers denote controller values, including model documents. Status values shown are explicit controller branches. Helpers and persistence can add further errors. Binary responses are streamed.


## Authentication and onboarding workflows

1. Register with POST /api/users/register, for example {"username":"Nila","email":"nila@example.com","password":"ExamplePass71"}. Web success is 201 with a user object and three cookies. Login uses email and password at POST /api/users/login. A typical successful body is {"user":{"id":"65a000000000000000000001","username":"Nila","email":"nila@example.com","phone":"","profilePic":"","isVerified":false}}. Forgot-password returns the same message for unknown accounts. Reset uses the token from the email link.
2. An enrolled account receives twoFactorRequired and challengeToken after password login. Submit {"challengeToken":"<issued challenge>","code":"123456"} to POST /api/users/login/2fa within five minutes. Each attempt consumes its challenge. Restart password login after an invalid attempt. To enroll, POST /api/users/2fa/setup, provision the returned otpauthUrl, POST /api/users/2fa/verify with the first six-digit code and display recovery codes once. Disable requires password and OTP or recovery code.
3. Start Google sign-in with a top-level navigation to GET /api/users/auth/google. Passport stores state in the temporary session. Register /api/users/auth/google/callback at the externally reachable backend origin. The callback sets auth cookies and redirects to the frontend /login/success route. Keep the handshake and callback on a compatible origin. Google users with OTP enabled currently return to /login for credential step-up. A Google-only OTP continuation remains open.
4. On 401, call POST /api/users/refresh with the scoped cookie, CSRF header and web-client header. Replace all rotated cookies before retry. Logout through POST /api/users/logout. The device list and DELETE operations live under /api/sessions/users/sessions. Those routes operate on Session rows. Login and refresh currently use the separate User refresh hash. An empty device list cannot establish that all devices are signed out.
5. POST /api/messgroups/create, then GET /api/messgroups/my-groups. For moderated admission send a join request and have the legacy admin approve the user. For time-limited invitations the legacy group admin calls POST /api/invite/codes with groupId, optionally ttlDays and maxUses. Retain the plaintext from that response for sharing. Read metadata later from GET /api/invite/codes/:groupId. Creating another code revokes prior codes. Authenticated joiners submit code and groupId to POST /api/invite/join-by-code and refresh their groups. Some invalid joins receive a neutral 200. Confirm membership from the group list.
6. Use the effective-dated membership endpoints for placeholders, role changes and departure. User IDs identify accounts. Membership IDs identify intervals, balances, beneficiaries and duty assignees. Read the active list before populating a selector.

## Accounting and household workflows

| Task | Request sequence and expected UI behavior |
|---|---|
| Meals and guests | Read configured slots. Submit a daily entry with date and slots, for example {"date":"2026-11-24","slots":{"lunch":{"state":"consumed","portionSubunits":500},"dinner":{"state":"confirmed_zero","portionSubunits":0}}}. Missing/unknown slots can block closing. Admins preview then apply bulk entries or absence ranges. Guests use a separate guests route, for example {"guestName":"Rafi","slot":"dinner","portionSubunits":1000,"poolMode":"individual"}. Individual guests count toward the host for displayed units. Universal guests enter the shared pool. |
| Expense lifecycle | Fetch group categories. POST an expense draft with date, costPeriod and lines, for example {"date":"2026-11-24","costPeriod":"2026-11","lines":[{"categoryId":"65a000000000000000000012","amount":12550,"splitMode":"equal_all"}]}. The amount is à§³125.50. Use the returned expense ID to submit. Treasurer or higher approves or rejects submitted records. Approval allocates lines and posts a balanced journal. A reversal preserves provenance. Reload expenses and balances after posting. Verify actual payer attribution before production use. |
| Money and funds | Load funds and active memberships. Submit a contribution with {"kind":"contribution","amount":50000,"fromMember":"65a000000000000000000013","toAccount":"65a000000000000000000014","method":"cash"}. Treasurer confirms to post, rejects submitted entries or reverses a confirmed transaction. Fetch the member balance and fund list again. Owner controls custody changes. |
| Reconcile and track assets | Treasurer selects a fund and posts accountId, actualBalance in poisha and optional asOf. Show the returned discrepancy and accounting equation. Resolve using the recorded resolution and explanation. Refundable asset purchases and refund records have separate assets endpoints. |
| Month review | Read period and preview. List unresolved meals, submitted expenses and money separately. The checklist currently returns journal balance and period editability. Manager begins review or returns to open. Owner posts finalize with the displayed expectedRevision and a stable idempotency key. On 409 refetch before prompting again. A 422 can identify the first unresolved slot as text. |
| Corrections and history | The periods correct route records an audit marker. To supersede a finalized statement, owner confirms a new finalization with reason. GET statements for the month returns statements and current. Retrieve older immutable versions by statement ID. Avoid automatic finalization when displaying history. |
| Recurring expenses and policies | Load effective policy versions before rendering weights. Owner publishes policies. Treasurer creates or updates a recurring rule, generates the selected month and reviews the resulting expense draft using the ordinary approval workflow. |
| Receipts | POST multipart/form-data with file and optional targetType/targetId to the group attachment upload. Supported types are JPEG, PNG, WebP and PDF up to 10 MiB. Let the HTTP client set the multipart boundary. GET the returned attachment URL with credentials. Cloudinary downloads redirect, legacy files stream. Scanning may return pending. |
| Disputes | Select an expense, money transaction or statement item in the current group, create the dispute, load the conversation, respond and have a manager resolve it. Keep the original financial entry visible alongside the resolution. |
| Support | Create a ticket using a stable key. List personal tickets, then load the thread and its permissions.canComment. Admins reply in the hidden support area. Internal notes stay out of the user thread. Resolve before admin closure. User can reopen a resolved ticket within seven days. Rating and single-use email actions have separate routes. |
| Inbox and realtime | Fetch unread count and feed, page by cursor, then mark selected IDs or all read. Save preferences separately. Connect Socket.IO with credentials, join the current group, leave on navigation and reconnect after refresh. Treat an inbox-new event as a signal to update the user feed. Group outbox delivery states are independent of inbox read state. |
| Routines | A manager creates a roster with rotation, publishes it and reads generated duties. Members mark assigned work done, request swaps and respond. Refresh the duty and swap state after acceptance. Board/today aggregates duties, menus, pinned notes and handovers. Role and membership visibility still apply to note detail. |
| Shopping and stock | Add and check items on the open shopping list. For conversion, select a group category and a positive price for each checked item. A successful conversion returns the draft expense and closed list. Review that draft before submitting. Inventory refills use the item ID and positive quantity and return the updated stock. |
| Polls | Create an expiring question with 2â€“6 options. Submit a zero-based optionIndex to vote, then fetch results. A change of vote replaces the previous choice. Closing is available to the creator and the roles accepted by the controller (owner, manager, treasurer). |

The status endpoint GET / returns plain text "Meal Mate Server is running". It checks the HTTP process only.

## Authentication, users and two-factor verification

### POST `/api/users/2fa/setup`

setup. Middleware `auth`.

Request `body totpController.setupSchema`.

Responses

- `404 { msg: 'User not found' }`
- `409 { msg: '2FA already enabled', code: 'TWO_FA_ALREADY_ENABLED' }`
- `200 { secret, otpauthUrl, message: 'Scan the QR code, then verify with /verify to enable 2FA', }`

Example JSON body `{}`.

[Handler](controllers/totpController.js#L54)

### POST `/api/users/2fa/verify`

verify. Middleware `auth`.

Request `body totpController.verifySchema` Â· `body { code }`.

Responses

- `404 { msg: 'User not found' }`
- `409 { msg: '2FA already enabled', code: 'TWO_FA_ALREADY_ENABLED' }`
- `400 { msg: 'No pending setup â€” call /setup first', code: 'TWO_FA_NO_SETUP' }`
- `400 { msg: 'Invalid verification code', code: 'TWO_FA_INVALID_CODE' }`
- `200 { msg: '2FA enabled', recoveryCodes: codes }`

Example JSON body `{"code":"123456"}`.

[Handler](controllers/totpController.js#L80)

### POST `/api/users/2fa/disable`

disable. Middleware `auth`.

Request `body totpController.disableSchema` Â· `body { password, code }`.

Responses

- `404 { msg: 'User not found' }`
- `400 { msg: '2FA not enabled', code: 'TWO_FA_NOT_ENABLED' }`
- `403 { msg: 'Invalid password', code: 'TWO_FA_INVALID_PASSWORD' }`
- `400 { msg: 'Invalid code', code: 'TWO_FA_INVALID_CODE' }`
- `200 { msg: '2FA disabled' }`

Example JSON body `{"password":"ExamplePass71","code":"123456"}`.

[Handler](controllers/totpController.js#L116)

### POST `/api/users/login/2fa-challenge`

login Challenge. Public.

Request `body schemas.loginSchema` Â· `body { email, password }`.

Responses

- `400 { msg: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }`
- `403 { msg: 'Account suspended' }`
- `200 { twoFactorRequired: true, challengeToken: challengeId, msg: '2FA verification required', }`

See the cookie and user envelope in Authentication below.

Example JSON body `{"email":"nila@example.com","password":"ExamplePass71"}`.

[Handler](controllers/totpController.js#L158)

### POST `/api/users/login/2fa`

login2fa. Public.

Request `body totpController.login2faSchema` Â· `body { challengeToken, code }`.

Responses

- `403 { msg: 'Invalid or expired challenge', code: 'TWO_FA_INVALID_CHALLENGE' }`
- `403 { msg: '2FA not enabled for this user', code: 'TWO_FA_NOT_ENABLED' }`
- `400 { msg: 'Invalid verification code', code: 'TWO_FA_INVALID_CODE' }`

See the cookie and user envelope in Authentication below.

Example JSON body `{"challengeToken":"issued-challenge-here","code":"123456"}`.

[Handler](controllers/totpController.js#L183)

### POST `/api/users/register`

register. Public.

Request `body schemas.registerSchema` Â· `body { username, email, password, phone }` Â· `body whatsapp`.

Responses

- `400 { msg: 'User already exists' }`

See the cookie and user envelope in Authentication below.

Example JSON body `{"username":"Nila","email":"nila@example.com","password":"ExamplePass71"}`.

[Handler](controllers/userController.js#L55)

### POST `/api/users/login`

login. Public.

Request `body schemas.loginSchema` Â· `body { email, password }`.

Responses

- `400 invalid`
- `403 { msg: 'Account suspended' }`
- `200 { twoFactorRequired: true, challengeToken: challengeId, msg: '2FA verification required', }`

See the cookie and user envelope in Authentication below.

Example JSON body `{"email":"nila@example.com","password":"ExamplePass71"}`.

[Handler](controllers/userController.js#L94)

### POST `/api/users/refresh`

refresh. Public.

Responses

- `400 { msg: 'Refresh token required' }`
- `401 { msg: 'Invalid or expired refresh token' }`
- `403 { msg: 'Account suspended' }`

See the cookie and user envelope in Authentication below.

[Handler](controllers/userController.js#L127)

### POST `/api/users/logout`

logout. Public.

Responses

- `200 { msg: 'Logged out' }`

[Handler](controllers/userController.js#L144)

### POST `/api/users/forgot-password`

forgot Password. Public.

Request `body schemas.forgotPasswordSchema` Â· `body email`.

Responses

- `200 { msg: 'If that email exists, a reset link has been sent' }`

Example JSON body `{"email":"nila@example.com"}`.

[Handler](controllers/userController.js#L230)

### POST `/api/users/reset-password`

reset Password. Public.

Request `body schemas.resetPasswordSchema` Â· `body { token, password }`.

Responses

- `400 { msg: 'Invalid or expired reset token' }`
- `200 { msg: 'Password reset successful' }`

Example JSON body `{"token":"Weekly bazar","password":"ExamplePass71"}`.

[Handler](controllers/userController.js#L251)

### GET `/api/users/verify-email/:token`

verify Email. Public.

Responses

- `400 { msg: 'Invalid verification token' }`
- `200 { msg: 'Email verified' }`

[Handler](controllers/userController.js#L278)

### GET `/api/users/auth/google`

Google OAuth redirect. Middleware `passport.authenticate('google', { scope: ['profile', 'email'] })`.

[Handler](routes/userRoutes.js#L27)

### GET `/api/users/auth/google/callback`

google Auth. Middleware `passport.authenticate('google', { failureRedirect: '${process.env.FRONTEND_URL}/login' })`.

Responses

- `403 { msg: 'Account suspended' }`
- `302 frontend + '/login'`
- `302 frontend + '/login/success'`

[Handler](controllers/userController.js#L347)

### GET `/api/users/profile`

get Profile. Middleware `auth`.

Responses

- `404 { msg: 'User not found' }`
- `200 user`

[Handler](controllers/userController.js#L219)

### GET `/api/users/groups/:groupId/members`

get Group Members Directory. Middleware `auth`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 { members: users }`

[Handler](controllers/userController.js#L197)

### PUT `/api/users/profile`

update Profile. Middleware `auth`.

Request `body schemas.updateProfileSchema` Â· `body k`.

Responses

- `400 { msg: 'Nothing to update' }`
- `200 { msg: 'Profile updated', user }`

Example JSON body `{"username":"Nila"}`.

[Handler](controllers/userController.js#L173)

### POST `/api/users/change-password`

change Password. Middleware `auth`.

Request `body schemas.changePasswordSchema` Â· `body currentPassword` Â· `body newPassword`.

Responses

- `400 { msg: 'Current password is incorrect' }`
- `200 { msg: 'Password changed' }`

Example JSON body `{"currentPassword":"ExamplePass71","newPassword":"ExamplePass71"}`.

[Handler](controllers/userController.js#L294)

### POST `/api/users/profile-pic`

upload Profile Pic. Middleware `auth`, `upload.single('image')`.

Responses

- `400 { msg: 'No image uploaded (field name: "image")' }`
- `200 { msg: 'Profile picture updated', profilePic: result.secure_url, user }`

[Handler](controllers/userController.js#L317)

### GET `/api/users/download-my-data`

download My Data. Middleware `auth`.

Responses

- `200 exportData`

[Handler](controllers/userController.js#L365)


## Platform administration

### GET `/api/admin/overview`

get Overview. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Responses

- `200 { totals: { users, groups, membershipsActive, statements }, traffic: { newUsers24h, newUsers7d, verifiedUsers: verified, auditEvents24h: audits24h }, generatedAt: new Date(), }`

[Handler](controllers/adminController.js#L58)

### GET `/api/admin/traffic`

get Traffic. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `query days`.

Responses

- `200 { days, signups, auditActions: actions }`

[Handler](controllers/adminController.js#L84)

### GET `/api/admin/audit`

list Audit Events. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `query limit` Â· `query action` Â· `query groupId`.

Responses

- `200 { events }`

[Handler](controllers/adminController.js#L106)

### GET `/api/admin/users`

admin List Users. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `query limit` Â· `query q` Â· `query cursor`.

Responses

- `200 { items, nextCursor: hasMore ? items[items.length - 1]._id : null, hasMore }`

[Handler](controllers/adminController.js#L120)

### GET `/api/admin/users/:userId`

admin Get User. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `params z.object({ userId: objectId })`.

Responses

- `404 { msg: 'Not found' }`
- `200 { user: publicProfile(user), memberships }`

[Handler](controllers/adminController.js#L144)

### PATCH `/api/admin/users/:userId`

admin Update User. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `params z.object({ userId: objectId })` Â· `body { isVerified, suspended }`.

Responses

- `404 { msg: 'Not found' }`
- `200 { user }`

[Handler](controllers/adminController.js#L157)

### GET `/api/admin/jobs`

list Job Statuses. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Responses

- `200 { jobs }`

[Handler](controllers/jobController.js#L4)

### GET `/api/admin/groups`

admin List Groups. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `query limit` Â· `query q`.

Responses

- `200 { items: groups.map(g => ({ ...g, activeMembers: countMap.get(String(g._id)) || 0 })), }`

[Handler](controllers/adminController.js#L175)

### GET `/api/admin/groups/:groupId`

admin Get Group. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `params z.object({ groupId: objectId })`.

Responses

- `404 { msg: 'Not found' }`
- `200 { group, memberships }`

[Handler](controllers/adminController.js#L197)

### DELETE `/api/admin/groups/:groupId`

admin Delete Group. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR`.

Request `params z.object({ groupId: objectId })`.

Responses

- `404 { msg: 'Not found' }`
- `200 { msg: 'Group archived' }`

[Handler](controllers/adminController.js#L208)


## Mess groups, invitations and categories

### POST `/api/messgroups/create`

create Group. Middleware `auth`.

Request `body schemas.createGroupSchema` Â· `body name` Â· `body mealSlots` Â· `body mealWeights` Â· `body defaultMealSubunits` Â· `body defaultMealsEnabled`.

Responses

- `201 newGroup`

Example JSON body `{"name":"Weekly bazar"}`.

[Handler](controllers/messGroupController.js#L23)

### POST `/api/messgroups/join-by-code`

join By Code. Middleware `auth`.

Request `body schemas.joinByCodeSchema` Â· `body code`.

Responses

- `404 { msg: 'Invalid join code' }`
- `400 { msg: 'Already requested or member' }`
- `200 { msg: 'Request sent Ã¢â‚¬â€ waiting for admin approval' }`

[Handler](controllers/messGroupController.js#L374)

### POST `/api/messgroups/join-request/:groupId`

send Join Request. Middleware `auth`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `400 { msg: 'Already requested or member' }`
- `200 { msg: 'Request sent' }`

[Handler](controllers/messGroupController.js#L81)

### POST `/api/messgroups/approve/:groupId/:userId`

approve Request. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.groupAndUserParamSchema`.

Responses

- `400 { msg: 'No pending request from this user' }`
- `200 { msg: 'Approved' }`

[Handler](controllers/messGroupController.js#L97)

### POST `/api/messgroups/add-member/:groupId`

add Member. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.addMemberSchema` Â· `body { userId, role }`.

Responses

- `400 { msg: 'User already a member' }`
- `404 { msg: 'Target user not found' }`
- `200 { msg: 'Member added successfully' }`

Example JSON body `{"userId":"65a000000000000000000013"}`.

[Handler](controllers/messGroupController.js#L114)

### GET `/api/messgroups/code/:groupId`

get Join Code. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `200 { code: req.group.code, inviteLink: '${frontend}/join?code=${encodeURIComponent(req.group.code)}', }`

[Handler](controllers/messGroupController.js#L348)

### POST `/api/messgroups/regenerate-code/:groupId`

regenerate Code. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `200 { msg: 'Join code regenerated', code: req.group.code }`

[Handler](controllers/messGroupController.js#L360)

### POST `/api/messgroups/extras/:groupId`

add Extra. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.extraSchema` Â· `body name` Â· `body amount`.

Responses

- `201 req.group.extras`

Example JSON body `{"name":"Weekly bazar","amount":12550}`.

[Handler](controllers/messGroupController.js#L397)

### DELETE `/api/messgroups/extras/:groupId/:extraId`

remove Extra. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdAndExtraParamSchema`.

Responses

- `200 { msg: 'Extra removed', extras: req.group.extras }`

[Handler](controllers/messGroupController.js#L410)

### POST `/api/messgroups/invite/:groupId`

invite By Email. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.inviteSchema` Â· `body { email }`.

Responses

- `400 { msg: 'Valid email required' }`
- `200 { msg: 'Invitation sent' }`

Example JSON body `{"email":"nila@example.com"}`.

[Handler](controllers/messGroupController.js#L467)

### GET `/api/messgroups/my-groups`

get All Groups. Middleware `auth`.

Responses

- `200 sanitized`

[Handler](controllers/messGroupController.js#L158)

### GET `/api/messgroups/:groupId`

get Group By Id. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 { ...group, admin: sanitizedAdmin, members: sanitizedMembers, pendingRequests: sanitizedPending }`

[Handler](controllers/messGroupController.js#L137)

### GET `/api/messgroups/export/:groupId`

excel Export. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 end`

[Handler](controllers/messGroupController.js#L294)

### GET `/api/messgroups/pdf/:groupId`

pdf Export. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`

[Handler](controllers/messGroupController.js#L482)

### GET `/api/messgroups/extras/:groupId`

get Extras. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `200 req.group.extras || []`

[Handler](controllers/messGroupController.js#L422)

### DELETE `/api/messgroups/remove-member/:groupId/:userId`

remove Member. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.groupAndUserParamSchema`.

Responses

- `403 { msg: 'Only admin can remove other members' }`
- `400 { msg: 'Admin cannot be removed Ã¢â‚¬â€ transfer admin role first' }`
- `404 { msg: 'Not a member of this group' }`
- `200 { msg: isSelf ? 'You left the group' : 'Member removed' }`

[Handler](controllers/messGroupController.js#L432)

### POST `/api/messgroups/categories/:groupId/seed`

seed Categories Endpoint. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `201 { msg: 'Seeded ${seeded.length} preset categories', count: seeded.length }`

[Handler](controllers/expenseCategoryController.js#L47)

### POST `/api/messgroups/categories/:groupId`

create Category. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.categorySchema` Â· `body { name, icon, splitMode }`.

Responses

- `201 category`
- `400 { msg: 'Category "${name}" already exists in this group' }`

Example JSON body `{"name":"Weekly bazar"}`.

[Handler](controllers/expenseCategoryController.js#L58)

### GET `/api/messgroups/categories/:groupId`

get Categories. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `200 categories`

[Handler](controllers/expenseCategoryController.js#L87)

### PUT `/api/messgroups/categories/:groupId/:categoryId`

update Category. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdAndIdParamSchema` Â· `body categorySchema.partial()` Â· `body { name, icon, splitMode }`.

Responses

- `404 { msg: 'Category not found' }`
- `400 { msg: 'Category "${name}" already exists in this group' }`
- `200 category`

[Handler](controllers/expenseCategoryController.js#L100)

### DELETE `/api/messgroups/categories/:groupId/:categoryId`

delete Category. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdAndIdParamSchema`.

Responses

- `404 { msg: 'Category not found' }`
- `200 { msg: 'Category archived (historical summaries keep it)', category }`

[Handler](controllers/expenseCategoryController.js#L131)

### GET `/api/messgroups/feature-flags/:groupId`

get Feature Flags. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 { flags: group.featureFlags || {} }`

[Handler](controllers/messGroupController.js#L561)

### PATCH `/api/messgroups/feature-flags/:groupId`

update Feature Flags. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body messGroupController.flagSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 { flags: group.featureFlags }`

Example JSON body `{}`.

[Handler](controllers/messGroupController.js#L570)

### GET `/api/messgroups/audit-log/:groupId`

get Group Audit Log. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema` Â· `query { limit = 50, cursor }`.

Responses

- `403 { msg: 'Owner, manager, treasurer, or auditor role required' }`
- `200 { events: items, nextCursor, hasMore }`

[Handler](controllers/messGroupController.js#L587)


## Meals and guest meals

### POST `/api/meals/:groupId`

add Meal. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.mealEntrySchema` Â· `body date` Â· `body slots`.

Responses

- `422 { msg: '${name} is not enabled for this group' }`
- `201 record`

Example JSON body `{"slots":{"lunch":{"state":"consumed","portionSubunits":1000}}}`.

[Handler](controllers/mealController.js#L52)

### POST `/api/meals/:groupId/guests`

create Guest Meal. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.guestMealSchema` Â· `body date` Â· `body slot` Â· `body guestName` Â· `body portionSubunits` Â· `body poolMode` Â· `body eventPoolRef`.

Responses

- `422 { msg: '${req.body.slot} is not enabled for this group' }`
- `201 guest`

Example JSON body `{"slot":"dinner","portionSubunits":1000,"poolMode":"individual"}`.

[Handler](controllers/mealController.js#L101)

### GET `/api/meals/:groupId/guests`

list Guest Meals. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema` Â· `query from` Â· `query to`.

Responses

- `200 guests`

[Handler](controllers/mealController.js#L124)

### POST `/api/meals/:groupId/bulk/preview`

preview Bulk Meals. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.mealBulkSchema` Â· `body entries`.

Responses

- `200 { preview: await runBulk({ entries: req.body.entries, groupId: req.params.groupId, actorId: req.user.id, apply: false }) }`

Example JSON body `{"entries":[{"userId":"65a000000000000000000013","date":"2026-11-24","slots":{"lunch":{"state":"consumed","portionSubunits":1000}}}]}`.

[Handler](controllers/mealController.js#L161)

### POST `/api/meals/:groupId/bulk/apply`

apply Bulk Meals. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.mealBulkSchema` Â· `body entries`.

Responses

- `200 { applied: await runBulk({ entries: req.body.entries, groupId: req.params.groupId, actorId: req.user.id, apply: true }) }`

Example JSON body `{"entries":[{"userId":"65a000000000000000000013","date":"2026-11-24","slots":{"lunch":{"state":"consumed","portionSubunits":1000}}}]}`.

[Handler](controllers/mealController.js#L170)

### POST `/api/meals/:groupId/absence/preview`

preview Absence. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.absenceRangeSchema` Â· `body from` Â· `body to` Â· `body userId` Â· `body slots`.

Responses

- `200 { count: preview.length, preview }`

Example JSON body `{"from":"2026-11-24","to":"2026-11-24"}`.

[Handler](controllers/mealController.js#L189)

### POST `/api/meals/:groupId/absence/apply`

apply Absence. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.absenceRangeSchema` Â· `body from` Â· `body to` Â· `body userId` Â· `body slots`.

Responses

- `200 { affected, skippedDuties, handover }`

Example JSON body `{"from":"2026-11-24","to":"2026-11-24"}`.

[Handler](controllers/mealController.js#L209)

### PUT `/api/meals/entry/:id`

update Meal. Middleware `auth`.

Request `params schemas.idParamSchema` Â· `body mealEntrySchema.partial()` Â· `body date` Â· `body slots`.

Responses

- `404 { msg: 'Meal entry not found' }`
- `200 record`

[Handler](controllers/mealController.js#L81)

### GET `/api/meals/:groupId`

get Meals. Middleware `auth`, `requireGroupRole('member')`, `resolveHistoryWindow`.

Request `query schemas.mealFilterQuerySchema`.

Responses

- `200 meals`

[Handler](controllers/mealController.js#L333)

### GET `/api/meals/:groupId/headcount/tomorrow`

get Tomorrow Headcount. Middleware `auth`, `requireGroupRole('member')`.

Request `query schemas.headcountQuerySchema` Â· `query date` Â· `query includeGuests`.

Responses

- `200 { groupId, date: targetDate, slots, grandTotalPortionSubunits: grandTotal, grandTotalPortions: Number((grandTotal / 1000).toFixed(3)), generatedAt: new Date(), }`

[Handler](controllers/mealController.js#L364)

### GET `/api/meals/:groupId/:month`

get Meals By Month. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.monthParamSchema` Â· `query schemas.mealFilterQuerySchema`.

Responses

- `200 meals`

[Handler](controllers/mealController.js#L287)

### DELETE `/api/meals/entry/:id`

delete Meal. Middleware `auth`, `requireGroupRole('member')`, `allowSelfOrAdmin`.

Request `params schemas.idParamSchema`.

Responses

- `404 { msg: 'Meal entry not found' }`
- `403 { msg: 'Not allowed to delete this entry' }`
- `200 { msg: 'Meal entry deleted' }`

[Handler](controllers/mealController.js#L314)


## Expense lifecycle

### POST `/api/expenses/:groupId`

add Expense. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.expenseEntrySchema` Â· `body { amount, description, categoryId }` Â· `body date`.

Responses

- `400 { msg: 'Invalid categoryId for this group' }`
- `201 expense`

Example JSON body `{"amount":12550,"categoryId":"65a000000000000000000013"}`.

[Handler](controllers/expenseController.js#L341)

### PUT `/api/expenses/entry/:id`

update Expense. Middleware `auth`.

Request `params schemas.idParamSchema` Â· `body schemas.expenseUpdateSchema`.

Responses

- `404 { msg: 'Expense not found' }`
- `400 { msg: 'Invalid categoryId for this group' }`
- `200 expense`

Example JSON body `{}`.

[Handler](controllers/expenseController.js#L375)

### GET `/api/expenses/:groupId`

get Expenses. Middleware `auth`, `requireGroupRole('member')`, `resolveHistoryWindow`.

Request `query schemas.expenseFilterQuerySchema`.

Responses

- `200 expenses`

[Handler](controllers/expenseController.js#L401)

### GET `/api/expenses/:groupId/:month`

get Expenses By Month. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.monthParamSchema`.

Responses

- `200 expenses`

[Handler](controllers/expenseController.js#L429)

### DELETE `/api/expenses/entry/:id`

delete Expense. Middleware `auth`, `requireGroupRole('member')`, `allowSelfOrAdmin`.

Request `params schemas.idParamSchema`.

Responses

- `404 { msg: 'Expense not found' }`
- `403 { msg: 'Not allowed to delete this expense' }`
- `200 { msg: 'Expense deleted' }`

[Handler](controllers/expenseController.js#L443)

### GET `/api/expenses/groups/:groupId/expenses`

list Expenses. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query schemas.listExpenseQuery` Â· `query { cursor, limit }`.

Responses

- `200 { expenses: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore }`
- `200 { expenses }`

[Handler](controllers/expenseController.js#L308)

### POST `/api/expenses/groups/:groupId/expenses`

create Expense. Middleware `auth`, `requireGroupRoleV2('member')`, `idempotent('expense.create')`.

Request `params schemas.groupIdParam` Â· `body schemas.createExpenseSchema` Â· `body { supplierName = '', description = '', date, costPeriod, serviceStart = null, serviceEnd = null, lines = [], isPayable = false, receiptReference = '', }`.

Responses

- `400 { msg: 'At least one line item is required' }`
- `422 { msg: 'fixed_amounts lines require fixedAmounts[]' }`
- `422 { msg: 'Expense total must be positive' }`
- `201 { msg: 'Expense draft created', expense, duplicateWarnings: duplicateCheck.hasWarnings ? duplicateCheck.warnings : undefined, }`
- `err.status { msg: err.message }`

Example JSON body `{"date":"2026-11-24","costPeriod":"2026-11","lines":[{"categoryId":"65a000000000000000000013","amount":12550,"splitMode":"equal_all"}]}`.

[Handler](controllers/expenseController.js#L57)

### POST `/api/expenses/groups/:groupId/expenses/:expenseId/submit`

submit Expense. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.expenseIdParam`.

Responses

- `404 { msg: 'Expense not found' }`
- `409 { msg: 'Cannot submit from state: ${expense.status}' }`
- `200 { msg: 'Expense submitted for approval', expense, duplicateWarnings: duplicateCheck.hasWarnings ? duplicateCheck.warnings : undefined, }`

[Handler](controllers/expenseController.js#L124)

### POST `/api/expenses/groups/:groupId/expenses/:expenseId/approve`

approve Expense. Middleware `auth`, `requireGroupRoleV2('treasurer')`, `idempotent('expense.approve')`.

Runs inside a MongoDB transaction: allocation is computed and frozen, the balanced Journal is posted, `expense.revision` is incremented, and the period revision is bumped â€” all or nothing.

**Self-approval rule:** if the approver's own membership is in the active member pool (practically always true for a treasurer who is a resident), `reason` is **required**; without it the request fails with `422 { msg: 'Self-approval requires a reason (field: reason)' }` and nothing is written. Supply a short reason such as "own bazar receipt reviewed with the manager". The approval is recorded in the audit trail.

**Payer rule:** an expense with no `payers[]` is journaled against the approver's own membership. If the approver has no active membership either, approval fails with `422 { msg: 'No payer on this expense â€” record payers[] before approval' }`.

Request `params schemas.expenseIdParam` Â· `body schemas.reasonBody` (`reason` required when self-approving).

Responses

- `200 { msg: 'Expense approved and posted', expense, journalId, selfApproved }`
- `404 { msg: 'Expense not found' }`
- `409 { msg: 'Cannot approve from state: ${expense.status}' }`
- `409 { msg: 'Period is finalized; use the correction process' | 'Period is in review; ordinary edits are stopped' }`
- `422 { msg: 'Self-approval requires a reason (field: reason)' }`
- `422 { msg: 'No payer on this expense â€” record payers[] before approval' }`
- `422 { msg: 'Allocation charges must sum to the expense line total' | 'Fixed allocations (â€¦) must equal the line total (â€¦)' | â€¦ }` â€” allocation cannot be computed (e.g. `meal_units` line with zero meal units)

Example JSON body `{"reason":"Receipt and payment reviewed"}`.

[Handler](controllers/expenseController.js#L155)

### POST `/api/expenses/groups/:groupId/expenses/:expenseId/reject`

reject Expense. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.expenseIdParam` Â· `body schemas.reasonBody`.

Responses

- `404 { msg: 'Expense not found' }`
- `409 { msg: 'Cannot reject from state: ${expense.status}' }`
- `200 { msg: 'Expense rejected', expense }`

Example JSON body `{"reason":"Receipt and payment reviewed"}`.

[Handler](controllers/expenseController.js#L241)

### POST `/api/expenses/groups/:groupId/expenses/:expenseId/reverse`

reverse Expense. Middleware `auth`, `requireGroupRoleV2('treasurer')`, `idempotent('expense.reverse')`.

Request `params schemas.expenseIdParam` Â· `body schemas.reasonBody` Â· `body reason`.

Responses

- `200 { msg: 'Expense reversed (mirrored journal posted)', ...result }`
- `err.status { msg: err.message }`

Example JSON body `{"reason":"Receipt and payment reviewed"}`.

[Handler](controllers/expenseController.js#L259)



## Ledger dashboard and statistics

### GET `/api/stats/groups/:groupId/dashboard`

get V2Dashboard. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query month`.

Responses

- `200 { groupId, month, period: { state: periodState, revision, reviewStartedAt: period?.reviewStartedAt || null, finalizedAt: period?.finalizedAt || null, }, activeMembersCount: activeMemberships.length, expenses: { draft: { count: drafts.length, totalPoisha: draftTotal, totalTaka: (draftTotal / 100).toFixed(2) }, submitted: { count: submitted.length, totalPoisha: submittedTotal, totalTaka: (submittedTotal / 100).toFixed(2) }, approved: { count: approved.length, totalPoisha: approvedTotal, totalTaka: (approvedTotal / 100).toFixed(2) }, rejected: { count: rejected.length }, payablesOutstanding: { count: payables.length, totalPoisha: outstandingPayables, totalTaka: (outstandingPayables / 100).toFixed(2) }, }, money: { totalContributionsPoisha: totalContributions, totalContributionsTaka: (totalContributions / 100).toFixed(2), personalSupplierPaymentsPoisha: totalPersonalSupplierPayments, pendingTransactions: { count: pendingTx.length, totalPoisha: pendingMoneyTotal, totalTaka: (pendingMoneyTotal / 100).toFixed(2) }, }, funds: { totalAssetsPoisha: totalFundAssets, totalAssetsTaka: (totalFundAssets / 100).toFixed(2), accounts: fundBalances, }, settlement, }`

[Handler](controllers/statsController.js#L191)

### GET `/api/stats/:groupId`

get Stats. Middleware `auth`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `400 { msg: 'Validation failed', errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })), }`
- `200 { groupId, granularity: 'day'|'month'|'year', year, month, userId, totals: { totalMeals, totalMealSubunits, totalExpensesPoisha, totalExpensesTaka, mealRatePoisha, mealRateTaka }, mealsSeries, expenseSeries, categoryBreakdown, finalizedMonths, }`

[Handler](controllers/statsController.js#L45)

**Series semantics (verified in source):**

- `mealsSeries[].mealSubunits` is the **integer-thousandths** sum of `portionSubunits` over slots whose state is `consumed`; `mealsSeries[].meals` is the same value Ã· 1000 (e.g. `1.25`).
- `expenseSeries[].amountPoisha` / `amount` are the aggregate spend; `categoryBreakdown[].totalPoisha` is the canonical value (`total` remains in taka for legacy clients).
- Only expenses with `status: 'approved'` and `isReversal !== true` are counted.
- `bucket` is a day-of-month **number** when `month=` is supplied, otherwise a `"YYYY-MM"` string.
- `mealRatePoisha` = `round(totalExpensePoisha / totalMeals)` â€” 0 when there are no meal units.


## Memberships

### GET `/api/memberships/groups/:groupId/memberships`

list Memberships. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { memberships: rows, active }`

[Handler](controllers/membershipController.js#L11)

### GET `/api/memberships/groups/:groupId/memberships/active`

list Active. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query at`.

Responses

- `200 { memberships: await activeMemberships({ groupId: req.params.groupId, at }) }`

[Handler](controllers/membershipController.js#L135)

### GET `/api/memberships/groups/:groupId/memberships/month/:month`

list For Month. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.monthParam`.

Responses

- `200 { memberships: await membershipsInMonth({ groupId: req.params.groupId, month: req.params.month }) }`

[Handler](controllers/membershipController.js#L143)

### POST `/api/memberships/groups/:groupId/memberships`

create Membership. Middleware `auth`, `requireGroupRoleV2('manager')`, `idempotent('membership.create')`.

Request `params schemas.groupIdParam` Â· `body schemas.createMembershipSchema` Â· `body { userId = null, displayName, startDate, endDate = null, role = 'member', room = '', weight = 1, isPlaceholder = false, }`.

Responses

- `201 { msg: 'Membership created', membership }`
- `422 { msg: err.message }`

Example JSON body `{"displayName":"Nila","startDate":"2026-11-24"}`.

[Handler](controllers/membershipController.js#L21)

### PATCH `/api/memberships/groups/:groupId/memberships/:membershipId`

update Membership. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.groupIdParam` Â· `body { role, room, weight, endDate, displayName, linkUserId }` Â· `body reason`.

Responses

- `404 { msg: 'Membership not found' }`
- `200 { msg: 'Membership updated', membership }`

[Handler](controllers/membershipController.js#L62)

### POST `/api/memberships/groups/:groupId/memberships/:membershipId/depart`

depart Membership. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.groupIdParam` Â· `body at`.

Responses

- `404 { msg: 'Membership not found' }`
- `200 { msg: 'Departure recorded; account and balances preserved', membership }`

[Handler](controllers/membershipController.js#L106)


## Group policies

### GET `/api/policies/groups/:groupId/policies`

list Policies. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { policies }`

[Handler](controllers/policyController.js#L7)

### POST `/api/policies/groups/:groupId/policies`

publish Policy. Middleware `auth`, `requireGroupRoleV2('owner')`.

Request `params schemas.groupIdParam` Â· `body schemas.publishPolicySchema` Â· `body { effectiveFrom, mealWeights, allowedPortions, entryCutoffHour, currency, timezone, requireExpenseApproval, reviewGraceDays }`.

Responses

- `422 { msg: 'Policy can only take effect from the current or a future month' }`
- `201 { msg: 'Policy version published', policy }`

Example JSON body `{"effectiveFrom":"2026-11"}`.

[Handler](controllers/policyController.js#L15)


## Periods and review

### GET `/api/periods/groups/:groupId/periods`

list Periods. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { periods: await Period.find({ groupId: req.params.groupId }).sort({ month: -1 }).lean() }`

[Handler](controllers/periodController.js#L9)

### GET `/api/periods/groups/:groupId/periods/:month`

get Period. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.monthParam`.

Responses

- `200 { period }`

[Handler](controllers/periodController.js#L17)

### GET `/api/periods/groups/:groupId/periods/:month/preview`

preview Statement. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.monthParam`.

Responses

- `200 { month: req.params.month, totalMeals: draft.totalUnits, mealExpenses: draft.mealExpenses, otherExpenses: draft.otherExpenses, totalExpenses: draft.totalExpenses, mealRate: draft.mealRate, items, }`

[Handler](controllers/periodController.js#L26)

### GET `/api/periods/groups/:groupId/periods/:month/checklist`

close Checklist. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.monthParam`.

Responses

- `200 { accountingEquation: equation, checks: [ { name: 'journals_balanced', ok: equation.balanced }, { name: 'period_editable', ok: Boolean(period), state: period?.state || 'missing' }, ], }`

[Handler](controllers/periodController.js#L72)

### POST `/api/periods/groups/:groupId/periods/:month/begin-review`

start Review. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.monthParam`.

Responses

- `200 { msg: 'Review started', period }`
- `409 { msg: err.message }`

[Handler](controllers/periodController.js#L47)

### POST `/api/periods/groups/:groupId/periods/:month/return-to-open`

reopen Period. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.monthParam`.

Responses

- `200 { msg: 'Returned to open', period }`
- `409 { msg: err.message }`

[Handler](controllers/periodController.js#L58)

### POST `/api/periods/groups/:groupId/periods/:month/correct`

record Correction. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.monthParam` Â· `body schemas.correctionSchema`.

Responses

- `201 { msg: 'Correction recorded in audit trail' }`

Example JSON body `{}`.

[Handler](controllers/periodController.js#L87)


## Money, balances and fund accounts

### GET `/api/money/groups/:groupId/money`

list Transactions. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query schemas.listMoneyQuery` Â· `query { cursor, limit }`.

Responses

- `200 { transactions: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore }`
- `200 { transactions }`

[Handler](controllers/moneyController.js#L191)

### POST `/api/money/groups/:groupId/money`

submit Transaction. Middleware `auth`, `requireGroupRoleV2('member')`, `idempotent('money.submit')`.

Request `params schemas.groupIdParam` Â· `body schemas.moneySchema` Â· `body { kind, amount, fromMember = null, toMember = null, fromAccount = null, toAccount = null, supplierName = '', method = 'cash', reference = '', paidAt, evidenceUrl = '', }`.

Responses

- `201 { msg: 'Transaction submitted â€” awaiting confirmation by receiver/treasurer', transaction: tx }`
- `400 { msg: err.message }`

Example JSON body `{"kind":"contribution","amount":12550,"fromMember":"65a000000000000000000013","toAccount":"65a000000000000000000014","method":"cash"}`.

[Handler](controllers/moneyController.js#L22)

### POST `/api/money/groups/:groupId/money/:txId/confirm`

confirm Transaction. Middleware `auth`, `requireGroupRoleV2('treasurer')`, `idempotent('money.confirm')`.

Request `params schemas.txIdParam`.

Responses

- `200 { msg: 'Transaction confirmed and posted to ledger', ...result }`
- `err.status { msg: err.message }`

[Handler](controllers/moneyController.js#L95)

### POST `/api/money/groups/:groupId/money/:txId/reject`

reject Transaction. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.txIdParam` Â· `body schemas.reasonBody`.

Responses

- `404 { msg: 'Transaction not found' }`
- `409 { msg: 'Only submitted transactions can be rejected' }`
- `200 { msg: 'Transaction rejected', transaction: tx }`

Example JSON body `{"reason":"Receipt and payment reviewed"}`.

[Handler](controllers/moneyController.js#L138)

### POST `/api/money/groups/:groupId/money/:txId/reverse`

reverse Transaction. Middleware `auth`, `requireGroupRoleV2('treasurer')`, `idempotent('money.reverse')`.

Request `params schemas.txIdParam` Â· `body schemas.reasonBody` Â· `body reason`.

Responses

- `200 { msg: 'Transaction reversed (mirrored journal posted)', ...result }`
- `err.status { msg: err.message }`

Example JSON body `{"reason":"Receipt and payment reviewed"}`.

[Handler](controllers/moneyController.js#L153)

### GET `/api/money/groups/:groupId/memberships/:membershipId/balance`

get Balance. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.balanceParam`.

Responses

- `200 { membershipId: req.params.membershipId, balancePoisha: balance, balanceTaka: (balance / 100).toFixed(2), meaning: balance > 0 ? 'group owes member' : balance < 0 ? 'member owes group' : 'settled', }`

[Handler](controllers/moneyController.js#L222)

### GET `/api/money/groups/:groupId/funds`

list Funds. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { funds: withBalances }`

[Handler](controllers/moneyController.js#L235)

### POST `/api/money/groups/:groupId/funds`

create Fund. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.groupIdParam` Â· `body schemas.fundSchema` Â· `body { name, kind, maskedIdentifier = '' }`.

Responses

- `201 { msg: 'Fund account created', fund }`

Example JSON body `{"name":"Weekly bazar","kind":"cash"}`.

[Handler](controllers/moneyController.js#L248)

### POST `/api/money/groups/:groupId/funds/:fundId/custodian`

change Custodian. Middleware `auth`, `requireGroupRoleV2('owner')`.

Request `params schemas.groupIdParam` Â· `body schemas.custodianSchema` Â· `body newCustodianId`.

Responses

- `404 { msg: 'Fund account not found' }`
- `200 { msg: 'Custody transferred (no income/expense created)', fund }`

Example JSON body `{"newCustodianId":"65a000000000000000000013"}`.

[Handler](controllers/moneyController.js#L264)


## Statements and finalization

### GET `/api/statements/groups/:groupId/statements`

list Statements. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { statements }`

[Handler](controllers/statementController.js#L85)

### GET `/api/statements/groups/:groupId/statements/id/:statementId`

get Statement By Id. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `404 { msg: 'Statement not found' }`
- `200 { statement, superseded: statement.state === 'superseded' }`

[Handler](controllers/statementController.js#L94)

### GET `/api/statements/groups/:groupId/statements/:month`

get Statement. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.monthParam`.

Responses

- `200 { statements, current: statements.find(s => s.state === 'current') || null }`

[Handler](controllers/statementController.js#L76)

### POST `/api/statements/groups/:groupId/statements/:month/finalize`

finalize. Middleware `auth`, `requireGroupRoleV2('owner')`, `idempotent('statement.finalize')`.

Request `params schemas.monthParam` Â· `body schemas.finalizeSchema`.

Responses

- `201 { msg: 'Statement v${statement.version} finalized; deliveries queued', statement }`
- `err.status { msg: err.message }`

Example JSON body `{"expectedRevision":4}`.

[Handler](controllers/statementController.js#L10)


## Recurring expenses

### GET `/api/recurring/groups/:groupId/recurring`

list Rules. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { rules: await RecurringRule.find({ groupId: req.params.groupId }).sort({ createdAt: -1 }).lean() }`

[Handler](controllers/recurringController.js#L11)

### POST `/api/recurring/groups/:groupId/recurring`

create Rule. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.groupIdParam` Â· `body schemas.recurringSchema` Â· `body name` Â· `body categoryId` Â· `body amount` Â· `body splitMode` Â· `body beneficiaries` Â· `body fixedAmounts` Â· `body weights` Â· `body supplierName` Â· `body dueDayOfMonth` Â· `body effectiveFrom` Â· `body effectiveTo`.

Responses

- `201 { msg: 'Recurring rule created', rule }`

Example JSON body `{"name":"Weekly bazar","amount":12550,"effectiveFrom":"2026-11"}`.

[Handler](controllers/recurringController.js#L18)

### POST `/api/recurring/groups/:groupId/recurring/generate-all`

generate All Drafts. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.groupIdParam`.

Responses

- `201 { msg: 'Generated ${generated.length} drafts for ${costPeriod}', generated }`
- `409 { msg: err.message }`

[Handler](controllers/recurringController.js#L115)

### PUT `/api/recurring/groups/:groupId/recurring/:ruleId`

update Rule. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.ruleIdParam` Â· `body k`.

Responses

- `404 { msg: 'Rule not found' }`
- `200 { msg: 'Rule updated', rule }`

[Handler](controllers/recurringController.js#L42)

### POST `/api/recurring/groups/:groupId/recurring/:ruleId/generate`

generate Draft. Middleware `auth`, `requireGroupRoleV2('treasurer')`, `idempotent('recurring.generate')`.

Request `params schemas.ruleIdParam` Â· `body schemas.generateSchema`.

Responses

- `400 { msg: 'costPeriod (YYYY-MM) required' }`
- `404 { msg: 'Rule not found' }`
- `409 { msg: 'Rule is inactive' }`
- `422 { msg: 'Cost period outside rule effective range' }`
- `409 { msg: 'Draft already generated for ${costPeriod}' }`
- `201 { msg: 'Draft generated for ${costPeriod}', expense: draft }`
- `409 { msg: err.message }`

Example JSON body `{"costPeriod":"2026-11"}`.

[Handler](controllers/recurringController.js#L56)


## Fund reconciliation

### GET `/api/reconciliation/groups/:groupId/reconciliations`

list Reconciliations. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query schemas.listReconciliationQuery`.

Responses

- `200 { reconciliations }`

[Handler](controllers/reconciliationController.js#L40)

### GET `/api/reconciliation/groups/:groupId/reconciliations/equation`

accounting Equation. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.groupIdParam`.

Responses

- `200 await getAccountingEquation({ groupId: req.params.groupId })`

[Handler](controllers/reconciliationController.js#L79)

### POST `/api/reconciliation/groups/:groupId/reconciliations`

create Reconciliation. Middleware `auth`, `requireGroupRoleV2('treasurer')`, `idempotent('reconciliation.create')`.

Request `params schemas.groupIdParam` Â· `body schemas.reconciliationSchema` Â· `body { accountId, asOf, actualBalance }`.

Responses

- `404 { msg: 'Fund account not found' }`
- `400 { msg: 'actualBalance must be integer poisha' }`
- `201 { msg: rec.variance === 0 ? 'Reconciled exactly' : 'Variance recorded â€” resolve before close', reconciliation: rec, }`

Example JSON body `{"accountId":"65a000000000000000000013","actualBalance":12550}`.

[Handler](controllers/reconciliationController.js#L10)

### POST `/api/reconciliation/groups/:groupId/reconciliations/:recId/resolve`

resolve Reconciliation. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.recIdParam` Â· `body schemas.resolveReconciliationSchema` Â· `body { resolution, explanation }`.

Responses

- `404 { msg: 'Reconciliation not found' }`
- `409 { msg: 'Already resolved' }`
- `400 { msg: 'resolution must be adjusted | accepted_shortage | found_cash | none' }`
- `200 { msg: 'Reconciliation resolved', reconciliation: rec }`

Example JSON body `{"resolution":"adjusted"}`.

[Handler](controllers/reconciliationController.js#L50)


## Disputes

### GET `/api/disputes/groups/:groupId/disputes`

list Disputes. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query schemas.disputeListQuery`.

Responses

- `200 { disputes }`

[Handler](controllers/disputeController.js#L24)

### POST `/api/disputes/groups/:groupId/disputes`

open Dispute. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `body schemas.disputeSchema` Â· `body { targetType, targetId, reason, statementId = null, membershipId = null }`.

Responses

- `400 { msg: 'targetType must be expense | money_transaction | statement_item' }`
- `201 { msg: 'Dispute opened', dispute }`

Example JSON body `{"targetType":"expense","targetId":"65a000000000000000000013","reason":"Weekly bazar"}`.

[Handler](controllers/disputeController.js#L8)

### POST `/api/disputes/groups/:groupId/disputes/:disputeId/respond`

respond To Dispute. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.disputeIdParam` Â· `body schemas.disputeRespondSchema` Â· `body text`.

Responses

- `404 { msg: 'Dispute not found' }`
- `400 { msg: 'Response text required' }`
- `200 { msg: 'Response recorded', dispute }`

Example JSON body `{"text":"Weekly bazar"}`.

[Handler](controllers/disputeController.js#L36)

### POST `/api/disputes/groups/:groupId/disputes/:disputeId/resolve`

resolve Dispute. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.disputeIdParam` Â· `body schemas.disputeResolveSchema`.

Responses

- `404 { msg: 'Dispute not found' }`
- `409 { msg: 'Dispute already closed' }`
- `200 { msg: 'Dispute closed', dispute }`

Example JSON body `{}`.

[Handler](controllers/disputeController.js#L48)


## Notifications and outbox

### GET `/api/notifications/whatsapp/webhook`

whatsapp Webhook Verify. Public.

Request `query 'hub.mode'` Â· `query 'hub.verify_token'` Â· `query 'hub.challenge'`.

Responses

- `200 challenge`
- `403 { msg: 'Webhook verification token mismatch' }`

[Handler](controllers/notificationController.js#L70)

### POST `/api/notifications/whatsapp/webhook`

whatsapp Webhook Receive. Public.

Responses

- `401 { msg: 'Invalid webhook signature' }`
- `200 { status: 'received' }`
- `200 { status: 'error_logged' }`

Provider requests require x-hub-signature-256 over the original JSON bytes. Missing configuration returns 503. An absent or invalid signature returns 401.

[Handler](controllers/notificationController.js#L85)

### PUT `/api/notifications/whatsapp/consent`

set Whatsapp Consent. Middleware `auth`.

Request `body { consent = true }`.

Responses

- `200 { msg: consent ? 'Opted in to WhatsApp notifications' : 'Opted out of WhatsApp notifications', user, }`

[Handler](controllers/notificationController.js#L117)

### GET `/api/notifications/groups/:groupId/notifications`

list Outbox. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam` Â· `query schemas.outboxQuery`.

Responses

- `200 { messages }`

[Handler](controllers/notificationController.js#L9)

### GET `/api/notifications/groups/:groupId/notifications/:messageId`

get Outbox Message. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.messageIdParam`.

Responses

- `404 { msg: 'Notification not found' }`
- `200 { message }`

[Handler](controllers/notificationController.js#L22)

### POST `/api/notifications/groups/:groupId/notifications/:messageId/resend`

resend. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.messageIdParam`.

Responses

- `404 { msg: 'Notification not found' }`
- `201 { msg: 'Resend queued (new delivery record)', message: copy }`

[Handler](controllers/notificationController.js#L31)

### POST `/api/notifications/groups/:groupId/notifications/manual-share`

manual Share Links. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params schemas.groupIdParam` Â· `body schemas.manualShareSchema` Â· `body { statementId }`.

Responses

- `200 { links }`

Example JSON body `{}`.

[Handler](controllers/notificationController.js#L47)


## Device sessions

### GET `/api/sessions/users/sessions`

get Sessions. Middleware `auth`.

Responses

- `200 { sessions }`

[Handler](controllers/sessionController.js#L7)

### DELETE `/api/sessions/users/sessions/:familyId`

revoke One. Middleware `auth`.

Request `params schemas.familyIdParam`.

Responses

- `404 { msg: 'Active session not found' }`
- `200 { msg: 'Session revoked' }`

[Handler](controllers/sessionController.js#L15)

### DELETE `/api/sessions/users/sessions`

revoke All. Middleware `auth`.

Request `body schemas.revokeAllSchema`.

Responses

- `200 { msg: '${count} session(s) revoked' }`

Example JSON body `{}`.

[Handler](controllers/sessionController.js#L25)


## Receipt attachments

### POST `/api/attachments/groups/:groupId/upload`

upload Attachment. Middleware `auth`, `requireGroupRoleV2('member')`, `receiptMulter.single('file')`.

Request `params schemas.groupIdParam` Â· `body { targetType = 'expense_receipt', targetId = null }`.

`targetType` enum: **`expense_receipt` | `payment_evidence` | `support`**. `targetId` is optional (links the file to that expense/transaction).

Responses

- `400 { msg: 'No file uploaded' }`
- `422 { msg: 'targetType must be one of: expense_receipt, payment_evidence, support' }`
- `400 { msg: 'File signature does not match claimed MIME type (rejected)' }`
- `400 { msg: 'File failed antivirus scan (rejected)' }`
- `201 { msg: 'Attachment uploaded to cloud storage, verified and scanned', scan: { scanned: scan.scanned, verdict: scan.verdict }, attachment: { id: attachment._id, originalName: attachment.originalName, mimeType: attachment.mimeType, size: attachment.size, sha256: attachment.sha256, scanStatus: attachment.scanStatus, url: '/api/attachments/groups/${groupId}/${attachment._id}', }, }`

[Handler](controllers/attachmentController.js#L47)

### GET `/api/attachments/groups/:groupId/:attachmentId`

download Attachment. Middleware `auth`, `requireGroupRoleV2('member')`.

**Authorization (not mere group membership):** the caller must be the uploader, hold `owner|manager|treasurer|auditor`, be the creator/legacy owner of the linked `expense_receipt`, or be the submitter of the linked `payment_evidence`. Everyone else â€” including ordinary members â€” receives the same `404 { msg: 'Attachment not found' }` so IDs cannot be probed.

Request `params schemas.groupIdParam`.

Responses

- `404 { msg: 'Attachment not found' }` â€” missing, other-group, or not authorized
- `302` redirect to a short-lived (1 h) signed receipt URL (`Cache-Control` is not set; the URL itself expires)
- `404 { msg: 'File no longer exists on storage' }` â€” legacy local-storage fallback only

[Handler](controllers/attachmentController.js#L141)


## Refundable assets

### GET `/api/assets/groups/:groupId`

list Assets. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params schemas.groupIdParam`.

Responses

- `200 { assets }`

[Handler](controllers/depositAssetController.js#L9)

### POST `/api/assets/groups/:groupId`

create Asset. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.groupIdParam` Â· `body { name, kind = 'landlord_deposit', initialAmount, fundingShares = [], custodianId = null, notes = '' }`.

Responses

- `400 { msg: 'name and positive initialAmount in poisha required' }`
- `400 { msg: 'fundingShares must include at least one member share' }`
- `422 { msg: 'Funding shares total (à§³${totalFunded / 100}) must equal initial amount (à§³${initialAmount / 100})' }`
- `201 { msg: 'Asset/deposit tracked successfully', asset }`

[Handler](controllers/depositAssetController.js#L18)

### POST `/api/assets/groups/:groupId/:assetId/refund`

record Asset Refund. Middleware `auth`, `requireGroupRoleV2('treasurer')`.

Request `params schemas.groupIdParam` Â· `body { membershipId, amount, note = '', moneyTransactionId = null }`.

Responses

- `404 { msg: 'Asset not found' }`
- `404 { msg: 'Member not found in asset funding shares' }`
- `422 { msg: 'Amount exceeds maximum remaining refundable share (à§³${maxRefundable / 100})' }`
- `200 { msg: 'Asset refund recorded', asset }`

[Handler](controllers/depositAssetController.js#L58)


## Inbox and preferences

### GET `/api/inbox`

list Inbox. Middleware `auth`.

Request `query inboxSchemas.inboxListQuery`.

Responses

- `200 { notifications: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore }`

[Handler](controllers/inboxController.js#L11)

### GET `/api/inbox/unread-count`

unread Count. Middleware `auth`.

Responses

- `200 { count }`

[Handler](controllers/inboxController.js#L29)

### POST `/api/inbox/read`

mark Read. Middleware `auth`.

Request `body inboxSchemas.inboxReadSchema` Â· `body { ids, all }`.

Responses

- `200 { msg: 'Marked read', count: result.modifiedCount }`

Example JSON body `{"all":true}`.

[Handler](controllers/inboxController.js#L37)

### GET `/api/inbox/preferences`

get Preferences. Middleware `auth`.

Responses

- `200 { preferences: mergePrefs(user?.notificationPrefs) }`

[Handler](controllers/inboxController.js#L53)

### PUT `/api/inbox/preferences`

update Preferences. Middleware `auth`.

Request `body inboxSchemas.inboxPrefsSchema`.

Responses

- `200 { msg: 'Preferences updated', preferences: mergePrefs(user.notificationPrefs) }`
- `400 { msg: 'Validation failed', errors: err.issues }`

Example JSON body `{}`.

[Handler](controllers/inboxController.js#L61)


## Personal support desk

### POST `/api/support/actions/:token`

public Action. Middleware `actionLimiter`.

Responses

- `200 NEUTRAL`
- `200 { msg: 'Action completed. Thank you.' }`

[Handler](controllers/supportController.js#L229)

### POST `/api/support/appeal`

appeal. Middleware `appealLimiter`.

Request `body supportSchemas.appealSchema` Â· `body { email, message, captchaToken }`.

Responses

- `200 NEUTRAL`

Example JSON body `{"email":"nila@example.com","message":"Weekly bazar"}`.

[Handler](controllers/supportController.js#L255)

### POST `/api/support/tickets`

create Ticket. Middleware `auth`, `idempotent('support.ticket.create')`.

Request `body supportSchemas.ticketCreateSchema` Â· `body { category, subject, body, groupId, attachContext, attachmentIds }`.

Responses

- `429 { msg: 'Too many open or recent tickets', code: 'TICKET_LIMIT' }`
- `201 { msg: 'Ticket created', ticket: { id: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status } }`

Example JSON body `{"category":"bug","subject":"Missing November receipt","body":"The receipt is missing from the expense detail."}`.

[Handler](controllers/supportController.js#L59)

### GET `/api/support/tickets`

list My Tickets. Middleware `auth`.

Request `query supportSchemas.ticketListQuery`.

Responses

- `200 { tickets: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore }`

[Handler](controllers/supportController.js#L110)

### GET `/api/support/tickets/:ticketId`

get Ticket Thread. Middleware `auth`.

Responses

- `200 { ticket, messages, permissions: permissionsFor(ticket), slaStage: slaStage(ticket) }`

[Handler](controllers/supportController.js#L124)

### POST `/api/support/tickets/:ticketId/messages`

add Message. Middleware `auth`, `messageLimiter`.

Request `body supportSchemas.ticketMessageSchema` Â· `body body` Â· `body attachmentIds`.

Responses

- `403 { msg: rule.reason, code: rule.code }`
- `429 { msg: 'Message limit reached for this ticket', code: 'TICKET_MESSAGE_LIMIT' }`
- `429 { msg: 'Too many messages, slow down', code: 'TICKET_MESSAGE_LIMIT' }`
- `409 { msg: 'Ticket state changed, retry', code: OPTIMISTIC.code }`
- `201 { msg: 'Message added', status: newStatus }`

Example JSON body `{"body":"Weekly bazar"}`.

[Handler](controllers/supportController.js#L138)

### POST `/api/support/tickets/:ticketId/resolve`

ticket Action. Middleware `auth`.

Request `body supportSchemas.ticketTransitionSchema` Â· `body score` Â· `body comment`.

Responses

- `409 { msg: 'Only resolved tickets can be rated', code: 'TICKET_STATE_CHANGED' }`
- `200 { msg: 'Thanks for the rating' }`
- `result.error.code === OPTIMISTIC.code ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${action} done', status: result.status }`

Example JSON body `{}`.

[Handler](controllers/supportController.js#L202)

### POST `/api/support/tickets/:ticketId/close`

ticket Action. Middleware `auth`.

Request `body supportSchemas.ticketTransitionSchema` Â· `body score` Â· `body comment`.

Responses

- `409 { msg: 'Only resolved tickets can be rated', code: 'TICKET_STATE_CHANGED' }`
- `200 { msg: 'Thanks for the rating' }`
- `result.error.code === OPTIMISTIC.code ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${action} done', status: result.status }`

Example JSON body `{}`.

[Handler](controllers/supportController.js#L202)

### POST `/api/support/tickets/:ticketId/reopen`

ticket Action. Middleware `auth`.

Request `body supportSchemas.ticketTransitionSchema` Â· `body score` Â· `body comment`.

Responses

- `409 { msg: 'Only resolved tickets can be rated', code: 'TICKET_STATE_CHANGED' }`
- `200 { msg: 'Thanks for the rating' }`
- `result.error.code === OPTIMISTIC.code ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${action} done', status: result.status }`

Example JSON body `{}`.

[Handler](controllers/supportController.js#L202)

### POST `/api/support/tickets/:ticketId/rate`

ticket Action. Middleware `auth`.

Request `body supportSchemas.ticketRateSchema` Â· `body score` Â· `body comment`.

Responses

- `409 { msg: 'Only resolved tickets can be rated', code: 'TICKET_STATE_CHANGED' }`
- `200 { msg: 'Thanks for the rating' }`
- `result.error.code === OPTIMISTIC.code ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${action} done', status: result.status }`

Example JSON body `{"score":1}`.

[Handler](controllers/supportController.js#L202)


## Platform support administration

### GET `/api/admin/support/tickets`

admin List Tickets. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `query supportSchemas.adminTicketListQuery`.

Responses

- `200 { tickets: items, nextCursor: page.nextCursor, hasMore: page.hasMore }`

[Handler](controllers/supportAdminController.js#L22)

### GET `/api/admin/support/tickets/:ticketId`

admin Get Ticket. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam`.

Responses

- `404 { msg: 'Ticket not found' }`
- `200 { ticket, messages, owner, memberships, slaStage: canTransition && null }`

[Handler](controllers/supportAdminController.js#L50)

### POST `/api/admin/support/tickets/:ticketId/reply`

admin Reply. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body supportSchemas.adminReplySchema` Â· `body body` Â· `body attachmentIds`.

Responses

- `404 { msg: 'Ticket not found' }`
- `403 { msg: rule.reason, code: rule.code }`
- `409 { msg: 'Ticket state changed, retry', code: 'TICKET_STATE_CHANGED' }`
- `201 { msg: 'Reply sent', status: newStatus }`

Example JSON body `{"body":"Weekly bazar"}`.

[Handler](controllers/supportAdminController.js#L70)

### POST `/api/admin/support/tickets/:ticketId/internal-note`

admin Internal Note. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body supportSchemas.adminReplySchema` Â· `body body`.

Responses

- `404 { msg: 'Ticket not found' }`
- `201 { msg: 'Internal note added' }`

Example JSON body `{"body":"Weekly bazar"}`.

[Handler](controllers/supportAdminController.js#L110)

### POST `/api/admin/support/tickets/:ticketId/assign`

admin Assign. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body supportSchemas.adminAssignSchema` Â· `body assignedAdminId`.

Responses

- `404 { msg: 'Ticket not found' }`
- `200 { msg: 'Assigned' }`

Example JSON body `{"assignedAdminId":"65a000000000000000000013"}`.

[Handler](controllers/supportAdminController.js#L124)

### PATCH `/api/admin/support/tickets/:ticketId`

admin Patch Ticket. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body supportSchemas.adminTicketPatchSchema` Â· `body { priority, category, tags }`.

Responses

- `404 { msg: 'Ticket not found' }`
- `200 { msg: 'Ticket updated', ticket }`

[Handler](controllers/supportAdminController.js#L136)

### POST `/api/admin/support/tickets/:ticketId/resolve`

admin Action. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body adminRedactSchema.partial({ reason: true })`.

Responses

- `404 { msg: 'Ticket not found' }`
- `result.error.code === 'TICKET_STATE_CHANGED' ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${result.status}', status: result.status }`

[Handler](controllers/supportAdminController.js#L156)

### POST `/api/admin/support/tickets/:ticketId/close`

admin Action. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body adminRedactSchema.partial({ reason: true })`.

Responses

- `404 { msg: 'Ticket not found' }`
- `result.error.code === 'TICKET_STATE_CHANGED' ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${result.status}', status: result.status }`

[Handler](controllers/supportAdminController.js#L156)

### POST `/api/admin/support/tickets/:ticketId/reopen`

admin Action. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.idParam` Â· `body supportSchemas.adminRedactSchema`.

Responses

- `404 { msg: 'Ticket not found' }`
- `result.error.code === 'TICKET_STATE_CHANGED' ? 409 : 403 { msg: result.error.reason || 'Not allowed', code: result.error.code }`
- `200 { msg: 'Ticket ${result.status}', status: result.status }`

Example JSON body `{"reason":"Weekly bazar"}`.

[Handler](controllers/supportAdminController.js#L156)

### POST `/api/admin/support/tickets/:ticketId/messages/:messageId/redact`

admin Redact Message. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params supportAdminRoutes.msgParam` Â· `body supportSchemas.adminRedactSchema` Â· `body reason`.

Responses

- `404 { msg: 'Message not found' }`
- `200 { msg: 'Message redacted' }`

Example JSON body `{"reason":"Weekly bazar"}`.

[Handler](controllers/supportAdminController.js#L179)

### GET `/api/admin/support/stats`

admin Stats. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Responses

- `200 { byStatus, overdue, medianFirstResponseMinutes: median === null ? null : Math.round(median), averageRating: ratings[0]?.avg ?? null, ratingCount: ratings[0]?.count ?? 0, }`

[Handler](controllers/supportAdminController.js#L195)

### GET `/api/admin/support/canned-replies`

list Canned Replies. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Responses

- `200 { replies }`

[Handler](controllers/supportAdminController.js#L232)

### POST `/api/admin/support/canned-replies`

create Canned Reply. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `body supportSchemas.cannedReplySchema`.

Responses

- `201 { reply }`

Example JSON body `{"title":"Weekly bazar","body":"Weekly bazar"}`.

[Handler](controllers/supportAdminController.js#L238)

### PUT `/api/admin/support/canned-replies/:replyId`

update Canned Reply. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params z.object({ replyId: objectId })` Â· `body supportSchemas.cannedReplySchema`.

Responses

- `404 { msg: 'Canned reply not found' }`
- `200 { reply }`

Example JSON body `{"title":"Weekly bazar","body":"Weekly bazar"}`.

[Handler](controllers/supportAdminController.js#L244)

### DELETE `/api/admin/support/canned-replies/:replyId`

delete Canned Reply. Middleware `auth`, `requirePlatformAdmin`, `requireAdminAMR (parent mount)`.

Request `params z.object({ replyId: objectId })`.

Responses

- `404 { msg: 'Canned reply not found' }`
- `200 { msg: 'Deleted' }`

[Handler](controllers/supportAdminController.js#L251)


## Routines, duties and notice board

### GET `/api/routines/groups/:groupId/rosters`

list Rosters. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam`.

Responses

- `200 { rosters }`

[Handler](controllers/routinesController.js#L45)

### POST `/api/routines/groups/:groupId/rosters`

create Roster. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params routineSchemas.groupIdParam` Â· `body routineSchemas.rosterCreateSchema`.

Responses

- `201 { roster }`

Example JSON body `{"title":"Weekly bazar","type":"bazar","rotation":{"mode":"round_robin"}}`.

[Handler](controllers/routinesController.js#L36)

### GET `/api/routines/groups/:groupId/rosters/:rosterId`

get Roster. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.rosterIdParam`.

Responses

- `404 { msg: 'Roster not found' }`
- `200 { roster }`

[Handler](controllers/routinesController.js#L52)

### PATCH `/api/routines/groups/:groupId/rosters/:rosterId`

update Roster. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params routineSchemas.rosterIdParam` Â· `body routineSchemas.rosterUpdateSchema`.

Responses

- `404 { msg: 'Roster not found' }`
- `200 { roster }`

Example JSON body `{}`.

[Handler](controllers/routinesController.js#L60)

### POST `/api/routines/groups/:groupId/rosters/:rosterId/publish`

publish Roster. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params routineSchemas.rosterIdParam` Â· `body { horizonDays, taskKeys = ['bazar'] }`.

Responses

- `404 { msg: 'Roster not found' }`
- `409 { msg: 'Already published' }`
- `200 { rosterId, state: 'published', dutiesCreated: created }`

[Handler](controllers/routinesController.js#L73)

### POST `/api/routines/groups/:groupId/rosters/:rosterId/extend-horizon`

extend Horizon. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params routineSchemas.rosterIdParam` Â· `body { additionalDays }`.

Responses

- `404 { msg: 'Roster not found' }`
- `200 { rosterId, horizonExtendedBy: additionalDays, dutiesCreated: created }`

[Handler](controllers/routinesController.js#L109)

### GET `/api/routines/groups/:groupId/duties`

list Duties. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `query { localDate, membershipId, status, rosterId }`.

Responses

- `200 { duties }`

[Handler](controllers/routinesController.js#L142)

### POST `/api/routines/groups/:groupId/duties/:assignmentId/done`

mark Duty Done. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `body { doneNote }`.

Responses

- `404 { msg: 'Duty not found' }`
- `409 { msg: 'Duty already done' }`
- `200 { duty }`

[Handler](controllers/routinesController.js#L156)

### POST `/api/routines/groups/:groupId/duties/:assignmentId/reassign`

reassign Duty. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params routineSchemas.groupIdParam` Â· `body routineSchemas.dutyReassignSchema` Â· `body { toMembershipId, reason }`.

Responses

- `404 { msg: 'Duty not found' }`
- `200 { duty }`

Example JSON body `{"toMembershipId":"65a000000000000000000013"}`.

[Handler](controllers/routinesController.js#L173)

### POST `/api/routines/groups/:groupId/swaps`

create Swap. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `body routineSchemas.swapCreateSchema` Â· `body { assignmentId, toMembershipId, reason }`.

Responses

- `404 { msg: 'Duty assignment not found' }`
- `201 { swap }`

Example JSON body `{"assignmentId":"65a000000000000000000013"}`.

[Handler](controllers/routinesController.js#L194)

### POST `/api/routines/groups/:groupId/swaps/:swapId/respond`

respond Swap. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `body routineSchemas.swapRespondSchema` Â· `body { accept, reason }`.

Responses

- `404 { msg: 'Swap request not found' }`
- `409 { msg: 'Already resolved' }`
- `200 { swap }`

Example JSON body `{"accept":true}`.

[Handler](controllers/routinesController.js#L211)

### POST `/api/routines/groups/:groupId/menu`

set Menu Plan. Middleware `auth`, `requireGroupRoleV2('manager')`.

Request `params routineSchemas.groupIdParam` Â· `body routineSchemas.menuPlanCreateSchema` Â· `body { weekStart, ...rest }`.

Responses

- `200 { menu }`

Example JSON body `{"weekStart":"2026-11-24"}`.

[Handler](controllers/routinesController.js#L246)

### GET `/api/routines/groups/:groupId/menu`

get Menu Plan. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `query { weekStart }`.

Responses

- `200 { menus }`

[Handler](controllers/routinesController.js#L261)

### POST `/api/routines/groups/:groupId/notes`

create Note. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `body routineSchemas.noteCreateSchema` Â· `body pinned`.

Responses

- `409 { msg: 'Pin limit reached (max 3)', code: 'PIN_LIMIT' }`
- `201 { note }`

Example JSON body `{"title":"Weekly bazar"}`.

[Handler](controllers/routinesController.js#L276)

### GET `/api/routines/groups/:groupId/notes`

list Notes. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam`.

Responses

- `200 { notes: visible }`

[Handler](controllers/routinesController.js#L290)

### GET `/api/routines/groups/:groupId/notes/:noteId`

get Note. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.noteIdParam`.

Responses

- `404 { msg: 'Note not found' }`
- `200 { note }`

[Handler](controllers/routinesController.js#L300)

### PATCH `/api/routines/groups/:groupId/notes/:noteId`

update Note. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.noteIdParam` Â· `body routineSchemas.noteUpdateSchema`.

Responses

- `404 { msg: 'Note not found' }`
- `200 { note }`

Example JSON body `{}`.

[Handler](controllers/routinesController.js#L308)

### DELETE `/api/routines/groups/:groupId/notes/:noteId`

delete Note. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.noteIdParam`.

Responses

- `404 { msg: 'Note not found' }`
- `200 { msg: 'Note deleted' }`

[Handler](controllers/routinesController.js#L322)

### POST `/api/routines/groups/:groupId/notes/:noteId/ack`

ack Note. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.noteIdParam`.

Responses

- `403 { msg: 'Not a member' }`
- `200 { msg: 'Acknowledged' }`

[Handler](controllers/routinesController.js#L336)

### POST `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/claim`

claim Task. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.noteTaskParam`.

Responses

- `404 { msg: 'Note not found' }`
- `403 { msg: 'Not a member' }`
- `409 { msg: result.code, code: result.code }`
- `200 { msg: 'Task claimed' }`

[Handler](controllers/routinesController.js#L347)

### POST `/api/routines/groups/:groupId/notes/:noteId/tasks/:taskId/done`

done Task. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.noteTaskParam`.

Responses

- `404 { msg: 'Note not found' }`
- `403 { msg: 'Not a member' }`
- `409 { msg: result.code, code: result.code }`
- `200 { msg: 'Task done' }`

[Handler](controllers/routinesController.js#L363)

### GET `/api/routines/groups/:groupId/board/today`

board Today. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam`.

Responses

- `200 { date: today, duties, menu: todayMenu, pinnedNotes, activeHandovers }`

[Handler](controllers/routinesController.js#L383)

### GET `/api/routines/groups/:groupId/menu/bazar-suggestions`

menu Bazar Suggestions. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `query { weekStart }`.

Responses

- `200 { weekStart: start, suggestions, totalItems: suggestions.length }`

[Handler](controllers/routinesController.js#L413)

### GET `/api/routines/groups/:groupId/duties/fairness`

duty Fairness Board. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `query { month }`.

Responses

- `200 { month: targetMonth, board }`

[Handler](controllers/routinesController.js#L459)

### GET `/api/routines/groups/:groupId/bazar-spend-rotation`

bazar Spend Rotation. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `query { from, to }`.

Responses

- `200 { rotation }`

[Handler](controllers/routinesController.js#L505)

### POST `/api/routines/groups/:groupId/emergency-broadcast`

emergency Broadcast. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params routineSchemas.groupIdParam` Â· `body { title, body }`.

Responses

- `400 { msg: 'title and body are required' }`
- `403 { msg: 'Only owner or manager can send emergency broadcasts' }`
- `201 { note }`

[Handler](controllers/routinesController.js#L553)


## Shopping list

### GET `/api/shopping-list/groups/:groupId`

get Shopping List. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params shoppingListRoutes.groupIdParam`.

Responses

- `200 { list }`

[Handler](controllers/shoppingListController.js#L39)

### POST `/api/shopping-list/groups/:groupId/items`

add Item. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params shoppingListRoutes.groupIdParam` Â· `body shoppingListRoutes.itemSchema` Â· `body shoppingListController.itemSchema`.

Responses

- `404 { msg: 'No open shopping list' }`
- `201 { list }`

Example JSON body `{"name":"Weekly bazar"}`.

[Handler](controllers/shoppingListController.js#L52)

### PATCH `/api/shopping-list/groups/:groupId/items/:itemId`

toggle Item. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params shoppingListRoutes.groupIdParam` Â· `params shoppingListRoutes.itemIdParam` Â· `body shoppingListRoutes.itemCheckSchema` Â· `body shoppingListController.itemCheckSchema`.

Responses

- `404 { msg: 'No open shopping list' }`
- `404 { msg: 'Item not found' }`
- `200 { list }`

Example JSON body `{"itemId":"65a000000000000000000013","checked":true}`.

[Handler](controllers/shoppingListController.js#L73)

### DELETE `/api/shopping-list/groups/:groupId/items/:itemId`

remove Item. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params shoppingListRoutes.groupIdParam` Â· `params shoppingListRoutes.itemIdParam`.

Responses

- `404 { msg: 'No open shopping list' }`
- `200 { msg: 'Item removed' }`

[Handler](controllers/shoppingListController.js#L93)

### POST `/api/shopping-list/groups/:groupId/to-expense`

to Expense. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params shoppingListRoutes.groupIdParam` Â· `body shoppingListRoutes.toExpenseSchema` Â· `body shoppingListController.toExpenseSchema`.

Responses

- `404 { msg: 'No open shopping list' }`
- `422 { msg: 'No checked items to convert' }`
- `201 { expense, list }`

Example JSON body `{"categoryId":"65a000000000000000000013"}`.

[Handler](controllers/shoppingListController.js#L107)

### GET `/api/shopping-list/groups/:groupId/history`

list History. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params shoppingListRoutes.groupIdParam`.

Responses

- `200 { lists }`

[Handler](controllers/shoppingListController.js#L162)


## Kitchen inventory

### GET `/api/kitchen-inventory/groups/:groupId`

list Kitchen Items. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params kitchenInventoryRoutes.groupIdParam`.

Responses

- `200 { items: result }`

[Handler](controllers/kitchenInventoryController.js#L30)

### POST `/api/kitchen-inventory/groups/:groupId`

create Kitchen Item. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params kitchenInventoryRoutes.groupIdParam` Â· `body kitchenInventoryRoutes.itemCreateSchema` Â· `body kitchenInventoryController.itemCreateSchema`.

Responses

- `409 { msg: 'Item already exists' }`
- `201 { item }`

Example JSON body `{"name":"Weekly bazar"}`.

[Handler](controllers/kitchenInventoryController.js#L50)

### PATCH `/api/kitchen-inventory/groups/:groupId/:itemId`

update Kitchen Item. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params kitchenInventoryRoutes.groupIdParam` Â· `params kitchenInventoryRoutes.itemIdParam` Â· `body kitchenInventoryRoutes.itemUpdateSchema` Â· `body kitchenInventoryController.itemUpdateSchema`.

Responses

- `404 { msg: 'Item not found' }`
- `200 { item }`

Example JSON body `{}`.

[Handler](controllers/kitchenInventoryController.js#L64)

### POST `/api/kitchen-inventory/groups/:groupId/:itemId/refill`

record Refill. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params kitchenInventoryRoutes.groupIdParam` Â· `params kitchenInventoryRoutes.itemIdParam` Â· `body kitchenInventoryRoutes.refillSchema` Â· `body kitchenInventoryController.refillSchema`.

Responses

- `404 { msg: 'Item not found' }`
- `200 { item }`

Example JSON body `{"quantity":1}`.

[Handler](controllers/kitchenInventoryController.js#L80)

### DELETE `/api/kitchen-inventory/groups/:groupId/:itemId`

delete Kitchen Item. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params kitchenInventoryRoutes.groupIdParam` Â· `params kitchenInventoryRoutes.itemIdParam`.

Responses

- `404 { msg: 'Item not found' }`
- `200 { msg: 'Item archived' }`

[Handler](controllers/kitchenInventoryController.js#L98)


## Polls

### GET `/api/polls/groups/:groupId`

list Polls. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params pollRoutes.groupIdParam`.

Responses

- `200 { polls }`

[Handler](controllers/pollController.js#L19)

### POST `/api/polls/groups/:groupId`

create Poll. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `params pollRoutes.groupIdParam` Â· `body pollRoutes.pollCreateSchema` Â· `body pollController.pollCreateSchema`.

Responses

- `201 { poll }`

Example JSON body `{"question":"Friday dinner?","options":["Fish curry","Chicken curry"],"expiresAt":"2026-12-01T12:00:00Z"}`.

[Handler](controllers/pollController.js#L28)

### POST `/api/polls/:pollId/vote`

vote Poll. Middleware `auth`, `requireGroupRoleV2('member')`.

Request `body pollRoutes.voteSchema` Â· `body pollController.voteSchema`.

Responses

- `409 { msg: 'Poll is closed' }`
- `409 { msg: 'Poll has expired' }`
- `400 { msg: 'Invalid option' }`
- `200 { poll }`

Example JSON body `{"optionIndex":0}`.

[Handler](controllers/pollController.js#L47)

### POST `/api/polls/:pollId/close`

close Poll. Middleware `auth`, `requireGroupRoleV2('member')`.

Responses

- `403 { msg: 'Only the creator or a manager can close this poll' }`
- `200 { poll }`

[Handler](controllers/pollController.js#L75)

### GET `/api/polls/:pollId/results`

poll Results. Middleware `auth`, `requireGroupRoleV2('member')`.

Responses

- `200 { poll, results, totalVotes }`

[Handler](controllers/pollController.js#L91)


## Expiring invitations

### POST `/api/invite/join-by-code`

join By Code. Middleware `auth`.

Request `body z.object({ code: z.string().min(1), groupId: z.string().min(1), })` Â· `body { code, groupId }`.

Responses

- `400 { msg: 'code and groupId are required' }`
- `429 { msg: 'Too many failed attempts, try again later' }`
- `200 { msg: 'Join processed' }`
- `404 { msg: 'Group not found' }`
- `200 { msg: 'Joined group' }`

[Handler](controllers/inviteController.js#L19)

### POST `/api/invite/codes`

create Invite Code. Middleware `auth`.

Request `body z.object({ groupId: z.string().min(1), maxUses: z.number().int().min(1).max(1000).optional(), ttlDays: z.number().int().min(1).max(365).optional(), })` Â· `body { groupId, maxUses, ttlDays }`.

Responses

- `400 { msg: 'groupId is required' }`
- `404 { msg: 'Group not found' }`
- `403 { msg: 'Only group admin can create invite codes' }`
- `201 { code, inviteLink: '${process.env.FRONTEND_URL || 'http://localhost:5174'}/join/${code}', expiresAt, maxUses: doc.maxUses, }`

[Handler](controllers/inviteController.js#L94)

### GET `/api/invite/codes/:groupId`

get Invite Code Metadata. Middleware `auth`.

Request `params z.object({ groupId: z.string().min(1), })`.

Responses

- `200 { prefix: null, expiresAt: null, usesLeft: 0, active: false }`
- `200 { prefix: active.prefix, expiresAt: active.expiresAt, usesLeft: Math.max(0, active.maxUses - active.usedCount), active: true, }`

[Handler](controllers/inviteController.js#L130)


## Legacy and deprecated interfaces

The entries and calculate reads and the summary month read carry deprecation middleware. Payment notes and legacy summary finalization use a separate accounting model. Prefer versioned statements for new integrations.

### POST `/api/messgroups/add-entry/:groupId`

add Entry. Middleware `auth`, `requireGroupRole('member')`, `allowSelfOrAdmin`.

Request `params schemas.objectIdParamSchema` Â· `body schemas.addEntrySchema` Â· `body { date, meals, costs }`.

Responses

- `400 { msg: 'User ${m.userId} is not a member' }`
- `400 { msg: 'User ${c.userId} is not a member' }`
- `200 entry`

Example JSON body `{"date":"2026-11-24"}`.

[Handler](controllers/messGroupController.js#L178)

### GET `/api/messgroups/entries/:groupId`

get Entries. Middleware `auth`, `deprecate({ successor: '/api/meals, /api/expenses' })`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 { ...group, admin: sanitizedAdmin, members: sanitizedMembers, pendingRequests: sanitizedPending }`

[Handler](controllers/messGroupController.js#L224)

### GET `/api/messgroups/calculate/:groupId`

calculate. Middleware `auth`, `deprecate({ successor: '/api/summary' })`, `requireGroupRole('member')`.

Request `params schemas.objectIdParamSchema`.

Responses

- `404 { msg: 'Group not found' }`
- `200 { totalMeals: 0, totalBazar: 0, mealRate: 0, summaries: group.members.map(member => ({ user: member.user.username, totalMeals: 0, totalCosts: 0, mealCost: 0, balance: 0, })), }`
- `200 { totalMeals, totalBazar, mealRate, summaries }`

[Handler](controllers/messGroupController.js#L237)

### PUT `/api/messgroups/payment-note/:groupId/:userId/:month`

upsert Payment Note. Middleware `auth`, `requireGroupRole('admin')`.

Request `body schemas.paymentNoteSchema` Â· `body { note, amountDue = 0, isPaid = false }`.

Responses

- `404 { msg: 'Group not found' }`
- `403 { msg: 'Only admin can create or edit payment notes' }`
- `404 { msg: 'User is not a member of this group' }`
- `201 { msg: 'Payment note saved', paymentNote }`

Example JSON body `{"note":"Weekly bazar"}`.

[Handler](controllers/paymentNoteController.js#L22)

### GET `/api/messgroups/payment-note/:groupId/:userId/:month`

get Payment Note. Middleware `auth`.

Responses

- `404 { msg: 'Group not found' }`
- `403 { msg: 'Members can only view their own payment note' }`
- `404 { msg: 'No payment note for this month' }`
- `200 paymentNote`

[Handler](controllers/paymentNoteController.js#L63)

### GET `/api/messgroups/payment-notes/:groupId/:month`

get All Payment Notes. Middleware `auth`, `requireGroupRole('admin')`.

Responses

- `400 { msg: 'Month must be YYYY-MM' }`
- `200 notes`

[Handler](controllers/paymentNoteController.js#L90)

### GET `/api/summary/:groupId/:month`

get Summary. Middleware `auth`, `deprecate({ successor: '/api/statements' })`, `requireGroupRole('member')`.

Request `params schemas.monthParamSchema`.

Responses

- `200 { ...existing.toObject(), frozen: true }`
- `200 { ...summary, isFinalized: existing?.isFinalized || false, frozen: false }`

[Handler](controllers/summaryController.js#L199)

### POST `/api/summary/finalize/:groupId/:month`

finalize Summary. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.monthParamSchema`.

Responses

- `409 { msg: 'Legacy summary is immutable; use /api/statements for a versioned correction' }`
- `410 { msg: 'Legacy summary finalization is retired; finalize through /api/statements' }`

[Handler](controllers/summaryController.js#L220)

### GET `/api/summary/whatsapp/:groupId/:month`

whatsapp Summary. Middleware `auth`, `requireGroupRole('admin')`.

Request `params schemas.monthParamSchema`.

Responses

- `200 { msg: process.env.WHATSAPP_TOKEN ? 'Sent ${sent}/${links.filter(l => l.waLink).length} via WhatsApp Cloud API' : 'Open these links to send each member their summary', month, recipients: links, }`

[Handler](controllers/summaryController.js#L157)

## Request schema appendix

**totpController.setupSchema**

`z.object({})`

**totpController.verifySchema**

`z.object({ code: z.string().length(6) })`

**totpController.disableSchema**

`z.object({ password: z.string().min(1), code: z.string().regex(/^(?:\d{6}|[A-F0-9]{8})$/), })`

**schemas.loginSchema**

`z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1), })`

**totpController.login2faSchema**

`z.object({ challengeToken: z.string().min(1), code: z.string().regex(/^(?:\d{6}|[A-F0-9]{8})$/), })`

**schemas.registerSchema**

`z.object({ username: z.string().trim().min(2).max(30) .regex(/^[a-zA-Z0-9_ ]+$/, 'Only letters, numbers, spaces, underscore'), email: z.string().trim().toLowerCase().email(), password: passwordSchema, phone: z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, 'Invalid phone number').optional(), whatsapp: whatsappSchema.optional(), })`

**schemas.passwordSchema**

`z .string() .min(8, 'Password must be at least 8 characters') .regex(/[A-Z]/, 'Must contain an uppercase letter') .regex(/[a-z]/, 'Must contain a lowercase letter') .regex(/[0-9]/, 'Must contain a number')`

**schemas.whatsappSchema**

`z.string().trim() .regex(/^\+?[0-9]{10,15}$/, 'WhatsApp must be 10-15 digits, optional leading +') .or(z.literal(''))`

**schemas.forgotPasswordSchema**

`z.object({ email: z.string().trim().toLowerCase().email(), })`

**schemas.resetPasswordSchema**

`z.object({ token: z.string().min(10), password: passwordSchema, })`

**schemas.objectIdParamSchema**

`z.object({ groupId: objectIdSchema, })`

**schemas.objectIdSchema**

`z .string() .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')`

**schemas.updateProfileSchema**

`z.object({ username: z.string().trim().min(2).max(30) .regex(/^[a-zA-Z0-9_ ]+$/).optional(), phone: z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, 'Invalid phone number').optional(), whatsapp: whatsappSchema.optional(), })`

**schemas.changePasswordSchema**

`z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema, })`

**schemas.createGroupSchema**

`z.object({ name: z.string().trim().min(2).max(60), mealSlots: z.array(z.enum(MEAL_SLOTS)).min(1).default(MEAL_SLOTS), mealWeights: z.object({ breakfast: z.number().int().min(0).max(1000).default(1000), lunch: z.number().int().min(0).max(1000).default(1000), snacks: z.number().int().min(0).max(1000).default(1000), dinner: z.number().int().min(0).max(1000).default(1000), }).default({}), defaultMealSubunits: mealDefaultsSchema.default({}), defaultMealsEnabled: z.boolean().default(false), })`

**schemas.MEAL_SLOTS**

`['breakfast', 'lunch', 'snacks', 'dinner']`

**schemas.mealDefaultsSchema**

`z.object({ breakfast: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0), lunch: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0), snacks: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0), dinner: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0), })`

**schemas.PORTION_SUBUNITS**

`[0, 250, 500, 750, 1000]`

**schemas.joinByCodeSchema**

`z.object({ code: z.string().trim().min(6).max(12).transform(v => v.toUpperCase()), })`

**schemas.groupAndUserParamSchema**

`z.object({ groupId: objectIdSchema, userId: objectIdSchema, })`

**schemas.addMemberSchema**

`z.object({ userId: objectIdSchema, role: z.enum(['member', 'admin']).default('member'), })`

**schemas.extraSchema**

`z.object({ name: z.string().trim().min(1).max(50), amount: z.number().nonnegative().max(1_000_000), })`

**schemas.objectIdAndExtraParamSchema**

`objectIdAndIdParamSchema`

**schemas.objectIdAndIdParamSchema**

`z.object({ groupId: objectIdSchema, categoryId: objectIdSchema, })`

**schemas.inviteSchema**

`z.object({ email: z.string().trim().toLowerCase().email(), })`

**schemas.addEntrySchema**

`z.object({ date: z.coerce.date(), meals: z.array(mealEntry).max(100).optional(), costs: z.array(costEntry).max(100).optional(), })`

**schemas.mealEntry**

`z.object({ userId: objectIdSchema, count: z.number().refine(v => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].includes(v), { message: 'Meal count must be 0, 0.5, 1, 1.5 or 2', }), })`

**schemas.costEntry**

`z.object({ userId: objectIdSchema, amount: z.number().positive().max(1_000_000), description: z.string().trim().max(200).optional(), })`

**schemas.paymentNoteSchema**

`z.object({ note: z.string().trim().min(1).max(1000), amountDue: z.number().nonnegative().optional(), isPaid: z.boolean().optional(), })`

**schemas.categorySchema**

`z.object({ name: z.string().trim().min(1).max(50), icon: z.string().trim().max(20).optional(), splitMode: z.enum(['meal', 'equal']).default('equal'), })`

**schemas.splitMode**

`z.enum([ 'meal_units', 'equal_all', 'equal_selected', 'member_days', 'fixed_amounts', 'weighted', 'usage', 'personal', ])`

**messGroupController.flagSchema**

`z.object({ routines: z.boolean().optional(), polls: z.boolean().optional(), shoppingList: z.boolean().optional(), kitchenInventory: z.boolean().optional(), bazarRotation: z.boolean().optional(), emergencyBroadcast: z.boolean().optional(), weeklyDigest: z.boolean().optional(), })`

**schemas.mealEntrySchema**

`z.object({ date: z.coerce.date().optional(), slots: z.object({ breakfast: mealSlotSchema.optional(), lunch: mealSlotSchema.optional(), snacks: mealSlotSchema.optional(), dinner: mealSlotSchema.optional(), }).refine(slots => Object.keys(slots).length > 0, 'At least one meal slot is required'), })`

**schemas.mealSlotSchema**

`z.object({ state: z.enum(['unknown', 'confirmed_zero', 'consumed']), portionSubunits: z.number().int().min(0).max(1000).optional(), }).superRefine((slot, ctx) => { if (slot.state === 'consumed' && ![250, 500, 750, 1000].includes(slot.portionSubunits)) { ctx.addIssue({ code: 'custom', message: 'Consumed slots require portionSubunits of 250, 500, 750, or 1000' }); } if (slot.state === 'confirmed_zero' && slot.portionSubunits !== undefined && slot.portionSubunits !== 0) { ctx.addIssue({ code: 'custom', message: 'confirmed_zero slots must have zero portionSubunits' }); } })`

**schemas.guestMealSchema**

`z.object({ date: z.coerce.date().optional(), guestName: z.string().trim().max(80).optional(), slot: z.enum(MEAL_SLOTS), portionSubunits: z.number().int().refine(v => [250, 500, 750, 1000].includes(v)), poolMode: z.enum(['individual', 'universal']), eventPoolRef: z.string().trim().max(120).optional(), })`

**schemas.mealBulkSchema**

`z.object({ entries: z.array(z.object({ userId: objectIdSchema, date: z.coerce.date(), slots: mealEntrySchema.shape.slots })).min(1).max(500), })`

**schemas.absenceRangeSchema**

`z.object({ userId: objectIdSchema.optional(), from: z.coerce.date(), to: z.coerce.date(), slots: z.array(z.enum(MEAL_SLOTS)).min(1).default(MEAL_SLOTS), }).refine(d => d.from <= d.to, 'from must be before to')`

**schemas.idParamSchema**

`z.object({ id: objectIdSchema })`

**schemas.mealFilterQuerySchema**

`z.object({ month: monthStr.optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), userId: objectIdSchema.optional(), }).refine( d => !(d.from && d.to && d.from > d.to), { message: 'from must be before to' } ).refine( d => !d.from || d.month === undefined, // prefer one style per request { message: 'Use either month or from/to, not both' } )`

**schemas.month**

`z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM')`

**schemas.monthStr**

`z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM')`

**schemas.headcountQuerySchema**

`z.object({ groupId: objectIdSchema, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(), includeGuests: z.enum(['true', 'false']).default('true').optional(), })`

**schemas.monthParamSchema**

`z.object({ groupId: objectIdSchema, month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'), })`

**schemas.expenseEntrySchema**

`expenseEntryBase.refine( d => !!d.categoryId, { message: 'categoryId is required' } )`

**schemas.expenseEntryBase**

`z.object({ date: z.coerce.date().optional(), amount: z.number().positive().max(1_000_000), description: z.string().trim().max(200).optional(), categoryId: objectIdSchema, // required â€” from GET /api/messgroups/categories/:groupId category: z.string().trim().max(50).optional(), // optional display label; derived from category server-side })`

**schemas.expenseUpdateSchema**

`expenseEntryBase.partial()`

**schemas.expenseFilterQuerySchema**

`z.object({ month: monthStr.optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), userId: objectIdSchema.optional(), categoryId: objectIdSchema.optional(), category: z.string().trim().max(50).optional(), // free-text legacy filter }).refine( d => !(d.from && d.to && d.from > d.to), { message: 'from must be before to' } ).refine( d => !d.from || d.month === undefined, { message: 'Use either month or from/to, not both' } )`

**schemas.groupIdParam**

`z.object({ groupId: objectId })`

**schemas.objectId**

`z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')`

**schemas.listExpenseQuery**

`z.object({ status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'reversed']).optional(), costPeriod: month.optional(), payable: z.boolean().optional(), })`

**schemas.createExpenseSchema**

`z.object({ supplierName: z.string().max(100).optional(), description: z.string().max(200).optional(), date: z.string().min(4), costPeriod: month.optional(), serviceStart: z.string().nullable().optional(), serviceEnd: z.string().nullable().optional(), isPayable: z.boolean().optional(), receiptReference: z.string().max(100).optional(), lines: z.array(z.object({ description: z.string().max(200).optional(), categoryId: objectId, amount: poisha, splitMode: splitMode.nullable().optional(), beneficiaries: z.array(objectId).optional(), fixedAmounts: z.array(z.object({ membershipId: objectId, amount: poisha })).optional(), weights: z.array(z.object({ membershipId: objectId, weight: z.number().int().min(1) })).optional(), usageQuantities: z.array(z.object({ membershipId: objectId, quantity: z.number().min(0) })).optional(), })).min(1), })`

**schemas.poisha**

`z.number().int().min(1, 'Amount must be integer poisha â‰¥ 1')`

**schemas.expenseIdParam**

`z.object({ groupId: objectId, expenseId: objectId })`

**schemas.reasonBody**

`z.object({ reason: z.string().max(300).optional() })`

**schemas.monthParam**

`z.object({ groupId: objectId, month })`

**schemas.createMembershipSchema**

`z.object({ userId: objectId.nullable().optional(), displayName: z.string().trim().min(1).max(80), startDate: z.string().min(4), endDate: z.string().nullable().optional(), role: z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member']).optional(), room: z.string().max(40).optional(), weight: z.number().int().min(1).optional(), isPlaceholder: z.boolean().optional(), })`

**schemas.publishPolicySchema**

`z.object({ effectiveFrom: month, mealWeights: z.object({ breakfast: z.number().int().min(0).max(1000).optional(), lunch: z.number().int().min(0).max(1000).optional(), snacks: z.number().int().min(0).max(1000).optional(), dinner: z.number().int().min(0).max(1000).optional(), }).optional(), allowedPortions: z.array(z.number()).optional(), entryCutoffHour: z.number().int().min(0).max(23).optional(), currency: z.string().optional(), timezone: z.string().optional(), requireExpenseApproval: z.boolean().optional(), reviewGraceDays: z.number().int().min(0).optional(), })`

**schemas.correctionSchema**

`z.object({ reason: z.string().max(300).optional(), adjustment: z.record(z.string(), z.unknown()).optional(), })`

**schemas.listMoneyQuery**

`z.object({ status: z.enum(['submitted', 'confirmed', 'rejected', 'reversed']).optional(), kind: z.enum(['contribution', 'payout', 'supplier_payment', 'member_settlement', 'transfer', 'fee']).optional(), })`

**schemas.moneySchema**

`z.object({ kind: z.enum(['contribution', 'payout', 'supplier_payment', 'member_settlement', 'transfer', 'fee']), amount: poisha, fromMember: objectId.nullable().optional(), toMember: objectId.nullable().optional(), fromAccount: objectId.nullable().optional(), toAccount: objectId.nullable().optional(), supplierName: z.string().max(100).optional(), method: z.enum(['cash', 'bkash', 'nagad', 'rocket', 'bank', 'other']).optional(), reference: z.string().max(100).optional(), paidAt: z.string().optional(), evidenceUrl: z.string().max(500).optional(), })`

**schemas.txIdParam**

`z.object({ groupId: objectId, txId: objectId })`

**schemas.balanceParam**

`z.object({ groupId: objectId, membershipId: objectId })`

**schemas.fundSchema**

`z.object({ name: z.string().trim().min(1).max(60), kind: z.enum(['cash', 'wallet', 'bank']), maskedIdentifier: z.string().max(40).optional(), })`

**schemas.custodianSchema**

`z.object({ newCustodianId: objectId })`

**schemas.finalizeSchema**

`z.object({ expectedRevision: z.number().int().min(0).optional(), reason: z.string().max(300).optional(), })`

**schemas.recurringSchema**

`z.object({ name: z.string().trim().min(1).max(80), categoryId: objectId.optional(), amount: poisha, splitMode: splitMode.optional(), beneficiaries: z.array(objectId).optional(), fixedAmounts: z.array(z.object({ membershipId: objectId, amount: poisha })).optional(), weights: z.array(z.object({ membershipId: objectId, weight: z.number().int().min(1) })).optional(), supplierName: z.string().max(100).optional(), dueDayOfMonth: z.number().int().min(1).max(31).optional(), effectiveFrom: month, effectiveTo: month.nullable().optional(), })`

**schemas.ruleIdParam**

`z.object({ groupId: objectId, ruleId: objectId })`

**schemas.generateSchema**

`z.object({ costPeriod: month })`

**schemas.listReconciliationQuery**

`z.object({ accountId: objectId.optional() })`

**schemas.reconciliationSchema**

`z.object({ accountId: objectId, asOf: z.string().optional(), actualBalance: z.number().int(), })`

**schemas.recIdParam**

`z.object({ groupId: objectId, recId: objectId })`

**schemas.resolveReconciliationSchema**

`z.object({ resolution: z.enum(['adjusted', 'accepted_shortage', 'found_cash', 'none']), explanation: z.string().max(500).optional(), })`

**schemas.disputeListQuery**

`z.object({ status: z.enum(['open', 'resolved', 'rejected']).optional() })`

**schemas.disputeSchema**

`z.object({ targetType: z.enum(['expense', 'money_transaction', 'statement_item']), targetId: objectId, reason: z.string().trim().min(1).max(1000), statementId: objectId.optional(), membershipId: objectId.optional(), })`

**schemas.disputeIdParam**

`z.object({ groupId: objectId, disputeId: objectId })`

**schemas.disputeRespondSchema**

`z.object({ text: z.string().min(1).max(1000) })`

**schemas.disputeResolveSchema**

`z.object({ rejected: z.boolean().optional(), note: z.string().max(500).optional(), correctionJournalId: objectId.optional(), })`

**schemas.outboxQuery**

`z.object({ statementId: objectId.optional(), state: z.enum(['pending', 'processing', 'sent', 'failed', 'skipped', 'not_configured']).optional(), })`

**schemas.messageIdParam**

`z.object({ groupId: objectId, messageId: objectId })`

**schemas.manualShareSchema**

`z.object({ statementId: objectId.optional() })`

**schemas.familyIdParam**

`z.object({ familyId: z.string().min(8) })`

**schemas.revokeAllSchema**

`z.object({ exceptFamilyId: z.string().optional() })`

**inboxSchemas.inboxListQuery**

`z.object({ unread: z.enum(['0', '1']).optional(), cursor: z.string().max(512).optional(), limit: z.coerce.number().int().min(1).max(100).optional(), })`

**inboxSchemas.inboxReadSchema**

`z.object({ ids: z.array(objectIdSchema).max(200).optional(), all: z.boolean().optional(), }).refine(v => (v.all === true) || (Array.isArray(v.ids) && v.ids.length > 0), { message: 'Provide ids or all:true', })`

**inboxSchemas.inboxPrefsSchema**

`z.object({ types: z.record( z.string().max(60).regex(/^[a-z0-9_.]+$/i), z.object({ inApp: z.boolean(), email: z.boolean() }) ).optional(), quietHours: z.object({ from: hhmm, to: hhmm }).optional(), })`

**inboxSchemas.hhmm**

`z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be HH:MM')`

**supportSchemas.appealSchema**

`z.object({ email: z.string().trim().toLowerCase().email().max(200), message: z.string().trim().min(10).max(2000), captchaToken: z.string().max(2000).optional(), })`

**supportSchemas.ticketCreateSchema**

`z.object({ category: ticketCategoryEnum, subject: z.string().trim().min(3).max(120), body: z.string().trim().min(10).max(2000), groupId: objectIdSchema.optional(), attachContext: z.boolean().optional(), attachmentIds: z.array(objectIdSchema).max(5).optional(), priority: z.undefined().optional(), }).strip()`

**supportSchemas.ticketCategoryEnum**

`z.enum(['account', 'bug', 'billing_dispute', 'feature', 'group_access', 'appeal', 'other'])`

**supportSchemas.ticketListQuery**

`z.object({ status: z.enum(['open', 'answered', 'awaiting_admin', 'resolved', 'closed']).optional(), cursor: z.string().max(512).optional(), })`

**supportSchemas.ticketMessageSchema**

`z.object({ body: z.string().trim().min(1).max(2000), attachmentIds: z.array(objectIdSchema).max(5).optional(), })`

**supportSchemas.ticketTransitionSchema**

`z.object({ note: z.string().trim().max(2000).optional(), reason: z.string().trim().min(3).max(500).optional(), }).passthrough()`

**supportSchemas.ticketRateSchema**

`z.object({ score: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(300).optional(), })`

**supportSchemas.adminTicketListQuery**

`z.object({ status: z.enum(['open', 'answered', 'awaiting_admin', 'resolved', 'closed']).optional(), priority: ticketPriorityEnum.optional(), assignee: objectIdSchema.optional(), category: ticketCategoryEnum.optional(), overdue: z.enum(['0', '1']).optional(), q: z.string().trim().max(120).optional(), cursor: z.string().max(512).optional(), })`

**supportSchemas.ticketPriorityEnum**

`z.enum(['low', 'normal', 'high', 'urgent'])`

**supportAdminRoutes.idParam**

`z.object({ ticketId: objectId })`

**supportSchemas.adminReplySchema**

`z.object({ body: z.string().trim().min(1).max(2000), attachmentIds: z.array(objectIdSchema).max(5).optional(), })`

**supportSchemas.adminAssignSchema**

`z.object({ assignedAdminId: objectIdSchema.nullable(), })`

**supportSchemas.adminTicketPatchSchema**

`z.object({ priority: ticketPriorityEnum.optional(), category: ticketCategoryEnum.optional(), tags: z.array(z.string().trim().max(30)).max(10).optional(), }).refine(v => Object.keys(v).length > 0, { message: 'Nothing to update' })`

**supportSchemas.adminRedactSchema**

`z.object({ reason: z.string().trim().min(3).max(500), })`

**supportAdminRoutes.msgParam**

`z.object({ ticketId: objectId, messageId: objectId })`

**supportSchemas.cannedReplySchema**

`z.object({ title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(2000), category: ticketCategoryEnum.optional(), })`

**routineSchemas.groupIdParam**

`z.object({ groupId: objectId })`

**routineSchemas.rosterCreateSchema**

`z.object({ title: z.string().trim().min(1).max(80), type: z.enum(['bazar', 'cleaning', 'cooking', 'custom']), areas: z.array(z.string().trim().max(40)).optional(), rotation: z.object({ mode: z.enum(['round_robin', 'weekly_template', 'fair', 'manual']), memberOrder: z.array(objectId).optional(), weeklyTemplate: z.record(z.array(objectId)).optional(), daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), }), skipWhenAbsent: z.boolean().optional(), weekStartsOn: z.number().int().min(0).max(6).optional(), horizonDays: z.number().int().min(7).max(90).optional(), })`

**routineSchemas.rosterIdParam**

`z.object({ groupId: objectId, rosterId: objectId })`

**routineSchemas.rosterUpdateSchema**

`z.object({ title: z.string().trim().min(1).max(80).optional(), type: z.enum(['bazar', 'cleaning', 'cooking', 'custom']).optional(), rotation: z.object({ mode: z.enum(['round_robin', 'weekly_template', 'fair', 'manual']).optional(), memberOrder: z.array(objectId).optional(), weeklyTemplate: z.record(z.array(objectId)).optional(), daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), }).optional(), skipWhenAbsent: z.boolean().optional(), weekStartsOn: z.number().int().min(0).max(6).optional(), horizonDays: z.number().int().min(7).max(90).optional(), state: z.enum(['draft', 'published', 'archived']).optional(), })`

**routineSchemas.dutyReassignSchema**

`z.object({ toMembershipId: objectId, reason: z.string().trim().max(500).optional(), })`

**routineSchemas.swapCreateSchema**

`z.object({ assignmentId: objectId, toMembershipId: objectId.optional(), // null = open offer reason: z.string().trim().max(500).optional(), })`

**routineSchemas.swapRespondSchema**

`z.object({ accept: z.boolean(), reason: z.string().trim().max(500).optional(), })`

**routineSchemas.menuPlanCreateSchema**

`z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'), isTemplate: z.boolean().optional(), days: z.array(z.object({ weekday: z.number().int().min(0).max(6), slots: z.object({ breakfast: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(), lunch: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(), snacks: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(), dinner: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(), }).optional(), cookMembershipId: objectId.optional(), estCostPoisha: z.number().int().min(0).optional(), note: z.string().max(300).optional(), })).optional(), })`

**routineSchemas.noteCreateSchema**

`z.object({ kind: z.enum(NOTE_KINDS).optional(), title: z.string().trim().min(1).max(120), body: z.string().trim().max(2000).optional(), audience: z.object({ type: z.enum(['all', 'members', 'role']).optional(), membershipIds: z.array(objectId).optional(), roles: z.array(z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member'])).optional(), }).optional(), pinned: z.boolean().optional(), validFrom: z.string().datetime().optional(), validUntil: z.string().datetime().optional(), absence: z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), }).optional(), tasks: z.array(z.object({ text: z.string().trim().max(200), assigneeMembershipId: objectId.optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), })).max(20).optional(), })`

**routineSchemas.NOTE_KINDS**

`['note', 'announcement', 'handover', 'alert']`

**routineSchemas.noteIdParam**

`z.object({ groupId: objectId, noteId: objectId })`

**routineSchemas.noteUpdateSchema**

`z.object({ title: z.string().trim().min(1).max(120).optional(), body: z.string().trim().max(2000).optional(), kind: z.enum(NOTE_KINDS).optional(), audience: z.object({ type: z.enum(['all', 'members', 'role']).optional(), membershipIds: z.array(objectId).optional(), roles: z.array(z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member'])).optional(), }).optional(), pinned: z.boolean().optional(), validFrom: z.string().datetime().optional(), validUntil: z.string().datetime().optional(), absence: z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), }).optional(), tasks: z.array(z.object({ _id: z.string().optional(), text: z.string().trim().max(200).optional(), assigneeMembershipId: objectId.optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), status: z.enum(['open', 'claimed', 'done']).optional(), claimedBy: objectId.optional(), doneBy: objectId.optional(), })).max(20).optional(), state: z.enum(['active', 'archived', 'deleted']).optional(), })`

**routineSchemas.noteTaskParam**

`z.object({ groupId: objectId, noteId: objectId, taskId: z.string().min(8) })`

**shoppingListRoutes.groupIdParam**

`z.object({ groupId: objectIdSchema })`

**shoppingListRoutes.itemSchema**

`z.object({ name: z.string().trim().min(1).max(120), quantity: z.string().trim().max(40).optional().default(''), unit: z.string().trim().max(20).optional().default(''), estimatedPricePoisha: z.number().int().nonnegative().optional().default(0), note: z.string().trim().max(300).optional().default(''), })`

**shoppingListController.itemSchema**

`z.object({ name: z.string().trim().min(1).max(120), quantity: z.string().trim().max(40).optional().default(''), unit: z.string().trim().max(20).optional().default(''), estimatedPricePoisha: z.number().int().nonnegative().optional().default(0), note: z.string().trim().max(300).optional().default(''), })`

**shoppingListRoutes.itemIdParam**

`z.object({ itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id') })`

**shoppingListRoutes.itemCheckSchema**

`z.object({ itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id'), checked: z.boolean(), })`

**shoppingListController.itemCheckSchema**

`z.object({ itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id'), checked: z.boolean(), })`

**shoppingListRoutes.toExpenseSchema**

`z.object({ expenseDescription: z.string().trim().min(1).max(200).optional().default('Bazar (from shopping list)'), categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category id').optional(), paidBy: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id').optional(), })`

**shoppingListController.toExpenseSchema**

`z.object({ expenseDescription: z.string().trim().min(1).max(200).optional().default('Bazar (from shopping list)'), categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category id').optional(), paidBy: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id').optional(), })`

**kitchenInventoryRoutes.groupIdParam**

`z.object({ groupId: objectIdSchema })`

**kitchenInventoryRoutes.itemCreateSchema**

`z.object({ name: z.string().trim().min(1).max(80), unit: z.string().trim().max(20).optional().default(''), currentStock: z.number().nonnegative().optional().default(0), reorderThreshold: z.number().nonnegative().optional().default(0), averageConsumptionPerDay: z.number().nonnegative().optional().default(0), })`

**kitchenInventoryController.itemCreateSchema**

`z.object({ name: z.string().trim().min(1).max(80), unit: z.string().trim().max(20).optional().default(''), currentStock: z.number().nonnegative().optional().default(0), reorderThreshold: z.number().nonnegative().optional().default(0), averageConsumptionPerDay: z.number().nonnegative().optional().default(0), })`

**kitchenInventoryRoutes.itemIdParam**

`z.object({ itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id') })`

**kitchenInventoryRoutes.itemUpdateSchema**

`z.object({ currentStock: z.number().nonnegative().optional(), reorderThreshold: z.number().nonnegative().optional(), averageConsumptionPerDay: z.number().nonnegative().optional(), isActive: z.boolean().optional(), })`

**kitchenInventoryController.itemUpdateSchema**

`z.object({ currentStock: z.number().nonnegative().optional(), reorderThreshold: z.number().nonnegative().optional(), averageConsumptionPerDay: z.number().nonnegative().optional(), isActive: z.boolean().optional(), })`

**kitchenInventoryRoutes.refillSchema**

`z.object({ quantity: z.number().positive(), unit: z.string().trim().max(20).optional().default(''), costPoisha: z.number().nonnegative().optional().default(0), note: z.string().trim().max(200).optional().default(''), })`

**kitchenInventoryController.refillSchema**

`z.object({ quantity: z.number().positive(), unit: z.string().trim().max(20).optional().default(''), costPoisha: z.number().nonnegative().optional().default(0), note: z.string().trim().max(200).optional().default(''), })`

**pollRoutes.groupIdParam**

`z.object({ groupId: objectIdSchema })`

**pollRoutes.pollCreateSchema**

`z.object({ question: z.string().trim().min(1).max(200), options: z.array(z.string().trim().min(1).max(120)).min(2).max(6), expiresAt: z.string().datetime(), relatedMenuItem: z.string().trim().max(120).optional().default(''), })`

**pollController.pollCreateSchema**

`z.object({ question: z.string().trim().min(1).max(200), options: z.array(z.string().trim().min(1).max(120)).min(2).max(6), expiresAt: z.string().datetime(), relatedMenuItem: z.string().trim().max(120).optional().default(''), })`

**pollRoutes.voteSchema**

`z.object({ optionIndex: z.number().int().min(0).max(5), })`

**pollController.voteSchema**

`z.object({ optionIndex: z.number().int().min(0).max(5), })`

