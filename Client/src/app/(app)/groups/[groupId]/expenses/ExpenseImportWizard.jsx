"use client";

/**
 * Spreadsheet import wizard: pick file → review diff → apply.
 * The modal is already a bottom sheet on mobile; here we keep every step to a
 * single column and make the primary action full-width.
 */
import { useRef, useState } from "react";
import { LuFileSpreadsheet, LuCircleCheck, LuTriangleAlert, LuClipboardPaste } from "react-icons/lu";
import Button from "@/components/shared/Button";
import FileInput from "@/components/shared/FileInput";
import Modal from "@/components/modals/Modal";
import ModalStepper from "@/components/shared/ModalStepper";
import { useToast } from "@/components/shared/ToastProvider";
import { expensesApi } from "@/lib/api/expenses";
import { useMoney } from "@/lib/hooks/useMoney";

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Review" },
  { id: 3, label: "Import" },
];

const MAX_BYTES = 5 * 1024 * 1024;

export default function ExpenseImportWizard({ isOpen, onClose, groupId, onImported }) {
  const { fmt, n } = useMoney();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
    fileRef.current = null;
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const chooseFile = (files) => {
    const picked = Array.isArray(files) ? files[0] : files?.target?.files?.[0] || files;
    if (!picked || !(picked instanceof File)) return;
    if (picked.size > MAX_BYTES) {
      showToast({ status: "warning", title: "File too large", description: "Maximum 5 MB per import." });
      return;
    }
    if (!/\.(xlsx|csv)$/i.test(picked.name)) {
      showToast({ status: "warning", title: "Unsupported file", description: "Upload a .xlsx or .csv file." });
      return;
    }
    setFile(picked);
  };

  const runPreview = async () => {
    if (!file) {
      showToast({ status: "warning", title: "Choose a file first" });
      return;
    }
    setLoading(true);
    try {
      const data = await expensesApi.previewImport(groupId, { file });
      setPreview(data);
      setStep(2);
    } catch (ex) {
      showToast({ status: "error", title: "Preview failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  };

  const applyImport = async () => {
    if (!preview?.previewHash) return;
    setLoading(true);
    try {
      const data = await expensesApi.applyImport(groupId, { file, previewHash: preview.previewHash });
      setResult(data);
      setStep(3);
      showToast({ status: "success", title: data?.msg || "Import complete" });
      onImported?.();
    } catch (ex) {
      if (ex?.status === 409) {
        showToast({ status: "warning", title: "File changed", description: ex?.data?.msg || "Re-run the preview." });
        setStep(1);
      } else {
        showToast({ status: "error", title: "Import failed", description: ex?.data?.msg || ex?.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      header="Import expenses"
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={close} isDisabled={loading}>
            {step === 3 ? "Done" : "Cancel"}
          </Button>
          {step === 1 && (
            <Button isFullWidth className="sm:!w-fit" onClick={runPreview} isLoading={loading} isDisabled={loading || !file}>
              Preview
            </Button>
          )}
          {step === 2 && (
            <Button
              isFullWidth
              className="sm:!w-fit"
              onClick={applyImport}
              isLoading={loading}
              isDisabled={loading || !preview?.toCreate?.length}
            >
              Import {n(preview?.toCreate?.length || 0)} draft(s)
            </Button>
          )}
        </div>
      }
    >
      <ModalStepper steps={STEPS} currentStep={step} />

      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-(--bgm) px-3 py-2 text-[11px] leading-relaxed text-(--tm)">
            <LuClipboardPaste size={13} className="mt-0.5 shrink-0 text-(--p)" />
            <span>
              Columns: <code className="font-semibold text-(--ts)">date</code>,{" "}
              <code className="font-semibold text-(--ts)">supplier</code>,{" "}
              <code className="font-semibold text-(--ts)">category</code>,{" "}
              <code className="font-semibold text-(--ts)">amount</code> (৳, e.g. 1,250.50),{" "}
              <code className="font-semibold text-(--ts)">description</code>,{" "}
              <code className="font-semibold text-(--ts)">receiptRef</code>,{" "}
              <code className="font-semibold text-(--ts)">paidBy</code>. Nothing is written until you confirm.
            </span>
          </div>
          <FileInput
            ref={fileRef}
            label="Spreadsheet"
            showPreview={false}
            accept=".xlsx,.csv"
            maxFileSize={5}
            onChange={chooseFile}
            helperText={file ? `Selected: ${file.name}` : ".xlsx or .csv · max 5 MB"}
          />
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-(--bgm) px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">Rows</p>
              <p className="text-sm font-extrabold tabular-nums text-(--tp)">{n(preview.stats?.rows ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-(--success-bg) px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-(--success)">New</p>
              <p className="text-sm font-extrabold tabular-nums text-(--success)">{n(preview.toCreate?.length ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-(--bgm) px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">Already there</p>
              <p className="text-sm font-extrabold tabular-nums text-(--tm)">{n(preview.duplicates?.length ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-(--bgm) px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">Total</p>
              <p className="text-sm font-extrabold tabular-nums text-(--tp)">{fmt(preview.stats?.totalPoisha ?? 0)}</p>
            </div>
          </div>

          {(preview.errors || []).length > 0 && (
            <div className="rounded-xl border border-(--warning)/40 bg-(--warning-bg) px-3 py-2 text-[11px] text-(--ts)">
              <p className="mb-1 flex items-center gap-1 font-bold text-(--warning)">
                <LuTriangleAlert size={13} /> {preview.errors.length} row(s) will be skipped
              </p>
              <ul className="space-y-0.5">
                {preview.errors.slice(0, 6).map((err, index) => (
                  <li key={index}>
                    Row {err.row}: {err.msg} ({err.field})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto rounded-xl border border-(--bd)">
            <ul className="divide-y divide-(--bd) text-xs">
              {(preview.toCreate || []).map((row) => (
                <li key={row.row} className="flex items-center justify-between gap-2 bg-(--bgs) px-3 py-2">
                  <span className="min-w-0 truncate text-(--ts)">
                    {row.date} · {row.supplierName || "—"}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-(--tp)">{fmt(row.amountPoisha)}</span>
                </li>
              ))}
              {(preview.toCreate || []).length === 0 && (
                <li className="px-3 py-6 text-center text-(--tm)">Nothing new to import.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-2 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-(--success-bg) text-(--success)">
            <LuCircleCheck size={22} />
          </span>
          <p className="text-sm font-bold text-(--tp)">{result.msg}</p>
          <p className="text-xs text-(--tm)">
            {n(result.created ?? 0)} draft expense(s) created · {n(result.duplicates ?? 0)} duplicate(s) skipped.
            Approve them in the Expenses tab.
          </p>
          <p className="flex items-center justify-center gap-1 text-[11px] text-(--tm)">
            <LuFileSpreadsheet size={12} /> Drafts never post to the ledger until approved.
          </p>
        </div>
      )}
    </Modal>
  );
}
