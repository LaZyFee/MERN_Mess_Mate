"use client";

import { useMemo, useState } from "react";
import { LuLandmark, LuPlus, LuWallet } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { moneyApi } from "@/lib/api/money";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { memberKey, memberName } from "../expenses/expenseHelpers";
import { FUND_KINDS } from "./fundKinds";

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
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <Select
        size="sm"
        label={t("money.newCustodian")}
        placeholder={t("money.member")}
        options={options}
        value={custodian}
        onChange={(event) => setCustodian(event.target.value)}
      />
      <Button size="md" variant="outline" isLoading={saving} isDisabled={saving || !custodian} onClick={handover}>
        {t("money.handOver")}
      </Button>
    </div>
  );
}

export default function FundsPanel({
  groupId,
  funds = [],
  memberships = [],
  role,
  onChanged,
}) {
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
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-(--tp)">{t("money.fundAccounts")}</h2>
        {canCreate && (
          <Button size="sm" variant="outline" leftIcon={<LuPlus size={14} />} onClick={() => setOpen((v) => !v)}>
            {t("money.createFund")}
          </Button>
        )}
      </div>

      {open && canCreate && (
        <div className="mb-3 space-y-2 rounded-lg border border-(--bd) bg-(--bgm) p-3">
          <Input size="lg" label={t("money.fundName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("money.fundNamePlaceholder")} />
          <Select size="lg" label={t("money.kind")} options={fundKindOptions} value={kind} onChange={(e) => setKind(e.target.value)} />
          <Input
            size="lg"
            label={t("money.maskedIdentifier")}
            value={masked}
            onChange={(e) => setMasked(e.target.value)}
            placeholder="•••• 1234"
          />
          <Button size="md" isFullWidth isLoading={saving} isDisabled={saving || !name.trim()} onClick={create}>
            {t("money.createFund")}
          </Button>
        </div>
      )}

      {funds.length === 0 ? (
        <p className="rounded-lg border border-(--bd) bg-(--bgs) p-3 text-xs text-(--tm)">
          {t("money.noFunds")}
        </p>
      ) : (
        <div className="space-y-2">
          {funds.map((fund) => (
            <div key={fund._id} className="min-w-0 rounded-lg border border-(--bd) bg-(--bgs) p-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--pale) text-(--p)">
                    {fund.kind === "bank" ? <LuLandmark size={15} /> : <LuWallet size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-(--tp)">{fund.name}</p>
                    <p className="truncate text-[11px] text-(--tm)">
                      {fund.maskedIdentifier || t("money.noIdentifier")}
                      {fund.currentCustodian ? ` · ${t("money.custodySet")}` : ""}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-(--tp)">
                  {fmt(fund.balancePoisha)}
                </p>
              </div>

              {canHandover && (
                <CustodianPicker
                  groupId={groupId}
                  fund={fund}
                  memberships={memberships}
                  onChanged={onChanged}
                />
              )}

              {Array.isArray(fund.custodianHistory) && fund.custodianHistory.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-(--tm)">{t("money.custodyHistory")}</summary>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-(--tl)">
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
          ))}
          <p className="text-right text-xs font-semibold text-(--tm)">
            {t("money.totalBalance")}: <span className="tabular-nums text-(--tp)">{fmt(total)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
