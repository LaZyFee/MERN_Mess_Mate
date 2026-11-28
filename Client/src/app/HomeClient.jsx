"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LangProvider";
import Topbar from "@/components/shared/Topbar";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/shared/Card";
import { LuUtensils, LuReceipt, LuShieldCheck, LuBookOpen, LuCalendarDays, LuShoppingBasket, LuPackage, LuWallet } from "react-icons/lu";
import { LuRefreshCw, LuPlus, LuLogIn } from "react-icons/lu";
import Button from "@/components/shared/Button";

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
  const router = useRouter();

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
    term: t(`landing.${c.termKey}`),
    def: t(`landing.${c.defKey}`),
  }));

  const MONEY_RULES = MONEY_RULES_SRC.map((k) => t(`landing.${k}`));

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-(--bg) text-(--tp)">
      <Topbar />

      <PageHeader
        as="div"
        className="mb-5 sm:mb-6"
        eyebrow={t("shell.builtFor")}
        title={t("shell.groups")}
        description={t("home.dashboardIntro")}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LuRefreshCw size={15} />}
              onClick={() => router.refresh()}
              className="w-full sm:w-fit"
            >
              {t("shell.refresh")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LuPlus size={15} />}
              onClick={() => router.push("/groups/create")}
              className="w-full sm:w-fit"
            >
              {t("grp.create")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LuLogIn size={15} />}
              onClick={() => router.push("/join")}
              className="w-full sm:w-fit"
            >
              {t("grp.join")}
            </Button>
          </>
        }
      />

      <main>
      <section className="bg-(--bgs)">
        <div className={`${SECTION_X} max-w-6xl py-10 sm:py-16`}>
          <div className="grid items-center gap-9 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
            <div>
              <p className="mb-4 flex items-center gap-2 text-sm font-bold text-(--p)">
                <LuUtensils aria-hidden="true" /> {t("landing.hero.badge")}
              </p>
              <h1 className="max-w-2xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
                {t("landing.hero.title.part1")}{" "}
                <span className="block text-(--p)">{t("landing.hero.title.part2")}</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-(--ts) sm:text-lg">{t("landing.hero.description")}</p>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => router.push("/register")}
                  className={BTN_PRIMARY}
                >
                  {t("landing.hero.cta.create")}
                </button>
                <button
                  onClick={() => router.push("/guide")}
                  className={BTN_OUTLINE}
                >
                  <LuBookOpen className="mr-2" />{t("shell.guide")}
                </button>
              </div>
            </div>

            <aside className="overflow-hidden rounded-3xl bg-(--brand-bg) p-5 text-(--brand-fg) shadow-lg sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-(--brand-mute)/40 pb-4">
                <h2 className="font-semibold">{t("landing.example.title")}</h2>
                <LuReceipt size={24} className="shrink-0 text-(--brand-on)" />
              </div>
              <dl className="space-y-3 pt-6">
                {[["food", "pool"], ["units", "units"]].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4">
                    <dt>{t(`guide.s6.f.${label}`)}</dt>
                    <dd className="font-bold tabular-nums">{t(`landing.example.${value}`)}</dd>
                  </div>
                ))}
                <div className="mt-6 border-t border-dashed border-(--brand-mute) pt-5">
                  <dt className="text-sm">{t("guide.s6.f.rate")}</dt>
                  <dd className="mt-1 text-5xl font-extrabold tracking-tight text-(--brand-on)">{t("landing.example.rate")}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed">{t("guide.s6.f.rateBody")}</p>
            </aside>
          </div>

          {/* Stats band: 2×2 on phones, one row on md+ */}
          <dl className="mx-auto mt-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs) sm:mt-14 md:grid-cols-4">
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
      <section className="border-y border-(--bd) bg-(--pale) py-12 sm:py-16">
        <div className={`${SECTION_X} grid max-w-6xl gap-8 lg:grid-cols-[1fr_2fr]`}>
          <div>
            <h2 className={H2}>{t("landing.daily.title")}</h2>
            <Link href="/guide#features" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-(--p) underline underline-offset-4">
              <LuBookOpen />{t("shell.guide")}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[[LuCalendarDays, "menu"], [LuShoppingBasket, "shopping"], [LuPackage, "kitchen"], [LuWallet, "budgets"]].map(([Icon, key]) => (
              <article key={key} className="border-t border-(--p)/30 pt-4">
                <Icon size={22} className="mb-2 text-(--p)" />
                <h3 className="font-bold">{t(`guide.s8.${key}`)}</h3>
                <p className="mt-1 leading-relaxed text-(--ts)">{t(`guide.s8.${key}Body`)}</p>
              </article>
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
              <button
                onClick={() => router.push("/register")}
                className={BTN_PRIMARY}
              >
                {t("landing.cta.create")}
              </button>
              <button
                onClick={() => router.push("/login")}
                className={BTN_OUTLINE}
              >
                {t("landing.cta.signin")}
              </button>
            </div>
          </Card>
        </div>
      </section>
      </main>
    </div>
  );
}
