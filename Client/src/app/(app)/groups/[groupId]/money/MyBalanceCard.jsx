"use client";

import { LuArrowDownLeft, LuArrowUpRight, LuScale } from "react-icons/lu";
import Card from "@/components/shared/Card";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

/** Money hero card — my ledger balance within the group (poisha integers). */
export default function MyBalanceCard({ balance }) {
  const t = useT();
  const { fmt } = useMoney();
  const poisha = Number(balance?.balancePoisha ?? 0);
  const positive = poisha > 0;

  return (
    <Card variant="elevated" padding="md" className="min-w-0 bg-(--p) text-(--bgs)">
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{t("money.myBalance")}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{fmt(Math.abs(poisha))}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold">
        {poisha === 0 ? (
          <>
            <LuScale size={14} /> {t("money.settled")}
          </>
        ) : positive ? (
          <>
            <LuArrowDownLeft size={14} /> {t("money.groupOwesMe")}
          </>
        ) : (
          <>
            <LuArrowUpRight size={14} /> {t("money.iOweGroup")}
          </>
        )}
      </p>
      {balance?.meaning && (
        <p className="mt-1 text-[11px] opacity-80">{t(`money.meaning.${balance.meaning}`, {}) || balance.meaning}</p>
      )}
    </Card>
  );
}
