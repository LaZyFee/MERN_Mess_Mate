import React, { forwardRef, useState, useEffect, useRef } from "react";
import Button from "@/components/shared/Button";
import { LuX, LuChevronUp, LuCheck } from "react-icons/lu";

/**
 * MultiSelect component
 * @param {Object} props - Component props
 * @param {'outline'|'filled'|'flushed'} [props.variant='outline'] - Select variant
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Select size
 * @param {boolean} [props.isInvalid=false] - Error state
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {boolean} [props.isBlocked=false] - Blocked state (uneditable, grayed out)
 * @param {boolean} [props.isRequired=false] - Required state
 * @param {Array<{value: string, label: string}>} [props.options=[]] - Select options
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.errorMessage] - Error message
 * @param {string} [props.helperText] - Helper text
 * @param {string} [props.label] - Input label
 * @param {'left'|'right'|'top'|'bottom'} [props.align='top'] - Label alignment
 * @param {string} [props.labelWidth='30%'] - Width of the label when align is 'left' or 'right'
 * @param {string} [props.inputWidth='70%'] - Width of the input when align is 'left' or 'right'
 * @param {string} [props.className] - Additional classes
 * @param {boolean} [props.isSearchable=false] - Whether the select has search functionality
 * @param {Array<string>} [props.value=[]] - Selected values
 * @param {Function} [props.onChange] - On change handler
 * @param {string} [props.name] - Input name
 */
