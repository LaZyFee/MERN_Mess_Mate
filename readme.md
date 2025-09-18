# MERN Mess Meal & Cost Tracking Web App

## Complete Project Development Plan

## 📋 Project Overview

This project aims to digitize mess meal and cost tracking from Excel sheets into a modern, collaborative web application. A "mess" refers to a shared living arrangement (hostels, group homes) where residents track daily meals and shared expenses collectively.

### 🎯 Key Objectives

- Replace manual Excel tracking with automated calculations
- Enable multi-user collaboration with role-based access
- Provide real-time updates and instant balance calculations
- Export data to Excel/PDF for record keeping
- Support multiple independent mess groups

---

## 🏗️ Tech Stack (MERN)

### Frontend

- **React.js** - User interface and components
- **Tailwind CSS / Material-UI** - Styling and responsive design
- **Axios** - API communication
- **React Router** - Navigation
- **Chart.js** - Data visualization (optional)

### Backend

- **Node.js + Express.js** - Server and API endpoints
- **JWT** - Authentication and session management
- **Bcryptjs** - Password hashing
- **CORS** - Cross-origin requests

### Database

- **MongoDB** - Primary database
- **Mongoose** - ODM for MongoDB

### Additional Tools

- **XLSX.js / SheetJS** - Excel export functionality
- **PDFKit / jsPDF** - PDF report generation
- **Nodemailer** - Email notifications (optional)
- **Socket.io** - Real-time updates (optional)

---

## 💾 Database Schema Design

### User Collection

