"use client";

/**
 * User Guide — a real documentation experience (not a markdown dump):
 *  · sticky table of contents + in-page search,
 *  · scroll-spy highlighting of the current section,
 *  · role comparison matrix, portion chips, split-mode cards, formula cards,
 *  · collapsible feature cards and FAQ accordions,
 *  · fully responsive and bilingual (English / বাংলা).
 *
 * Content strings live in the `guide` i18n namespace; structure lives in
 * `guideContent.js` so both languages stay in lock-step.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuChevronDown,
  LuChevronUp,
  LuCheck,
  LuMinus,
  LuSearch,
  LuX,
  LuArrowUp,
  LuBookOpen,
} from "react-icons/lu";
import Card from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import { useLang } from "@/lib/i18n/LangProvider";
import {
  GUIDE_SECTIONS,
  ROLES,
  ROLE_MATRIX,
  ROLE_CARDS,
  PORTIONS,
  SPLIT_MODES_GUIDE,
  FORMULAS,
  FEATURES,
  FAQ_ITEMS,
} from "./guideContent";

const SERIF_NUM = "tabular-nums";

/** Small helper: a definition row used across sections. */
function Fact({ term, children }) {
  return (
    <div className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
      <p className="text-sm font-bold text-(--tp)">{term}</p>
      <p className="mt-1 text-sm leading-relaxed text-(--ts)">{children}</p>
    </div>
  );
}

