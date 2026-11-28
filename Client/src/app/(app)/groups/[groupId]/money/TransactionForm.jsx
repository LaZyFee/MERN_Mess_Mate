"use client";

/**
 * Submit a money transaction.
 * Mobile-first: kind first (drives the fields), amount next, then only the
 * fields that kind needs. The submit button sticks to the bottom.
 */
import { useMemo, useState } from "react";
import { LuSend } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { moneyApi } from "@/lib/api/money";
import { dhakaToday } from "@/lib/utils/format";
import { MONEY_KINDS, MONEY_METHODS } from "@/lib/utils/money";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { memberKey, memberName } from "../expenses/expenseHelpers";

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
  const t = useT();
  const { parse, errorText } = useMoney();
  const { showToast } = useToast();
  const [kind, setKind] = useState("contribution");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
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
    () => pickOptions(memberships.map((m) => ({ value: memberKey(m), label: memberName(m) })), t("money.member")),
    [memberships, t],
  );
  const fundOptions = useMemo(
    () =>
      pickOptions(
        funds.map((f) => ({ value: f._id, label: `${f.name}${f.maskedIdentifier ? ` · ${f.maskedIdentifier}` : ""}` })),
        t("money.funds"),
      ),
    [funds, t],
  );
  const kindOptions = useMemo(
    () => MONEY_KINDS.map((k) => ({ value: k.value, label: t(`money.kind.${k.value}`) })),
    [t],
  );
  const methodOptions = useMemo(
    () => MONEY_METHODS.map((m) => ({ value: m.value, label: t(`money.method.${m.value}`) })),
    [t],
  );

  const reset = () => {
    setAmount("");
    setAmountError("");
    setReference("");
    setEvidenceUrl("");
    setSupplierName("");
    setFromMember("");
    setToMember("");
    setFromAccount("");
    setToAccount("");
  };

  const onAmountChange = (value) => {
    setAmount(value);
    if (!value.trim()) {
      setAmountError("");
      return;
    }
    const result = parse(value);
    setAmountError(result.ok ? "" : errorText(result.reason));
  };

  const submit = async () => {
    const result = parse(amount);
    if (!result.ok) {
      setAmountError(errorText(result.reason));
      showToast({ status: "warning", title: errorText(result.reason) });
      return;
    }
    setAmountError("");
    const payload = {
      kind,
      amount: result.poisha,
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
      showToast({ status: "success", title: res?.msg || t("money.submitted") });
      reset();
      onCreated?.();
    } catch (ex) {
      showToast({ status: "error", title: t("money.couldNotSubmit"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          size="lg"
          label={t("money.kind")}
          options={kindOptions}
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        />
        <Input
          size="lg"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          label={t("money.amount")}
          isRequired
          placeholder="0.00"
          value={amount}
          isInvalid={Boolean(amountError)}
          errorMessage={amountError}
          onChange={(event) => onAmountChange(event.target.value)}
        />
        {fields.from && (
          <Select
            size="lg"
            label={t("money.fromMember")}
            options={memberOptions}
            value={fromMember}
            onChange={(event) => setFromMember(event.target.value)}
          />
        )}
        {fields.to && (
          <Select
            size="lg"
            label={t("money.toMember")}
            options={memberOptions}
            value={toMember}
            onChange={(event) => setToMember(event.target.value)}
          />
        )}
        {fields.fromAccount && (
          <Select
            size="lg"
            label={t("money.fromFund")}
            options={fundOptions}
            value={fromAccount}
            onChange={(event) => setFromAccount(event.target.value)}
          />
        )}
        {fields.toAccount && (
          <Select
            size="lg"
            label={t("money.toFund")}
            options={fundOptions}
            value={toAccount}
            onChange={(event) => setToAccount(event.target.value)}
          />
        )}
        {fields.supplier && (
          <Input
            size="lg"
            label={t("money.supplier")}
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            placeholder={t("money.supplierHint")}
          />
        )}
        <Select
          size="lg"
          label={t("money.method")}
          options={methodOptions}
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        />
        <Input
          size="lg"
          label={t("money.reference")}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <Input
          size="lg"
          type="date"
          label={t("money.paidOn")}
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
        />
        <Input
          size="lg"
          type="url"
          label={t("money.evidenceLink")}
          placeholder="https://…"
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
        />
      </div>

      <div className="sticky bottom-2 z-20 rounded-2xl border border-(--bd) bg-(--glb) p-2 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <Button
          size="lg"
          className="rounded-xl"
          isFullWidth
          leftIcon={<LuSend size={15} />}
          isLoading={saving}
          isDisabled={saving}
          onClick={submit}
        >
          {t("money.submit")}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-(--tm)">{t("money.note")}</p>
    </div>
  );
}
