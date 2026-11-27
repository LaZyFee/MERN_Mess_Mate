/**
 * User Guide content structure â€” section metadata for the TOC, in-page search and
 * scroll spy. All *text* lives in the `guide` i18n namespace; this file only holds
 * structure (ids, icons, layout hints) so English and Bangla stay in lock-step.
 */
import {
  LuBookOpen,
  LuRocket,
  LuShieldCheck,
  LuUtensils,
  LuReceipt,
  LuCalculator,
  LuFileCheck2,
  LuSparkles,
  LuCircleHelp,
  LuWrench,
} from "react-icons/lu";

/** @typedef {"plain"|"flow"|"roles"|"portions"|"splits"|"formulas"|"balances"|"features"|"faq"|"table"} SectionShape */

export const GUIDE_SECTIONS = [
  {
    id: "introduction",
    number: 1,
    icon: LuBookOpen,
    titleKey: "guide.s1.title",
    shape: "flow",
    /** Keywords used by the in-page search (both languages). */
    keywords: [
      "meal", "expense", "mess", "introduction", "à¦­à§‚à¦®à¦¿à¦•à¦¾", "à¦®à§‡à¦¸", "à¦–à¦°à¦š", "à¦®à¦¿à¦²",
    ],
  },
  {
    id: "getting-started",
    number: 2,
    icon: LuRocket,
    titleKey: "guide.s2.title",
    shape: "plain",
    keywords: [
      "register", "login", "signup", "create group", "join", "invite code", "dashboard",
      "profile", "à¦¨à¦¿à¦¬à¦¨à§à¦§à¦¨", "à¦²à¦—à¦‡à¦¨", "à¦—à§à¦°à§à¦ª", "à¦•à§‹à¦¡", "à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦²",
    ],
  },
  {
    id: "roles",
    number: 3,
    icon: LuShieldCheck,
    titleKey: "guide.s3.title",
    shape: "roles",
    keywords: [
      "owner", "manager", "treasurer", "auditor", "member", "permission", "role",
      "à¦®à¦¾à¦²à¦¿à¦•", "à¦®à§à¦¯à¦¾à¦¨à§‡à¦œà¦¾à¦°", "à¦•à§‹à¦·à¦¾à¦§à§à¦¯à¦•à§à¦·", "à¦¨à¦¿à¦°à§€à¦•à§à¦·à¦•", "à¦¸à¦¦à¦¸à§à¦¯", "à¦…à¦¨à§à¦®à¦¤à¦¿",
    ],
  },
  {
    id: "meals",
    number: 4,
    icon: LuUtensils,
    titleKey: "guide.s4.title",
    shape: "portions",
    keywords: [
      "meal", "breakfast", "lunch", "dinner", "portion", "half", "absent", "cutoff",
      "à¦®à¦¿à¦²", "à¦¨à¦¾à¦¶à¦¤à¦¾", "à¦¦à§à¦ªà§à¦°", "à¦°à¦¾à¦¤", "à¦­à¦¾à¦—", "à¦¹à¦¾à¦«", "à¦…à¦¨à§à¦ªà¦¸à§à¦¥à¦¿à¦¤",
    ],
  },
  {
    id: "expenses",
    number: 5,
    icon: LuReceipt,
    titleKey: "guide.s5.title",
    shape: "splits",
    keywords: [
      "expense", "bazar", "category", "split", "approve", "reject", "reverse", "payer",
      "à¦–à¦°à¦š", "à¦¬à¦¾à¦œà¦¾à¦°", "à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿", "à¦­à¦¾à¦—", "à¦…à¦¨à§à¦®à§‹à¦¦à¦¨", "à¦¬à¦¾à¦¤à¦¿à¦²",
    ],
  },
  {
    id: "calculations",
    number: 6,
    icon: LuCalculator,
    titleKey: "guide.s6.title",
    shape: "formulas",
    keywords: [
      "meal rate", "formula", "balance", "calculation", "units", "à¦®à¦¿à¦² à¦°à§‡à¦Ÿ", "à¦¸à§‚à¦¤à§à¦°",
      "à¦¬à§à¦¯à¦¾à¦²à§‡à¦¨à§à¦¸", "à¦¹à¦¿à¦¸à¦¾à¦¬", "à¦à¦•à¦•",
    ],
  },
  {
    id: "settlement",
    number: 7,
    icon: LuFileCheck2,
    titleKey: "guide.s7.title",
    shape: "balances",
    keywords: [
      "settlement", "finalize", "close", "statement", "version", "correction",
      "à¦¨à¦¿à¦·à§à¦ªà¦¤à§à¦¤à¦¿", "à¦šà§‚à¦¡à¦¼à¦¾à¦¨à§à¦¤", "à¦¬à¦¨à§à¦§", "à¦¸à§à¦Ÿà§‡à¦Ÿà¦®à§‡à¦¨à§à¦Ÿ", "à¦¸à¦‚à¦¶à§‹à¦§à¦¨",
    ],
  },
  {
    id: "features",
    number: 8,
    icon: LuSparkles,
    titleKey: "guide.s8.title",
    shape: "features",
    keywords: [
      "2fa", "inbox", "support", "board", "menu", "notice", "shopping", "kitchen",
      "poll", "budget", "chart", "asset", "export", "à¦‡à¦¨à¦¬à¦•à§à¦¸", "à¦¸à¦¹à¦¾à¦¯à¦¼à¦¤à¦¾", "à¦¬à¦¾à¦œà¦¾à¦°", "à¦­à§‹à¦Ÿ",
    ],
  },
  {
    id: "faq",
    number: 9,
    icon: LuCircleHelp,
    titleKey: "guide.s9.title",
    shape: "faq",
    keywords: ["faq", "question", "à¦ªà§à¦°à¦¶à§à¦¨", "à¦¸à¦¾à¦§à¦¾à¦°à¦£"],
  },
  {
    id: "troubleshooting",
    number: 10,
    icon: LuWrench,
    titleKey: "guide.s10.title",
    shape: "table",
    keywords: ["error", "problem", "troubleshoot", "à¦¸à¦®à¦¸à§à¦¯à¦¾", "à¦­à§à¦²", "à¦¤à§à¦°à§à¦Ÿà¦¿"],
  },
];

