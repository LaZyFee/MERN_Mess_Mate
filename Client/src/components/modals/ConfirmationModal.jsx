"use client";

import React from "react";
import Modal from "@/components/shared/overlay/Modal";
import Alert from "@/components/shared/feedback/Alert";
import Button from "@/components/shared/buttons/Button";
import { FiX, FiCheck, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

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
            className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer ${
              status === "error"
                ? "bg-red-600"
                : status === "success"
                  ? "bg-(--p2)"
                  : "bg-(--p)"
            }`}
            leftIcon={
              isSubmitting ? (
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
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
