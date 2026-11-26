"use client";

/**
 * T14.14 — "Explain my bill" drawer (`GET /statements/groups/:groupId/statements/:month/explain`).
 * Renders the server-built breakdown of one frozen statement item in English or
 * Bengali. Nothing is recalculated here: every figure comes from the statement.
 */
import { useCallback, useEffect, useState } from "react";
import { LuReceiptText, LuLoaderCircle, LuTriangleAlert } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Modal from "@/components/modals/Modal";
import { statementsApi } from "@/lib/api/statements";
import { formatPoisha } from "@/lib/utils/format";

const LANGS = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

function amountOf(row) {
  // the server ships display strings; fall back to the poisha value
  return row.display?.en || formatPoisha(row.amountPoisha || 0);
}

export default function ExplainBillDrawer({ groupId, month, membershipId = null, displayName = "", onClose }) {
  const [lang, setLang] = useState("en");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (targetLang = lang) => {
    setLoading(true);
    setError(null);
    try {
      setData(await statementsApi.explain(groupId, month, membershipId, targetLang));
    } catch (ex) {
      setError(ex?.data?.msg || ex?.message || "Could not build the explanation");
    } finally {
      setLoading(false);
    }
  }, [groupId, month, membershipId, lang]);

  useEffect(() => {
    if (month) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, membershipId]);

  const pick = (row) => (lang === "bn" && row.labelBn ? row.labelBn : row.label);

  return (
    <Modal
      isOpen={Boolean(month)}
      onClose={onClose}
      header={
        <span className="flex items-center gap-2">
          <LuReceiptText size={16} /> {lang === "bn" ? "আমার বিল" : "Explain my bill"}
          {displayName ? <span className="text-xs font-normal text-(--tm)">· {displayName}</span> : null}
        </span>
      }
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="mb-3 flex gap-1 rounded-lg bg-(--bgm) p-1">
        {LANGS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => { setLang(option.value); load(option.value); }}
            className={`min-h-9 flex-1 rounded-md px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p) ${lang === option.value ? "bg-(--bgs) text-(--tp) shadow-[var(--shadow-md)]" : "text-(--tm)"
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-(--tm)">
          <LuLoaderCircle size={16} className="animate-spin" /> Building the breakdown…
        </p>
      ) : error ? (
        <p className="flex items-center gap-2 rounded-lg border border-(--danger) bg-(--danger-bg) p-3 text-xs text-(--ts)">
          <LuTriangleAlert size={14} /> {error}
        </p>
      ) : data ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-(--p) bg-(--pale) p-3">
            <p className="text-sm font-extrabold text-(--p)">{data.headline}</p>
            <p className="text-[11px] text-(--tm)">{data.summary?.note}</p>
          </div>

          {(data.sections || []).map((section) => (
            <div key={section.key}>
              <ul className="divide-y divide-(--bd) rounded-lg border border-(--bd) bg-(--bgs)">
                {section.rows.map((row) => (
                  <li
                    key={row.key}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${row.emphasis ? "font-bold text-(--tp)" : "text-(--ts)"}`}
                  >
                    <span className="min-w-0">{pick(row)}</span>
                    <span className={`shrink-0 tabular-nums ${row.negative ? "text-(--danger)" : ""}`}>
                      {row.amountPoisha == null ? "" : amountOf(row)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      <Button size="sm" variant="ghost" isFullWidth className="mt-3" onClick={onClose}>
        {lang === "bn" ? "বন্ধ করুন" : "Close"}
      </Button>
    </Modal>
  );
}