/** Role matrix rows â€” the columns are always the five roles, in rank order. */
export const ROLES = ["owner", "manager", "treasurer", "auditor", "member"];

/** Which roles can do each capability (data from Server/middleware/roles.js + route guards). */
export const ROLE_MATRIX = [
  { key: "guide.s3.cap.1", allow: ["owner", "manager", "treasurer", "auditor", "member"] },
  { key: "guide.s3.cap.2", allow: ["owner", "manager", "treasurer", "member"] },
  { key: "guide.s3.cap.3", allow: ["owner"] },
  { key: "guide.s3.cap.4", allow: ["owner", "manager", "treasurer", "member"] },
  { key: "guide.s3.cap.5", allow: ["owner", "manager", "treasurer"] },
  { key: "guide.s3.cap.6", allow: ["owner", "manager", "treasurer"] },
  { key: "guide.s3.cap.7", allow: ["owner", "manager", "treasurer"] },
  { key: "guide.s3.cap.8", allow: ["owner", "manager"] },
  { key: "guide.s3.cap.9", allow: ["owner", "manager"] },
  { key: "guide.s3.cap.10", allow: ["owner"] },
  { key: "guide.s3.cap.11", allow: ["owner", "manager", "treasurer"] },
  { key: "guide.s3.cap.12", allow: ["owner", "manager"] },
  { key: "guide.s3.cap.13", allow: ["owner", "manager", "treasurer", "member"] },
  { key: "guide.s3.cap.14", allow: ["owner", "manager", "treasurer", "auditor"] },
];

/** Portion chips shown in Â§4. */
export const PORTIONS = [
  { key: "s4.p.quarter", taka: "Â¼", value: 0.25 },
  { key: "s4.p.half", taka: "Â½", value: 0.5 },
  { key: "s4.p.threeQuarter", taka: "Â¾", value: 0.75 },
  { key: "s4.p.full", taka: "1", value: 1 },
];

/** Split-mode cards in Â§5 (API enum â†’ dictionary key). */
export const SPLIT_MODES_GUIDE = [
  { value: "meal_units", key: "split.meal_units", descKey: "guide.s5.split.meal_units" },
  { value: "equal_all", key: "split.equal_all", descKey: "guide.s5.split.equal_all" },
  { value: "equal_selected", key: "split.equal_selected", descKey: "guide.s5.split.equal_selected" },
  { value: "member_days", key: "split.member_days", descKey: "guide.s5.split.member_days" },
  { value: "fixed_amounts", key: "split.fixed_amounts", descKey: "guide.s5.split.fixed_amounts" },
  { value: "weighted", key: "split.weighted", descKey: "guide.s5.split.weighted" },
  { value: "usage", key: "split.usage", descKey: "guide.s5.split.usage" },
  { value: "personal", key: "split.personal", descKey: "guide.s5.split.personal" },
];

/** Formula cards in Â§6. */
export const FORMULAS = [
  { id: "units", titleKey: "guide.s6.f.units", bodyKey: "guide.s6.f.unitsBody", exampleKey: "guide.s6.f.unitsEx" },
  { id: "food", titleKey: "guide.s6.f.food", bodyKey: "guide.s6.f.foodBody", exampleKey: "guide.s6.f.foodEx" },
  { id: "rate", titleKey: "guide.s6.f.rate", bodyKey: "guide.s6.f.rateBody", exampleKey: "guide.s6.f.rateEx" },
  { id: "mealCost", titleKey: "guide.s6.f.mealCost", bodyKey: "guide.s6.f.mealCostBody", exampleKey: "guide.s6.f.mealCostEx" },
  { id: "equal", titleKey: "guide.s6.f.equal", bodyKey: "guide.s6.f.equalBody", exampleKey: "guide.s6.f.equalEx" },
  { id: "balance", titleKey: "guide.s6.f.balance", bodyKey: "guide.s6.f.balanceBody", exampleKey: "guide.s6.f.balanceEx" },
];

/** Feature cards in Â§8. */
export const FEATURES = [
  { key: "invites" },
  { key: "2fa" },
  { key: "inbox" },
  { key: "support" },
  { key: "board" },
  { key: "menu" },
  { key: "notice" },
  { key: "shopping" },
  { key: "kitchen" },
  { key: "polls" },
  { key: "budgets" },
  { key: "charts" },
  { key: "assets" },
  { key: "disputes" },
  { key: "exports" },
];

/** FAQ pairs in Â§9. */
export const FAQ_ITEMS = Array.from({ length: 10 }, (_, i) => ({
  qKey: `guide.s9.q${i + 1}`,
  aKey: `guide.s9.a${i + 1}`,
}));

/** What each role may do (short blurbs) â€” rendered as cards. */
export const ROLE_CARDS = ["owner", "manager", "treasurer", "auditor", "member"];
