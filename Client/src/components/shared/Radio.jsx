import React, { forwardRef } from "react";

/**
 * Radio component
 * @param {Object} props - Component props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Radio size
 * @param {boolean} [props.isChecked] - Checked state (controlled)
 * @param {boolean} [props.defaultChecked] - Default checked state (uncontrolled)
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {boolean} [props.isBlocked=false] - Blocked state (uneditable, grayed out)
 * @param {boolean} [props.isRequired=false] - Required state
 * @param {boolean} [props.isInvalid=false] - Invalid state
 * @param {string} [props.name] - Radio name (for grouping)
 * @param {string} [props.label] - Radio label
 * @param {string} [props.className] - Additional classes
 * @param {Function} [props.onChange] - Change handler
 */
const Radio = forwardRef(
  (
    {
      size = "md",
      isChecked,
      defaultChecked,
      isDisabled = false,
      isBlocked = false,
      isRequired = false,
      isInvalid = false,
      name,
      label,
      className = "",
      onChange,
      id,
      ...props
    },
    ref,
  ) => {
    // Generate ID if not provided
    const radioId = id || `radio-${Math.random().toString(36).substring(2, 9)}`;

    // Container classes
    const containerClasses = ["flex items-start gap-2", className].join(" ");

    // Radio size classes
    const radioSizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    // Label size classes
    const labelSizeClasses = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    };

    // Label spacing classes
    const labelSpacingClasses = {
      sm: "",
      md: "",
      lg: "",
    };

    // State classes using CSS variables
    const stateClasses = {
      base: "rounded-full border-[1.5px] border-(--bd2) bg-(--bg) text-(--p) focus:ring-4 focus:ring-(--pale) hover:border-(--p) hover:bg-(--pale) transition-colors",
      disabled: "opacity-50 cursor-not-allowed",
      blocked: "opacity-60 cursor-not-allowed pointer-events-none",
      invalid: "border-red-500 focus:ring-red-500/20 text-red-500",
    };

    const radioClasses = [
      radioSizeClasses[size],
      stateClasses.base,
      isDisabled ? stateClasses.disabled : "",
      isBlocked ? stateClasses.blocked : "",
      isInvalid ? stateClasses.invalid : "",
    ].join(" ");

    const labelClasses = [
      labelSizeClasses[size],
      "text-(--ts) font-medium",
      isDisabled ? "opacity-50" : "",
      isBlocked ? "opacity-70" : "",
      isInvalid ? "text-red-500" : "",
    ].join(" ");

    return (
      <div className={containerClasses}>
        <label
          htmlFor={radioId}
          className="flex items-center h-5 cursor-pointer"
        >
          <input
            ref={ref}
            id={radioId}
            type="radio"
            name={name}
            checked={isChecked}
            defaultChecked={defaultChecked}
            disabled={isDisabled || isBlocked}
            required={isRequired}
            onChange={onChange}
            className={radioClasses}
            readOnly={isBlocked}
            {...props}
          />
        </label>
        {label && (
          <label htmlFor={radioId} className={labelClasses}>
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
      </div>
    );
  },
);

Radio.displayName = "Radio";

export default Radio;
