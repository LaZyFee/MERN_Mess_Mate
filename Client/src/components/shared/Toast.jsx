"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/shared/Button";
import { LuInfo, LuCircleCheck, LuTriangleAlert, LuCircleX, LuCircleHelp, LuLoader, LuX } from "react-icons/lu";

/**
 * Toast component for notification messages
 * @param {Object} props - Component props
 * @param {'success'|'error'|'warning'|'info'|'question'|'loading'} [props.status='info'] - Toast status/type
 * @param {string} props.title - Toast title
 * @param {string} [props.description] - Toast description
 * @param {boolean} [props.isVisible=false] - Whether the toast is visible
 * @param {number} [props.duration=5000] - Duration in ms before auto-hiding (0 for no auto-hide)
 * @param {Function} [props.onClose] - Function to call when toast closes
 * @param {boolean} [props.hasCloseButton=true] - Whether to show close button
 * @param {'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right'|'center'} [props.position='bottom-right'] - Toast position
 * @param {string} [props.className] - Additional classes
 * @param {'toast'|'confirm'|'prompt'|'custom'} [props.type='toast'] - Toast type
 * @param {boolean} [props.showCancelButton] - For confirm toasts, whether to show cancel button
 * @param {string} [props.confirmButtonText] - For confirm toasts, confirm button text
 * @param {string} [props.cancelButtonText] - For confirm toasts, cancel button text
 * @param {Function} [props.onConfirm] - For confirm toasts, function to call on confirmation
 * @param {Function} [props.onCancel] - For confirm toasts, function to call on cancellation
 * @param {string} [props.defaultValue] - For prompt toasts, default input value
 * @param {string} [props.inputPlaceholder] - For prompt toasts, input placeholder
 * @param {string} [props.inputLabel] - For prompt toasts, input label
 * @param {'text'|'password'|'email'|'number'|'tel'|'url'} [props.inputType='text'] - For prompt toasts, input type
 * @param {Function} [props.onSubmit] - For prompt toasts, function to call on submission
 * @param {Function} [props.validateInput] - For prompt toasts, function to validate input
 * @param {React.ReactNode} [props.footer] - Custom footer content
 * @param {boolean} [props.dismissOnEscape=true] - Whether to dismiss on escape key
 * @param {boolean} [props.dismissOnClickOutside=true] - Whether to dismiss when clicking outside
 * @param {boolean} [props.dismissOnButtonClick=true] - Whether to dismiss when a button is clicked
 * @param {boolean} [props.showProgressBar=false] - Whether to show a progress bar
 * @param {React.ReactNode} [props.icon] - Custom icon to override the default
 * @param {string} [props.width] - Custom width for modal types
 * @param {string} [props.zIndex='50'] - Z-index for the toast
 * @param {string} [props.animation='fade-in-up'] - Animation style
 */
