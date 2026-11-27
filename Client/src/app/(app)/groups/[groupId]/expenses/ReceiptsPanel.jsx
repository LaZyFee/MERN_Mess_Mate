"use client";

import { useState } from "react";
import { LuChevronDown, LuChevronUp, LuUpload, LuShieldAlert } from "react-icons/lu";
import Button from "@/components/shared/Button";
import FileInput from "@/components/shared/FileInput";
import { useToast } from "@/components/shared/ToastProvider";
import { attachmentsApi } from "@/lib/api/expenses";
import { useT } from "@/lib/i18n/LangProvider";

const MAX_BYTES = 10 * 1024 * 1024;

function attachmentList(expense) {
  const list = expense?.attachments || expense?.receipts;
  return Array.isArray(list) ? list : [];
}

export default function ReceiptsPanel({ groupId, expense, onUploaded }) {
  const t = useT();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const items = attachmentList(expense);

  const handleFile = async (files) => {
    const file = Array.isArray(files) ? files[0] : files?.target?.files?.[0] || files;
    if (!file || !(file instanceof File)) return;
    if (file.size > MAX_BYTES) {
      showToast({ status: "warning", title: t("exp.fileTooLarge"), description: t("exp.fileTooLargeBody") });
      return;
    }
    setUploading(true);
    try {
      const res = await attachmentsApi.upload(groupId, file);
      showToast({ status: "success", title: t("exp.receiptUploaded") });
      onUploaded?.(res?.attachment || res);
    } catch (ex) {
      showToast({ status: "error", title: t("exp.uploadFailed"), description: ex?.data?.msg || ex?.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-w-0 rounded-lg border border-(--bd) bg-(--bgs)">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-(--tm)">
          {t("exp.receipts")} {items.length > 0 && `(${items.length})`}
        </span>
        {open ? <LuChevronUp size={16} className="text-(--tm)" /> : <LuChevronDown size={16} className="text-(--tm)" />}
      </button>

      {open && (
        <div className="border-t border-(--bd) px-3 py-3">
          {items.length === 0 ? (
            <p className="text-xs text-(--tm)">{t("exp.noReceipt")}</p>
          ) : (
            <ul className="space-y-1">
              {items.map((attachment) => {
                const pending = attachment.scanStatus === "pending";
                return (
                  <li key={attachment._id || attachment.id}>
                    {pending ? (
                      <div className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-(--tm)">
                        <LuShieldAlert size={14} className="shrink-0" />
                        <span className="truncate">{attachment.originalName || attachment.filename || t("exp.receiptFallback")}</span>
                        <span className="ml-auto shrink-0 rounded-full bg-(--bgm) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          {t("exp.scanPending")}
                        </span>
                      </div>
                    ) : (
                      <a
                        href={`/api/bff/attachments/groups/${groupId}/${attachment._id || attachment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-(--p) hover:bg-(--pale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
                      >
                        <span className="truncate">
                          {attachment.originalName || attachment.filename || t("exp.receiptFallback")}
                        </span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {expense?._id ? (
            <div className="mt-3">
              <FileInput
                compact
                hideLabel
                showPreview={false}
                label={t("exp.uploadReceipt")}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                maxFileSize={10}
                isDisabled={uploading}
                helperText={uploading ? t("exp.uploading") : t("exp.uploadHelper")}
                onChange={handleFile}
              />
              {uploading && (
                <Button variant="link" size="sm" isDisabled leftIcon={<LuUpload size={12} />} className="mt-1">
                  {t("exp.uploading")}
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-(--tm)">{t("exp.saveDraftFirst")}</p>
          )}
        </div>
      )}
    </div>
  );
}
