"use client";

import React, { useEffect } from "react";
import Modal from "@/components/modals/Modal";
import Button from "@/components/shared/Button";
import { FiX, FiCheck, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { LuLoader } from "react-icons/lu";
import { useToast } from "@/components/shared/ToastProvider";

/**
 * Reusable Confirmation Modal that uses the custom Alert component
 */
export default function ConfirmationModal({
 isOpen,
 onClose,
 onConfirm,
 title = "Are you sure?",
 message,
 status = "warning",
 confirmText = "Yes, Confirm",
 cancelText = "Cancel",
 isSubmitting = false,
 isLoading = false,
 details = null,
}) {
 const busy = isSubmitting || isLoading;
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      showToast({
        status,
        title,
        description: message,
        duration: 0,
      });
    }
  }, [isOpen, showToast, status, title, message]);

 return (
  <Modal
   isOpen={isOpen}
   onClose={onClose}
   size="3xl"
   header={title}
   hasCloseButton={!busy}
   closeOnEsc={!busy}
   closeOnOverlayClick={!busy}
   footer={
    <div className="flex gap-3 justify-end">
     <Button
      variant=""

      onClick={onClose}
      disabled={busy}
      className="px-4 py-2 border border-(--bd2) text-xs font-bold text-(--ts) rounded-xl hover:bg-(--pale) transition-colors cursor-pointer disabled:opacity-50"
      leftIcon={<FiX size={14} />}
     >
      {cancelText}
     </Button>
     <Button
      variant=""

      onClick={onConfirm}
      disabled={busy}
      className={`px-4 py-2 text-(--bgs) font-bold text-xs rounded-xl shadow-md transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer ${
       status === "error"
        ? "bg-(--danger)"
        : status === "success"
         ? "bg-(--p2)"
         : "bg-(--p)"
      }`}
      leftIcon={
       busy ? (
        <LuLoader size={14} className="animate-spin" />
       ) : status === "error" ? (
        <FiAlertTriangle size={14} />
       ) : status === "success" ? (
        <FiCheckCircle size={14} />
       ) : (
        <FiCheck size={14} />
       )
      }
     >
      {busy ? "Processing..." : confirmText}
     </Button>
    </div>
   }
  >
   <div className="space-y-4">
    {details ? <div className="pt-1">{details}</div> : null}
   </div>
  </Modal>
 );
}

