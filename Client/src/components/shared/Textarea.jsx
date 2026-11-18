import React, { forwardRef } from "react";

/**
 * Textarea component with multiple variants
 */
const Textarea = forwardRef(
  (
    {
      variant = "outline",
      size = "md",
      isInvalid = false,
      isDisabled = false,
      isReadOnly = false,
      isBlocked = false,
      isRequired = false,
      errorMessage,
      helperText,
      label,
      align = "top",
      labelWidth: propLabelWidth,
      inputWidth: propInputWidth,
      className = "",
      id,
      rows = 3,
      ...props
    },
    ref,
  ) => {
    const textareaId =
      id || `textarea-${Math.random().toString(36).substring(2, 9)}`;

    let labelWidth = propLabelWidth || "30%";
    let inputWidth = propInputWidth || "70%";

    if (propLabelWidth && !propInputWidth) {
      if (propLabelWidth.endsWith("%")) {
        const labelPercentage = parseFloat(propLabelWidth);
        if (!isNaN(labelPercentage)) {
          inputWidth = `${100 - labelPercentage}%`;
        }
      }
    } else if (!propLabelWidth && propInputWidth) {
      if (propInputWidth.endsWith("%")) {
        const inputPercentage = parseFloat(propInputWidth);
        if (!isNaN(inputPercentage)) {
          labelWidth = `${100 - inputPercentage}%`;
        }
      }
    }

    const baseClasses = "w-full transition-all duration-200 focus:outline-none";

    const sizeClasses = {
      sm: "text-xs py-1.5 px-3 rounded-xl",
      md: "text-sm py-2 px-4 rounded-2xl",
      lg: "text-base py-2.5 px-5 rounded-2xl",
    };

    const variantClasses = {
      outline:
        "border-[1.5px] border-(--bd2) bg-(--bgs) focus:border-(--p) focus:ring-4 focus:ring-(--pale) placeholder:text-(--tm)/70 text-(--tp) hover:border-(--p)/50 transition-colors",
      filled:
        "border-[1.5px] border-transparent bg-(--bgm) focus:bg-(--bgs) focus:border-(--p) focus:ring-4 focus:ring-(--pale) placeholder:text-(--tm)/70 text-(--tp) hover:bg-(--bd) transition-colors",
      flushed:
        "border-b-[1.5px] border-(--bd2) rounded-none px-0 bg-transparent focus:border-b-(--p) text-(--tp) placeholder:text-(--tm)/70 focus:ring-0 focus:ring-offset-0 transition-colors",
    };

    const stateClasses = {
      invalid: "border-red-500 focus:border-red-500 focus:ring-red-500/20",
      disabled: "opacity-60 cursor-not-allowed bg-(--bgs)",
      readOnly: "opacity-70 cursor-default bg-(--bgs)",
      blocked: "opacity-70 cursor-not-allowed bg-(--bgs) pointer-events-none",
    };

    const labelClasses = {
      base: "block text-(--ts) font-medium",
      sm: "text-xs",
      md: "text-[13px]",
      lg: "text-base",
      disabled: "opacity-60",
      blocked: "opacity-70",
      invalid: "text-red-500",
      top: "mb-2",
      bottom: "mt-2",
      left: "mr-3",
      right: "ml-3",
    };

    const helperTextClasses = "mt-1.5 text-xs text-(--tm)";
    const errorMessageClasses = "mt-1.5 text-xs text-red-500";
    const placeholderClass = "placeholder:text-(--tm)/50";

    const textareaClasses = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      placeholderClass,
      isInvalid ? stateClasses.invalid : "",
      isDisabled ? stateClasses.disabled : "",
      isReadOnly ? stateClasses.readOnly : "",
      isBlocked ? stateClasses.blocked : "",
      className,
    ].join(" ");

    const labelClassNames = [
      labelClasses.base,
      labelClasses[size],
      labelClasses[align],
      isDisabled ? labelClasses.disabled : "",
      isBlocked ? labelClasses.blocked : "",
      isInvalid ? labelClasses.invalid : "",
    ].join(" ");

    const textareaContent = (
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          aria-invalid={isInvalid}
          aria-describedby={
            helperText
              ? `${textareaId}-helper-text`
              : errorMessage && isInvalid
                ? `${textareaId}-error-message`
                : undefined
          }
          disabled={isDisabled}
          readOnly={isReadOnly || isBlocked}
          required={isRequired}
          rows={rows}
          {...props}
        />
      </div>
    );

    const labelElement = (
      <label htmlFor={textareaId} className={labelClassNames}>
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
    );

    return (
      <div className="w-full">
        {label ? (
          <>
            {align === "top" && (
              <div className="flex flex-col">
                {labelElement}
                {textareaContent}
              </div>
            )}
            {align === "bottom" && (
              <div className="flex flex-col">
                {textareaContent}
                {labelElement}
              </div>
            )}
            {align === "left" && (
              <div className="flex items-center justify-between gap-4">
                <div style={{ width: labelWidth }}>{labelElement}</div>
                <div style={{ width: inputWidth }}>{textareaContent}</div>
              </div>
            )}
            {align === "right" && (
              <div className="flex items-center justify-between gap-4">
                <div style={{ width: inputWidth }}>{textareaContent}</div>
                <div style={{ width: labelWidth }}>{labelElement}</div>
              </div>
            )}
          </>
        ) : (
          textareaContent
        )}

        {helperText && !isInvalid && (
          <div id={`${textareaId}-helper-text`} className={helperTextClasses}>
            {helperText}
          </div>
        )}

        {isInvalid && errorMessage && (
          <div
            id={`${textareaId}-error-message`}
            className={errorMessageClasses}
          >
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