const MultiSelect = forwardRef(
 (
  {
   variant = "outline",
   size = "md",
   isInvalid = false,
   isDisabled = false,
   isBlocked = false,
   isRequired = false,
   options = [],
   placeholder,
   errorMessage,
   helperText,
   label,
   align = "top",
   labelWidth: propLabelWidth,
   inputWidth: propInputWidth,
   className = "",
   id,
   isSearchable = true,
   value = [],
   onChange,
   name,
   ...props
  },
  ref,
 ) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedValues, setSelectedValues] = useState(value || []);
  const selectContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Handle automatic width calculation for labelWidth and inputWidth
  let labelWidth = propLabelWidth || "30%";
  let inputWidth = propInputWidth || "70%";

  // If only one width is provided, calculate the other
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

  // Generate ID if not provided
  const selectId =
   id || `multi-select-${Math.random().toString(36).substring(2, 9)}`;

  // Filter options based on search term
  const filteredOptions = searchTerm
   ? options.filter((option) =>
     option.label.toLowerCase().includes(searchTerm.toLowerCase()),
    )
   : options;

  // Handle outside click
  useEffect(() => {
   const handleClickOutside = (event) => {
    if (
     selectContainerRef.current &&
     !selectContainerRef.current.contains(event.target)
    ) {
     setIsOpen(false);
    }
   };

   document.addEventListener("mousedown", handleClickOutside);
   return () => {
    document.removeEventListener("mousedown", handleClickOutside);
   };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
   if (isOpen && isSearchable && searchInputRef.current) {
    searchInputRef.current.focus();
   }
  }, [isOpen, isSearchable]);

  // Update selected values when value prop changes
  useEffect(() => {
   setSelectedValues(value || []);
  }, [value]);

  // Handle option selection
  const handleOptionSelect = (option) => {
   if (isDisabled || isBlocked) return;

   const newValues = selectedValues.includes(option.value)
    ? selectedValues.filter((v) => v !== option.value)
    : [...selectedValues, option.value];

   setSelectedValues(newValues);

   if (onChange) {
    onChange({
     target: {
      name: name,
      value: newValues,
     },
    });
   }

   if (isSearchable) {
    searchInputRef.current?.focus();
   }
  };

  // Get display value for the selected options
  const getDisplayValue = () => {
   if (selectedValues.length === 0) return "";

   const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
   );
   if (selectedOptions.length === 0) return "";

   if (selectedOptions.length === 1) return selectedOptions[0].label;

   return `${selectedOptions.length} selected`;
  };

  // Base select classes
  const baseClasses = "w-full transition-all duration-200 focus:outline-none";

  // Size classes
  const sizeClasses = {
   sm: "text-xs py-1.5 px-3 rounded-lg",
   md: "text-sm py-2 px-4 rounded-xl",
   lg: "text-base py-2.5 px-5 rounded-xl",
  };

  // Variant classes using CSS variables
  const variantClasses = {
   outline:
    "border border-(--bd2) bg-(--bg) rounded-xl focus:border-(--p) focus:ring-2 focus:ring-(--p)/20",
   filled:
    "bg-(--bgl) border-2 border-transparent rounded-xl focus:bg-(--bg) focus:border-(--p) focus:ring-2 focus:ring-(--p)/20",
   flushed:
    "border-b-2 border-(--bd2) rounded-none px-0 bg-transparent focus:border-(--p)",
  };

  // State classes using CSS variables
  const stateClasses = {
   invalid: "border-(--danger) focus:border-(--danger) focus:ring-(--danger)/20",
   disabled: "opacity-60 cursor-not-allowed bg-(--bgs)",
   blocked: "opacity-70 cursor-not-allowed bg-(--bgs) pointer-events-none",
  };

  // Label classes
  const labelClasses = {
   base: "block text-(--ts) font-medium",
   sm: "text-xs",
   md: "text-[13px]",
   lg: "text-base",
   disabled: "opacity-60",
   blocked: "opacity-70",
   invalid: "text-(--danger)",
   top: "mb-2",
   bottom: "mt-2",
   left: "mr-3",
   right: "ml-3",
  };

  // Helper text classes
  const helperTextClasses = "mt-1.5 text-xs text-(--tm)";

  // Error message classes
  const errorMessageClasses = "mt-1.5 text-xs text-(--danger)";

  // Placeholder color class
  const placeholderClass = "placeholder:text-(--tl)/50";

  // Select button classes
  const selectButtonClasses = [
   baseClasses,
   variantClasses[variant],
   sizeClasses[size],
   placeholderClass,
   isInvalid ? stateClasses.invalid : "",
   isDisabled ? stateClasses.disabled : "",
   isBlocked ? stateClasses.blocked : "",
   "flex items-center justify-between cursor-pointer relative appearance-none",
   className,
  ].join(" ");

  // Search input classes
  const searchInputClasses = [
   "px-3 py-2 w-full border-b border-(--bd2) focus:outline-none focus:border-(--p) bg-(--bgs) text-(--tp) placeholder:text-(--tl)",
   sizeClasses[size],
  ].join(" ");

  const labelClassNames = [
   labelClasses.base,
   labelClasses[size],
   labelClasses[align],
   isDisabled ? labelClasses.disabled : "",
   isBlocked ? labelClasses.blocked : "",
   isInvalid ? labelClasses.invalid : "",
  ].join(" ");

  // Create label element with required indicator
  const labelElement = (
   <label htmlFor={selectId} className={labelClassNames}>
    {label}
    {isRequired && <span className="text-(--danger) ml-1">*</span>}
   </label>
  );

  // For compatibility with form elements, maintain a hidden select element with the actual values
  const renderHiddenSelect = () => (
   <select
    ref={ref}
    name={name}
    id={selectId}
    className="hidden"
    aria-hidden="true"
    value={selectedValues}
    onChange={() => {}}
    disabled={isDisabled || isBlocked}
    required={isRequired}
    multiple
    {...props}
   >
    {options.map((option) => (
     <option key={option.value} value={option.value}>
      {option.label}
     </option>
    ))}
   </select>
  );

  // Create selected chip elements for display
  const renderSelectedChips = () => {
   if (selectedValues.length === 0) return null;

   const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
   );
   return (
    <div className="flex flex-wrap gap-1 mt-2">
     {selectedOptions.map((option) => (
      <div
       key={option.value}
       className="flex items-center bg-(--pale) text-(--p) text-xs px-2 py-1 rounded-full border border-(--p)/20"
      >
       <span>{option.label}</span>
       {!(isDisabled || isBlocked) && (
        <Button
         variant="ghost"
         size="sm"
         className="ml-1 text-(--p) hover:text-(--p3) p-0 h-auto min-h-0"
         onClick={(e) => {
          e.stopPropagation();
          handleOptionSelect(option);
         }}
        >
         <LuX size={12} />
        </Button>
       )}
      </div>
     ))}
    </div>
   );
  };

  // Create content for multiselect
  const multiSelectContent = (
   <div className="relative" ref={selectContainerRef}>
    {/* Hidden select element for form submission */}
    {renderHiddenSelect()}

    {/* Custom select button */}
    <div
     id={selectId}
     className={selectButtonClasses}
     role="button"
     aria-haspopup="listbox"
     aria-expanded={isOpen}
     aria-describedby={
      helperText
       ? `${selectId}-helper-text`
       : errorMessage && isInvalid
        ? `${selectId}-error-message`
        : undefined
     }
     onClick={() => !(isDisabled || isBlocked) && setIsOpen(!isOpen)}
     style={{
      cursor: isDisabled || isBlocked ? "not-allowed" : "pointer",
     }}
    >
     <span
      className={
       !selectedValues.length && placeholder
        ? "text-(--tl)"
        : "text-(--tp)"
      }
     >
      {getDisplayValue() || placeholder || "Select options"}
     </span>
     <LuChevronUp
      className={`w-4 h-4 text-(--tl) shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "" : "rotate-180"}`}
     />
      />
     </svg>
    </div>

    {/* Display selected values as chips */}
    {renderSelectedChips()}

    {/* Dropdown menu */}
    {isOpen && !(isDisabled || isBlocked) && (
     <div
      className={`absolute z-50 mt-1 w-full bg-(--bgs) shadow-(--shadow-lg) rounded-xl max-h-60 overflow-auto border border-(--bd)`}
      role="listbox"
      aria-multiselectable="true"
     >
      {/* Search input */}
      {isSearchable && (
       <div className="sticky top-0 bg-(--bgs) z-10 border-b border-(--bd)">
        <input
         ref={searchInputRef}
         type="text"
         className={searchInputClasses}
         placeholder="Search..."
         value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         onClick={(e) => e.stopPropagation()}
        />
       </div>
      )}

      {/* Options */}
      <div>
       {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
         <div
          key={option.value}
          className={`px-3 py-2 cursor-pointer transition-all duration-150 flex items-center ${
           selectedValues.includes(option.value)
            ? "bg-(--pale) text-(--p) font-medium"
            : "text-(--ts) hover:bg-(--bgl) hover:text-(--p)"
          }`}
          role="option"
          aria-selected={selectedValues.includes(option.value)}
          onClick={() => handleOptionSelect(option)}
         >
          <div
           className={`shrink-0 w-4 h-4 mr-2 border rounded ${
            selectedValues.includes(option.value)
             ? "bg-(--p) border-(--p)"
             : "border-(--bd2)"
           }`}
          >
           {selectedValues.includes(option.value) && (
            <LuCheck className="w-4 h-4 text-(--bgs)" />
           )}
          </div>
          {option.label}
         </div>
        ))
       ) : (
        <div className="px-3 py-2 text-(--tl) text-center">
         No results found
        </div>
       )}
      </div>
     </div>
    )}
   </div>
  );

  return (
   <div className="w-full">
    {label ? (
     <>
      {align === "top" && (
       <div className="flex flex-col">
        {labelElement}
        {multiSelectContent}
       </div>
      )}

      {align === "bottom" && (
       <div className="flex flex-col">
        {multiSelectContent}
        {labelElement}
       </div>
      )}

      {align === "left" && (
       <div className="flex items-center justify-between gap-4">
        <div style={{ width: labelWidth }}>{labelElement}</div>
        <div style={{ width: inputWidth }}>{multiSelectContent}</div>
       </div>
      )}

      {align === "right" && (
       <div className="flex items-center justify-between gap-4">
        <div style={{ width: inputWidth }}>{multiSelectContent}</div>
        <div style={{ width: labelWidth }}>{labelElement}</div>
       </div>
      )}
     </>
    ) : (
     multiSelectContent
    )}

    {helperText && !isInvalid && (
     <div id={`${selectId}-helper-text`} className={helperTextClasses}>
      {helperText}
     </div>
    )}

    {isInvalid && errorMessage && (
     <div id={`${selectId}-error-message`} className={errorMessageClasses}>
      {errorMessage}
     </div>
    )}
   </div>
  );
 },
);

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
