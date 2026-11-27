// T14.17c — public landing/home page translations (EN ↔ BN).
// Keys follow "landing.<section>.<item>" dotted paths used by `translate()`.
import { registerDictionary } from "@/lib/i18n/registry";

registerDictionary("en", "landing", {
  "example.title": "Example meal rate",
  "example.pool": "৳8,000",
  "example.units": "120",
  "example.rate": "৳66.67",
  "daily.title": "Around the shared kitchen",
  // Public navigation
  "nav.howItWorks": "How it works",
  "nav.features": "Features",

  // Hero
  "hero.badge": "Built for Bangladeshi messes",
  "hero.title.part1": "Every meal counted.",
  "hero.title.part2": "Every taka accounted for.",
  "hero.description":
    "MealMate replaces the Excel sheets your mess uses to track meals and shared costs. Log daily meals across slots, split bazar fairly, approve expenses, and close the month with a versioned, immutable statement — everything your whole mess can check.",
  "hero.cta.create": "Create your group",
  "hero.cta.signin": "Sign in",

  // Stats band
  "stats.splitModes.label": "Split modes",
  "stats.splitModes.value": "8",
  "stats.splitModes.note": "meal_units, equal_all, fixed_amounts, weighted, usage & more",
  "stats.moneyRule.label": "Money rule",
  "stats.moneyRule.value": "Integer poisha",
  "stats.moneyRule.note": "1 BDT = 100 poisha — never floats",
  "stats.statement.label": "Statement",
  "stats.statement.value": "Immutable",
  "stats.statement.note": "versions supersede; nothing overwritten",
  "stats.roles.label": "Roles",
  "stats.roles.value": "5 tiers",
  "stats.roles.note": "owner, manager, treasurer, auditor, member",

  // How it works
  "sections.howItWorks.title": "Close the month in four steps",
  "sections.howItWorks.subtitle":
    "From daily meals to a finalized statement that everyone can verify.",
  "steps.01.title": "Create your group",
  "steps.01.body": "Owner gets a default policy and preset Bangladesh categories.",
  "steps.02.title": "Invite members",
  "steps.02.body": "Hashed invite code or join link. Residents log meals per slot daily.",
  "steps.03.title": "Book & approve",
  "steps.03.body": "Draft multi-line expenses, submit, treasurer approves — allocations freeze into a balanced journal.",
  "steps.04.title": "Close the month",
  "steps.04.body": "Owner finalizes an immutable statement. Everyone sees what they owe via email/WhatsApp.",

  // Features
  "sections.features.title": "Everything a mess needs",
  "sections.features.subtitle":
    "From slot-state meals to double-entry money, all in one app — no spreadsheets, no guesswork.",
  "features.groups.title": "Groups & Meals",
  "features.groups.item.0": "Independent mess groups with per-member roles",
  "features.groups.item.1": "Slot-state meals: breakfast, lunch, snacks, dinner (¼–1 portions)",
  "features.groups.item.2": "Guest meals: individual or universal pool modes",
  "features.groups.item.3": "Bulk entries and absence ranges with preview → apply",
  "features.groups.item.4": "Tomorrow's headcount for the cook",
  "features.expenses.title": "Expenses & Money",
  "features.expenses.item.0": "Multi-line, multi-payer expenses with 8 split modes",
  "features.expenses.item.1": "Approval workflow: draft → submit → approve/reject → reverse",
  "features.expenses.item.2": "Double-entry journal — debits always equal credits",
  "features.expenses.item.3": "Contributions, payouts, settlements, transfers, fees",
  "features.expenses.item.4": "Fund accounts with custodians; balances derived from journals",
  "features.statements.title": "Month Close & Statements",
  "features.statements.item.0": "Period state machine: open → review → finalized",
  "features.statements.item.1": "Versioned, immutable statements (corrections supersede)",
  "features.statements.item.2": "Meal rate computed as integer thousandths",
  "features.statements.item.3": "Close checklist + accounting-equation verification",
  "features.statements.item.4": "Bill delivery by email/WhatsApp honoring consent",

  // Core concepts
  "sections.concepts.title": "Core concepts",
  "sections.concepts.subtitle":
    "The domain model that makes MealMate trustworthy for money.",
  "concepts.group.term": "Group",
  "concepts.group.def": "An independent mess with its own members, categories, policies and history.",
  "concepts.membership.term": "Membership",
  "concepts.membership.def": "Effective-dated interval with a role — used for balances, beneficiaries and statements.",
  "concepts.mealSlot.term": "Meal slot",
  "concepts.mealSlot.def": "Breakfast / lunch / snacks / dinner — unknown → consumed / confirmed_zero. Unknown blocks close.",
  "concepts.expense.term": "Expense",
  "concepts.expense.def": "Multi-line, multi-payer: draft → submitted → approved | rejected → reversed.",
  "concepts.journal.term": "Journal",
  "concepts.journal.def": "Balanced double-entry posting (debits = credits). The only monetary source of truth.",
  "concepts.statement.term": "Statement",
  "concepts.statement.def": "A month's immutable, versioned closing snapshot — corrections supersede.",

  // Money rules
  "sections.moneyRules.title": "Money rules that shape the app",
  "moneyRules.0": "All amounts are integer poisha. Input 12550 = ৳125.50.",
  "moneyRules.1": "Largest-remainder allocation — charges sum exactly to the line total.",
  "moneyRules.2": "Balances derived from journals, never stored as flags or floats.",
  "moneyRules.3": "Nothing financial is ever edited: journals reverse, statements supersede.",

  // Final CTA
  "cta.title": "Ready to organize your mess?",
  "cta.description":
    "Create your group, invite members by code and start tracking meals, expenses and money today.",
  "cta.create": "Create your group",
  "cta.signin": "Sign in",
});

