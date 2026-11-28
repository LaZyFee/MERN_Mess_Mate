"use client";

/**
 * Money ledger hero — "where do I stand?" in one card.
 * Direction (owe / owed / settled) drives the tone; amounts stay tabular.
 */
import { LuArrowDownLeft, LuArrowUpRight, LuScale, LuInfo } from "react-icons/lu";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

export default function MyBalanceCard({ balance }) {
  const t = useT();
  const { fmt } = useMoney();
  const poisha = Number(balance?.balancePoisha ?? 0);
  const positive = poisha > 0;
  const settled = poisha === 0;

  const Icon = settled ? LuScale : positive ? LuArrowDownLeft : LuArrowUpRight;

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-(--brand-bg) px-4 py-4 text-(--brand-fg) ring-1 ring-(--brand-on)/15 sm:px-5 sm:py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-14 -z-10 size-44 rounded-full bg-(--brand-on) opacity-20 blur-3xl"
      />
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-(--brand-on)">{t("money.myBalance")}</p>
      <p
        className={`mt-1 truncate text-[30px] font-black leading-none tracking-tight tabular-nums sm:text-4xl ${settled ? "text-(--brand-fg)" : positive ? "text-(--brand-on)" : "text-(--brand-fg)"
          }`}
      >
        {settled ? fmt(0) : fmt(Math.abs(poisha))}
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-(--brand-fg)/10 px-2.5 py-1 text-[11.5px] font-semibold text-(--brand-fg) ring-1 ring-(--brand-fg)/15">
        <Icon size={13} className={settled ? "" : "text-(--brand-on)"} />
        {settled ? t("money.settled") : positive ? t("money.groupOwesMe") : t("money.iOweGroup")}
      </p>
      {balance?.meaning && (
        <p className="mt-2 flex items-start gap-1 text-[11px] leading-snug text-(--brand-mute)">
          <LuInfo size={11} className="mt-0.5 shrink-0" />
          {t(`money.meaning.${balance.meaning}`, {}) || balance.meaning}
        </p>
      )}
    </section>
  );
}
