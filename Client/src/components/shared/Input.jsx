import React, { forwardRef, useId } from "react";

/**
 * Input component with multiple variants
 */
const Input = forwardRef(
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
   leftElement,
   rightElement,
   label,
   align = "top",
   labelWidth: propLabelWidth,
   inputWidth: propInputWidth,
   className = "",
   id,
   ...props
  },
  ref,
 ) => {
  const generatedId = useId();

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

  const inputId = id || generatedId;
  const normalizedInputProps = { ...props };

  if (Object.prototype.hasOwnProperty.call(normalizedInputProps, "value")) {
   normalizedInputProps.value = normalizedInputProps.value ?? "";
  }

  if (Object.prototype.hasOwnProperty.call(normalizedInputProps, "checked")) {
   normalizedInputProps.checked = Boolean(normalizedInputProps.checked);
  }

  const baseClasses = "w-full transition-all duration-200 focus:outline-none";

  const sizeClasses = {
   sm: "h-8 text-xs px-3 rounded-xl flex items-center",
   md: "h-10 text-sm px-4 rounded-2xl flex items-center",
   lg: "h-12 text-sm px-4 rounded-2xl flex items-center",
   xl: "h-14 text-base px-5 rounded-2xl flex items-center",
  };

  const containerSizeClasses = {
   sm: leftElement ? "pl-8" : "",
   md: leftElement ? "pl-10" : "",
   lg: leftElement ? "pl-11" : "",
   xl: leftElement ? "pl-12" : "",
  };

  const rightElementClasses = {
   sm: rightElement ? "pr-8" : "",
   md: rightElement ? "pr-10" : "",
   lg: rightElement ? "pr-11" : "",
   xl: rightElement ? "pr-12" : "",
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
   invalid: "border-(--danger) focus:border-(--danger) focus:ring-(--danger)/20",
   disabled: "opacity-60 cursor-not-allowed bg-(--bgs)",
   readOnly: "opacity-70 cursor-default bg-(--bgs)",
   blocked: "opacity-70 cursor-not-allowed bg-(--bgs) pointer-events-none",
  };

  const labelClasses = {
   base: "block text-(--ts) font-semibold",
   sm: "text-[11px]",
   md: "text-[13px]",
   lg: "text-[13.5px]",
   xl: "text-[15px]",
   disabled: "opacity-60",
   blocked: "opacity-70",
   invalid: "text-(--danger)",
   top: "mb-2",
   bottom: "mt-2",
   left: "mr-3",
   right: "ml-3",
  };

  const helperTextClasses = "mt-1.5 text-xs text-(--tm)";
  const errorMessageClasses =
   "mt-1.5 text-xs text-(--danger) flex items-center gap-1 font-medium transition-all duration-150";
  const placeholderClass = "placeholder:text-(--tm)/50";

  const inputClasses = [
   baseClasses,
   sizeClasses[size],
   variantClasses[variant],
   placeholderClass,
   isInvalid ? stateClasses.invalid : "",
   isDisabled ? stateClasses.disabled : "",
   isReadOnly ? stateClasses.readOnly : "",
   isBlocked ? stateClasses.blocked : "",
   leftElement ? containerSizeClasses[size] : "",
   rightElement ? rightElementClasses[size] : "",
   props.type === "number"
    ? "appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    : "",
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

  const inputWithIconsContent = (
   <div className="relative w-full">
    {leftElement && (
     <div className="absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none">
      <span className="text-(--tm) group-focus-within:text-(--p) transition-colors duration-200">
       {leftElement}
      </span>
     </div>
    )}

    <input
     ref={ref}
     id={inputId}
     className={inputClasses}
     aria-invalid={isInvalid}
     aria-describedby={
      helperText
       ? `${inputId}-helper-text`
       : errorMessage && isInvalid
        ? `${inputId}-error-message`
        : undefined
     }
     disabled={isDisabled}
     readOnly={isReadOnly || isBlocked}
     required={isRequired}
     onWheel={(e) => {
       if (props.type === "number") {
         e.preventDefault();
       }
       e.currentTarget.blur();
     }}
     {...normalizedInputProps}
    />

    {rightElement && (
     <div className="absolute right-0 inset-y-0 flex items-center pr-3">
      <span className="text-(--tm) group-focus-within:text-(--p) transition-colors duration-200">
       {rightElement}
      </span>
     </div>
    )}
   </div>
  );

  const labelElement = (
   <label htmlFor={inputId} className={labelClassNames}>
    {label}
    {isRequired && <span className="text-(--danger) ml-1">*</span>}
   </label>
  );

  return (
   <div className="w-full">
    {label ? (
     <>
      {align === "top" && (
       <div className="flex flex-col">
        {labelElement}
        {inputWithIconsContent}
       </div>
      )}
      {align === "bottom" && (
       <div className="flex flex-col">
        {inputWithIconsContent}
        {labelElement}
       </div>
      )}
      {align === "left" && (
       <div className="flex items-center justify-between gap-4">
        <div className="[width:var(--inline-width)]" style={{ "--inline-width": labelWidth }}>{labelElement}</div>
        <div className="[width:var(--inline-width)]" style={{ "--inline-width": inputWidth }}>{inputWithIconsContent}</div>
       </div>
      )}
      {align === "right" && (
       <div className="flex items-center justify-between gap-4">
        <div className="[width:var(--inline-width)]" style={{ "--inline-width": inputWidth }}>{inputWithIconsContent}</div>
        <div className="[width:var(--inline-width)]" style={{ "--inline-width": labelWidth }}>{labelElement}</div>
       </div>
      )}
     </>
    ) : (
     inputWithIconsContent
    )}

    {helperText && !isInvalid && (
     <div id={`${inputId}-helper-text`} className={helperTextClasses}>
      {helperText}
     </div>
    )}

    {isInvalid && errorMessage && (
     <div id={`${inputId}-error-message`} className={errorMessageClasses}>
      {errorMessage}
     </div>
    )}
   </div>
  );
 },
);

Input.displayName = "Input";

export default Input;
