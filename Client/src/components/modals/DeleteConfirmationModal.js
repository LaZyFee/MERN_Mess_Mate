"use client";

import { FiTrash2, FiX } from "react-icons/fi";
import Modal from "@/components/shared/overlay/Modal";
import Button from "@/components/shared/buttons/Button";
import ProtectedComponent from "@/components/shared/layout/ProtectedComponent";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  itemName = "this item",
  details = [],
  isLoading = false,
  feature = null,
  action = "delete",
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={title}
      size="3xl"
      hasCloseButton
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <FiTrash2 size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-(--tp) mb-2">
            Confirm Deletion
          </h3>
          <p className="text-(--tm) text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{itemName}</span>? This action
            cannot be undone.
          </p>
          {details.length > 0 && (
            <div className="mt-4 p-3 bg-(--bgl) rounded-lg text-left space-y-1">
              {details.map((detail, idx) => (
                <p key={idx} className="text-sm text-(--tp)">
                  <span className="font-medium">{detail.label}:</span>{" "}
                  {detail.value || "—"}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            <FiX size={14} className="mr-1" /> Cancel
          </Button>
          {feature ? (
            <ProtectedComponent
              feature={feature}
              action={action}
              mode="disable"
            >
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                <FiTrash2 size={14} className="mr-1" /> Delete
              </Button>
            </ProtectedComponent>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              <FiTrash2 size={14} className="mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