```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  messGroups: [{
    groupId: ObjectId,
    role: String // 'admin' or 'member'
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### MessGroup Collection

```javascript
{
  _id: ObjectId,
  name: String, // "August Mess 2024"
  code: String (unique), // Join code for group
  admin: ObjectId, // Reference to User
  members: [{
    userId: ObjectId,
    joinedAt: Date,
    status: String // 'active', 'inactive'
  }],
  pendingRequests: [ObjectId], // Users requesting to join
  currentMonth: String, // "2024-08"
  isActive: Boolean,
  createdAt: Date
}
```

### Meal Collection

```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  userId: ObjectId,
  date: Date,
  lunch: Number, // 0, 0.5, 1, 1.5, 2
  dinner: Number, // 0, 0.5, 1, 1.5, 2
  totalMeals: Number, // lunch + dinner
  month: String, // "2024-08"
  createdAt: Date,
  updatedAt: Date
}
```

### Expense Collection

```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  userId: ObjectId, // Who paid
  date: Date,
  amount: Number,
  description: String, // "Bazaar", "Vegetables", etc.
  category: String, // "groceries", "utilities", "extras"
  month: String, // "2024-08"
  createdAt: Date,
  updatedAt: Date
}
```

### Monthly Summary Collection

```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  month: String, // "2024-08"
  totalMeals: Number,
  totalExpenses: Number,
  mealRate: Number, // totalExpenses / totalMeals
  userSummaries: [{
    userId: ObjectId,
    totalMeals: Number,
    totalExpenses: Number,
    mealCost: Number, // totalMeals * mealRate
    balance: Number, // totalExpenses - mealCost
    status: String // "owes" or "receives"
  }],
  extras: [{ // Fixed monthly costs
    name: String, // "Gas", "Wifi", "Rent"
    amount: Number
  }],
  isFinalized: Boolean,
  createdAt: Date
}
```

---

## 🔑 Core Features & Implementation

### 1. Authentication System

#### What You Must Do:

- **User Registration/Login**
  - Email/password authentication
  - JWT token generation and validation
  - Password hashing with bcrypt
  - Refresh token mechanism

#### Implementation Steps:

```javascript
// Backend Routes
POST / api / auth / register;
POST / api / auth / login;
POST / api / auth / refresh - token;
POST / api / auth / logout;
GET / api / auth / profile;
```

#### What You Can Add:

- Google OAuth login
- Password reset via email
- Account verification

### 2. Mess Group Management

#### Core Functionality:

- **Create Mess Group** (user becomes admin)
- **Generate unique join codes**
- **Member invitation system**
- **Join request approval**

#### API Endpoints:

```javascript
POST /api/mess/create
POST /api/mess/join-request/:groupId
PUT  /api/mess/approve-request/:groupId/:userId
GET  /api/mess/my-groups
DELETE /api/mess/remove-member/:groupId/:userId
```

### 3. Daily Data Entry

#### Meal Entry System:

- Simple form with date picker
- Dropdown for meal counts (0, 0.5, 1, 1.5, 2)
- Separate fields for lunch and dinner
- Auto-calculation of total meals

#### Expense Entry System:

- Amount input with validation
- Description field
- Category selection
- Date picker (defaults to today)

#### API Endpoints:

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

### 4. Automatic Calculations

#### Real-time Processing:

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

#### API Endpoints:

```javascript
GET /api/summary/group/:groupId/month/:month
POST /api/summary/finalize/:groupId/:month
```

### 5. Data Visualization Dashboard

#### User Dashboard Features:

- **Current month overview**
- **Personal meal count & expenses**
- **Balance status (owes/receives)**
- **Recent activities**

#### Group Dashboard Features:

- **Monthly summary table**
- **Member-wise breakdown**
- **Daily entries view**
- **Export options**

---

## 📱 Frontend User Interface

### 1. Authentication Pages

- **Login Page**: Email, password, remember me
- **Register Page**: Username, email, password, confirm password
- **Profile Page**: Edit profile, change password

### 2. Dashboard Pages

- **Home Dashboard**: Overview of all joined mess groups
- **Group Dashboard**: Specific mess group details
- **Add Entry Page**: Quick meal/expense entry forms

### 3. Group Management Pages

- **Create Group**: Group name, initial settings
- **Manage Members**: View members, approve requests, remove users
- **Group Settings**: Edit group details, generate new join codes

### 4. Reports & Export

- **Monthly Report**: Detailed breakdown with charts
- **Export Options**: Excel, PDF download buttons
- **History**: Previous months' data

---

## 🔄 User Workflow

### For Admin (Group Creator):

1. **Register/Login** → Create mess group → Get join code
2. **Share join code** with members
3. **Approve join requests** from members
4. **Monitor daily entries** and make corrections if needed
5. **Finalize monthly summary** at month-end
6. **Generate and share reports**

### For Members:

1. **Register/Login** → Request to join group using code
2. **Wait for admin approval**
3. **Daily entry**: Log meals and expenses
4. **View personal and group summaries**
5. **Check balance status** (how much to pay/receive)

---

## 📊 Advanced Features (What Better You Can Do)

### 1. Real-time Updates

- **Socket.io integration** for live updates
- **Instant calculation** when data changes
- **Live member activity** indicators

### 2. Mobile Optimization

- **Progressive Web App (PWA)** features
- **Offline data entry** with sync
- **Push notifications** for reminders

### 3. Analytics & Insights

- **Cost trend analysis** over months
- **Meal consumption patterns**
- **Budget forecasting**
- **Member contribution analytics**

### 4. Enhanced UX Features

- **Dark/Light theme toggle**
- **Multi-language support** (English, Bengali)
- **Keyboard shortcuts** for quick entry
- **Bulk data import** from Excel/CSV

### 5. Integration Capabilities

- **Payment gateway integration** (Stripe, PayPal)
- **WhatsApp notifications** for balance updates
- **Calendar integration** for meal planning
- **Bank account linking** for expense tracking

---

## 🚀 Development Roadmap

### Phase 1: MVP (2-3 months)

- [ ] User authentication system
- [ ] Basic mess group creation and management
- [ ] Simple meal and expense entry forms
- [ ] Basic calculation engine
- [ ] Essential dashboard views

### Phase 2: Core Features (2-3 months)

- [ ] Advanced group management
- [ ] Data export functionality
- [ ] Responsive mobile design
- [ ] Email notifications
- [ ] Data validation and error handling

### Phase 3: Advanced Features (2-4 months)

- [ ] Real-time updates
- [ ] Charts and analytics
- [ ] PWA features
- [ ] Payment integration
- [ ] Advanced reporting

### Phase 4: Optimization (1-2 months)

- [ ] Performance optimization
- [ ] Security hardening
- [ ] Bug fixes and refinements
- [ ] User feedback implementation
