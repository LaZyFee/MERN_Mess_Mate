"use client";

import React from "react";
import Modal from "@/components/modals/Modal";
import Alert from "@/components/shared/Alert";
import Button from "@/components/shared/Button";
import { FiX, FiCheck, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { LuLoader } from "react-icons/lu";

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
}) {
 return (
  <Modal
   isOpen={isOpen}
   onClose={onClose}
   size="3xl"
   header={title}
   hasCloseButton={!isSubmitting}
   closeOnEsc={!isSubmitting}
   closeOnOverlayClick={!isSubmitting}
   footer={
    <div className="flex gap-3 justify-end">
     <Button
      variant=""

      onClick={onClose}
      disabled={isSubmitting}
      className="px-4 py-2 border border-(--bd2) text-xs font-bold text-(--ts) rounded-xl hover:bg-(--pale) transition-colors cursor-pointer disabled:opacity-50"
      leftIcon={<FiX size={14} />}
     >
      {cancelText}
     </Button>
     <Button
      variant=""

      onClick={onConfirm}
      disabled={isSubmitting}
      className={`px-4 py-2 text-(--bgs) font-bold text-xs rounded-xl shadow-md transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer ${
       status === "error"
        ? "bg-(--danger)"
        : status === "success"
         ? "bg-(--p2)"
         : "bg-(--p)"
      }`}
      leftIcon={
       isSubmitting ? (
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
      {isSubmitting ? "Processing..." : confirmText}
     </Button>
    </div>
   }
  >
   <div className="space-y-4">
    <Alert status={status} title={title}>
     <div className="text-xs leading-relaxed font-semibold whitespace-pre-line">
      {message}
     </div>
    </Alert>
   </div>
  </Modal>
 );
}
