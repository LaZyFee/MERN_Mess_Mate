import Radio from "./Radio";

/**
 * RadioGroup component to manage a group of radio buttons
 * @param {Object} props - Component props
 * @param {string} props.name - Name for the radio group
 * @param {string} [props.value] - Currently selected value (controlled)
 * @param {string} [props.defaultValue] - Default selected value (uncontrolled)
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size for all radios
 * @param {boolean} [props.isDisabled=false] - Disabled state for all radios
 * @param {boolean} [props.isBlocked=false] - Blocked state for all radios (uneditable, grayed out)
 * @param {boolean} [props.isRequired=false] - Required state for the group
 * @param {boolean} [props.isInvalid=false] - Invalid state for all radios
 * @param {Array<{value: string, label: string, isDisabled?: boolean}>} props.options - Radio options
 * @param {'vertical'|'horizontal'} [props.orientation='vertical'] - Radio layout orientation
 * @param {string} [props.label] - Group label
 * @param {string} [props.errorMessage] - Error message for the group
 * @param {string} [props.helperText] - Helper text for the group
 * @param {Function} [props.onChange] - Change handler (receives event)
 * @param {string} [props.className] - Additional classes
 */
const RadioGroup = ({
  name,
  value,
  defaultValue,
  size = "md",
  isDisabled = false,
  isBlocked = false,
  isRequired = false,
  isInvalid = false,
  options = [],
  orientation = "vertical",
  label,
  errorMessage,
  helperText,
  onChange,
  className = "",
  id,
  ...props
}) => {
  // Generate ID if not provided
  const groupId =
    id || `radio-group-${Math.random().toString(36).substring(2, 9)}`;

  // Container classes
  const containerClasses = ["w-full", className].join(" ");

  // Options container classes - using gap instead of space
  const optionsContainerClasses = [
    orientation === "vertical"
      ? "flex flex-col gap-2.5"
      : "flex flex-row flex-wrap gap-4",
  ].join(" ");

  // Label classes using CSS variables
  const labelClasses = [
    "block text-(--ts) font-medium mb-2",
    size === "sm" ? "text-xs" : "",
    size === "md" ? "text-sm" : "",
    size === "lg" ? "text-base" : "",
    isDisabled ? "opacity-50" : "",
    isBlocked ? "opacity-70 pointer-events-none" : "",
    isInvalid ? "text-red-500" : "",
  ].join(" ");

  // Helper text classes
  const helperTextClasses = "mt-1.5 text-xs text-(--tm)";

  // Error message classes
  const errorMessageClasses = "mt-1.5 text-xs text-red-500";

  const handleChange = (event) => {
    if (onChange) {
      onChange(event);
    }
  };

  return (
    <div role="radiogroup" className={containerClasses} {...props}>
      {label && (
        <label id={`${groupId}-label`} className={labelClasses}>
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className={optionsContainerClasses}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            id={`${groupId}-${option.value}`}
            value={option.value}
            label={option.label}
            size={size}
            isChecked={value !== undefined ? value === option.value : undefined}
            defaultChecked={
              defaultValue !== undefined
                ? defaultValue === option.value
                : undefined
            }
            isDisabled={option.isDisabled || isDisabled}
            isBlocked={isBlocked}
            isRequired={isRequired}
            isInvalid={isInvalid}
            onChange={handleChange}
            {...props}
          />
        ))}
      </div>

      {helperText && !isInvalid && (
        <div className={helperTextClasses}>{helperText}</div>
      )}

      {isInvalid && errorMessage && (
        <div className={errorMessageClasses}>{errorMessage}</div>
      )}
    </div>
  );
};

export default RadioGroup;
