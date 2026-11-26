// T14.17b — shared dictionaries: shell (nav/actions), auth, home.
// Keys: "<namespace>.<key>". Missing bn keys fall back to English.
import { registerDictionary } from "@/lib/i18n";

registerDictionary("en", "shell", {
  "groups": "My groups",
  "home": "Home",
  "inbox": "Inbox",
  "profile": "Profile",
  "support": "Support",
  "logout": "Sign out",
  "menu": "Menu",
  "loading": "Loading…",
  "error": "Something went wrong",
  "retry": "Retry",
});

registerDictionary("bn", "shell", {
  "groups": "আমার গ্রুপ",
  "home": "হোম",
  "inbox": "ইনবক্স",
  "profile": "প্রোফাইল",
  "support": "সহায়তা",
  "logout": "লগ আউট",
  "menu": "মেনু",
  "loading": "লোড হচ্ছে…",
  "error": "কিছু একটা ভুল হয়েছে",
  "retry": "আবার চেষ্টা করুন",
});

registerDictionary("en", "group", {
  "tab.overview": "Overview",
  "tab.meals": "Meals",
  "tab.expenses": "Expenses",
  "tab.money": "Money",
  "tab.statements": "Statements",
  "tab.board": "Board",
  "tab.charts": "Charts",
  "tab.members": "Members",
  "tab.activity": "Activity",
  "tab.more": "More",
});

registerDictionary("bn", "group", {
  "tab.overview": "সারসংক্ষেপ",
  "tab.meals": "মিল",
  "tab.expenses": "খরচ",
  "tab.money": "টাকা",
  "tab.statements": "স্টেটমেন্ট",
  "tab.board": "বোর্ড",
  "tab.charts": "চার্ট",
  "tab.members": "সদস্য",
  "tab.activity": "কার্যকলাপ",
  "tab.more": "আরও",
});

registerDictionary("en", "auth", {
  "login.title": "Sign in",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Sign in",
  "login.google": "Continue with Google",
  "login.forgot": "Forgot password?",
  "login.noAccount": "New here? Create an account",
  "register.title": "Create account",
  "register.username": "Username",
  "register.submit": "Create account",
  "register.haveAccount": "Already have an account? Sign in",
  "verify.title": "Verify your email",
  "verify.body": "We sent a verification link to your email. Open it to activate your account.",
  "reset.title": "Reset password",
  "reset.submit": "Send reset link",
  "join.title": "Join a group",
  "join.code": "Join code",
  "join.submit": "Join",
});

registerDictionary("bn", "auth", {
  "login.title": "সাইন ইন",
  "login.email": "ইমেইল",
  "login.password": "পাসওয়ার্ড",
  "login.submit": "সাইন ইন",
  "login.google": "গুগল দিয়ে চালিয়ে যান",
  "login.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
  "login.noAccount": "নতুন? অ্যাকাউন্ট খুলুন",
  "register.title": "অ্যাকাউন্ট তৈরি",
  "register.username": "ইউজারনেম",
  "register.submit": "অ্যাকাউন্ট তৈরি করুন",
  "register.haveAccount": "অ্যাকাউন্ট আছে? সাইন ইন",
  "verify.title": "ইমেইল যাচাই করুন",
  "verify.body": "আপনার ইমেইলে একটি লিংক পাঠানো হয়েছে। অ্যাকাউন্ট চালু করতে সেটি খুলুন।",
  "reset.title": "পাসওয়ার্ড রিসেট",
  "reset.submit": "রিসেট লিংক পাঠান",
  "join.title": "গ্রুপে যোগ দিন",
  "join.code": "জয়েন কোড",
  "join.submit": "যোগ দিন",
});

registerDictionary("en", "home", {
  "title": "My mess groups",
  "empty": "You are not in a group yet.",
  "create": "Create a group",
  "join": "Join with a code",
  "meals": "meals",
  "members": "members",
});

registerDictionary("bn", "home", {
  "title": "আমার মেস গ্রুপ",
  "empty": "আপনি এখনো কোনো গ্রুপে নেই।",
  "create": "গ্রুপ তৈরি করুন",
  "join": "কোড দিয়ে যোগ দিন",
  "meals": "মিল",
  "members": "সদস্য",
});
