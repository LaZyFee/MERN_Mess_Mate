import React from "react";
import Button from "@/components/shared/Button";

/**
 * Icon Button component
 * @param {Object} props - Component props
 * @param {'primary'|'secondary'|'outline'|'ghost'} [props.variant='primary'] - Button variant
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Button size
 * @param {boolean} [props.isRound=false] - Whether button is round
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} [props.ariaLabel] - Accessibility label
 * @param {string} [props.className] - Additional classes
 */
const IconButton = ({
 variant = "primary",
 size = "md",
 isRound = false,
 isDisabled = false,
 icon,
 ariaLabel,
 className = "",
 ...props
}) => {
 // Base classes
 const baseClasses =
  "inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-(--p)/20 disabled:opacity-50 disabled:cursor-not-allowed";

 // Size classes
 const sizeClasses = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-2.5",
  xl: "p-3",
 };

 // Icon size classes
 const iconSizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-6 w-6",
 };

 // Variant classes using CSS variables
 const variantClasses = {
  primary: "bg-(--p) text-[var(--bgs)] hover:bg-(--p3) active:bg-(--p4)",
  secondary:
   "bg-(--bg) text-(--tm) border-[1.5px] border-(--bd2) hover:bg-(--pale) hover:text-(--p) hover:border-(--p)",
  outline:
   "bg-transparent border-[1.5px] border-(--bd2) text-(--ts) hover:bg-(--pale) hover:text-(--p) hover:border-(--p)",
  ghost: "bg-transparent text-(--ts) hover:bg-(--pale) hover:text-(--p)",
 };

 const classes = [
  baseClasses,
  sizeClasses[size],
  variantClasses[variant],
  isRound ? "rounded-full" : "rounded-xl",
  className,
 ].join(" ");

 // Clone icon element to add appropriate sizing
 const iconElement = React.isValidElement(icon)
  ? React.cloneElement(icon, {
    className: `${icon.props.className || ""} ${iconSizeClasses[size]}`,
    "aria-hidden": true,
   })
  : icon;

 return (
  <button
   className={classes}
   disabled={isDisabled}
   aria-label={ariaLabel}
   {...props}
  >
   {iconElement}
  </button>
 );
};

export default IconButton;
