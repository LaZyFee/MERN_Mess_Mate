# MealMate — User Guide

> Meal, expense and settlement tracking for shared living (mess / bachelor flats).
> This guide describes **how the application actually behaves**, checked against the
> source code. All money is shown in **Taka (৳)**; internally the system stores
> integer **poisha** (1 Taka = 100 poisha).

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Getting started](#2-getting-started)
3. [Roles and permissions](#3-roles-and-permissions)
4. [Meal management](#4-meal-management)
5. [Expense management](#5-expense-management)
6. [Financial calculations](#6-financial-calculations)
7. [Monthly summary and settlement](#7-monthly-summary-and-settlement)
8. [Additional features](#8-additional-features)
9. [Frequently asked questions](#9-frequently-asked-questions)
10. [Troubleshooting and support](#10-troubleshooting-and-support)

---

## 1. Introduction

### What is MealMate?

MealMate replaces the Excel sheet (or the notebook on the kitchen wall) that a mess
group uses to track **who ate what** and **who paid for what**. It keeps meals,
expenses, cash movements and month-end balances in one place so every member can see
the same numbers.

### Why does it exist?

In a shared mess, three things always go wrong:

1. **Meals are remembered, not recorded.** Someone claims they skipped dinner three
   weeks ago and nobody can prove otherwise.
2. **Bazar money is mixed with personal money.** Cash handed to the manager, groceries
   paid from someone's pocket, and the supplier's unpaid bill all get tangled.
3. **The month-end split is disputed.** Each person computes a different "meal rate".

MealMate fixes this by making every number traceable: meals are stored per day and
per slot, every expense needs an approver, every money movement is a recorded
transaction, and each month closes with a **versioned, immutable statement**.

### How does a mess group work?

```
 Sign up ──► Create a group (you become Owner)  ──► Invite members (code or email)
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
 Members log daily meals     Members / treasurer log expenses
 (breakfast / lunch / snacks / dinner,      │
  with ¼ ½ ¾ 1 portions)                    ▼
        │                            Treasurer approves ─► ledger entry
        └──────────────┬─────────────────────┘
                       ▼
        Treasurer confirms money movements (contributions, payouts)
                       ▼
        Owner/treasurer/manager close the month ─► Statement v1
                       ▼
        Balances settle; corrections create Statement v2, v3 …
```

The **calendar month** (`YYYY-MM`) is the accounting period. Everything — meals,
expenses, money — is attached to a month, which is what makes the month-end statement
possible.

---

## 2. Getting started

### 2.1 Registration and login

1. Open the site and choose **Create account**.
2. Fill in **Username** (2–30 characters; letters, numbers, spaces and `_`),
   **Email**, and **Password**. Passwords need at least 8 characters with an
   uppercase letter, a lowercase letter and a number.
3. Verify your email if verification is enabled, then **Sign in**.
4. **Forgot password?** on the login page sends a reset link to your email.

You can also sign in with Google. If you enable two-factor authentication, login adds
a step where you type the 6-digit code from your authenticator app.

### 2.2 Creating a mess

1. From **Home**, choose **Create**.
2. Give the group a name, pick the meal slots you use (breakfast / lunch / snacks /
   dinner) and continue.
3. You become the group's **Owner** and first member.
4. MealMate automatically creates:
   - a **Policy version 1** (meal weights, portion sizes, entry cut-off hour 23:00,
     Asia/Dhaka timezone, approval required),
   - a set of **default expense categories** for Bangladesh (bazar, rent, utilities …).

### 2.3 Joining an existing mess

You need a **6-character join code** (format `MM-XXXXXX`) from an existing member, or
an **invite link**.

1. From **Home**, choose **Join** (or open `/join?code=MM-XXXXXX`).
2. Enter the code. MealMate tells you the code is invalid without revealing whether
   a group exists.
3. Your request goes to the group's manager/owner as a **pending request**. Once it is
   approved you appear in the member list and the group shows on your Home page.

> Group IDs and names are never discoverable. A code is the only way in.

### 2.4 Invitation codes (expiring, limited-use)

Separate from the permanent join code, managers and owners can create a **time-limited
invite code** from **More → Invite people**:

- Choose how many uses it allows and how many days it stays valid.
- The code is shown **once** — copy it immediately. Only a hash is stored.
- Use **Copy code**, **Copy link**, or **Share**.
- **Regenerate** instantly invalidates every link made from the previous code.
- You can also send an email invitation to a specific address.

### 2.5 Understanding the dashboard

Your **Home** page lists every group you belong to with your role. Inside a group the
tabs are:

| Tab | What it shows |
|---|---|
| **Overview** | Current month: approved expenses, contributions, fund assets, outstanding payables, awaiting approval, meal rate, and each member's closing balance |
| **Meals** | Your daily meal entry + the whole-group month grid |
| **Expenses** | Expense workflow (draft → submit → approve) and the paid-amount ledger |
| **Money** | Contributions, payouts, settlements, and fund (cash box / wallet / bank) balances |
| **Statements** | Finalized month-end statements and the month-end close panel |
| **Board** | Routine: duties, weekly menu, notice board, bazar list, kitchen stock, polls |
| **Charts** | Meal / expense / category charts |
| **Members** | Member directory, roles, pending requests |
| **Activity** | Audit trail of who changed what (owner/manager/treasurer/auditor) |
| **More** | Invites, categories, budgets, notifications, disputes, reconciliation, deposit assets |

### 2.6 Profile and account settings

Open **Profile** (bottom navigation → **More**, or `/profile`):

- Change **username**, **phone** and **WhatsApp number**, and upload an avatar.
- **Change password**.
- **Two-factor authentication** — enable with an authenticator app.
- **Active sessions** — see every signed-in device and sign out any of them.
- **Notification preferences** — per notification type, email on/off, quiet hours, and
  a WhatsApp consent toggle.
- **Language** — switch between **English** and **বাংলা** at any time (the toggle in the
  header). The choice is remembered on your device.

---

## 3. Roles and permissions

MealMate implements **five roles**. They are ordered:

`owner` (4) > `manager` (3) > `treasurer` (2) > `auditor` (1) > `member` (0)

A role always includes everything the lower roles can do **except** `auditor`, which is
a special read-only tier.

### What each role means

**Owner**
- Created the group (or was given ownership).
- Can do everything a manager and treasurer can do.
- Exclusive: publish policy versions, finalize a month, hand over fund custody,
  transfer ownership.
- Cannot leave the group while they are the only owner.

**Manager**
- Operational head. Can add members, change roles, close/open the review period,
  build rosters, publish the weekly menu, send invites, manage categories.
- Cannot finalize a statement and cannot change fund custody.

**Treasurer**
- The money person. Can approve/reject/reverse expenses, confirm/reject/reverse money
  transactions, create funds, set budgets, record deposit assets, manage reconciliation
  and send payment reminders.
- Cannot add members or publish the menu.

**Auditor**
- A viewer for people who must be able to check the books.
- Sees everything a member sees (all read screens) but **every write is refused by the
  server**, in every module.

**Member**
- Logs their own meals, creates expense drafts, submits money transactions, reads all
  group data, votes in polls, ticks items on the bazar list, comments on support tickets.

### Role comparison table

| Capability | Owner | Manager | Treasurer | Auditor | Member |
|---|:--:|:--:|:--:|:--:|:--:|
| View all group data (meals, expenses, money, statements, board) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log / edit **own** meals | ✅ | ✅ | ✅ | ❌ | ✅ |
| Edit **others'** meals (admin meal tools) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create an expense draft / submit it | ✅ | ✅ | ✅ | ❌ | ✅ |
| Approve / reject / reverse an expense | ✅ | ✅ | ✅ | ❌ | ❌ |
| Import expenses from Excel | ✅ | ✅ | ✅ | ❌ | ❌ |
| Legacy direct expense entry | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit a money transaction (contribution, payout…) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Confirm / reject / reverse a money transaction | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create a fund account | ✅ | ✅ | ✅ | ❌ | ❌ |
| Hand over fund custody | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add members / change roles / remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create & regenerate invite codes, invite by email | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage expense categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish a policy version | ✅ | ❌ | ❌ | ❌ | ❌ |
| Begin review / return a period to open | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Finalize** a month (statement) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Set budgets / record deposit assets | ✅ | ✅ | ✅ | ❌ | ❌ |
| Build / publish rosters & weekly menu | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark a duty done / request a swap | ✅ | ✅ | ✅ | ❌ | ✅ |
| Post a notice, open a poll, vote | ✅ | ✅ | ✅ | ❌ | ✅ |
| Use the bazar list & kitchen stock | ✅ | ✅ | ✅ | ❌ | ✅ |
| View the group audit log (Activity tab) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve join requests | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change your own password / 2FA / sessions | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Good to know:** the UI hides what you cannot do, but the **server enforces every
> rule** — a hidden button cannot be triggered by hand. The "Activity" tab is the
> authoritative record of what happened.

### What a member cannot access

- Approving money or expenses.
- Adding, removing or re-roling members.
- Invite codes, categories, budgets.
- Finalizing a month or editing a finalized statement.
- Any write at all if the role is `auditor`.

---

## 4. Meal management

### Adding daily meals

1. Open the group → **Meals**.
2. Pick the month and tap the day (the strip of days under the month picker).
3. For each enabled slot (**Breakfast**, **Lunch**, **Snacks**, **Dinner**) choose one of:
   - **Unknown** — no answer yet (blocks month-end close until resolved),
   - **Absent** — you did not eat (confirmed zero),
   - **¼**, **½**, **¾**, **1** — the portion you ate.
4. Tap **Save meal entry**.

A slot is **never** silently treated as zero. If a slot is left "Unknown", the month
cannot be finalized until somebody resolves it — this prevents a forgotten dinner from
quietly becoming free.

### Half meals and full meals

A portion is stored as a fraction of a full meal:

| Button | Stored | Meaning |
|---|---|---|
| ¼ | 0.25 | Quarter meal |
| ½ | 0.50 | Half meal |
| ¾ | 0.75 | Three-quarter meal |
| 1 | 1.00 | Full meal |

Each slot also has a **weight** (policy). With default weights of 1000 (1.0), one full
breakfast and one full dinner count exactly the same. A group can, for example, give
dinner a weight of 1.5 while breakfast stays 1.0 — the weighted total is what the meal
rate divides by.

### Editing and deleting meals

- You can edit your own entry until the **cut-off hour** (default **23:00 Asia/Dhaka**)
  on that day. After the cut-off, the day is locked.
- Owners can correct other members' entries using the admin meal tools.
- Deleting your day's entry is allowed only while the day is open.
- Old "legacy" meal entries can no longer be deleted (the server answers `410 Gone`);
  adjust the day through the current grid instead.

### Meal history

The **month grid** shows every member × every day × every slot for the selected month,
so disputes are settled by looking at the same table.

### Meal calculation rules (what the code really does)

1. Each consumed slot contributes:
   `portion × slotWeight` weighted meal units.
2. A member's monthly **meal units** = sum of all their weighted slots.
3. **Total meal units** = all members' units + guest meal units.
4. The **meal rate** = food (bazar) expenses ÷ total meal units.
5. A member's **meal cost** = their units × meal rate.

See [§6](#6-financial-calculations) for worked numbers.

---

## 5. Expense management

### Adding an expense

Anyone in the group can create an **expense draft**:

1. **Expenses → New draft**.
2. Fill in the **date** and the **cost period** (the month the cost belongs to — this can
   differ from the purchase date).
3. Optionally add a **supplier** and a **receipt / transaction reference**.
4. Choose **who paid**. The payer is required; the full amount is recorded against that
   member's pocket. If it is a supplier bill not yet paid, tick **Payable to supplier**.
5. Add one or more **lines**. Every line has a **category**, an **amount in ৳**, and —
   optionally — its own split rule.
6. **Save draft**, then **Submit** for approval.

If a very similar expense (same supplier, amount, date) was already recorded, MealMate
warns you, but still lets you keep the draft.

### Expense categories

Categories are managed per group (**More → Expense Categories**, owner/manager). Each
category carries a default split mode:

- **meal** — the cost is spread by meal units (bazar, vegetables, fish …).
- **equal** — the cost is split equally among all active members (rent, internet …).

The default Bangladesh set is created when the group is made. You can add an emoji icon
and archive categories you no longer use (archiving never deletes historical expenses).

### Split rules

| Split mode | How the cost is divided |
|---|---|
| **Meal units** | By each member's weighted meals in the service period |
| **Equal — all active members** | 1 unit each to everyone active in the period |
| **Equal — selected members** | 1 unit each to the members you tick |
| **Member days** | By the number of days each member was active in the period |
| **Fixed amounts** | An exact Taka amount per member (must add up to the line total) |
| **Weighted shares** | By a weight you give each member |
| **Usage quantities** | By a meter/consumption reading per member |
| **Personal** | The whole line goes to exactly one member |

All splits use **largest-remainder rounding**, so the member charges always add up
exactly to the line total — not a poisha more or less.

### Approving, rejecting, reversing

- **Submit** moves a draft to *Submitted*.
- Treasurer/manager/owner **Approve** → a balanced journal entry is posted to the ledger.
- **Reject** (with a reason) sends it back as *Rejected*.
- **Reverse** (with a reason) turns an approved expense into its mirror: the original
  stays in history and a reversal row restores everyone's balance.
- If the approver is also a beneficiary of the expense, the system asks for a reason —
  it discloses the self-approval in the audit log.

### Shared expenses vs. individual contributions

- A **shared expense** is a line whose split distributes the amount across members.
- An **individual contribution** is when a member personally pays money into the group
  (recorded under **Money → New** as a *Contribution*), or pays a supplier directly
  (*Supplier payment*). These payments increase the amount you have already paid in.

### Expense history

The **Expenses** tab lists everything with filters for status, cost period and
"payable only". Old approved expenses are never deleted — they are reversed, so the
history stays complete.

---

## 6. Financial calculations

Every number below is stored in **integer poisha** and rendered in **Taka**.

### 6.1 Total meal count (meal units)

**What it calculates:** how much food the group consumed, weighted per slot.

**Formula**

```
member units = Σ over days, over slots ( portion × slotWeight )
total units  = Σ member units + guest meal units
```

**Example:** Amina eats 20 full lunches (1.0 each) and 15 full dinners (1.0 each) →
**35 units**. With dinner weight 1.5 instead: `20×1 + 15×1.5 = 42.5 units`.

**How to read it:** units are not "plates". They are the fair-share weights the meal
rate is divided by.

### 6.2 Total meal expense (food pool)

**What it calculates:** money spent on food that should be divided by meal units.

**Formula**

```
food expenses = Σ approved expense lines whose split mode is "meal units"
```

**Example:** Bazar ৳4,500 + vegetables ৳1,200 + fish ৳2,300 = **৳8,000**.

### 6.3 Total expenses

```
total expenses = food expenses + other (fixed) expenses
```

**Example:** ৳8,000 food + ৳3,000 rent + ৳500 internet = **৳11,500**.

### 6.4 Meal rate

**What it calculates:** the cost of one full meal unit.

**Formula**

```
meal rate = food expenses ÷ total meal units
```

**Example:** ৳8,000 ÷ 42.5 units = **৳188.24 per unit** (stored as 18824 poisha).

**How to read it:** the meal rate is *derived*. It is not a setting — it changes as soon
as a bazar receipt is approved or a meal is corrected.

### 6.5 Meal-based distribution

**Formula**

```
member meal cost = member units × meal rate
```

**Example:** Karim ate 30 units → 30 × ৳188.24 = **৳5,647.06**.

### 6.6 Equal distribution (rent, bills)

**Formula**

```
member share = category total ÷ number of active members
```

**Example:** ৳3,000 rent among 5 members = **৳600 each**.

With largest-remainder rounding, ৳1,000 among 3 members becomes ৳333.34 / ৳333.33 /
৳333.33 — still exactly ৳1,000.

### 6.7 Member contributions (money paid in)

**Formula**

```
paid in = Σ confirmed contributions
        + Σ supplier payments made personally
        + Σ settlements paid
        − Σ settlements received
        − Σ payouts received
```

Only **confirmed** money transactions count. A submitted transaction is recorded but has
no effect on balances until the treasurer confirms it.

### 6.8 Individual balances

**Formula**

```
total charge  = meal cost + other (fixed) charges
closing balance = opening balance
                + paid in
                − total charge
```

- **Positive balance** → the group **owes the member** ("receives").
- **Negative balance** → the member **owes the group** ("owes").
- **Zero** → settled.

**Example** (month for Karim):

| Item | Amount |
|---|---:|
| Opening balance (carried from last month) | ৳0.00 |
| Meal cost (30 units × ৳188.24) | ৳5,647.06 |
| Rent share | ৳600.00 |
| Internet share | ৳100.00 |
| **Total charge** | **৳6,347.06** |
| Contributions paid in | ৳7,000.00 |
| **Closing balance** | **+৳652.94 (receives)** |

### 6.9 Who owes whom

After everyone's balance is computed, the group's net position is always zero. The
"who owes whom" view pairs members with **negative** balances (they owe) against members
with **positive** balances (they are owed). The **Explain my bill** button on a
statement row shows the exact lines behind your number.

### 6.10 Monthly settlement

Settlement means turning balances into money movements:

1. A member who owes pays into the fund (or to a creditor member) — recorded as a
   **Member settlement** or **Contribution** transaction.
2. The treasurer **confirms** it, which posts the journal entries.
3. Balances move toward zero. Anything still open becomes the **opening balance** of
   the next month.

### 6.11 Finalized statements

When the month is finalized the numbers are frozen into a **Statement** with:

- `totalMeals`, `mealExpenses`, `otherExpenses`, `totalExpenses`, `mealRate`,
- a per-member row: units, meal cost, other cost, total charge, contributions,
  closing balance,
- the **policy snapshot** in force that month,
- a **content hash**, so tampering is detectable.

---

## 7. Monthly summary and settlement

### Understanding monthly reports

**Statements** lists one entry per finalized month. Open a month to see the four headline
figures (total meals, meal expenses, other expenses, meal rate) and the member table —
on phones each member is a collapsible card.

### Positive and negative balances

| Balance | Label | Meaning |
|---|---|---|
| `> 0` | Receives | The group owes this member money |
| `= 0` | Settled | Nothing due either way |
| `< 0` | Owes | The member must pay the group |

### Payment and settlement workflow

```
open month ─► members log meals & expenses ─► treasurer approves everything
      │
      ├─ pre-close checklist (treasurer): unresolved meals? unapproved expenses?
      │                                    unconfirmed money? zero-unit food cost?
      ▼
begin review (manager+) ─► preview statement (no saving)
      ▼
finalize (owner) ─► Statement v1 saved, month locked, everyone notified
      ▼
balances settle ─► remaining credit carries into next month's opening balance
```

### Finalizing a monthly statement

1. Everything for the month must be resolved — every slot answered, every expense
   approved/rejected, every money transaction confirmed/rejected.
2. The treasurer runs **Month-end close → Checklist**.
3. Manager+ starts the **review** phase.
4. The owner taps **Finalize**. If two people finalize at once, the second is asked to
   refresh and retry — this prevents two different statements for one month.

### What happens after finalization

- The month becomes **read-only** for normal edits.
- Every member gets an in-app notification with their balance.
- The statement can be printed/exported, and **Explain my bill** keeps working with the
  frozen figures.

### Can finalized data be edited?

No — not by editing. Corrections go through a **new version**:

- A manager records a correction and the owner re-finalizes with a reason.
- MealMate creates **Statement v2**; v1 becomes `superseded` and stays visible in the
  version chips for audit.

---

## 8. Additional features

### Invitation codes
See [§2.4](#24-invitation-codes-expiring-limited-use). Owner/manager only.

### Two-factor authentication (2FA)
**Profile → Two-factor authentication**. Scan the secret into any authenticator app,
then enter a 6-digit code to enable. Login then asks for the code each time. Disabling
requires your password plus a current code.

### Inbox and notifications
The bell in the header shows unread messages live. Open **Inbox** to read, mark one or
all as read, and jump to the related item. Preferences (**Profile**) control which types
arrive, email on/off and quiet hours.

### Support desk
**Support → New ticket** with a subject, priority and message. You and the support team
reply in one thread; you can see the ticket status and whether we are waiting on you.
Suspended accounts can file an **appeal** from the same area.

### Routine and board
**Board** tab:

- **Today** — today's duties, menu, pinned notes and any handover banner.
- **Duties** — a duty calendar. Mark your duty done, request a swap, or accept someone
  else's swap. A fairness card shows each member's weighted duty share, Gini index and
  how far each person is from a fair share.
- **Rosters** (manager+) — create a rotation (round-robin, weekly template, fair or
  manual), choose the days, publish it and extend the horizon.
- **Weekly menu** (manager+) — plan breakfast/lunch/snacks/dinner per weekday, choose
  the cook and an estimated cost; members see today's menu.
- **Notice board** — post a note, announcement or alert, pin it, target an audience and
  see who has acknowledged it. Handover notes can carry a task checklist.

### Shopping list (bazar list)
Everyone can add items with quantity and an estimated ৳ price, tick items as bought and
delete them. The footer shows how many are open and the estimated total. Anyone with
convert permission can turn the ticked items into an **expense draft**, which then goes
through normal approval.

### Kitchen inventory
Track staples (rice, oil, lentils, LPG …): current stock, unit, low-stock threshold and
refills. Low stock is highlighted, and a refill can record its ৳ cost.

### Polls
Ask the group a quick question (for example, "What's for dinner Friday?"), offer 2–6
options and an expiry time. Members vote once; results are live; the creator can close
the poll early.

### Budgets
**More → Budgets**: set a monthly ceiling per category (or for the whole group). The
panel shows planned / spent / left and flags a category that is near its limit or over.
Treasurer and above can edit.

### Charts
**Charts** plots meals, expenses and a category doughnut, by month or year, filterable
per member.

### Deposit assets
Refundable money the group holds — landlord deposit, kitchen equipment, advances. Each
asset tracks its funding shares and any refunds, so a deposit does not get forgotten.

### Disputes & reconciliation
Raise a dispute about a charge; it is answered and resolved or rejected with a note.
Reconciliation compares the ledger balance with the real cash box balance (for example,
after counting the cash) and records the difference and its explanation.

### Exports
Group data can be exported to **Excel** and **PDF**. Amounts are exported in Taka with
two decimals.

---

## 9. Frequently asked questions

**How do I join a mess?**
Ask a member for the join code (`MM-XXXXXX`) or an invite link, then **Home → Join**.
A manager/owner must approve your request.

**Can I change someone's role?**
Only a manager or owner can. **Members → change role**. Ownership itself can be
transferred by the current owner; the last owner cannot leave without transferring.

**I entered the wrong meal — how do I fix it?**
Open **Meals**, pick the day, correct the slot and save — as long as it is before the
23:00 (Dhaka) cut-off. After the cut-off, ask an owner to correct it with the admin meal
tools. In a finalized month, corrections create a new statement version.

**How do I edit an expense?**
A draft can be edited freely. Once submitted it must be rejected (with a reason) and
re-created, or reversed after approval. Nothing is ever silently deleted.

**Why is my balance negative?**
You have been charged more than you have paid in so far (meals + your share of rent and
bills > your contributions). It will clear when you settle. Use **Explain my bill** on
your statement row to see the exact breakdown.

**Why did the meal rate change?**
The meal rate is food expenses ÷ total meal units. Approving a new bazar receipt raises
it; correcting a meal raises or lowers the denominator. In a finalized statement the
rate is frozen.

**When should the month be closed?**
When all meals are recorded, all expenses approved or rejected, and all money
transactions confirmed. The checklist tells you exactly what is still unresolved.

**Can I undo a finalized month?**
Not directly. Record a correction and re-finalize — you get a new version; the old one is
kept as `superseded`.

**I lost my invite code.**
The plaintext is shown only once. Generate a new one (**More → Invite people →
Regenerate**); the old code and its links stop working immediately.

**I lost my phone / authenticator.**
Use a recovery/support ticket from the login page. You can also sign out other sessions
from **Profile → Active sessions** once you are back in.

**How do I switch language?**
Use the **EN / বাং** toggle in the header. It applies immediately and is remembered on
that device.

---

## 10. Troubleshooting and support

| Problem | What it means | What to do |
|---|---|---|
| "Meal edits are locked after 23:00" | The day's cut-off passed | Ask an owner to correct the entry, or edit tomorrow's |
| "Unresolved dinner meal for …" when closing | A slot is still **Unknown** | Open **Meals** for that member/day and choose Absent or a portion |
| "Positive food cost with zero meal units" | A bazar expense was approved in a month with no meals | Record the meals, or change that line's split mode to Equal |
| "fixed_amounts lines require fixedAmounts[]" | A fixed-amount line has no per-member amounts | Fill in each member's amount so they add up to the line total |
| "Self-approval requires a reason" | You approved an expense you also benefit from | Enter a short reason — it is logged |
| "Cannot approve from state: draft" | The expense was never submitted | Submit it first |
| "Period already finalized; use the correction process" | The month is locked | Record a correction and re-finalize |
| "Auditor access is read-only" | Your role is auditor | Ask a manager to change your role if you need to write |
| "Invalid join code" | Code typed wrong, or it was regenerated | Check the code with the member; ask for a new one |
| "Could not refresh statement — please retry" | Someone else finalized first | Retry; you will see the latest version |
| "File too large" on a receipt | Receipt over 10 MB | Compress the image or photograph it again |
| Emails not arriving | Spam filter / unverified email | Check spam, re-send verification, or contact support |

### Getting help

- **Support → New ticket** from inside the app (fastest — it includes your account).
- The **User guide** (this page) is available from the header at any time, in both
  languages.
- Suspended accounts: use the **appeal** form on the suspension notice.

When you ask for help about a money issue, include the **month** and, if you have it,
the **statement version** — it lets support reconstruct exactly what you saw.
