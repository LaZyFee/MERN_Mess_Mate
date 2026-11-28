"use client";

/**
 * "Explain my bill" sheet — the server-built breakdown of one frozen statement
 * item, in English or Bengali. Nothing is recalculated here.
 */
import { useCallback, useEffect, useState } from "react";
import { LuReceiptText, LuLoaderCircle, LuTriangleAlert, LuSparkles } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Modal from "@/components/modals/Modal";
import { statementsApi } from "@/lib/api/statements";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const LANGS = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

function amountOf(row, fmt, lang) {
  return row.display?.[lang] || row.display?.en || fmt(row.amountPoisha || 0, { lang });
}

export default function ExplainBillDrawer({ groupId, month, membershipId = null, displayName = "", onClose }) {
  const t = useT();
  const { lang: uiLang, fmt } = useMoney();
  const [lang, setLang] = useState("en");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (targetLang = lang) => {
      setLoading(true);
      setError(null);
      try {
        setData(await statementsApi.explain(groupId, month, membershipId, targetLang));
      } catch (ex) {
        setError(ex?.data?.msg || ex?.message || t("stmt.explainFailed"));
      } finally {
        setLoading(false);
      }
    },
    [groupId, month, membershipId, lang, t],
  );

  useEffect(() => {
    if (!month) return;
    const next = uiLang === "bn" ? "bn" : "en";
    setLang(next);
    load(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, membershipId]);

  const pick = (row) => (lang === "bn" && row.labelBn ? row.labelBn : row.label);

  return (
    <Modal
      isOpen={Boolean(month)}
      onClose={onClose}
      header={
        <span className="flex min-w-0 items-center gap-2">
          <LuReceiptText size={16} className="shrink-0" />
          <span className="truncate">{t("stmt.explainMyBill")}</span>
          {displayName ? <span className="truncate text-xs font-normal text-(--tm)">· {displayName}</span> : null}
        </span>
      }
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="mb-3 flex gap-1 rounded-full bg-(--bgm) p-1">
        {LANGS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setLang(option.value);
              load(option.value);
            }}
            className={`min-h-9 flex-1 rounded-full text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p) ${lang === option.value ? "bg-(--bgs) text-(--tp) shadow-sm" : "text-(--tm)"
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-(--tm)">
          <LuLoaderCircle size={16} className="animate-spin" /> {t("stmt.buildingBreakdown")}
        </p>
      ) : error ? (
        <p className="flex items-start gap-2 rounded-xl border border-(--danger)/40 bg-(--danger-bg) p-3 text-xs text-(--ts)">
          <LuTriangleAlert size={14} className="mt-px shrink-0 text-(--danger)" /> {error}
        </p>
      ) : data ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-(--pale) p-3 ring-1 ring-(--p)/20">
            <p className="flex items-start gap-1.5 text-sm font-extrabold leading-snug text-(--p)">
              <LuSparkles size={14} className="mt-0.5 shrink-0" /> {data.headline}
            </p>
            {data.summary?.note && <p className="mt-1 text-[11px] leading-relaxed text-(--tm)">{data.summary.note}</p>}
          </div>

          {(data.sections || []).map((section) => (
            <div key={section.key}>
              <ul className="divide-y divide-(--bd) overflow-hidden rounded-xl border border-(--bd) bg-(--bgs)">
                {section.rows.map((row) => (
                  <li
                    key={row.key}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-[13px] ${row.emphasis ? "font-bold text-(--tp)" : "text-(--ts)"
                      }`}
                  >
                    <span className="min-w-0">{pick(row)}</span>
                    <span className={`shrink-0 tabular-nums ${row.negative ? "text-(--danger)" : ""}`}>
                      {row.amountPoisha == null ? "" : amountOf(row, fmt, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      <Button size="md" variant="ghost" isFullWidth className="mt-3 rounded-xl" onClick={onClose}>
        {t("shell.close")}
      </Button>
    </Modal>
  );
}