/** Sticky table of contents (desktop) / horizontal chips (mobile). */
function TableOfContents({ t, activeId, onJump, results }) {
  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label={t("guide.toc")}
        className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] overflow-y-auto lg:block"
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("guide.toc")}</p>
        <ol className="space-y-0.5">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = activeId === section.id;
            const dim = results && !results.includes(section.id);
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onJump(section.id);
                  }}
                  aria-current={active ? "location" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm no-underline transition-colors ${active ? "bg-(--pale) font-bold text-(--p)" : "text-(--ts) hover:bg-(--bgm)"
                    } ${dim ? "opacity-40" : ""}`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${active ? "bg-(--p) text-(--bgs)" : "bg-(--bgm) text-(--tm)"}`}>
                    {section.number}
                  </span>
                  <Icon size={14} className="shrink-0" />
                  <span className="min-w-0 truncate">{t(section.titleKey)}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile chips */}
      <nav
        aria-label={t("guide.toc")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        {GUIDE_SECTIONS.map((section) => {
          const active = activeId === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                onJump(section.id);
              }}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold no-underline ${active ? "border-(--p) bg-(--pale) text-(--p)" : "border-(--bd) bg-(--bgs) text-(--ts)"
                }`}
            >
              <span className="tabular-nums">{section.number}</span>
              {t(section.titleKey)}
            </a>
          );
        })}
      </nav>
    </>
  );
}

/** Blue header used by every section. */
function SectionHead({ section, t }) {
  const Icon = section.icon;
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--pale) text-(--p)">
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          {section.number} / {GUIDE_SECTIONS.length}
        </p>
        <h2 id={`${section.id}-heading`} className="text-lg font-extrabold text-(--tp) sm:text-xl">
          {t(section.titleKey)}
        </h2>
      </div>
    </div>
  );
}

function RoleMatrix({ t }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-(--bd) bg-(--bgs)">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">{t("guide.s3.tableCaption")}</caption>
        <thead>
          <tr className="border-b border-(--bd) bg-(--bgm) text-left text-[11px] uppercase tracking-wide text-(--tm)">
            <th scope="col" className="px-3 py-2">{t("guide.s3.cap")}</th>
            {ROLES.map((role) => (
              <th key={role} scope="col" className="px-2 py-2 text-center">
                {t(`grp.role.${role}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLE_MATRIX.map((row) => (
            <tr key={row.key} className="border-b border-(--bd) last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-medium text-(--ts)">{t(row.key)}</th>
              {ROLES.map((role) => {
                const allowed = row.allow.includes(role);
                return (
                  <td key={role} className="px-2 py-2 text-center">
                    <span
                      className={`inline-grid size-6 place-items-center rounded-full ${allowed ? "bg-(--success-bg) text-(--success)" : "bg-(--bgm) text-(--tl)"
                        }`}
                      role="img"
                      aria-label={`${t(`grp.role.${role}`)}: ${allowed ? t("guide.s3.yes") : t("guide.s3.no")}`}
                    >
                      {allowed ? <LuCheck size={13} /> : <LuMinus size={13} />}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBody({ section, t }) {
  const { id } = section;

  if (id === "introduction") {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-(--ts)">{t("guide.s1.what")}</p>
        <Card variant="outlined" padding="md" className="rounded-xl">
          <p className="mb-2 text-sm font-bold text-(--tp)">{t("guide.s1.whyTitle")}</p>
          <ul className="space-y-2">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-start gap-2 text-sm leading-relaxed text-(--ts)">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--p)" />
                <span>{t(`guide.s1.why.${n}`)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div>
          <p className="mb-2 text-sm font-bold text-(--tp)">{t("guide.s1.flow")}</p>
          <ol className="space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} className="flex items-start gap-3 rounded-lg border border-(--bd) bg-(--bgs) p-3">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full bg-(--pale) text-xs font-bold text-(--p) ${SERIF_NUM}`}>
                  {n}
                </span>
                <span className="text-sm leading-relaxed text-(--ts)">{t(`guide.s1.step.${n}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  if (id === "getting-started") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Fact term={t("guide.s2.signup")}>{t("guide.s2.signupBody")}</Fact>
        <Fact term={t("guide.s2.create")}>{t("guide.s2.createBody")}</Fact>
        <Fact term={t("guide.s2.join")}>{t("guide.s2.joinBody")}</Fact>
        <Fact term={t("guide.s2.invite")}>{t("guide.s2.inviteBody")}</Fact>
        <Fact term={t("guide.s2.dash")}>{t("guide.s2.dashBody")}</Fact>
        <Fact term={t("guide.s2.profile")}>{t("guide.s2.profileBody")}</Fact>
      </div>
    );
  }

  if (id === "roles") {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-(--ts)">{t("guide.s3.intro")}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_CARDS.map((role) => (
            <Card key={role} variant="outlined" padding="sm" className="rounded-xl">
              <Badge colorScheme="primary" size="sm" isRounded>{t(`grp.role.${role}`)}</Badge>
              <p className="mt-2 text-xs leading-relaxed text-(--ts)">{t(`guide.s3.${role}Body`)}</p>
            </Card>
          ))}
        </div>
        <RoleMatrix t={t} />
      </div>
    );
  }

  if (id === "meals") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Fact term={t("guide.s4.entry")}>{t("guide.s4.entryBody")}</Fact>
          <Fact term={t("guide.s4.edit")}>{t("guide.s4.editBody")}</Fact>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-(--tp)">{t("guide.s4.portions")}</p>
          <p className="mb-2 text-sm leading-relaxed text-(--ts)">{t("guide.s4.portionsBody")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PORTIONS.map((portion) => (
              <div key={portion.key} className="rounded-lg border border-(--bd) bg-(--bgs) p-3 text-center">
                <p className="text-xl font-extrabold text-(--p)">{portion.taka}</p>
                <p className="mt-0.5 text-[11px] text-(--tm)">{t(`guide.${portion.key}`)}</p>
                <p className="text-[11px] tabular-nums text-(--tl)">{portion.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
        <Fact term={t("guide.s4.history")}>{t("guide.s4.historyBody")}</Fact>
        <p className="rounded-lg border border-(--warning)/40 bg-(--warning)/10 p-3 text-sm leading-relaxed text-(--ts)">
          {t("guide.s4.rule")}
        </p>
      </div>
    );
  }

  if (id === "expenses") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Fact term={t("guide.s5.create")}>{t("guide.s5.createBody")}</Fact>
          <Fact term={t("guide.s5.categories")}>{t("guide.s5.categoriesBody")}</Fact>
          <Fact term={t("guide.s5.workflow")}>{t("guide.s5.workflowBody")}</Fact>
          <Fact term={t("guide.s5.contrib")}>{t("guide.s5.contribBody")}</Fact>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-(--tp)">{t("guide.s5.splits")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SPLIT_MODES_GUIDE.map((mode) => (
              <div key={mode.value} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
                <p className="text-sm font-bold text-(--p)">{t(mode.key)}</p>
                <p className="mt-1 text-xs leading-relaxed text-(--ts)">{t(mode.descKey)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-(--tm)">{t("guide.s5.splitsBody")}</p>
        </div>
      </div>
    );
  }

  if (id === "calculations") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-(--ts)">{t("guide.s6.intro")}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {FORMULAS.map((formula) => (
            <Card key={formula.id} variant="outlined" padding="md" className="rounded-xl">
              <p className="text-sm font-bold text-(--tp)">{t(formula.titleKey)}</p>
              <p className="mt-1 text-xs leading-relaxed text-(--ts)">{t(formula.bodyKey)}</p>
              <p className="mt-2 rounded-md bg-(--bgm) px-2 py-1.5 text-xs tabular-nums text-(--p)">
                {t(formula.exampleKey)}
              </p>
            </Card>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="rounded-lg border border-(--bd) bg-(--bgs) p-3 text-xs leading-relaxed text-(--tm)">{t("guide.s6.paidIn")}</p>
          <p className="rounded-lg border border-(--bd) bg-(--bgs) p-3 text-xs leading-relaxed text-(--tm)">{t("guide.s6.explain")}</p>
        </div>
      </div>
    );
  }

  if (id === "settlement") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Fact term={t("guide.s7.reports")}>{t("guide.s7.reportsBody")}</Fact>
          <Fact term={t("guide.s7.after")}>{t("guide.s7.afterBody")}</Fact>
          <Fact term={t("guide.s7.workflow")}>{t("guide.s7.workflowBody")}</Fact>
          <Fact term={t("guide.s7.corrections")}>{t("guide.s7.correctionsBody")}</Fact>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-(--tp)">{t("guide.s7.balances")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { toneClass: "text-(--success)", label: t("status.receives"), sign: "+" },
              { toneClass: "text-(--warning)", label: t("status.settled"), sign: "0" },
              { toneClass: "text-(--danger)", label: t("status.owes"), sign: "−" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-(--bd) bg-(--bgs) p-3 text-center">
                <p className={`text-2xl font-extrabold ${item.toneClass}`}>{item.sign}</p>
                <p className="mt-0.5 text-xs font-semibold text-(--ts)">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-(--tm)">{t("guide.s7.balancesBody")}</p>
        </div>
      </div>
    );
  }

  if (id === "features") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <details key={feature.key} className="group rounded-lg border border-(--bd) bg-(--bgs)">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm font-bold text-(--tp)">{t(`guide.s8.${feature.key}`)}</span>
              <LuChevronDown size={15} className="shrink-0 text-(--tm) group-open:hidden" />
              <LuChevronUp size={15} className="hidden shrink-0 text-(--tm) group-open:block" />
            </summary>
            <p className="border-t border-(--bd) px-3 py-2 text-xs leading-relaxed text-(--ts)">
              {t(`guide.s8.${feature.key}Body`)}
            </p>
          </details>
        ))}
      </div>
    );
  }

  if (id === "faq") {
    return (
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, index) => (
          <details key={item.qKey} className="group rounded-lg border border-(--bd) bg-(--bgs)">
            <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-2 px-3 py-2">
              <span className="flex gap-2 text-sm font-semibold text-(--tp)">
                <span className={`shrink-0 text-(--tm) ${SERIF_NUM}`}>{index + 1}.</span>
                <span>{t(item.qKey)}</span>
              </span>
              <LuChevronDown size={15} className="mt-0.5 shrink-0 text-(--tm) group-open:hidden" />
              <LuChevronUp size={15} className="mt-0.5 hidden shrink-0 text-(--tm) group-open:block" />
            </summary>
            <p className="border-t border-(--bd) px-3 py-2 text-sm leading-relaxed text-(--ts)">{t(item.aKey)}</p>
          </details>
        ))}
      </div>
    );
  }

  // troubleshooting
  const ROWS = [
    ["locked", "lockedA"],
    ["unresolved", "unresolvedA"],
    ["zerounits", "zerounitsA"],
    ["selfApprove", "selfApproveA"],
    ["finalized", "finalizedA"],
    ["auditor", "auditorA"],
    ["joincode", "joincodeA"],
    ["bigfile", "bigfileA"],
  ];
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-lg border border-(--bd) bg-(--bgs) md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-(--bd) bg-(--bgm) text-left text-[11px] uppercase tracking-wide text-(--tm)">
              <th scope="col" className="px-3 py-2">{t("guide.s10.t.problem")}</th>
              <th scope="col" className="px-3 py-2">{t("guide.s10.t.action")}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([problem, action]) => (
              <tr key={problem} className="border-b border-(--bd) last:border-0 align-top">
                <th scope="row" className="px-3 py-2 text-left font-medium text-(--ts)">{t(`guide.s10.${problem}`)}</th>
                <td className="px-3 py-2 text-(--ts)">{t(`guide.s10.${action}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {ROWS.map(([problem, action]) => (
          <div key={problem} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
            <p className="text-xs font-bold text-(--tp)">{t(`guide.s10.${problem}`)}</p>
            <p className="mt-1 text-xs leading-relaxed text-(--ts)">{t(`guide.s10.${action}`)}</p>
          </div>
        ))}
      </div>
      <p className="rounded-lg border border-(--p) bg-(--pale) p-3 text-sm leading-relaxed text-(--ts)">
        {t("guide.s10.help")}
      </p>
    </div>
  );
}

export default function GuideClient({ initialLang = "en" }) {
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(GUIDE_SECTIONS[0].id);

  // Search across titles + keywords in the active language.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return GUIDE_SECTIONS.filter((section) => {
      const title = t(section.titleKey).toLowerCase();
      return title.includes(q) || section.keywords.some((word) => word.toLowerCase().includes(q));
    }).map((section) => section.id);
  }, [query, t]);

  // Scroll spy — highlight the section currently in view.
  useEffect(() => {
    const elements = GUIDE_SECTIONS
      .map((section) => document.getElementById(section.id))
      .filter(Boolean);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 1] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const jump = (id) => {
    const element = document.getElementById(id);
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  };

  const visibleSections = results
    ? GUIDE_SECTIONS.filter((section) => results.includes(section.id))
    : GUIDE_SECTIONS;

  return (
    <div className="min-w-0 px-4 pb-10 pt-4 sm:px-6" lang={initialLang === "bn" || lang === "bn" ? "bn" : "en"}>
      {/* Hero */}
      <header className="mb-4 rounded-2xl border border-(--bd) bg-(--bgs) p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--p)">
              <LuBookOpen size={13} /> MealMate
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-(--tp) sm:text-2xl">
              {t("guide.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-(--ts)">{t("guide.subtitle")}</p>
          </div>
          <Link
            href="/support"
            className="inline-flex min-h-10 items-center rounded-lg border border-(--bd) px-3 text-xs font-semibold text-(--p) no-underline hover:bg-(--pale)"
          >
            {t("shell.support")}
          </Link>
        </div>

        {/* Search */}
        <label className="mt-4 block">
          <span className="sr-only">{t("guide.search")}</span>
          <span className="relative block">
            <LuSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--tm)" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("guide.search")}
              className="min-h-11 w-full rounded-lg border border-(--bd) bg-(--bg) pl-9 pr-10 text-sm text-(--tp) placeholder:text-(--tm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("shell.clear")}
                className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-(--tm) hover:bg-(--bgm)"
              >
                <LuX size={14} />
              </button>
            )}
          </span>
        </label>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <TableOfContents t={t} activeId={activeId} onJump={jump} results={results} />

        <div className="min-w-0 space-y-4">
          {visibleSections.length === 0 ? (
            <Card variant="outlined" padding="lg" className="rounded-xl text-center">
              <p className="text-sm font-semibold text-(--tp)">{t("guide.noResults")}</p>
              <p className="mt-1 text-xs text-(--tm)">{t("guide.search")}</p>
            </Card>
          ) : (
            visibleSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="scroll-mt-20 rounded-2xl border border-(--bd) bg-(--bgs) p-4 sm:p-5"
              >
                <SectionHead section={section} t={t} />
                <SectionBody section={section} t={t} />
              </section>
            ))
          )}

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-(--bd) px-4 text-xs font-semibold text-(--tm) hover:bg-(--bgm)"
            >
              <LuArrowUp size={13} /> {t("guide.backToTop")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