registerDictionary("bn", "landing", {
  "example.title": "মিল রেটের উদাহরণ",
  "example.pool": "৳৮,০০০",
  "example.units": "১২০",
  "example.rate": "৳৬৬.৬৭",
  "daily.title": "মেসের রান্নাঘরের দৈনন্দিন কাজ",
  // Public navigation
  "nav.howItWorks": "যেভাবে কাজ করে",
  "nav.features": "ফিচার",

  // Hero
  "hero.badge": "বাংলাদেশি মেসের জন্য তৈরি",
  "hero.title.part1": "প্রতিটি মিল গোনা হয়েছে",
  "hero.title.part2": "প্রতিটি টাকা হিসাব রাখা হয়েছে",
  "hero.description":
    "মিলমেট আপনার মেসের খাবার ও ভাগের খরচ ট্র্যাক করার এক্সেল শীটের বদলে ব্যবহৃত হয়। দৈনিক স্লট অনুযায়ী মিল লগ করুন, বাজার ন্যায্যভাবে ভাগ করুন, খরচ অনুমোদন করুন, এবং মাসের শেষে একটি সংস্করণ-সংরক্ষিত অপরিবর্তনীয় স্টেটমেন্টে হিসাব বন্ধ করুন — আপনার পুরো মেস যারা পরীক্ষা করতে পারে তার সবকিছু।",
  "hero.cta.create": "আপনার গোষ্ঠী তৈরি করুন",
  "hero.cta.signin": "সাইন ইন",

  // Stats band
  "stats.splitModes.label": "বিভাজন পদ্ধতি",
  "stats.splitModes.value": "৮",
  "stats.splitModes.note": "মিল_ইউনিট, সমান_সব, ফিক্সড_অ্যামাউন্ট, ওজনভিত্তিক, ব্যবহার ও আরও",
  "stats.moneyRule.label": "টাকার নিয়ম",
  "stats.moneyRule.value": "পূর্ণ পয়শা",
  "stats.moneyRule.note": "১ বডত = ১০০ পয়শা — ফ্লোট ছাড়া",
  "stats.statement.label": "স্টেটমেন্ট",
  "stats.statement.value": "অপরিবর্তনীয়",
  "stats.statement.note": "নতুন সংস্করণ পুরনোকে প্রতিস্থাপন করে; কিছু ওভাররাইট করা হয় না",
  "stats.roles.label": "ভূমিকা",
  "stats.roles.value": "৫টি স্তর",
  "stats.roles.note": "মালিক, ম্যানেজার, কোষাধ্যক্ষ, অডিটর, সদস্য",

  // How it works
  "sections.howItWorks.title": "চার ধাপে মাস বন্ধ করুন",
  "sections.howItWorks.subtitle": "দৈনিক মিল থেকে একটি চূড়ান্ত যাচাইযোগ্য স্টেটমেন্ট পর্যন্ত।",
  "steps.01.title": "আপনার গোষ্ঠী তৈরি করুন",
  "steps.01.body": "মালিক একটি ডিফল্ট নীতি ও বাংলাদেশের পূর্বনির্ধারিত ক্যাটাগরি পায়।",
  "steps.02.title": "সদস্যদের আমন্ত্রণ জানান",
  "steps.02.body": "হ্যাশড আমন্ত্রণ কোড অথবা জয়েন লিংক। বাসিন্দারা প্রতিদিন স্লট অনুযায়ী মিল লগ করেন।",
  "steps.03.title": "বুক ও অনুমোদন",
  "steps.03.body": "ড্রাফট মাল্টি-লাইন খরচ জমা দিন, কোষাধ্যক্ষ অনুমোদন করেন — বণ্টন একটি ব্যালেন্সড জার্নালে হিমায়িত হয়।",
  "steps.04.title": "মাস বন্ধ করুন",
  "steps.04.body": "মালিক একটি অপরিবর্তনীয় স্টেটমেন্ট শেষ করেন। সবাই ইমেল/WhatsApp এর মাধ্যমে দেখতে পায় তারা কী বকেয়।",
  // Features
  "sections.features.title": "একটি মেসের সব প্রয়োজন",
  "sections.features.subtitle": "স্লট-অবস্থা মিল থেকে ডাবল-এন্ট্রি টাকা পর্যন্ত, এক অ্যাপে — এক্সেল ছাড়া, অনুমান ছাড়া।",
  "features.groups.title": "গোষ্ঠী ও মিল",
  "features.groups.item.0": "প্রতি সদস্যের ভূমিকা সহ স্বতন্ত্র মেস গোষ্ঠী",
  "features.groups.item.1": "স্লট-অবস্থা মিল: নাশতা, দুপুরের খাবার, স্ন্যাকস, রাতের খাবার (¼–১ পর্শন)",
  "features.groups.item.2": "অতিথি মিল: ব্যক্তিগত অথবা সার্বজনীন পুল মোড",
  "features.groups.item.3": "বাল্ক এন্ট্রি ও অনুপস্থিতির পরিসর প্রিভিউ → প্রয়োগ সহ",
  "features.groups.item.4": "রান্নাবাবুর জন্য আগামী দিনের হেডকাউন্ট",
  "features.expenses.title": "খরচ ও টাকা",
  "features.expenses.item.0": "মাল্টি-লাইন, মাল্টি-পেয়ার খরচ ৮টি ভাগের পদ্ধতি সহ",
  "features.expenses.item.1": "অনুমোদন ওয়ার্কফ্লো: ড্রাফট → জমা → অনুমোদন/প্রত্যাখ্যান → বিপরীত",
  "features.expenses.item.2": "ডাবল-এন্ট্রি জার্নাল — ডেবিট সর্বদা ক্রেডিটের সমান",
  "features.expenses.item.3": "অবদান, পে-আউট, সেটলমেন্ট, ট্রান্সফার, ফি",
  "features.expenses.item.4": "কাস্টোডিয়ান সহ ফান্ড অ্যাকাউন্ট; ব্যালেন্স জার্নাল থেকে প্রাপ্ত",
  "features.statements.title": "মাস বন্ধ ও স্টেটমেন্ট",
  "features.statements.item.0": "পিরিয়ড স্টেট মেশিন: ওপেন → রিভিউ → ফাইনালাইজড",
  "features.statements.item.1": "সংস্করণযোগ্য, অপরিবর্তনীয় স্টেটমেন্ট (সু�ডেকশন সুপারসিড)",
  "features.statements.item.2": "মিল হার পূর্ণসংখ্যা হাজার অংশ হিসেবে গণনা করা",
  "features.statements.item.3": "বন্ধ করার চেকলিস্ট + অ্যাকাউন্টিং-সমীকরণ যাচাই",
  "features.statements.item.4": "ইমেল/WhatsApp এর মাধ্যমে বিল ডেলিভারি সম্মতি মেনে",

  // Core concepts
  "sections.concepts.title": "মূল ধারণা",
  "sections.concepts.subtitle": "টাকার জন্য মিলমেটকে বিশ্বাসযোগ্য করে তোলা ডোমেইন মডেল।",
  "concepts.group.term": "গোষ্ঠী",
  "concepts.group.def": "একটি স্বতন্ত্র মেস যেটির নিজস্য সদস্য, ক্যাটাগরি, নীতি ও ইতিহাস আছে।",
  "concepts.membership.term": "সদস্যতা",
  "concepts.membership.def": "ভূমিকাসহ কার্যকর-দিনের অন্তরাল — ব্যালেন্স, সুবিধাপ্রাপ্তি ও স্টেটমেন্টের জন্য ব্যবহৃত।",
  "concepts.mealSlot.term": "মিল স্লট",
  "concepts.mealSlot.def": "নাশতা / দুপুরের খাবার / স্ন্যাকস / রাতের খাবার — অজানা → গ্রাহকিত / নিশ্চিত_শূন্য। অজানা বন্ধ করতে বাধা দেয়।",
  "concepts.expense.term": "খরচ",
  "concepts.expense.def": "মাল্টি-লাইন, মাল্টি-পেয়ার: ড্রাফট → জমা করা → অনুমোদিত | প্রত্যাখ্যাত → বিপরীত।",
  "concepts.journal.term": "জার্নাল",
  "concepts.journal.def": "ব্যালেন্সড ডাবল-এন্ট্রি পোস্টিং (ডেবিট = ক্রেডিট)। টাকার একমাত্র সত্যের উৎস।",
  "concepts.statement.term": "স্টেটমেন্ট",
  "concepts.statement.def": "একটি মাসের অপরিবর্তনীয়, সংস্করণযোগ্য বন্ধ স্ন্যাপশট — সংশোধন সুপারসিড।",

  // Money rules
  "sections.moneyRules.title": "টাকার নিয়ম যা অ্যাপকে গঠন করে",
  "moneyRules.0": "সমস্ত অমাউন্ট পূর্ণ পয়শা। ইনপুট 12550 = ৳125.50।",
  "moneyRules.1": "লার্জেস্ট-রিমেইন্ডার অ্যালোকেশন — চার্জ লাইন টোটালের সঠিক যোগফল।",
  "moneyRules.2": "ব্যালেন্স জার্নাল থেকে প্রাপ্ত, ফ্লোট বা ফ্ল্যাগ হিসেবে সংরক্ষিত নয়।",
  "moneyRules.3": "কোনো আর্থিক কিছுவে সম্পাদিত নয়: জার্নাল biporীত, স্টেটমেন্ট সুপারসিড।",

  // Final CTA
  "cta.title": "আপনার মেস সাজাতে প্রস্তুত?",
  "cta.description": "আপনার গোষ্ঠী তৈরি করুন, কোড দিয়ে সদস্যদের আমন্ত্রণ জানান এবং আজ থেকে মিল, খরচ ও টাকা ট্র্যাক শুরু করুন।",
  "cta.create": "আপনার গোষ্ঠী তৈরি করুন",
  "cta.signin": "সাইন ইন",
});

