import React from "react";
import { LuInfo, LuCircleCheck, LuTriangleAlert, LuCircleX, LuX } from "react-icons/lu";

/**
 * Alert component for notifications and messages
 * @param {Object} props - Component props
 * @param {'info'|'success'|'warning'|'error'} [props.status='info'] - Alert status/type
 * @param {string} [props.title] - Alert title
 * @param {boolean} [props.isDismissible=false] - Whether the alert can be dismissed
 * @param {Function} [props.onDismiss] - Dismiss handler function
 * @param {React.ReactNode} props.children - Alert content
 * @param {string} [props.className] - Additional classes
 */
const Alert = ({
 status = "info",
 title,
 isDismissible = false,
 onDismiss,
 children,
 className = "",
 ...props
}) => {
 // Base classes
 const baseClasses = "rounded-xl p-4 border";

 // Status-specific classes and icons
 const statusConfig = {
  info: {
   classes: "bg-(--pale) text-(--p) border-(--p)/20",
   iconColor: "text-(--p)",
   hoverBg: "hover:bg-(--pale2)",
   focusRing: "focus:ring-(--p)",
   icon: <LuInfo size={20} className="h-5 w-5" />,
  },
  success: {
   classes: "bg-(--success-bg) text-(--success) border-(--success)/20",
   iconColor: "text-(--success)",
   hoverBg: "hover:bg-(--success-bg)",
   focusRing: "focus:ring-(--success)",
   icon: <LuCircleCheck size={20} className="h-5 w-5" />,
  },
  warning: {
   classes: "bg-(--warning-bg) text-(--warning) border-(--warning)/20",
   iconColor: "text-(--warning)",
   hoverBg: "hover:bg-(--warning-bg)",
   focusRing: "focus:ring-(--warning)",
   icon: <LuTriangleAlert size={20} className="h-5 w-5" />,
  },
  error: {
   classes: "bg-(--danger-bg) text-(--danger) border-(--danger)/20",
   iconColor: "text-(--danger)",
   hoverBg: "hover:bg-(--danger-bg)",
   focusRing: "focus:ring-(--danger)",
   icon: <LuCircleX size={20} className="h-5 w-5" />,
  },
 };

 const config = statusConfig[status];

 const alertClasses = [baseClasses, config.classes, className].join(" ");

 // Dismiss icon
 const DismissIcon = () => <LuX size={16} className="h-4 w-4" />;

 return (
  <div className={alertClasses} role="alert" {...props}>
   <div className="flex items-start">
    <div className="shrink-0 mt-0.5">
     <div className={config.iconColor}>{config.icon}</div>
    </div>
    <div className="ml-3 grow min-w-0">
     {title && <h3 className="text-sm font-semibold">{title}</h3>}
     <div className={title ? "text-sm mt-1" : "text-sm"}>{children}</div>
    </div>
    {isDismissible && (
     <div className="shrink-0 ml-auto pl-3">
      <button
       className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.iconColor} ${config.hoverBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.focusRing} transition-colors duration-200`}
       onClick={onDismiss}
       aria-label="Dismiss"
      >
       <DismissIcon />
      </button>
     </div>
    )}
   </div>
  </div>
 );
};

export default Alert;
