"use client";

import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { LuChevronDown } from "react-icons/lu";

function CountryFlag({ country, label }) {
  const iso = country ? String(country).toUpperCase() : "";
  if (!iso) return <span className="phone-country-empty-flag" aria-hidden="true">--</span>;
  return <span className="phone-country-flag shrink-0" aria-label={label || iso}>{iso}</span>;
}

const Select = forwardRef(
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
      isSearchable = false,
      inputValue: externalInputValue,
      onInputChange,
      isLoading = false,
      displayValue: propDisplayValue,
      leftElement: _leftElement,
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const initialSelected = options.find(
      (option) =>
        String(option.value) === String(props.value) ||
        String(option.label).toLowerCase() ===
        String(props.value).toLowerCase() ||
        (option.iso &&
          String(option.iso).toUpperCase() ===
          String(props.value).toUpperCase()),
    );
    const [selectedOption, setSelectedOption] = useState(props.value || "");
    const [displayValue, setDisplayValue] = useState(
      propDisplayValue || initialSelected?.label || "",
    );
    const [dropdownPosition, setDropdownPosition] = useState({
      top: 0,
      left: 0,
      width: 0,
    });

    const selectContainerRef = useRef(null);
    const searchInputRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const prevValueRef = useRef(undefined);
    const prevOptionsRef = useRef(undefined);

    // Auto-detect if this select has flags or is a country field
    const hasFlags = options.some((opt) => Boolean(opt?.iso));
    const isCountryField =
      (props.name && String(props.name).toLowerCase().includes("country")) ||
      (label && String(label).toLowerCase().includes("country"));
    const shouldUseSearchable = isSearchable || hasFlags || isCountryField;

    // Handle automatic width calculation for labelWidth and inputWidth
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

    const selectId =
      id || `select-${Math.random().toString(36).substring(2, 9)}`;

    // Handle controlled input value from parent component
    useEffect(() => {
      if (externalInputValue !== undefined) {
        setSearchTerm(externalInputValue);
      }
    }, [externalInputValue]);

    // Filter options based on search term (searches label, value, ISO and calling code)
    const filteredOptions = options.filter((option) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        option.label?.toLowerCase().includes(term) ||
        String(option.value)?.toLowerCase().includes(term) ||
        (option.iso && String(option.iso).toLowerCase().includes(term)) ||
        (option.code && String(option.code).toLowerCase().includes(term))
      );
    });

    // Update dropdown position on open, scroll, or resize
    const updateDropdownPosition = useCallback(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const width = Math.max(rect.width, 280);
        let left = rect.left;
        if (
          typeof window !== "undefined" &&
          left + width > window.innerWidth - 16
        ) {
          left = Math.max(12, window.innerWidth - width - 16);
        }
        setDropdownPosition({
          top: rect.bottom + 4,
          left,
          width,
        });
      }
    }, []);

    // Handle click outside and Escape
    useEffect(() => {
      if (!isOpen) return undefined;

      const handleClickOutside = (event) => {
        const insideSelect = selectContainerRef.current?.contains(event.target);
        const insideDropdown = dropdownRef.current?.contains(event.target);

        if (!insideSelect && !insideDropdown) {
          setIsOpen(false);
          setSearchTerm("");
          if (props.onBlur) {
            props.onBlur({
              target: {
                name: props.name || "",
                value: selectedOption,
              },
            });
          }
        }
      };

      const handleEscape = (event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
          setSearchTerm("");
        }
      };

      updateDropdownPosition();
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      requestAnimationFrame(() => searchInputRef.current?.focus());

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
        window.removeEventListener("scroll", updateDropdownPosition, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }, [
      isOpen,
      updateDropdownPosition,
      props.onBlur,
      props.name,
      selectedOption,
    ]);

    // Update display value when selected value or options change
    useEffect(() => {
      const optionsChanged =
        JSON.stringify(prevOptionsRef.current) !== JSON.stringify(options);
      const valueChanged = prevValueRef.current !== props.value;

      if (!valueChanged && !optionsChanged) {
        return;
      }

      prevValueRef.current = props.value;
      prevOptionsRef.current = options;

      const selected = options.find(
        (option) =>
          String(option.value) === String(props.value) ||
          String(option.label).toLowerCase() ===
          String(props.value).toLowerCase() ||
          (option.iso &&
            String(option.iso).toUpperCase() ===
            String(props.value).toUpperCase()),
      );

      const newSelectedValue = props.value || "";
      let newDisplayValue = "";

      if (propDisplayValue) {
        newDisplayValue = propDisplayValue;
      } else if (selected) {
        newDisplayValue = selected.label;
      } else {
        newDisplayValue = "";
      }

      setSelectedOption(newSelectedValue);
      setDisplayValue(newDisplayValue);

      if (externalInputValue === undefined) {
        setSearchTerm("");
      }
    }, [options, props.value, externalInputValue, propDisplayValue]);

    // Handle search input change
    const handleSearchInputChange = (e) => {
      e.stopPropagation();
      const value = e.target.value;
      setSearchTerm(value);
      if (onInputChange) {
        onInputChange(value);
      }
    };

    // Handle option selection
    const handleOptionSelect = (option) => {
      if (option.disabled) {
        return;
      }

      const syntheticEvent = {
        target: {
          name: props.name || "",
          value: option.value,
        },
        preventDefault: () => { },
        stopPropagation: () => { },
      };

      if (props.onChange) {
        props.onChange(syntheticEvent);
      }

      setSelectedOption(option.value);
      setDisplayValue(option.label);
      setSearchTerm("");
      setIsOpen(false);
    };

    // Toggle dropdown
    const toggleDropdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled && !isBlocked) {
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);
        if (newIsOpen) {
          setSearchTerm("");
          updateDropdownPosition();
        }
      }
    };

    // Base select classes
    const baseClasses = "w-full transition-all duration-200 focus:outline-none";

    const sizeClasses = {
      sm: "h-8 text-xs px-3 rounded-xl",
      md: "h-10 text-sm px-4 rounded-2xl",
      lg: "h-12 text-sm px-4 rounded-2xl",
      xl: "h-14 text-base px-5 rounded-2xl",
    };

    // Variant classes matching Input.jsx
    const variantClasses = {
      outline:
        "border-[1.5px] border-(--bd2) bg-(--bgs) focus:border-(--p) focus:ring-4 focus:ring-(--pale) text-(--tp) hover:border-(--p)/50 transition-colors",
      filled:
        "border-[1.5px] border-transparent bg-(--bgm) focus:bg-(--bgs) focus:border-(--p) focus:ring-4 focus:ring-(--pale) text-(--tp) hover:bg-(--bd) transition-colors",
      flushed:
        "border-b-[1.5px] border-(--bd2) rounded-none px-0 bg-transparent focus:border-b-(--p) text-(--tp) focus:ring-0 focus:ring-offset-0 transition-colors",
    };

    const stateClasses = {
      invalid:
        "border-(--danger)! focus:border-(--danger)! focus:ring-(--danger)/20!",
      disabled: "opacity-60 cursor-not-allowed bg-(--bgs)",
      blocked: "opacity-70 cursor-not-allowed bg-(--bgs) pointer-events-none",
    };

    const labelClasses = {
      base: "block text-(--ts) font-semibold",
      sm: "text-xs",
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
      "mt-1.5 text-xs text-(--danger) flex items-center gap-1 font-medium";
    const placeholderClass = "placeholder:text-(--tl)";

    const selectButtonClasses = [
      baseClasses,
      variantClasses[variant] || variantClasses.outline,
      sizeClasses[size] || sizeClasses.md,
      placeholderClass,
      "flex items-center justify-between cursor-pointer relative appearance-none text-left font-normal",
      isOpen ? "border-(--p) ring-4 ring-(--pale)" : "",
      isInvalid ? stateClasses.invalid : "",
      isDisabled ? stateClasses.disabled : "",
      isBlocked ? stateClasses.blocked : "",
      className,
    ].join(" ");

    // Regular (non-searchable) native select classes — fixed from the
    // original comma-operator expression which discarded every class
    // except the last one.
    const regularSelectClasses = [
      baseClasses,
      variantClasses[variant] || variantClasses.outline,
      sizeClasses[size] || sizeClasses.md,
      placeholderClass,
      "appearance-none pr-8",
      isInvalid ? stateClasses.invalid : "",
      isDisabled ? stateClasses.disabled : "",
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

    const labelElement = (
      <label htmlFor={selectId} className={labelClassNames}>
        {label}
        {isRequired && <span className="text-(--danger) ml-1">*</span>}
      </label>
    );

    // Selected option object (used for flag resolution)
    const selectedOptionObj = options.find(
      (opt) =>
        String(opt.value) === String(selectedOption) ||
        String(opt.label).toLowerCase() ===
        String(selectedOption).toLowerCase() ||
        (opt.iso &&
          String(opt.iso).toUpperCase() ===
          String(selectedOption).toUpperCase()),
    );

    // Hidden select for standard form serialization
    const renderHiddenSelect = () => (
      <select
        ref={ref}
        id={selectId}
        className="hidden"
        aria-hidden="true"
        value={selectedOption}
        onChange={() => { }}
        disabled={isDisabled || isBlocked}
        required={isRequired}
        {...props}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );

    // Regular select (not searchable)
    const regularSelectContent = (
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={regularSelectClasses}
          aria-invalid={isInvalid}
          aria-describedby={
            helperText
              ? `${selectId}-helper-text`
              : errorMessage && isInvalid
                ? `${selectId}-error-message`
                : undefined
          }
          disabled={isDisabled || isBlocked}
          required={isRequired}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <LuChevronDown className="w-4 h-4 text-(--tl)" />
        </div>
      </div>
    );

    // Searchable select content matching the phone country selector
    const searchableSelectContent = (
      <div ref={selectContainerRef} className="relative w-full">
        {renderHiddenSelect()}

        <button
          type="button"
          ref={buttonRef}
          id={selectId}
          role="combobox"
          disabled={isDisabled || isBlocked}
          onClick={toggleDropdown}
          className={selectButtonClasses}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${selectId}-menu`}
          aria-invalid={isInvalid}
          aria-describedby={
            helperText
              ? `${selectId}-helper-text`
              : errorMessage && isInvalid
                ? `${selectId}-error-message`
                : undefined
          }
        >
          <span className="flex items-center gap-2.5 min-w-0 flex-1">
            {selectedOptionObj?.iso ? (
              <CountryFlag
                country={selectedOptionObj.iso}
                label={selectedOptionObj.label}
              />
            ) : null}
            <span
              className={`truncate ${!selectedOption && placeholder ? "text-(--tl)" : "text-(--tp)"
                }`}
            >
              {displayValue || placeholder || "Select option"}
            </span>
          </span>

          <span className="flex items-center gap-1.5 shrink-0 ml-2">
            {isLoading && (
              <div className="animate-spin h-4 w-4 border-2 border-(--p) border-t-transparent rounded-full" />
            )}
            <LuChevronDown
              className={`w-4 h-4 text-(--tl) transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                }`}
            />
          </span>
        </button>

        {/* Dropdown menu - Portal to body matching phone-country-menu */}
        {isOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={dropdownRef}
              id={`${selectId}-menu`}
              className="phone-country-menu [position:fixed] [top:var(--inline-top)] [left:var(--inline-left)] [width:var(--inline-width)] [max-width:calc(100vw_-_2rem)] z-[100000]"
              style={{
                "--inline-top": `${dropdownPosition.top}px`,
                "--inline-left": `${dropdownPosition.left}px`,
                "--inline-width": `${dropdownPosition.width}px`,
              }}
              role="listbox"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input with phone-country-search styling */}
              <input
                ref={searchInputRef}
                type="text"
                className="phone-country-search"
                placeholder={
                  isCountryField || hasFlags ? "Search country..." : "Search..."
                }
                value={searchTerm}
                onChange={handleSearchInputChange}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setIsOpen(false);
                    setSearchTerm("");
                  }
                  if (e.key === "Enter" && filteredOptions.length > 0) {
                    e.preventDefault();
                    handleOptionSelect(filteredOptions[0]);
                  }
                }}
              />

              {/* Options list with phone-country-options styling */}
              <div className="phone-country-options">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) =>
                    option.disabled ? (
                      <div
                        key={option.value}
                        className="phone-country-option opacity-50 cursor-not-allowed"
                        role="option"
                        aria-selected={
                          String(option.value) === String(selectedOption)
                        }
                        aria-disabled="true"
                        title={`${option.label} is disabled`}
                      >
                        {option.iso && (
                          <CountryFlag
                            country={option.iso}
                            label={option.label}
                          />
                        )}
                        <span className="phone-country-option-label">
                          {option.label}
                        </span>
                        <span className="text-[10px] font-semibold italic text-(--tm)">
                          Disabled
                        </span>
                      </div>
                    ) : (
                      <button
                        key={option.value}
                        type="button"
                        className={`phone-country-option ${String(option.value) === String(selectedOption)
                          ? "is-selected"
                          : ""
                          }`}
                        role="option"
                        aria-selected={
                          String(option.value) === String(selectedOption)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOptionSelect(option);
                        }}
                      >
                        {option.iso && (
                          <CountryFlag
                            country={option.iso}
                            label={option.label}
                          />
                        )}
                        <span className="phone-country-option-label">
                          {option.label}
                        </span>
                        {option.code && (
                          <span className="phone-country-option-code">
                            {option.code}
                          </span>
                        )}
                      </button>
                    ),
                  )
                ) : (
                  <div className="phone-country-empty">
                    No results found for &quot;{searchTerm}&quot;
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    );

    const renderHelperAndError = () => (
      <>
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
      </>
    );

    // Return the component JSX
    return (
      <div className="w-full">
        {label ? (
          <>
            {align === "top" && (
              <div className="flex flex-col">
                {labelElement}
                {shouldUseSearchable
                  ? searchableSelectContent
                  : regularSelectContent}
              </div>
            )}
            {align === "bottom" && (
              <div className="flex flex-col">
                {shouldUseSearchable
                  ? searchableSelectContent
                  : regularSelectContent}
                {labelElement}
              </div>
            )}
            {align === "left" && (
              <div className="flex items-center justify-between gap-4">
                <div
                  className="[width:var(--inline-width)]"
                  style={{ "--inline-width": labelWidth }}
                >
                  {labelElement}
                </div>
                <div
                  className="[width:var(--inline-width)]"
                  style={{ "--inline-width": inputWidth }}
                >
                  {shouldUseSearchable
                    ? searchableSelectContent
                    : regularSelectContent}
                </div>
              </div>
            )}
            {align === "right" && (
              <div className="flex items-center justify-between gap-4">
                <div
                  className="[width:var(--inline-width)]"
                  style={{ "--inline-width": inputWidth }}
                >
                  {shouldUseSearchable
                    ? searchableSelectContent
                    : regularSelectContent}
                </div>
                <div
                  className="[width:var(--inline-width)]"
                  style={{ "--inline-width": labelWidth }}
                >
                  {labelElement}
                </div>
              </div>
            )}
          </>
        ) : shouldUseSearchable ? (
          searchableSelectContent
        ) : (
          regularSelectContent
        )}
        {renderHelperAndError()}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;