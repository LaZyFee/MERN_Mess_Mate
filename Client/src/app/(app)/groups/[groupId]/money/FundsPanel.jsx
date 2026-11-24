"use client";

import { useMemo, useState } from "react";
import { LuLandmark, LuPlus, LuWallet } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { moneyApi } from "@/lib/api/money";
import { formatPoisha, formatDay } from "@/lib/utils/format";
import { memberKey, memberName } from "../expenses/expenseHelpers";
import { FUND_KINDS } from "./fundKinds";

function CustodianPicker({ groupId, fund, memberships, onChanged }) {
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
      showToast({ status: "success", title: "Custody transferred" });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Handover failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <Select
        size="sm"
        label="New custodian"
        placeholder="Choose a member"
        options={options}
        value={custodian}
        onChange={(event) => setCustodian(event.target.value)}
      />
      <Button size="md" variant="outline" isLoading={saving} isDisabled={saving || !custodian} onClick={handover}>
        Hand over
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
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("cash");
  const [masked, setMasked] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreate = ["owner", "manager", "treasurer"].includes(role);
  const canHandover = role === "owner";

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
      showToast({ status: "success", title: "Fund account created" });
      setName("");
      setMasked("");
      setOpen(false);
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not create fund", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-(--tp)">Fund accounts</h2>
        {canCreate && (
          <Button size="sm" variant="outline" leftIcon={<LuPlus size={14} />} onClick={() => setOpen((v) => !v)}>
            New fund
          </Button>
        )}
      </div>

      {open && canCreate && (
        <div className="mb-3 space-y-2 rounded-lg border border-(--bd) bg-(--bgm) p-3">
          <Input size="lg" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main cash box" />
          <Select size="lg" label="Kind" options={FUND_KINDS} value={kind} onChange={(e) => setKind(e.target.value)} />
          <Input
            size="lg"
            label="Masked identifier"
            value={masked}
            onChange={(e) => setMasked(e.target.value)}
            placeholder="•••• 1234"
          />
          <Button size="md" isFullWidth isLoading={saving} isDisabled={saving || !name.trim()} onClick={create}>
            Create fund
          </Button>
        </div>
      )}

      {funds.length === 0 ? (
        <p className="rounded-lg border border-(--bd) bg-(--bgs) p-3 text-xs text-(--tm)">
          No fund accounts yet.
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
                      {fund.maskedIdentifier || "No identifier"}
                      {fund.currentCustodian ? " · custody set" : ""}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-(--tp)">
                  {formatPoisha(fund.balancePoisha)}
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
                  <summary className="cursor-pointer text-[11px] font-semibold text-(--tm)">Custody history</summary>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-(--tl)">
                    {fund.custodianHistory.map((entry, index) => (
                      <li key={entry._id || index}>
                        {entry.from ? formatDay(String(entry.from).slice(0, 10)) : "—"} →{" "}
                        {entry.to ? formatDay(String(entry.to).slice(0, 10)) : "current"}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
          <p className="text-right text-xs font-semibold text-(--tm)">
            Total balance: <span className="tabular-nums text-(--tp)">{formatPoisha(total)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
