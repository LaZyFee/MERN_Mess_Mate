"use client";

import { useMemo, useState } from "react";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { moneyApi } from "@/lib/api/money";
import { parseTaka, dhakaToday } from "@/lib/utils/format";
import { MONEY_KINDS, MONEY_METHODS } from "@/lib/utils/money";
import { memberKey, memberName } from "../expenses/expenseHelpers";
import { FUND_KINDS } from "./fundKinds";

const MEMBER_KEYS = {
  contribution: { from: true, to: false, toAccount: true },
  payout: { from: false, to: true, fromAccount: true },
  supplier_payment: { from: true, fromAccount: true, supplier: true },
  member_settlement: { from: true, to: true },
  transfer: { fromAccount: true, toAccount: true },
  fee: { fromAccount: true },
};

function pickOptions(list, emptyLabel) {
  return [{ value: "", label: emptyLabel }, ...list];
}

export default function TransactionForm({ groupId, memberships = [], funds = [], onCreated }) {
  const { showToast } = useToast();
  const [kind, setKind] = useState("contribution");
  const [amount, setAmount] = useState("");
  const [fromMember, setFromMember] = useState("");
  const [toMember, setToMember] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(dhakaToday());
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const fields = MEMBER_KEYS[kind] || {};
  const memberOptions = useMemo(
    () => pickOptions(memberships.map((m) => ({ value: memberKey(m), label: memberName(m) })), "Select member"),
    [memberships],
  );
  const fundOptions = useMemo(
    () => pickOptions(funds.map((f) => ({ value: f._id, label: `${f.name}${f.maskedIdentifier ? ` · ${f.maskedIdentifier}` : ""}` })), "Select fund"),
    [funds],
  );

  const reset = () => {
    setAmount("");
    setReference("");
    setEvidenceUrl("");
    setSupplierName("");
    setFromMember("");
    setToMember("");
    setFromAccount("");
    setToAccount("");
  };

  const submit = async () => {
    const poisha = parseTaka(amount);
    if (poisha < 1) {
      showToast({ status: "warning", title: "Enter a positive amount" });
      return;
    }
    const payload = {
      kind,
      amount: poisha,
      method,
      paidAt: `${paidAt}T00:00:00.000Z`,
      reference: reference.trim() || undefined,
      evidenceUrl: evidenceUrl.trim() || undefined,
      supplierName: fields.supplier ? supplierName.trim() || undefined : undefined,
      fromMember: fields.from && fromMember ? fromMember : null,
      toMember: fields.to && toMember ? toMember : null,
      fromAccount: fields.fromAccount && fromAccount ? fromAccount : null,
      toAccount: fields.toAccount && toAccount ? toAccount : null,
    };
    setSaving(true);
    try {
      const res = await moneyApi.create(groupId, payload);
      showToast({ status: "success", title: res?.msg || "Transaction submitted" });
      reset();
      onCreated?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not submit", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          size="lg"
          label="Kind"
          options={MONEY_KINDS}
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        />
        <Input
          size="lg"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          label="Amount (৳)"
          isRequired
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {fields.from && (
          <Select
            size="lg"
            label="From member"
            options={memberOptions}
            value={fromMember}
            onChange={(event) => setFromMember(event.target.value)}
          />
        )}
        {fields.to && (
          <Select
            size="lg"
            label="To member"
            options={memberOptions}
            value={toMember}
            onChange={(event) => setToMember(event.target.value)}
          />
        )}
        {fields.fromAccount && (
          <Select
            size="lg"
            label="From fund"
            options={fundOptions}
            value={fromAccount}
            onChange={(event) => setFromAccount(event.target.value)}
          />
        )}
        {fields.toAccount && (
          <Select
            size="lg"
            label="To fund"
            options={fundOptions}
            value={toAccount}
            onChange={(event) => setToAccount(event.target.value)}
          />
        )}
        {fields.supplier && (
          <Input
            size="lg"
            label="Supplier"
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            placeholder="Who was paid"
          />
        )}
        <Select
          size="lg"
          label="Method"
          options={MONEY_METHODS}
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        />
        <Input
          size="lg"
          label="Reference / TrxID"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <Input
          size="lg"
          type="date"
          label="Paid on"
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
        />
        <Input
          size="lg"
          type="url"
          label="Evidence link"
          placeholder="https://…"
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
        />
      </div>
      <Button size="lg" isFullWidth isLoading={saving} isDisabled={saving} onClick={submit}>
        Submit transaction
      </Button>
      <p className="text-[11px] text-(--tm)">
        Submitted transactions await treasurer confirmation before they post to the ledger.
      </p>
    </div>
  );
}
