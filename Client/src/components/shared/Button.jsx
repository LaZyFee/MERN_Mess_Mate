import React from "react";
import {
 FiArrowLeft,
 FiArrowRight,
 FiCheck,
 FiSave,
 FiSearch,
} from "react-icons/fi";

import { LuLoader } from "react-icons/lu";

// Loading spinner
const Spinner = () => (
 <LuLoader className="animate-spin" size={16} aria-hidden="true" />
);

/**
 * Button component with multiple variants
 * @param {Object} props - Component props
 * @param {'primary'|'secondary'|'outline'|'ghost'|'link'|'danger'|'danger-link'|'dashed'|'translucent'|'translucent-dark'} [props.variant='primary'] - Button variant
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md'] - Button size
 * @param {boolean} [props.isFullWidth=false] - Whether button takes full width
 * @param {boolean} [props.isRound=false] - Whether button is a round (circular) icon button
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {boolean} [props.hasShadow=false] - Whether to add shadow effect
 * @param {boolean} [props.hasHoverTranslate=false] - Whether to add translate Y on hover
 * @param {React.ReactNode} [props.leftIcon] - Optional left icon
 * @param {React.ReactNode} [props.rightIcon] - Optional right icon
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.className] - Additional classes
 * @param {string} [props.type='button'] - Button type (button, submit, reset)
 * @param {string} [props.ariaLabel] - Accessibility label for icon-only buttons
 * @param {string} [props.href] - If provided, renders as <a> tag
 * @param {string|React.ElementType} [props.as='button'] - Custom element type
 */
