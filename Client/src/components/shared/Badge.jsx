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
      solid: "bg-blue-600 text-white",
      subtle: "bg-blue-50 text-blue-600",
      outline: "bg-transparent border border-blue-500 text-blue-600",
    },
    secondary: {
      solid: "bg-gray-600 text-white",
      subtle: "bg-gray-100 text-gray-600",
      outline: "bg-transparent border border-gray-500 text-gray-600",
    },
    success: {
      solid: "bg-(--p2) text-white",
      subtle: "bg-(--pale) text-(--p2)",
      outline: "bg-transparent border border-(--p) text-(--p2)",
    },
    danger: {
      solid: "bg-red-600 text-white",
      subtle: "bg-red-50 text-red-600",
      outline: "bg-transparent border border-red-500 text-red-600",
    },
    warning: {
      solid: "bg-amber-500 text-white",
      subtle: "bg-amber-50 text-amber-600",
      outline: "bg-transparent border border-amber-500 text-amber-600",
    },
    info: {
      solid: "bg-cyan-600 text-white",
      subtle: "bg-cyan-50 text-cyan-600",
      outline: "bg-transparent border border-cyan-500 text-cyan-600",
    },
  };

  const badgeClasses = [
    baseClasses,
    sizeClasses[size],
    borderRadiusClasses,
    variantClasses[variant]?.[colorScheme] || variantClasses.primary.solid,
    className,
  ].join(" ");

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
