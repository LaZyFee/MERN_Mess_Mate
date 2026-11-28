"use client";

import { useState } from "react";
import { LuLogIn } from "react-icons/lu";
import PageHeader from "@/components/shared/PageHeader";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";
import { useT } from "@/lib/i18n/LangProvider";

function JoinForm({ initialCode }) {
  const t = useT();
  const { showToast } = useToast();
  const [code, setCode] = useState(initialCode);
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) {
      showToast({ status: "error", title: t("join.error.emptyCode") });
      return;
    }
    if (!groupId.trim()) {
      showToast({ status: "error", title: t("join.error.emptyGroupId") });
      return;
    }
    setLoading(true);
    try {
      await groupsApi.joinByCode({ code: code.trim(), groupId: groupId.trim() });
      showToast({
        status: "success",
        title: t("join.success.title"),
        description: t("join.success.description"),
      });
    } catch (ex) {
      if (ex?.status === 429) {
        showToast({ status: "error", title: t("join.error.tooManyAttempts") });
      } else {
        const msg = ex?.data?.message || ex?.message || t("join.error.failed");
        showToast({ status: "error", title: msg });
      }
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 sm:gap-6">
      <Input
        label={t("join.code")}
        isRequired
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
        }}
        placeholder="MM-XXXXXX"
        helperText={t("join.helper.code")}
        autoComplete="off"
      />
      <Input
        label={t("join.groupId")}
        isRequired
        value={groupId}
        onChange={(e) => {
          setGroupId(e.target.value.trim());
        }}
        placeholder={t("join.placeholder.groupId")}
        helperText={t("join.helper.groupId")}
        autoComplete="off"
      />
      <Button
        type="submit"
        variant="primary"
        isFullWidth
        isLoading={loading}
        isDisabled={loading}
        leftIcon={<LuLogIn size={16} />}
      >
        {t("join.submit")}
      </Button>
    </form>
  );
}

export default function JoinClient({ initialCode = "" }) {
  const t = useT();
  return (
    <div className="min-h-[100dvh] bg-(--bg) overflow-x-hidden">
      <PageHeader
        as="div"
        className="mb-4 sm:mb-6"
        backHref="/dashboard"
        backLabel={t("shell.back")}
        title={t("join.title")}
        description={t("join.subtitle")}
      />
      <div className="mx-auto min-w-0 w-full px-3 sm:px-6 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <JoinForm initialCode={initialCode} />
      </div>
    </div>
  );
}
