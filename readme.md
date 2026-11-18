
# MealMate — Backend Documentation & Development Plan
 
*MERN Mess Meal & Cost Tracking Web App*
 
## Contents
 
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Backend Project Structure](#3-backend-project-structure-implemented)
4. [Database Schema Design](#4-database-schema-design)
5. [API Reference (implemented)](#5-api-reference-implemented)
6. [How the Money Works](#6-how-the-money-works)
7. [Realtime, Filters & Indexing](#7-realtime-filters--indexing)
8. [Security Measures](#8-security-measures-implemented)
9. [Core Features & Implementation Plan (original plan)](#9-core-features--implementation-plan-original-plan)
10. [Frontend User Interface](#10-frontend-user-interface)
11. [User Workflow](#11-user-workflow)
12. [Roadmap / Remaining Work](#12-roadmap--remaining-work)
13. [Advanced Features](#13-advanced-features-what-better-you-can-do)
14. [Environment Variables](#14-environment-variables-env)
---
 
## 1. Project Overview
 
This project digitizes mess meal and cost tracking from Excel sheets into a modern, collaborative web application. A "mess" refers to a shared living arrangement (hostels, group homes) where residents track daily meals and shared expenses collectively.
 
### Key Objectives
 
- Replace manual Excel tracking with automated calculations
- Enable multi-user collaboration with role-based access
- Provide real-time updates and instant balance calculations
- Export data to Excel/PDF for record keeping
- Support multiple independent mess groups
---
 
## 2. Tech Stack
 
### 2.1 Overall MERN Stack (planned)
 
**Frontend**
 
- **React.js** — User interface and components
- **Tailwind CSSI** — Styling and responsive design
- **Axios** — API communication
- **React Router** — Navigation
- **Chart.js** — Data visualization (optional)
**Backend**
 
- **Node.js + Express.js** — Server and API endpoints
- **JWT** — Authentication and session management
- **Bcryptjs** — Password hashing
- **CORS** — Cross-origin requests
**Database**
 
- **MongoDB** — Primary database
- **Mongoose** — ODM for MongoDB
**Additional Tools**
 
- **XLSX.js / SheetJS** — Excel export functionality
- **PDFKit / jsPDF** — PDF report generation
- **Nodemailer** — Email notifications (optional)
- **Socket.io** — Real-time updates (optional)
### 2.2 Backend Tech Stack (as implemented)
 
- **Node.js + Express 5** — REST API
- **MongoDB + Mongoose** — data layer
- **Zod** — request validation (body + params), with Mongo-operator stripping
- **JWT** — short-lived access tokens (1h) + rotating refresh tokens (7d)
- **bcryptjs** — password hashing
- **Helmet / hpp / CORS allowlist** — security headers & hardening
- **express-rate-limit** — 20 req/15min on auth, 300 req/15min general
- **ExcelJS** — Excel export (replaced unmaintained SheetJS/xlsx)
- **PDFKit** — PDF report export
- **Nodemailer** — password reset / verification / group invite emails
- **Socket.IO** — JWT-authenticated realtime group rooms
- **Multer + Cloudinary** — profile picture upload
---
 
## 3. Backend Project Structure (implemented)
 
```
Server/
├── config/
│   ├── db.js               # MongoDB connection
│   ├── cloudinary.js       # Cloudinary SDK config (profile pics)
│   └── passportJs.js       # Google OAuth strategy
├── controllers/
│   ├── userController.js       # auth, tokens, reset, profile-pic, whatsapp profile
│   ├── messGroupController.js  # groups, join codes, extras, exports
│   ├── mealController.js       # meal CRUD (upsert per day) + filters
│   ├── expenseController.js    # expense CRUD + category refs + filters
│   ├── expenseCategoryController.js  # admin-managed categories per group
│   ├── paymentNoteController.js      # admin payment notes (member read-only)
│   ├── summaryController.js    # monthly summary compute + finalize + WhatsApp
│   └── statsController.js      # monthly/yearly aggregates for charts
├── middleware/
│   ├── auth.js             # JWT access-token guard
│   ├── roles.js            # requireGroupRole('admin'|'member') + allowSelfOrAdmin
│   └── upload.js           # multer (image-only, 5MB, in-memory)
├── models/
│   ├── User.js             # + refresh token hash, reset/verify tokens, whatsapp
│   ├── MessGroup.js        # + unique join code, extras, embedded entries (legacy)
│   ├── Meal.js             # per user/group/day, totalMeals auto-computed
│   ├── Expense.js          # categorized expenses, month-scoped, categoryId ref
│   ├── ExpenseCategory.js  # admin-managed per-group categories (splitMode equal|meal)
│   ├── PaymentNote.js      # admin payment notes per member per month
│   └── MonthlySummary.js   # frozen snapshot per group/month
├── routes/
│   ├── userRoutes.js
│   ├── messGroupRoutes.js
│   ├── mealRoutes.js
│   ├── expenseRoutes.js
│   ├── summaryRoutes.js
│   └── statsRoutes.js
├── utils/
│   ├── tokens.js           # access/refresh signing, rotation, hashing
│   ├── mailer.js           # Nodemailer templates
│   └── whatsapp.js         # wa.me deep links + optional Cloud API sender
├── validation/
│   ├── schemas.js          # all Zod schemas (incl. filters, stats, notes)
│   └── validate.js         # Zod validate middleware + NoSQL-injection sanitizer
└── index.js                # Express 5 app, Helmet, CORS allowlist, Socket.IO
```
 
---
 
## 4. Database Schema Design
 
### 4.1 User Collection
 
```javascript
{
  _id: ObjectId,
  googleId: String,
  username: String,
  email: String (unique),
  phone: String,
  whatsapp: String,       // optional, e.g. "8801712345678" — used for WA month-end summaries
  password: String (hashed, absent for Google users),
  profilePic: String (Cloudinary URL),
  refreshToken: String (sha256 hash — rotation guard),
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verifyEmailToken: String,
  isVerified: Boolean,
  messGroups: [ObjectId],
  createdAt: Date, updatedAt: Date
}
```
 
### 4.2 MessGroup Collection
 
```javascript
{
  _id: ObjectId,
  name: String,
  code: String (unique),       // "MM-7K2QPX" — no ambiguous chars
  admin: ObjectId (User),
  members: [{ user: ObjectId, role: 'admin'|'member' }],
  pendingRequests: [ObjectId],
  extras: [{ name: String, amount: Number }],
  entries: [ ... ]             // legacy embedded entries (superseded by Meal/Expense)
}
```
 
### 4.3 Meal Collection ✨
 
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  userId: ObjectId,
  date: Date,
  lunch: Number,       // 0, 0.5, 1, 1.5, 2
  dinner: Number,      // 0, 0.5, 1, 1.5, 2
  totalMeals: Number,  // auto: lunch + dinner
  month: String,       // "2024-08" — derived, never trusted from client
  createdAt: Date, updatedAt: Date
}
// unique index: { groupId, userId, date } — one doc per user per day
```
 
### 4.4 Expense Collection ✨
 
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  userId: ObjectId,     // who paid
  date: Date,
  amount: Number,
  description: String,
  category: String,     // legacy enum: groceries | utilities | extras | rent | other
  categoryId: ObjectId, // optional ref to group-managed ExpenseCategory (takes precedence)
  month: String,        // "2024-08"
  createdAt: Date, updatedAt: Date
}
```
 
### 4.5 ExpenseCategory Collection ✨ (new)
 
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  name: String,         // "Home Rent", "Gas Bill", "Electricity Bill", "Dust Bill"...
  icon: String,         // optional emoji for UI
  splitMode: String,    // 'equal' → divided equally among all members (rent/bills)
                        // 'meal'  → split by meal share (bazar-type costs)
  createdBy: ObjectId,
  isArchived: Boolean   // archived categories stay in old summaries
}
// unique index: { groupId, name }
```
 
### 4.6 PaymentNote Collection ✨ (new)
 
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  userId: ObjectId,     // the member the note is about
  month: String,        // "2024-08"
  note: String,         // admin's payment note (created AND edited by admin only)
  amountDue: Number,    // snapshot when note was written
  isPaid: Boolean,
  paidAt: Date,
  createdBy: ObjectId   // admin who wrote it
}
// unique index: { groupId, userId, month } — one editable note per member per month
```
 
### 4.7 MonthlySummary Collection ✨
 
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  month: String,              // "2024-08"
  totalMeals: Number,
  totalExpenses: Number,      // expenses + extras
  mealRate: Number,           // totalExpenses / totalMeals
  userSummaries: [{
    userId: ObjectId,
    totalMeals, totalExpenses, mealCost, balance,
    status: 'owes' | 'receives' | 'settled'
  }],
  extras: [{ name, amount }],
  isFinalized: Boolean        // admin freezes the month
}
// unique index: { groupId, month }
```
 
---
 
## 5. API Reference (implemented)
 
All routes are prefixed with `/api`. Auth via the `x-auth-token` header (access JWT).
 
### 5.1 Authentication — `/api/users`
 
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register. Returns `user`, `accessToken`, `refreshToken`. Sends verification email if SMTP configured. |
| POST | `/login` | — | Login. Returns token pair. |
| POST | `/refresh` | — | Exchange refresh token for a new pair. **Rotation**: used tokens are invalidated; reuse returns 401. |
| POST | `/logout` | — | Invalidates the stored refresh token. |
| GET | `/profile` | ✅ | Current user (sanitized fields). |
| PUT | `/profile` | ✅ | Update `username?`, `phone?`, `whatsapp?` (WhatsApp number used for month-end summaries). |
| POST | `/change-password` | ✅ | `{ currentPassword, newPassword }` |
| POST | `/forgot-password` | — | Always 200 (no user enumeration). Sends reset link, 15-min expiry. |
| POST | `/reset-password` | — | `{ token, password }`. Invalidates all sessions. |
| GET | `/verify-email/:token` | — | Marks account verified. |
| POST | `/profile-pic` | ✅ | multipart field `image` (JPEG/PNG/WebP, ≤5MB) → Cloudinary. |
| GET | `/auth/google` / `/auth/google/callback` | — | Google OAuth → redirect with token pair. |
 
### 5.2 Mess Groups — `/api/messgroups`
 
**Group lifecycle & membership**
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/create` | user | Creates group, assigns `MM-XXXXXX` join code. Creator = admin. |
| POST | `/join-by-code` | user | `{ code }` → adds to pendingRequests. |
| POST | `/join-request/:groupId` | user | Legacy join-request by groupId. |
| GET | `/my-groups` | user | Groups **the user belongs to** (no global leak). |
| POST | `/approve/:groupId/:userId` | admin | Approve pending request. |
| POST | `/add-member/:groupId` | admin | Add user directly `{ userId, role }`. |
| DELETE | `/remove-member/:groupId/:userId` | admin/self | Kick member, or self-leave. Admin protected. |
| GET | `/:groupId` | member | Group detail with populated users. |
 
**Join codes & invites**
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/code/:groupId` | admin | View current join code. |
| POST | `/regenerate-code/:groupId` | admin | Rotate code (old links die). |
| POST | `/invite/:groupId` | admin | Email invite `{ email }` with join link (Nodemailer). |
 
**Expense categories**
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/categories/:groupId` | admin | Create expense category `{ name, icon?, splitMode: 'equal'\|'meal' }`. |
| GET | `/categories/:groupId` | member | List group's active categories. |
| PUT | `/categories/:groupId/:categoryId` | admin | Rename / change split mode / icon. |
| DELETE | `/categories/:groupId/:categoryId` | admin | Archive category (old summaries keep it). |
 
**Extras (fixed costs)**
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/extras/:groupId` | admin | Add fixed cost `{ name, amount }`. |
| GET | `/extras/:groupId` | member | List extras. |
| DELETE | `/extras/:groupId/:extraId` | admin | Remove extra. |
 
**Payment notes**
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| PUT | `/payment-note/:groupId/:userId/:month` | admin | Create **or edit** member's month payment note `{ note, amountDue?, isPaid? }`. |
| GET | `/payment-note/:groupId/:userId/:month` | admin/self | View a payment note (members can only view their own). |
| GET | `/payment-notes/:groupId/:month` | admin | All members' notes for a month. |
 
**Totals & exports**
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/entries/:groupId` | member | Legacy embedded entries. |
| GET | `/calculate/:groupId` | member | All-time totals + per-member balances. |
| GET | `/export/:groupId` | member | Excel (.xlsx) download — ExcelJS. |
| GET | `/pdf/:groupId` | member | PDF report download — PDFKit. |
 
### 5.3 Meals — `/api/meals`
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/:groupId` | member | Upsert own meal for a date `{ date?, lunch, dinner }`. Defaults to today. |
| PUT | `/entry/:id` | owner | Update own entry. |
| GET | `/:groupId/:month` | member | Group meals for `YYYY-MM`. |
| DELETE | `/entry/:id` | owner/admin | Delete entry. |
 
### 5.4 Expenses — `/api/expenses`
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/:groupId` | member | Add expense `{ date?, amount, description?, category?, categoryId? }`. `categoryId` (admin-created category) wins over legacy enum. |
| PUT | `/entry/:id` | payer | Update own expense. |
| GET | `/:groupId` | member | Filtered list: `?month=` OR `?from=&to=`, `&userId=`, `&categoryId=`, `&category=`. |
| GET | `/:groupId/:month` | member | Group expenses for month. |
| DELETE | `/entry/:id` | payer/admin | Delete expense. |
 
### 5.5 Summary — `/api/summary`
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/:groupId/:month` | member | Live computation from Meal+Expense (+categories & extras). If finalized, returns the frozen snapshot. Includes per-member `mealCost`, `otherCost` (per-category shares), `totalDue`. |
| POST | `/finalize/:groupId/:month` | admin | Freezes the month into MonthlySummary (upsert). |
| GET | `/whatsapp/:groupId/:month` | admin | WhatsApp month-end summaries: wa.me deep links per member (or direct send with Cloud API configured). |
 
### 5.6 Stats — `/api/stats` ✨
 
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/:groupId` | member | Aggregated series for charts. `?granularity=month&year=` → 12 monthly buckets; `?granularity=month&month=` → daily buckets; `?granularity=year` → yearly trend; `&userId=` per-member. Returns `mealsSeries`, `expenseSeries`, `categoryBreakdown`, `totals`. |
 
---
 
## 6. How the Money Works
 
### 6.1 Cost Calculation Model
 
Meal costs and fixed costs are computed **separately**, then linked into one per-person total:
 
```
MEAL COST
  mealRate   = totalMealExpenses (groceries/bazar) ÷ totalMeals
  memberCost = memberMeals × mealRate
  e.g. mealRate 10 × 60 meals = 600
 
CATEGORY COSTS (admin-created: Home Rent, Gas Bill, Electricity Bill, Dust Bill…)
  splitMode 'equal' → categoryTotal ÷ activeMemberCount
  splitMode 'meal'  → categoryTotal ÷ totalMeals × memberMeals
  e.g. {rent 100, gas 50, electricity 70, dust 30} = 250 ÷ 5 members = 50 each
 
TOTAL DUE per member = mealCost + Σ categoryShares
  e.g. 600 (meal) + 50 (others) = 650
```
 
The summary response reports each member's `mealCost`, `otherCost` (itemized per category in `categoryCosts[]`), and `totalDue` — so the UI can show "650 total: 600 for meals + 50 for others".
 
### 6.2 Payment Notes (new)
 
- Admin creates/edits a monthly note per member (e.g. "Please pay by the 5th"). One note per member per month — editing updates the same note.
- Members can **view only their own** note; reading another member's note → 403.
- `isPaid` flag + `paidAt` let admins track settlements.
### 6.3 WhatsApp Notifications (new)
 
- Users **optionally** save a WhatsApp number at registration or via `PUT /api/users/profile`.
- After finalizing a month, the admin calls `GET /api/summary/whatsapp/:groupId/:month`:
  - **Default (zero-config):** returns a `wa.me` deep link per member with the full pre-filled summary message (meals × rate, other costs, total due, paid, owes/receives, admin note). Admin just clicks to send.
  - **Optional Cloud API:** set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` in `.env` and the server sends the messages directly.
- Members without a WhatsApp number are skipped with a reason.
---
 
## 7. Realtime, Filters & Indexing
 
### 7.1 Realtime — Socket.IO
 
- Handshake requires a valid access token (`socket.handshake.auth.token`)
- Client emits `join-group` / `leave-group` with a groupId
- Server emits `meal-updated` and `expense-updated` to `group:<id>` rooms when entries change
### 7.2 Filter Support (query params)
 
Collection endpoints accept these query filters (validated with Zod):
 
| Endpoint | Filters |
|---|---|
| `GET /api/meals/:groupId` | `?month=YYYY-MM` OR `?from=&to=`, `&userId=` |
| `GET /api/expenses/:groupId` | `?month=` OR `?from=&to=`, `&userId=`, `&categoryId=`, `&category=` |
| `GET /api/stats/:groupId` | `?granularity=month\|year`, `&year=`, `&month=`, `&userId=` |
 
Rules: `month` and `from/to` are mutually exclusive; `from` must be ≤ `to`.
 
### 7.3 Optimization & Indexing
 
| Collection | Indexes |
|---|---|
| Meal | `{groupId, userId, date}` unique · `{groupId, month}` |
| Expense | `{groupId, month}` · `{groupId, userId}` · `{groupId, categoryId, month}` |
| ExpenseCategory | `{groupId, name}` unique · `{groupId}` |
| PaymentNote | `{groupId, userId, month}` unique · `{groupId}` |
| MonthlySummary | `{groupId, month}` unique |
| User | email unique · `{googleId}` · `{createdAt}` |
| MessGroup | code unique · `{admin}` · `{members.user}` |
 
Also: aggregation pipelines (stats) use `$match`-first stages so indexes apply; `.lean()` on read-heavy list endpoints; month strings allow cheap index-friendly range queries (`^2026-`).
 
---
 
## 8. Security Measures (implemented)
 
1. **Zod validation everywhere** — strict schemas for all body & route params (ObjectId regex, meal values limited to 0/0.5/1/1.5/2, strong password rules: 8+ chars with upper/lower/digit).
2. **NoSQL injection defense** — `$`/`.` keys stripped from all input before validation.
3. **Role-based access control** — `requireGroupRole('admin'|'member')` middleware; write endpoints check `allowSelfOrAdmin`; extras/invite/regenerate-code are admin-only.
4. **Refresh-token rotation** — refresh tokens stored as sha256 hashes; reuse of an old token fails; logout clears the stored hash; password reset invalidates all sessions.
5. **Rate limiting** — strict limiter (20/15min) on auth routes (brute-force protection); general limiter (300/15min).
6. **Strict CORS allowlist** — `FRONTEND_URL` origins only; no wildcard; explicit method list.
7. **Helmet** security headers; **hpp** against parameter pollution; 10kb body limit.
8. **No data leakage** — password hashes, refresh/reset/verify tokens never leave the server; generic "Invalid Credentials"; forgot-password always 200; error handler hides `err.message`.
9. **Month derived server-side** from dates — clients can't spoof month scoping.
10. **Upload hardening** — mimetype allowlist + 5MB cap, streamed to Cloudinary.
11. **Dependency audit clean** — 0 vulnerabilities (`uuid` override pins exceljs's transitive dep to v11).
---
 
## 9. Core Features & Implementation Plan (original plan)
 
> Note: the endpoint paths in this section are from the original plan. The implemented routes are listed in Section 5.
 
### 9.1 Authentication System
 
**What you must do:**
 
- User registration/login
  - Email/password authentication
  - JWT token generation and validation
  - Password hashing with bcrypt
  - Refresh token mechanism
**Implementation steps:**
 
```javascript
// Backend Routes
POST / api / auth / register;
POST / api / auth / login;
POST / api / auth / refresh - token;
POST / api / auth / logout;
GET / api / auth / profile;
```
 
**What you can add:**
 
- Google OAuth login
- Password reset via email
- Account verification
### 9.2 Mess Group Management
 
**Core functionality:**
 
- **Create Mess Group** (user becomes admin)
- **Generate unique join codes**
- **Member invitation system**
- **Join request approval**
**API endpoints:**
 
```javascript
POST /api/mess/create
POST /api/mess/join-request/:groupId
PUT  /api/mess/approve-request/:groupId/:userId
GET  /api/mess/my-groups
DELETE /api/mess/remove-member/:groupId/:userId
```
 
### 9.3 Daily Data Entry
 
**Meal entry system:**
 
- Simple form with date picker
- Dropdown for meal counts (0, 0.5, 1, 1.5, 2)
- Separate fields for lunch and dinner
- Auto-calculation of total meals
**Expense entry system:**
 
- Amount input with validation
- Description field
- Category selection
- Date picker (defaults to today)
**API endpoints:**
 
```javascript
POST /api/meals/add
PUT  /api/meals/update/:id
GET  /api/meals/group/:groupId/month/:month
DELETE /api/meals/:id
 
POST /api/expenses/add
PUT  /api/expenses/update/:id
GET  /api/expenses/group/:groupId/month/:month
DELETE /api/expenses/:id
```
 
### 9.4 Automatic Calculations
 
**Real-time processing:**
 
```javascript
// Calculate monthly summary
function calculateMonthlySummary(groupId, month) {
  const totalMeals = sum(all meals for group in month);
  const totalExpenses = sum(all expenses for group in month);
  const mealRate = totalExpenses / totalMeals;
 
  // For each user
  const userMealCost = userTotalMeals * mealRate;
  const userBalance = userTotalExpenses - userMealCost;
 
  return summary;
}
```
 
**API endpoints:**
 
```javascript
GET /api/summary/group/:groupId/month/:month
POST /api/summary/finalize/:groupId/:month
```
 
### 9.5 Data Visualization Dashboard
 
**User dashboard features:**
 
- Current month overview
- Personal meal count & expenses
- Balance status (owes/receives)
- Recent activities
**Group dashboard features:**
 
- Monthly summary table
- Member-wise breakdown
- Daily entries view
- Export options
---
 
## 10. Frontend User Interface
 
### 10.1 Authentication Pages
 
- **Login Page**: Email, password, remember me
- **Register Page**: Username, email, password, confirm password
- **Profile Page**: Edit profile, change password
### 10.2 Dashboard Pages
 
- **Home Dashboard**: Overview of all joined mess groups
- **Group Dashboard**: Specific mess group details
- **Add Entry Page**: Quick meal/expense entry forms
### 10.3 Group Management Pages
 
- **Create Group**: Group name, initial settings
- **Manage Members**: View members, approve requests, remove users
- **Group Settings**: Edit group details, generate new join codes
### 10.4 Reports & Export
 
- **Monthly Report**: Detailed breakdown with charts
- **Export Options**: Excel, PDF download buttons
- **History**: Previous months' data
---
 
## 11. User Workflow
 
### For Admin (Group Creator)
 
1. **Register/Login** → Create mess group → Get join code
2. **Share join code** with members
3. **Approve join requests** from members
4. **Monitor daily entries** and make corrections if needed
5. **Finalize monthly summary** at month-end
6. **Generate and share reports**
### For Members
 
1. **Register/Login** → Request to join group using code
2. **Wait for admin approval**
3. **Daily entry**: Log meals and expenses
4. **View personal and group summaries**
5. **Check balance status** (how much to pay/receive)
---
 
## 12. Roadmap / Remaining Work
 
### Phase: Frontend Integration (next)
 
- [ ] Axios client with access-token header + auto-refresh on 401 (retry queue)
- [ ] Socket.IO client: `join-group` per open group page, listen for `meal-updated`/`expense-updated`
- [ ] Register/Login/Reset/Verify pages consuming the new token-pair flow (+ optional WhatsApp field)
- [ ] Group pages: join-by-code input, admin panel (approve/remove/extras/categories/code regenerate)
- [ ] Category manager UI (create Home Rent / Gas Bill / etc. with splitMode picker)
- [ ] Summary page showing per-member `mealCost + otherCost = totalDue` breakdown
- [ ] Charts page consuming `/api/stats` (monthly/yearly filters, category pie)
- [ ] Payment notes UI (admin editor, member read-only view, isPaid toggle)
- [ ] WhatsApp send panel (list wa.me links after finalize, click-to-send)
### Phase: Enhancement
 
- [ ] Charts & analytics (Chart.js on summary data)
- [ ] PWA (offline entry with sync)
- [ ] Bulk import from Excel/CSV
- [ ] Multi-language (English, Bengali)
- [ ] Payment integration (settle-up tracking) — PaymentNote.isPaid is the foundation
- [ ] WhatsApp Cloud API production setup (template messages for >24h windows)
### Phase: Ops
 
- [ ] Configure real SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) to enable emails
- [ ] Deploy behind HTTPS reverse proxy; set `NODE_ENV=production`
- [ ] Rotate all secrets before deploying (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, Cloudinary keys)
---
 
## 13. Advanced Features (What Better You Can Do)
 
### 13.1 Real-time Updates
 
- **Socket.io integration** for live updates
- **Instant calculation** when data changes
- **Live member activity** indicators
### 13.2 Mobile Optimization
 
- **Progressive Web App (PWA)** features
- **Offline data entry** with sync
- **Push notifications** for reminders
### 13.3 Analytics & Insights
 
- **Cost trend analysis** over months
- **Meal consumption patterns**
- **Budget forecasting**
- **Member contribution analytics**
### 13.4 Enhanced UX Features
 
- **Dark/Light theme toggle**
- **Multi-language support** (English, Bengali)
- **Keyboard shortcuts** for quick entry
- **Bulk data import** from Excel/CSV
### 13.5 Integration Capabilities
 
- **Payment gateway integration** (Stripe, PayPal)
- **WhatsApp notifications** for balance updates
- **Calendar integration** for meal planning
- **Bank account linking** for expense tracking
---
 
## 14. Environment Variables (`.env`)
 
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...           # access tokens
JWT_REFRESH_SECRET=...   # refresh tokens (separate secret!)
SESSION_SECRET=...       # OAuth session cookie
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:5174
SMTP_HOST=               # optional — emails skip silently if empty
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=MealMate <no-reply@mealmate.app>
WHATSAPP_TOKEN=          # optional — WhatsApp Cloud API direct send
WHATSAPP_PHONE_ID=       # optional — your WA business phone number id
```
 
