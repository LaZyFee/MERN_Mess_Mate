"use client";

import React, { useState, useRef, useEffect } from "react";
import Button from "@/components/shared/buttons/Button";

/**
 * Dropdown component for menus
 */
const Dropdown = ({
  trigger,
  items = [],
  placement = "left",
  size = "md",
  isDisabled = false,
  className = "",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    if (!isDisabled) {
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "w-36",
    md: "w-48",
    lg: "w-64",
  };

  const placementClasses = {
    left: "left-0",
    right: "right-0",
  };

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      ref={dropdownRef}
      {...props}
    >
      <div
        onClick={toggleDropdown}
        className={
          isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-10 mt-2 ${sizeClasses[size]} ${placementClasses[placement]} origin-top-right rounded-xl bg-(--bgs) shadow-lg border border-(--bd) focus:outline-none`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1 max-h-60 overflow-auto" role="none">
            {items.map((item, index) =>
              item.isDivider ? (
                <div key={index} className="h-px bg-(--bd) my-1"></div>
              ) : (
                <Button
                  key={index}
                  className="flex w-full items-center px-4 py-2 text-sm text-(--ts) hover:bg-(--bgl) hover:text-(--p) transition-colors duration-150"
                  role="menuitem"
                  onClick={() => handleItemClick(item)}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </Button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
