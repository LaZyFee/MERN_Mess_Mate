import React from "react";

import {
 FiCheckCircle,
 FiXCircle,
 FiClock,
 FiAlertCircle,
 FiWifi,
 FiWifiOff,
} from "react-icons/fi";

const Badge = ({
 variant = "primary",
 colorScheme = "solid",
 size = "md",
 isRounded = false,
 icon: Icon,
 iconSize,
 children,
 className = "",
 ...props
}) => {
 const baseClasses =
  "inline-flex items-center justify-center font-semibold gap-1.5 capitalize w-fit whitespace-nowrap select-none leading-none";

 const sizeClasses = {
  xs: "text-[6px] px-0.5 py-0.5",
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-2.5 py-1.5",
 };

 const borderRadiusClasses = isRounded ? "rounded-full" : "rounded-md";

 const variantClasses = {
  primary: {
   solid: "bg-(--info) text-(--bgs)",
   subtle: "bg-(--info-bg) text-(--info)",
   outline: "bg-transparent border border-(--info) text-(--info)",
  },
  secondary: {
   solid: "bg-(--tm) text-(--bgs)",
   subtle: "bg-(--bgm) text-(--ts)",
   outline: "bg-transparent border border-(--bd3) text-(--ts)",
  },
  success: {
   solid: "bg-(--p2) text-(--bgs)",
   subtle: "bg-(--pale) text-(--p2)",
   outline: "bg-transparent border border-(--p) text-(--p2)",
  },
  danger: {
   solid: "bg-(--danger) text-(--bgs)",
   subtle: "bg-(--danger-bg) text-(--danger)",
   outline: "bg-transparent border border-(--danger) text-(--danger)",
  },
  warning: {
   solid: "bg-(--warning) text-(--bgs)",
   subtle: "bg-(--warning-bg) text-(--warning)",
   outline: "bg-transparent border border-(--warning) text-(--warning)",
  },
  info: {
   solid: "bg-(--info) text-(--bgs)",
   subtle: "bg-(--info-bg) text-(--info)",
   outline: "bg-transparent border border-(--info) text-(--info)",
  },
 };

 const badgeClasses = `${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${borderRadiusClasses} ${
  variantClasses[variant]?.[colorScheme] || variantClasses.primary.solid
 } ${className}`;

 const defaultIconSizes = { sm: 10, md: 12, lg: 14 };
 const finalIconSize = iconSize || defaultIconSizes[size];

 return (
  <span className={badgeClasses} {...props}>
   {Icon && <Icon size={finalIconSize} />}
   {children}
  </span>
 );
};

export default Badge;
