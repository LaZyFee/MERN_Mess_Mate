import React, { forwardRef, useId, useState } from "react";
import { LuCheck } from "react-icons/lu";

/**
 * Checkbox component with premium custom styling
 * @param {Object} props - Component props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Checkbox size
 * @param {boolean} [props.isChecked] - Checked state (controlled)
 * @param {boolean} [props.defaultChecked] - Default checked state (uncontrolled)
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {boolean} [props.isBlocked=false] - Blocked state (uneditable, grayed out)
 * @param {boolean} [props.isRequired=false] - Required state
 * @param {boolean} [props.isInvalid=false] - Invalid state
 * @param {string} [props.errorMessage] - Error message
 * @param {string} [props.helperText] - Helper text
 * @param {string} [props.label] - Checkbox label
 * @param {'left'|'right'|'top'|'bottom'} [props.align='right'] - Label alignment
 * @param {string} [props.className] - Additional classes for the container
 * @param {Function} [props.onChange] - Change handler
 */
const Checkbox = forwardRef(
 (
  {
   size = "md",
   isChecked,
   checked,
   defaultChecked,
   isDisabled = false,
   isBlocked = false,
   isRequired = false,
   isInvalid = false,
   errorMessage,
   helperText,
   label,
   align = "right",
   className = "",
   labelClassName = "",
   onChange,
   id,
   ...props
  },
  ref,
 ) => {
  // Use React's built-in deterministic id to avoid SSR/CSR hydration mismatches.
  const reactId = useId();
  const sanitizedReactId = String(reactId).replace(/[:]/g, "");
  const checkboxId = id || `checkbox-${sanitizedReactId}`;

  // Label size classes
  const labelSizeClasses = {
   sm: "text-xs",
   md: "text-sm",
   lg: "text-base",
  };

  // Label spacing classes
  const labelSpacingClasses = {
   left: "mr-2.5",
   right: "ml-2.5",
   top: "mb-1.5",
   bottom: "mt-1.5",
  };

  // Helper text classes
  const helperTextClasses = "mt-1.5 text-xs text-(--tm)";

  // Error message classes
  const errorMessageClasses = "mt-1.5 text-xs text-(--danger)";

  // Label classes
  const labelClasses = [
   labelSizeClasses[size],
   labelSpacingClasses[align],
   labelClassName || "text-(--ts) font-medium",
   isDisabled
    ? "opacity-40 cursor-not-allowed"
    : "cursor-pointer select-none",
   isBlocked ? "opacity-60 cursor-default" : "",
   isInvalid ? "text-(--danger)" : "",
   align === "right" || align === "left" ? "flex-1" : "",
  ].join(" ");

  const [localChecked, setLocalChecked] = useState(defaultChecked ?? false);

  const handleChange = (e) => {
   if (isChecked === undefined && checked === undefined) {
    setLocalChecked(e.target.checked);
   }
   if (onChange) {
    onChange(e);
   }
  };

  const isCurrentlyChecked =
   isChecked !== undefined
    ? isChecked
    : checked !== undefined
     ? checked
     : localChecked;

  // Create custom checkbox element
  const checkboxElement = (
   <label
    htmlFor={checkboxId}
    className="flex items-center h-5 relative cursor-pointer"
   >
    <input
     ref={ref}
     id={checkboxId}
     type="checkbox"
     checked={isCurrentlyChecked}
     defaultChecked={defaultChecked}
     disabled={isDisabled || isBlocked}
     required={isRequired}
     aria-invalid={isInvalid}
     onChange={handleChange}
     className="sr-only"
     readOnly={isBlocked}
     {...props}
    />
    <div
     className={`
						flex items-center justify-center rounded-md border-[1.5px] transition-all duration-200 select-none
						${size === "sm" ? "w-4 h-4 rounded" : size === "lg" ? "w-6 h-6" : "w-5 h-5"}
						${
       isDisabled || isBlocked
        ? "bg-(--bgm) border-(--bd2) opacity-40 cursor-not-allowed"
        : isInvalid
         ? "border-(--danger) bg-(--danger-bg)"
         : isCurrentlyChecked
          ? "border-(--p) bg-(--p)"
          : "border-(--bd2) bg-(--bg) hover:bg-(--pale) hover:border-(--p)"
      }
					`}
    >
     <LuCheck
      strokeWidth={3.5}
      className={`
							text-[var(--bgs)] transition-all duration-200 transform
							${size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-4 h-4" : "w-3 h-3"}
							${isCurrentlyChecked ? "scale-100 opacity-100" : "scale-75 opacity-0"}
						`}
     />
    </div>
   </label>
  );

  // Create label element with required indicator
  const labelElement = label && (
   <label htmlFor={checkboxId} className={labelClasses}>
    {label}
    {isRequired && <span className="text-(--danger) ml-1">*</span>}
   </label>
  );

  return (
   <div className={`w-full ${className}`}>
    {label ? (
     <>
      {align === "top" && (
       <div className="flex flex-col gap-1.5">
        {labelElement}
        {checkboxElement}
       </div>
      )}

      {align === "bottom" && (
       <div className="flex flex-col gap-1.5">
        {checkboxElement}
        {labelElement}
       </div>
      )}

      {align === "left" && (
       <div className="flex items-center">
        {labelElement}
        {checkboxElement}
       </div>
      )}

      {align === "right" && (
       <div className="flex items-center">
        {checkboxElement}
        {labelElement}
       </div>
      )}
     </>
    ) : (
     checkboxElement
    )}

    {helperText && !isInvalid && (
     <div className={helperTextClasses}>{helperText}</div>
    )}

    {isInvalid && errorMessage && (
     <div className={errorMessageClasses}>{errorMessage}</div>
    )}
   </div>
  );
 },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
