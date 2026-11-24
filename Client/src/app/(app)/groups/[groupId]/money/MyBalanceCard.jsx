"use client";

import { LuArrowDownLeft, LuArrowUpRight, LuScale } from "react-icons/lu";
import Card from "@/components/shared/Card";
import { formatPoisha } from "@/lib/utils/format";

/** Money hero card — my ledger balance within the group (poisha integers). */
export default function MyBalanceCard({ balance }) {
  const poisha = Number(balance?.balancePoisha ?? 0);
  const meaning = balance?.meaning || (poisha > 0 ? "group owes member" : poisha < 0 ? "member owes group" : "settled");
  const positive = poisha > 0;

  return (
    <Card variant="elevated" padding="md" className="min-w-0 bg-(--p) text-(--bgs)">
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">My balance</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatPoisha(Math.abs(poisha))}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold">
        {poisha === 0 ? (
          <>
            <LuScale size={14} /> Settled — nothing due
          </>
        ) : positive ? (
          <>
            <LuArrowDownLeft size={14} /> The group owes you
          </>
        ) : (
          <>
            <LuArrowUpRight size={14} /> You owe the group
          </>
        )}
      </p>
      {balance?.meaning && balance.meaning !== meaning && (
        <p className="mt-1 text-[11px] opacity-80">{balance.meaning}</p>
      )}
    </Card>
  );
}
