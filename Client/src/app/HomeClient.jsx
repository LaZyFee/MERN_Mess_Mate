"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LangProvider";
import Topbar from "@/components/shared/Topbar";
import Card from "@/components/shared/Card";
import { LuUtensils, LuReceipt, LuShieldCheck } from "react-icons/lu";

// Source data keyed to the `landing` dictionary namespace.
const STATS_SRC = [
  { key: "splitModes", value: "8" },
  { key: "moneyRule", value: "Integer poisha" },
  { key: "statement", value: "Immutable" },
  { key: "roles", value: "5 tiers" },
];

const STEPS_SRC = [
  { n: "01", key: "steps.01" },
  { n: "02", key: "steps.02" },
  { n: "03", key: "steps.03" },
  { n: "04", key: "steps.04" },
];

const FEATURE_GROUPS_SRC = [
  { key: "features.groups", icon: LuUtensils, items: ["item.0", "item.1", "item.2", "item.3", "item.4"] },
  { key: "features.expenses", icon: LuReceipt, items: ["item.0", "item.1", "item.2", "item.3", "item.4"] },
  { key: "features.statements", icon: LuShieldCheck, items: ["item.0", "item.1", "item.2", "item.3", "item.4"] },
];

const CONCEPTS_SRC = [
  { termKey: "concepts.group.term", defKey: "concepts.group.def" },
  { termKey: "concepts.membership.term", defKey: "concepts.membership.def" },
  { termKey: "concepts.mealSlot.term", defKey: "concepts.mealSlot.def" },
  { termKey: "concepts.expense.term", defKey: "concepts.expense.def" },
  { termKey: "concepts.journal.term", defKey: "concepts.journal.def" },
  { termKey: "concepts.statement.term", defKey: "concepts.statement.def" },
];

const MONEY_RULES_SRC = ["moneyRules.0", "moneyRules.1", "moneyRules.2", "moneyRules.3"];

// Shared class strings
const BTN_BASE =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-7 text-base font-semibold no-underline transition-colors sm:w-auto";
const BTN_PRIMARY = `${BTN_BASE} bg-(--p) text-(--bgs) hover:bg-(--p3)`;
const BTN_OUTLINE = `${BTN_BASE} border border-(--bd) bg-(--bgs) text-(--tp) hover:bg-(--bgm)`;
const SECTION_X = "mx-auto w-full px-4 sm:px-6 lg:px-8";
const H2 = "text-2xl font-extrabold tracking-tight text-(--tp) sm:text-3xl lg:text-4xl";
const SUB = "mt-3 text-base leading-relaxed text-(--ts) sm:text-lg";

