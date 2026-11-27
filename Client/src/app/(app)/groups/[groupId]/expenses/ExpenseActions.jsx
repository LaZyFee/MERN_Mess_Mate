"use client";

import { useState } from "react";
import { LuCheck, LuRotateCcw, LuSend, LuX } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Modal from "@/components/modals/Modal";
import Textarea from "@/components/shared/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { expensesApi } from "@/lib/api/expenses";
import { useT } from "@/lib/i18n/LangProvider";

const ACTIONS = {
  approve: { titleKey: "exp.approveTitle", verbKey: "exp.approveVerb", requiresReason: false, status: "success" },
  reject: { titleKey: "exp.rejectTitle", verbKey: "exp.rejectVerb", requiresReason: true, status: "error" },
  reverse: { titleKey: "exp.reverseTitle", verbKey: "exp.reverseVerb", requiresReason: true, status: "warning" },
};

function ReasonModal({ action, onClose, onConfirm, saving }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const config = ACTIONS[action];
  if (!config) return null;
  const selfApproval = action === "approve";
  return (
    <Modal
      isOpen={Boolean(action)}
      onClose={onClose}
      size="lg"
      header={t(config.titleKey)}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} isDisabled={saving}>
            {t("shell.cancel")}
          </Button>
          <Button
            variant={config.status === "error" ? "danger" : "primary"}
            isLoading={saving}
            isDisabled={saving || (config.requiresReason && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {t(config.verbKey)}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-(--tm)">
        {selfApproval ? t("exp.approveBody") : t("exp.dangerBody")}
      </p>
      <div className="mt-4">
        <Textarea
          label={config.requiresReason ? t("exp.reasonRequired") : t("exp.reasonOptional")}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("exp.reasonPlaceholder")}
        />
      </div>
    </Modal>
  );
}

export default function ExpenseActions({ groupId, expense, canTreasurer, onChanged }) {
  const t = useT();
  const { showToast } = useToast();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(null);

  const run = async (fn, successTitle) => {
    try {
      const res = await fn();
      showToast({ status: "success", title: res?.msg || successTitle });
      onChanged?.();
      return true;
    } catch (ex) {
      showToast({
        status: "error",
        title: t("exp.actionFailed"),
        description: ex?.data?.msg || ex?.message,
      });
      return false;
    }
  };

  const submit = async () => {
    setBusy("submit");
    await run(() => expensesApi.submit(groupId, expense._id), t("exp.submitted"));
    setBusy(null);
  };

  const confirmReason = async (reason) => {
    const action = pending;
    setBusy(action);
    const done = await run(() => {
      if (action === "approve") return expensesApi.approve(groupId, expense._id, reason);
      if (action === "reject") return expensesApi.reject(groupId, expense._id, reason);
      return expensesApi.reverse(groupId, expense._id, reason);
    }, t("exp.done", { action: t(ACTIONS[action].verbKey) }));
    setBusy(null);
    if (done) setPending(null);
  };

  const status = expense?.status;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && (
          <Button
            size="sm"
            leftIcon={<LuSend size={14} />}
            isLoading={busy === "submit"}
            isDisabled={Boolean(busy)}
            onClick={submit}
          >
            {t("exp.submit")}
          </Button>
        )}
        {status === "submitted" && canTreasurer && (
          <>
            <Button
              size="sm"
              leftIcon={<LuCheck size={14} />}
              isDisabled={Boolean(busy)}
              onClick={() => setPending("approve")}
            >
              {t("exp.approve")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              leftIcon={<LuX size={14} />}
              isDisabled={Boolean(busy)}
              onClick={() => setPending("reject")}
            >
              {t("exp.reject")}
            </Button>
          </>
        )}
        {status === "approved" && canTreasurer && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<LuRotateCcw size={14} />}
            isDisabled={Boolean(busy)}
            onClick={() => setPending("reverse")}
          >
            {t("exp.reverse")}
          </Button>
        )}
      </div>

      <ReasonModal
        action={pending}
        saving={Boolean(busy)}
        onClose={() => setPending(null)}
        onConfirm={confirmReason}
      />
    </>
  );
}