const Button = ({
 variant = "",
 size = "md",
 isFullWidth = false,
 isRound = false,
 isLoading = false,
 isDisabled = false,
 disabled,
 hasShadow = false,
 hasHoverTranslate = false,
 leftIcon,
 rightIcon,
 className = "",
 type = "button",
 children,
 ariaLabel,
 href,
 as: Component = "button",
 ...props
}) => {
 // Base classes that apply to all buttons
 const baseClasses = [
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 ease-out whitespace-nowrap select-none leading-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/50 focus-visible:ring-offset-2",
  "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0 disabled:scale-100",
  "cursor-pointer",
 ].join(" ");

 // Size classes using design system tokens
 const sizeClasses = {
  xs: "h-5 px-3 text-[0.625rem]",
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-lg",
 };

 // Fixed circular sizes for round (icon-only) buttons — no horizontal padding,
 // the icon itself is centered by the base flex layout.
 const circleSizeClasses = {
  xs: "w-5 h-5",
  sm: "w-7 h-7",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
 };

 // Shadow classes (used only when hasShadow is explicitly true, otherwise variants handle their own subtle shadows)
 const shadowClasses = {
  primary:
   "shadow-[var(--shadow-lg)]",
  secondary: "shadow-md hover:shadow-lg",
  default: "shadow-md hover:shadow-lg",
 };

 // Hover translate classes (explicit override)
 const hoverTranslateClasses = {
  true: "hover:-translate-y-1 active:translate-y-0",
  false: "",
 };

 // Variant classes with rich aesthetics, gradients, and micro-interactions
 const variantClasses = {
  primary: "bg-(--p) text-[var(--bgs)] shadow-md shadow-(--p)/20 hover:bg-[var(--p3)] hover:shadow-lg hover:shadow-(--p)/30 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
  secondary:
   "bg-(--bg) text-(--tm) border-[1.5px] border-(--bd2) shadow-sm hover:bg-[var(--pale)] hover:text-(--p) hover:border-(--p) hover:shadow-md hover:-translate-y-[1px] active:bg-[var(--bd)] active:translate-y-0 active:scale-[0.98]",
  outline:
   "bg-transparent border-[1.5px] border-(--bd2) text-(--ts) hover:bg-[var(--pale)] hover:text-(--p) hover:border-[var(--p)] hover:shadow-sm hover:-translate-y-[1px] active:bg-(--bd) active:translate-y-0 active:scale-[0.98]",
  ghost: "bg-transparent text-(--ts) hover:text-(--p) hover:bg-[var(--pale)] active:bg-[var(--bd)] active:scale-[0.98]",
  danger: "bg-(--danger) text-(--bgs) shadow-md shadow-(--danger)/20 hover:bg-(--danger) hover:shadow-lg hover:shadow-(--danger)/30 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
  link: "bg-transparent text-(--p) hover:text-[var(--p3)] underline-offset-4 hover:underline p-0 h-auto active:scale-95",
  "danger-link":
   "bg-transparent text-(--danger) hover:text-(--danger) underline-offset-4 hover:underline p-0 h-auto active:scale-95",
  dashed:
   "bg-transparent border-[1.5px] border-dashed border-(--bd2) text-(--tm) hover:bg-[var(--pale)] hover:text-(--p) hover:border-(--p) active:bg-(--bd) active:scale-[0.98]",
  translucent: "bg-(--p4)/5 text-(--tm) backdrop-blur-sm border-[1.5px] border-transparent hover:bg-(--p4)/10 hover:border-(--bd) active:bg-(--p4)/15 active:scale-[0.98]",
  "translucent-dark":
   "bg-(--p4)/40 text-(--bgs) backdrop-blur-md border-[1.5px] border-(--bgs)/10 hover:bg-(--p4)/60 hover:border-(--bgs)/20 active:bg-(--p4)/70 active:scale-[0.98]",
  custom: "",
  empty: "",
  "": "",
 };

 // Check if className contains custom styling that should override defaults
 const hasCustomRounded = className && /rounded-\w+/.test(className);
 const hasCustomPadding =
  className && /p-[x\d]|px-|py-|pt-|pr-|pb-|pl-/.test(className);

 // Determine the appropriate rounded class
 const getRoundedClass = () => {
  if (hasCustomRounded) return "";
  if (variant === "link") return "";
  if (isRound) return "rounded-full";
  return "rounded-xl";
 };

 const normalizedDisabled = isDisabled || disabled;

 const getDefaultIcon = (position) => {
  if (leftIcon || rightIcon || typeof children !== "string") return null;

  const label = children.trim().toLowerCase();
  if (position === "left") {
   if (label === "back" || label === "previous")
    return <FiArrowLeft size={16} />;
   if (
    label.includes("save") ||
    label.includes("update") ||
    label.includes("publish")
   )
    return <FiSave size={16} />;
   if (label.includes("search")) return <FiSearch size={16} />;
   if (
    label.includes("submit") ||
    label.includes("confirm") ||
    label.includes("apply")
   )
    return <FiCheck size={16} />;
  }

  if (position === "right" && (label === "next" || label === "continue")) {
   return <FiArrowRight size={16} />;
  }

  return null;
 };

 const resolvedLeftIcon = leftIcon || getDefaultIcon("left");
 const resolvedRightIcon = rightIcon || getDefaultIcon("right");

 // Get size classes, excluding padding if custom padding is provided
 const getSizeClasses = () => {
  if (variant === "link" || variant === "ghost") return "";
  if (isRound) return circleSizeClasses[size] || circleSizeClasses.md;
  if (hasCustomPadding) {
   // Only apply height and font size, not padding
   const sizeMap = {
    xs: "h-6 text-[0.625rem]",
    sm: "h-8 text-xs",
    md: "h-10 text-sm",
    lg: "h-12 text-base",
    xl: "h-14 text-lg",
   };
   return sizeMap[size];
  }
  return sizeClasses[size];
 };

 const getFilteredClassName = () => className;

 // Get shadow class based on variant
 const getShadowClass = () => {
  if (variant === "primary") return shadowClasses.primary;
  return shadowClasses.default;
 };

 const classes = `${baseClasses} ${variantClasses[variant] || ""} ${getSizeClasses()} ${getRoundedClass()} ${
  isFullWidth ? "w-full" : "w-fit"
 } ${isLoading ? "cursor-wait" : ""} ${hasShadow ? getShadowClass() : ""} ${
  hasHoverTranslate ? hoverTranslateClasses.true : ""
 } ${getFilteredClassName()}`;

 // Determine if we should render as a link
 const Element = href ? "a" : Component;
 const isButtonElement = Element === "button";

 // For link variant with href, we want it to look like a link
 const finalProps = {
  className: classes,
  "aria-label": ariaLabel,
  ...(href && { href }),
  ...(isButtonElement && { type }),
  ...(isButtonElement && { disabled: normalizedDisabled || isLoading }),
  ...(isButtonElement && { "aria-busy": isLoading || undefined }),
  ...props,
 };

 return (
  <Element {...finalProps}>
   {isLoading ? (
    <>
     <Spinner />
     {children}
    </>
   ) : (
    <>
     {resolvedLeftIcon && (
      <span className="shrink-0" aria-hidden="true">
       {resolvedLeftIcon}
      </span>
     )}
     {children}
     {resolvedRightIcon && (
      <span className="shrink-0" aria-hidden="true">
       {resolvedRightIcon}
      </span>
     )}
    </>
   )}
  </Element>
 );
};

export default Button;
