"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import Button from "../shared/Button";

/**
 * Modal component for dialogs and popups
 */
const Modal = ({
 isOpen,
 onClose,
 header,
 footer,
 children,
 size = "3xl",
 isCentered = true,
 closeOnOverlayClick = true,
 closeOnEsc = true,
 hasCloseButton = true,
 scrollBehavior = "inside",
 className = "",
 bodyClassName = "px-6 py-6",
 headerClassName = "px-6 py-5",
 footerClassName = "px-6 py-5",
 ...props
}) => {
 const modalRef = useRef(null);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
  return () => setMounted(false);
 }, []);

 useEffect(() => {
  if (!isOpen || !closeOnEsc) return;

  const handleKeyDown = (event) => {
   if (event.key === "Escape") {
    onClose();
   }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
 }, [isOpen, closeOnEsc, onClose]);

 const handleOverlayClick = (event) => {
  if (!closeOnOverlayClick) return;
  if (modalRef.current && !modalRef.current.contains(event.target)) {
   onClose();
  }
 };

 const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
 };

 const alignmentClasses = isCentered
  ? "items-end sm:items-center"
  : "items-end sm:items-start sm:mt-16";

 const modalClasses = [
  "bg-(--bgs) rounded-t-2xl rounded-b-none sm:rounded-2xl shadow-xl border border-(--bd)",
  "w-full relative",
  "flex flex-col",
  scrollBehavior === "inside"
   ? "max-h-[90dvh] sm:max-h-[calc(100dvh-7rem)]"
   : "",
  sizeClasses[size],
  className,
 ].join(" ");

 if (!mounted || !isOpen) return null;

 return createPortal(
  <div
   className="fixed inset-0 z-100000 overflow-y-auto min-h-96"
   aria-modal="true"
   role="dialog"
   aria-labelledby={header ? "modal-title" : undefined}
   {...props}
  >
   <div
    className="fixed inset-0 bg-(--p4)/50 backdrop-blur-sm transition-opacity"
    aria-hidden="true"
    onClick={handleOverlayClick}
   />

   <div
    className={`min-h-screen w-full sm:px-4 flex justify-center ${alignmentClasses}`}
   >
    <div
     ref={modalRef}
     className={modalClasses}
     onClick={(e) => e.stopPropagation()}
    >
     {(header || hasCloseButton) && (
      <div className={`flex items-start justify-between border-b border-(--bd) ${headerClassName}`}>
       {header && (
        <div
         className="text-lg font-semibold text-(--tp) flex-1 min-w-0"
         id="modal-title"
        >
         {header}
        </div>
       )}
       {hasCloseButton && (
        <Button
         variant="ghost"
         size="sm"
        type="button"
         onClick={onClose}
         aria-label="Close"
         className="text-(--tm) hover:text-(--p) dark:text-(--bgs) dark:hover:text-primary transition-colors shrink-0"
        >
         <LuX size={20} aria-hidden="true" />
        </Button>
       )}
      </div>
     )}

     <div
      className={`${bodyClassName} ${scrollBehavior === "inside" ? "overflow-y-auto hide-scrollbar" : ""}`}
     >
      {children}
     </div>

     {footer && (
      <div className={`border-t border-(--bd) ${footerClassName}`}>{footer}</div>
     )}
    </div>
   </div>

   {/* Hide scrollbar styles */}
   <style jsx>{`
    .hide-scrollbar {
     scrollbar-width: none; /* Firefox */
     -ms-overflow-style: none; /* IE/Edge */
    }
    .hide-scrollbar::-webkit-scrollbar {
     display: none;
    }
   `}</style>
  </div>,
  document.body,
 );
};

export default Modal;
