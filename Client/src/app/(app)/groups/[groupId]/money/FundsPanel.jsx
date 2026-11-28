"use client";

/**
 * Fund accounts (cash box / wallet / bank) with balances and custody history.
 * Mobile-first: each fund is a card; the creator is a collapsible sheet.
 */
import { useMemo, useState } from "react";
import { LuLandmark, LuPlus, LuSmartphone, LuWallet, LuCoins, LuUserCog } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { moneyApi } from "@/lib/api/money";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { memberKey, memberName } from "../expenses/expenseHelpers";
import { EmptyState } from "../GroupUI";
import { FUND_KINDS } from "./fundKinds";

const KIND_ICON = { bank: LuLandmark, wallet: LuSmartphone, cash: LuCoins };

function CustodianPicker({ groupId, fund, memberships, onChanged }) {
  const t = useT();
  const { showToast } = useToast();
  const [custodian, setCustodian] = useState("");
  const [saving, setSaving] = useState(false);

  const options = memberships.map((membership) => ({
    value: membership.userId?._id || membership.userId || memberKey(membership),
    label: memberName(membership),
  }));

  const handover = async () => {
    if (!custodian) return;
    setSaving(true);
    try {
      await moneyApi.changeCustodian(groupId, fund._id, custodian);
      showToast({ status: "success", title: t("money.custodyTransferred") });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("money.handoverFailed"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2.5 space-y-2 border-t border-(--bd) pt-2.5">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
        <LuUserCog size={12} /> {t("money.custodian")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <Select
          size="md"
          label={t("money.newCustodian")}
          placeholder={t("money.member")}
          options={options}
          value={custodian}
          onChange={(event) => setCustodian(event.target.value)}
        />
        <Button size="md" className="rounded-xl" variant="outline" isLoading={saving} isDisabled={saving || !custodian} onClick={handover}>
          {t("money.handOver")}
        </Button>
      </div>
    </div>
  );
}

export default function FundsPanel({ groupId, funds = [], memberships = [], role, onChanged }) {
  const t = useT();
  const { lang, fmt } = useMoney();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("cash");
  const [masked, setMasked] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreate = ["owner", "manager", "treasurer"].includes(role);
  const canHandover = role === "owner";

  const fundKindOptions = useMemo(
    () => FUND_KINDS.map((option) => ({ value: option.value, label: t(`money.fundKind.${option.value}`) })),
    [t],
  );

  const total = useMemo(
    () => funds.reduce((sum, fund) => sum + Number(fund.balancePoisha || 0), 0),
    [funds],
  );

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await moneyApi.createFund(groupId, {
        name: name.trim(),
        kind,
        maskedIdentifier: masked.trim() || undefined,
      });
      showToast({ status: "success", title: t("money.fundCreated") });
      setName("");
      setMasked("");
      setOpen(false);
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("money.couldNotCreateFund"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          {t("money.funds")} · {fmt(total)}
        </p>
        {canCreate && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            leftIcon={<LuPlus size={13} />}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {t("money.createFund")}
          </Button>
        )}
      </div>

      {open && canCreate && (
        <div className="space-y-2 rounded-2xl border border-(--bd) bg-(--bgm) p-3">
          <Input size="md" label={t("money.fundName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("money.fundNamePlaceholder")} />
          <Select size="md" label={t("money.kind")} options={fundKindOptions} value={kind} onChange={(e) => setKind(e.target.value)} />
          <Input size="md" label={t("money.maskedIdentifier")} value={masked} onChange={(e) => setMasked(e.target.value)} placeholder="•••• 1234" />
          <Button size="md" className="rounded-xl" isFullWidth isLoading={saving} isDisabled={saving || !name.trim()} onClick={create}>
            {t("money.createFund")}
          </Button>
        </div>
      )}

      {funds.length === 0 ? (
        <EmptyState icon={LuWallet} title={t("money.noFunds")} body={t("money.fundAssets")} />
      ) : (
        <div className="space-y-2">
          {funds.map((fund) => {
            const Icon = KIND_ICON[fund.kind] || LuWallet;
            return (
              <div key={fund._id} className="min-w-0 rounded-2xl border border-(--bd) bg-(--bgs) p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p)">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-(--tp)">{fund.name}</p>
                    <p className="truncate text-[11px] text-(--tm)">
                      {t(`money.fundKind.${fund.kind}`)}
                      {fund.maskedIdentifier ? ` · ${fund.maskedIdentifier}` : ""}
                      {fund.currentCustodian ? ` · ${t("money.custodySet")}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-extrabold tabular-nums text-(--tp)">{fmt(fund.balancePoisha)}</p>
                </div>

                {canHandover && (
                  <CustodianPicker groupId={groupId} fund={fund} memberships={memberships} onChanged={onChanged} />
                )}

                {Array.isArray(fund.custodianHistory) && fund.custodianHistory.length > 0 && (
                  <details className="mt-2 border-t border-(--bd) pt-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-(--tm)">
                      {t("money.custodyHistory")}
                    </summary>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-(--tm)">
                      {fund.custodianHistory.map((entry, index) => (
                        <li key={entry._id || index}>
                          {entry.from ? formatDay(String(entry.from).slice(0, 10), lang) : "—"} →{" "}
                          {entry.to ? formatDay(String(entry.to).slice(0, 10), lang) : t("money.current")}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