const Toast = ({
 status = "info",
 title,
 description,
 isVisible = false,
 duration = 5000,
 onClose,
 hasCloseButton = true,
 position = "bottom-right",
 className = "",
 type = "toast",
 showCancelButton,
 confirmButtonText = "OK",
 cancelButtonText = "Cancel",
 onConfirm,
 onCancel,
 defaultValue = "",
 inputPlaceholder = "",
 inputLabel = "",
 inputType = "text",
 onSubmit,
 validateInput,
 footer,
 dismissOnEscape = true,
 dismissOnClickOutside = true,
 dismissOnButtonClick = true,
 showProgressBar = false,
 icon,
 width = "sm:max-w-lg",
 zIndex = 1000000,
 animation = "fade-in-up",
 ...props
}) => {
 const [isShown, setIsShown] = useState(isVisible);
 const [inputValue, setInputValue] = useState(defaultValue);
 const [inputError, setInputError] = useState("");
 const [progress, setProgress] = useState(100);

 const modalRef = useRef(null);

 // Update visibility if prop changes
 useEffect(() => {
  setIsShown(isVisible);
 }, [isVisible]);

 // Handle escape key
 useEffect(() => {
  const handleEscape = (e) => {
   if (dismissOnEscape && e.key === "Escape") {
    handleCancel();
   }
  };

  if (isShown) {
   document.addEventListener("keydown", handleEscape);
   return () => document.removeEventListener("keydown", handleEscape);
  }
 }, [isShown, dismissOnEscape]);

 // Progress bar effect
 useEffect(() => {
  if (isShown && duration > 0 && showProgressBar) {
   const startTime = Date.now();
   const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
    setProgress(newProgress);

    if (newProgress <= 0) {
     clearInterval(interval);
    }
   }, 10);

   return () => clearInterval(interval);
  }
 }, [isShown, duration, showProgressBar]);

 // Auto-hide after duration
 useEffect(() => {
  if (isShown && duration > 0) {
   const timer = setTimeout(() => {
    setIsShown(false);
    if (onClose) onClose();
   }, duration);

   return () => clearTimeout(timer);
  }
 }, [isShown, duration, onClose]);

 // Handle click outside for modal types
 useEffect(() => {
  const handleClickOutside = (e) => {
   if (
    dismissOnClickOutside &&
    modalRef.current &&
    !modalRef.current.contains(e.target) &&
    isShown &&
    (type === "confirm" || type === "prompt" || type === "custom")
   ) {
    handleCancel();
   }
  };

  if (
   isShown &&
   (type === "confirm" || type === "prompt" || type === "custom")
  ) {
   document.addEventListener("mousedown", handleClickOutside);
   return () =>
    document.removeEventListener("mousedown", handleClickOutside);
  }
 }, [isShown, dismissOnClickOutside, type]);

 // Handle close
 const handleClose = () => {
  setIsShown(false);
  if (onClose) onClose();
 };

 // Handle confirm action
 const handleConfirm = () => {
  if (dismissOnButtonClick) {
   setIsShown(false);
  }
  if (onConfirm) onConfirm();
 };

 // Handle cancel action
 const handleCancel = () => {
  if (dismissOnButtonClick) {
   setIsShown(false);
  }
  if (onCancel) onCancel();
 };

 // Handle prompt submission
 const handleSubmit = (e) => {
  e.preventDefault();

  // Validate input if validation function provided
  if (validateInput) {
   const error = validateInput(inputValue);
   if (error) {
    setInputError(error);
    return;
   }
  }

  if (dismissOnButtonClick) {
   setIsShown(false);
  }
  if (onSubmit) onSubmit(inputValue);
 };

 // Status configuration (icons and colors) using CSS variables
 const statusConfig = {
  info: {
   bgColor: "bg-(--pale)",
   textColor: "text-(--p)",
   borderColor: "border-(--p)",
   iconColor: "text-(--p)",
   icon: <LuInfo size={20} className="h-5 w-5" />,
   buttonVariant: "primary",
   buttonBg: "bg-(--p) hover:bg-(--p3)",
   progressBarColor: "bg-(--p)",
  },
  success: {
   bgColor: "bg-(--pale)",
   textColor: "text-(--p2)",
   borderColor: "border-(--p2)",
   iconColor: "text-(--p2)",
   icon: <LuCircleCheck size={20} className="h-5 w-5" />,
   buttonVariant: "primary",
   buttonBg: "bg-(--p2) hover:bg-(--p3)",
   progressBarColor: "bg-(--p2)",
  },
  warning: {
   bgColor: "bg-(--pale)",
   textColor: "text-(--gold)",
   borderColor: "border-(--gold)",
   iconColor: "text-(--gold)",
   icon: <LuTriangleAlert size={20} className="h-5 w-5" />,
   buttonVariant: "secondary",
   buttonBg: "bg-(--gold) hover:bg-(--gold)/80",
   progressBarColor: "bg-(--gold)",
  },
  error: {
   bgColor: "bg-(--danger-bg)",
   textColor: "text-(--danger)",
   borderColor: "border-(--danger)",
   iconColor: "text-(--danger)",
   icon: <LuCircleX size={20} className="h-5 w-5" />,
   buttonVariant: "danger",
   buttonBg: "bg-(--danger) hover:opacity-90",
   progressBarColor: "bg-(--danger)",
  },
  question: {
   bgColor: "bg-(--pale)",
   textColor: "text-(--p)",
   borderColor: "border-(--p)",
   iconColor: "text-(--p)",
   icon: <LuCircleHelp size={20} className="h-5 w-5" />,
   buttonVariant: "primary",
   buttonBg: "bg-(--p) hover:bg-(--p3)",
   progressBarColor: "bg-(--p)",
  },
  loading: {
   bgColor: "bg-(--bgs)",
   textColor: "text-(--ts)",
   borderColor: "border-(--bd2)",
   iconColor: "text-(--p)",
   icon: <LuLoader size={20} className="h-5 w-5 animate-spin" />,
   buttonVariant: "primary",
   buttonBg: "bg-(--p) hover:bg-(--p3)",
   progressBarColor: "bg-(--p)",
  },
 };

 const config = statusConfig[status];

 // Position classes
 const positionClasses = {
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 transform -translate-x-1/2",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
  center: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
 };

 // Determine the appropriate content based on toast type
 const renderContent = () => {
  switch (type) {
   case "confirm":
    return (
     <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
      {showCancelButton && (
       <Button variant="secondary" size="md" onClick={handleCancel}>
        {cancelButtonText}
       </Button>
      )}
      <Button
       variant={config.buttonVariant}
       size="md"
       onClick={handleConfirm}
      >
       {confirmButtonText}
      </Button>
     </div>
    );
   case "prompt":
    return (
     <form onSubmit={handleSubmit} className="mt-4">
      {inputLabel && (
       <label className="block text-sm font-medium text-(--ts) mb-1">
        {inputLabel}
       </label>
      )}
      <input
       type={inputType}
       className={`w-full px-3 py-2 border ${
        inputError ? "border-(--danger)" : "border-(--bd2)"
       } rounded-xl bg-(--bgs) text-(--tp) focus:outline-none focus:ring-2 focus:ring-(--p)/20 focus:border-(--p) transition-all duration-200`}
       value={inputValue}
       onChange={(e) => {
        setInputValue(e.target.value);
        if (inputError) setInputError("");
       }}
       placeholder={inputPlaceholder}
       autoFocus
      />
      {inputError && (
       <p className="mt-1 text-sm text-(--danger)">{inputError}</p>
      )}
      <div className="mt-4 flex justify-end space-x-2">
       <Button
        variant="secondary"
        size="md"

        onClick={handleCancel}
       >
        {cancelButtonText}
       </Button>
       <Button variant={config.buttonVariant} size="md">
        {confirmButtonText}
       </Button>
      </div>
     </form>
    );
   case "custom":
    return <div className="mt-4">{footer}</div>;
   default:
    return null;
  }
 };

 const isModal = type === "confirm" || type === "prompt" || type === "custom";
 const containerClass = isModal
  ? "fixed inset-0 overflow-y-auto"
  : `fixed ${positionClasses[position]} max-w-sm w-full`;

 // Don't render if not shown
 if (!isShown) return null;

 // Animation classes
 const getAnimationClasses = () => {
  if (isModal) return "animate-fade-in";

  switch (animation) {
   case "fade-in-up":
    return "animate-fade-in-up";
   case "fade-in-down":
    return "animate-fade-in-down";
   case "fade-in-left":
    return "animate-fade-in-left";
   case "fade-in-right":
    return "animate-fade-in-right";
   case "zoom-in":
    return "animate-zoom-in";
   default:
    return "animate-fade-in";
  }
 };

 return isModal ? (
  <div
   
   className={`${containerClass} [z-index:var(--inline-z-index)]`} style={{ "--inline-z-index": zIndex }}
   role="dialog"
   aria-modal="true"
   {...props}
  >
   <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
    {/* Overlay */}
    <div
     className="fixed inset-0 bg-(--p4)/50 backdrop-blur-sm transition-opacity animate-fade-in"
     onClick={dismissOnClickOutside ? handleCancel : undefined}
    ></div>

    {/* Modal */}
    <div
     ref={modalRef}
     className={`relative inline-block bg-(--bgs) rounded-2xl text-left overflow-hidden shadow-(--shadow-xl) transform transition-all ${width} sm:w-full animate-zoom-in border-l-4 ${config.borderColor}`}
    >
     <div className="p-6">
      {/* Header */}
      <div className="flex items-start">
       {/* Icon */}
       <div className={`shrink-0 mr-3 ${config.iconColor}`}>
        {icon || config.icon}
       </div>

       {/* Content */}
       <div className="flex-1">
        <h3 className={`text-lg font-semibold ${config.textColor}`}>
         {title}
        </h3>
        {description && (
         <p className="mt-2 text-sm text-(--tm)">{description}</p>
        )}
       </div>

       {/* Close button for modal */}
       {hasCloseButton && (
        <Button
         variant="ghost"
         size="sm"

         onClick={handleCancel}
         className="p-1"
         aria-label="Close"
        >
         <span className="sr-only">Close</span>
         <LuX size={20} className="h-5 w-5" />
        </Button>
       )}
      </div>

      {/* Action Buttons */}
      {renderContent()}
     </div>
    </div>
   </div>
  </div>
 ) : (
  <div
   
   className={`${containerClass} shadow-(--shadow-lg) rounded-xl border-l-4 ${config.bgColor} ${config.textColor} ${config.borderColor} ${className} ${getAnimationClasses()} [z-index:var(--inline-z-index)]`} style={{ "--inline-z-index": zIndex }}
   role="alert"
   {...props}
  >
   {/* Progress bar */}
   {showProgressBar && duration > 0 && (
    <div className="h-1 w-full bg-(--bd2) rounded-t-xl overflow-hidden">
     <div
      
      className={`h-1 ${config.progressBarColor} [width:var(--inline-width)] [transition:width_0.1s_linear]`} style={{ "--inline-width": `${progress}%` }}
     ></div>
    </div>
   )}

   <div className="p-4 flex items-start">
    {/* Icon */}
    <div className={`shrink-0 ${config.iconColor}`}>
     {icon || config.icon}
    </div>

    {/* Content */}
    <div className="ml-3 flex-1">
     <p className="font-medium">{title}</p>
     {description && (
      <p className="mt-1 text-sm opacity-90">{description}</p>
     )}
    </div>

    {/* Close button */}
    {hasCloseButton && (
     <div className="ml-4 shrink-0 flex">
      <Button
       variant="ghost"
       size="sm"

       onClick={handleClose}
       className="p-1"
       aria-label="Close"
      >
       <span className="sr-only">Close</span>
       <LuX size={20} className="h-5 w-5" />
      </Button>
     </div>
    )}
   </div>
  </div>
 );
};

export default Toast;
