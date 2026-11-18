"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/shared/buttons/Button";

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
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
      buttonVariant: "primary",
      buttonBg: "bg-(--p) hover:bg-(--p3)",
      progressBarColor: "bg-(--p)",
    },
    success: {
      bgColor: "bg-(--pale)",
      textColor: "text-(--p2)",
      borderColor: "border-(--p2)",
      iconColor: "text-(--p2)",
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      buttonVariant: "primary",
      buttonBg: "bg-(--p2) hover:bg-(--p3)",
      progressBarColor: "bg-(--p2)",
    },
    warning: {
      bgColor: "bg-(--pale)",
      textColor: "text-(--gold)",
      borderColor: "border-(--gold)",
      iconColor: "text-(--gold)",
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      buttonVariant: "secondary",
      buttonBg: "bg-(--gold) hover:bg-(--gold)/80",
      progressBarColor: "bg-(--gold)",
    },
    error: {
      bgColor: "bg-(--pale)",
      textColor: "text-red-600",
      borderColor: "border-red-500",
      iconColor: "text-red-500",
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      buttonVariant: "danger",
      buttonBg: "bg-red-500 hover:bg-red-600",
      progressBarColor: "bg-red-500",
    },
    question: {
      bgColor: "bg-(--pale)",
      textColor: "text-(--p)",
      borderColor: "border-(--p)",
      iconColor: "text-(--p)",
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      buttonVariant: "primary",
      buttonBg: "bg-(--p) hover:bg-(--p3)",
      progressBarColor: "bg-(--p)",
    },
    loading: {
      bgColor: "bg-(--bgs)",
      textColor: "text-(--ts)",
      borderColor: "border-(--bd2)",
      iconColor: "text-(--p)",
      icon: (
        <svg
          className="h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
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
      ),
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
                inputError ? "border-red-300" : "border-(--bd2)"
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
              <p className="mt-1 text-sm text-red-600">{inputError}</p>
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
      className={containerClass}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
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
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
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
      className={`${containerClass} shadow-(--shadow-lg) rounded-xl border-l-4 ${
        config.bgColor
      } ${config.textColor} ${
        config.borderColor
      } ${className} ${getAnimationClasses()}`}
      style={{ zIndex }}
      role="alert"
      {...props}
    >
      {/* Progress bar */}
      {showProgressBar && duration > 0 && (
        <div className="h-1 w-full bg-(--bd2) rounded-t-xl overflow-hidden">
          <div
            className={`h-1 ${config.progressBarColor}`}
            style={{
              width: `${progress}%`,
              transition: "width 0.1s linear",
            }}
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
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toast;