export default function HomeClient() {
  // Client read of the locale seeded by RootLayout from the `mm_lang` cookie.
  // Re-renders in real time when LanguageToggle (in Topbar) switches the language.
  const t = useT();

  const STATS = STATS_SRC.map((s) => ({
    ...s,
    label: t(`landing.stats.${s.key}.label`),
    value: t(`landing.stats.${s.key}.value`),
    note: t(`landing.stats.${s.key}.note`),
  }));

  const STEPS = STEPS_SRC.map((s) => ({
    ...s,
    title: t(`landing.${s.key}.title`),
    body: t(`landing.${s.key}.body`),
  }));

  const FEATURE_GROUPS = FEATURE_GROUPS_SRC.map((g) => ({
    ...g,
    title: t(`landing.${g.key}.title`),
    items: g.items.map((i) => t(`landing.${g.key}.${i}`)),
  }));

  const CONCEPTS = CONCEPTS_SRC.map((c) => ({
    term: t(c.termKey),
    def: t(c.defKey),
  }));

  const MONEY_RULES = MONEY_RULES_SRC.map((k) => t(`landing.${k}`));

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-(--bg) text-(--tp)">
      <Topbar />

      {/* Hero */}
      <section className="relative border-b border-(--bd)">
        {/* soft tint behind hero, built only from theme variables */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-(--pale) to-transparent opacity-70"
        />
        <div className={`${SECTION_X} relative max-w-5xl pb-12 pt-10 sm:pb-20 sm:pt-16 lg:pt-24`}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex min-h-8 items-center gap-2 rounded-full border border-(--bd) bg-(--bgs) px-3 text-xs font-semibold text-(--p) sm:text-sm">
              <span className="size-2 rounded-full bg-(--p)" />
              {t("landing.hero.badge")}
            </span>

            <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-(--tp) sm:text-5xl lg:text-6xl">
              {t("landing.hero.title.part1")}
              <span className="mt-1 block text-(--p)">{t("landing.hero.title.part2")}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-(--ts) sm:mt-6 sm:text-lg">
              {t("landing.hero.description")}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className={BTN_PRIMARY}>
                {t("landing.hero.cta.create")}
              </Link>
              <Link href="/login" className={BTN_OUTLINE}>
                {t("landing.hero.cta.signin")}
              </Link>
            </div>
          </div>

          {/* Stats band: 2×2 on phones, one row on md+ */}
          <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-2 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs) sm:mt-14 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.key}
                className={`flex min-w-0 flex-col gap-1 p-4 text-left sm:p-5
                  ${i % 2 === 0 ? "border-r border-(--bd)" : ""}
                  ${i < 2 ? "border-b border-(--bd) md:border-b-0" : ""}
                  ${i !== 3 ? "md:border-r md:border-(--bd)" : "md:border-r-0"}`}
              >
                <dd className="order-2 text-xl font-extrabold leading-tight text-(--tp) break-words sm:text-2xl">
                  {s.value}
                </dd>
                <dt className="order-1 text-xs font-semibold text-(--p) sm:text-sm">{s.label}</dt>
                <dd className="order-3 text-xs leading-snug text-(--tm) break-words">{s.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      {/* How it works — vertical timeline on mobile, 4 columns on lg */}
      <section id="how-it-works" className="scroll-mt-16 border-b border-(--bd) bg-(--bgs) py-14 sm:py-20">
        <div className={`${SECTION_X} max-w-5xl`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={H2}>{t("landing.sections.howItWorks.title")}</h2>
            <p className={SUB}>{t("landing.sections.howItWorks.subtitle")}</p>
          </div>

          <ol className="mt-10 grid gap-0 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.n} className="relative flex gap-4 pb-8 last:pb-0 sm:block sm:pb-0">
                {/* connector line (mobile only) */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px bg-(--bd) sm:hidden"
                  />
                )}
                <div className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-(--bd) bg-(--pale) text-sm font-bold text-(--p) sm:mb-4">
                  {step.n}
                </div>
                <div className="min-w-0 sm:rounded-2xl sm:border sm:border-(--bd) sm:bg-(--bg) sm:p-4 sm:-mt-14 sm:pt-16 lg:h-full">
                  <h3 className="text-base font-semibold text-(--tp)">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-(--tm)">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features by area */}
      <section id="features" className="scroll-mt-16 py-14 sm:py-20">
        <div className={`${SECTION_X} max-w-6xl`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={H2}>{t("landing.sections.features.title")}</h2>
            <p className={SUB}>{t("landing.sections.features.subtitle")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-3">
            {FEATURE_GROUPS.map((group) => (
              <Card key={group.key} variant="outlined" padding="lg" className="h-full rounded-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--pale) text-(--p)">
                    <group.icon size={20} />
                  </span>
                  <h3 className="text-lg font-semibold text-(--tp)">{group.title}</h3>
                </div>
                <ul className="divide-y divide-(--bd)">
                  {group.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 py-3 text-sm leading-relaxed text-(--ts) first:pt-0 last:pb-0"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-(--p)" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Core concepts — a definition list, not a card grid */}
      <section id="concepts" className="scroll-mt-16 border-y border-(--bd) bg-(--bgs) py-14 sm:py-20">
        <div className={`${SECTION_X} max-w-5xl`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={H2}>{t("landing.sections.concepts.title")}</h2>
            <p className={SUB}>{t("landing.sections.concepts.subtitle")}</p>
          </div>

          <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-(--bd) bg-(--bd) sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
            {CONCEPTS.map((c) => (
              <div key={c.term} className="bg-(--bg) p-5">
                <dt className="text-base font-bold text-(--p)">{c.term}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-(--ts) break-words">{c.def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Money rules */}
      <section id="money-rules" className="scroll-mt-16 py-14 sm:py-20">
        <div className={`${SECTION_X} max-w-3xl`}>
          <Card variant="filled" padding="lg" className="rounded-2xl sm:p-8">
            <h2 className="text-xl font-extrabold tracking-tight text-(--tp) sm:text-3xl">
              {t("landing.sections.moneyRules.title")}
            </h2>
            <ol className="mt-6 space-y-4">
              {MONEY_RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-(--ts) sm:text-base">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-(--pale) text-xs font-bold text-(--p)">
                    {i + 1}
                  </span>
                  <span className="min-w-0 break-words">{rule}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-3xl">
          <Card
            variant="outlined"
            padding="lg"
            className="rounded-2xl text-center sm:p-10 border-(--p)"
          >
            <h2 className="text-2xl font-extrabold tracking-tight text-(--tp) sm:text-3xl">
              {t("landing.cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-(--ts)">
              {t("landing.cta.description")}
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className={BTN_PRIMARY}>
                {t("landing.cta.create")}
              </Link>
              <Link href="/login" className={BTN_OUTLINE}>
                {t("landing.cta.signin")}
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
