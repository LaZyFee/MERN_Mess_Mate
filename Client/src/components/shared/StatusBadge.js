import {
 FiCheckCircle,
 FiClock,
 FiWifi,
 FiWifiOff,
 FiXCircle,
 FiAlertCircle,
 FiFileText,
 FiRotateCcw,
} from "react-icons/fi";
import Badge from "./Badge";

// CONFIGURATION MAPS (Single source of truth)

const STATUS_CONFIGS = {
 // Driver/Vendor statuses
 driver: {
  approved: { variant: "success", label: "Approved", icon: FiCheckCircle },
  completed: { variant: "success", label: "Completed", icon: FiCheckCircle },
  active: { variant: "success", label: "Active", icon: FiCheckCircle },
  pending: { variant: "warning", label: "Pending", icon: FiClock },
  cancelled: { variant: "danger", label: "Cancelled", icon: FiClock },
  processing: { variant: "subtle", label: "Processing", icon: FiClock },
  suspended: { variant: "danger", label: "Suspended", icon: FiXCircle },
  rejected: { variant: "danger", label: "Rejected", icon: FiXCircle },
  inactive: { variant: "danger", label: "Inactive", icon: FiXCircle },
  available: { variant: "available", label: "Available", icon: FiCheckCircle },
  paid: { variant: "success", label: "Paid", icon: FiCheckCircle },
  refunded: { variant: "secondary", label: "Refunded", icon: FiXCircle },
  authorized: { variant: "info", label: "Authorized", icon: FiCheckCircle },
 },

 // Document statuses
 document: {
  verified: { variant: "success", label: "Verified", icon: FiCheckCircle },
  approved: { variant: "success", label: "Approved", icon: FiCheckCircle },
  pending: { variant: "warning", label: "Pending", icon: FiClock },
  rejected: { variant: "danger", label: "Rejected", icon: FiXCircle },
  available: { variant: "available", label: "Available", icon: FiCheckCircle },
 },

 // Generic boolean/active states
 boolean: {
  true: { variant: "success", label: "Active", icon: FiCheckCircle },
  false: { variant: "secondary", label: "Inactive", icon: FiXCircle },
 },

 // Online/Availability
 online: {
  online: { variant: "success", label: "Online", icon: FiWifi },
  offline: { variant: "secondary", label: "Offline", icon: FiWifiOff },
 },

 availability: {
  available: { variant: "success", label: "Available", icon: FiCheckCircle },
  onTrip: { variant: "warning", label: "On Trip", icon: FiClock },
  unavailable: {
   variant: "secondary",
   label: "Unavailable",
   icon: FiXCircle,
  },
 },

 // Booking statuses
 booking: {
  confirmed: { variant: "success", label: "Confirmed", icon: FiCheckCircle },
  completed: { variant: "info", label: "Completed", icon: FiCheckCircle },
  pending: { variant: "warning", label: "Pending", icon: FiClock },
  cancelled: { variant: "danger", label: "Cancelled", icon: FiXCircle },
  failed: { variant: "danger", label: "Failed", icon: FiXCircle },
 },

 // Payment statuses
 payment: {
  paid: { variant: "success", label: "Paid", icon: FiCheckCircle },
  refunded: { variant: "secondary", label: "Refunded", icon: FiXCircle },
  pending: { variant: "warning", label: "Pending", icon: FiClock },
  authorized: { variant: "info", label: "Authorized", icon: FiCheckCircle },
  unpaid: { variant: "warning", label: "Unpaid", icon: FiClock },
  failed: { variant: "danger", label: "Failed", icon: FiXCircle },
  cancelled: { variant: "danger", label: "Cancelled", icon: FiXCircle },
 },

 // MealMate — expense workflow statuses
 expense: {
  draft: { variant: "subtle", label: "Draft", icon: FiFileText },
  submitted: { variant: "warning", label: "Submitted", icon: FiClock },
  approved: { variant: "success", label: "Approved", icon: FiCheckCircle },
  rejected: { variant: "danger", label: "Rejected", icon: FiXCircle },
  reversed: { variant: "secondary", label: "Reversed", icon: FiRotateCcw },
 },

 // MealMate — money transaction statuses
 money: {
  submitted: { variant: "warning", label: "Submitted", icon: FiClock },
  confirmed: { variant: "success", label: "Confirmed", icon: FiCheckCircle },
  rejected: { variant: "danger", label: "Rejected", icon: FiXCircle },
  reversed: { variant: "secondary", label: "Reversed", icon: FiRotateCcw },
 },

 // MealMate — accounting period states
 period: {
  open: { variant: "info", label: "Open", icon: FiClock },
  review: { variant: "warning", label: "In Review", icon: FiClock },
  finalized: { variant: "success", label: "Finalized", icon: FiCheckCircle },
 },

 // MealMate — statement item statuses
 statement_item: {
  owes: { variant: "danger", label: "Owes", icon: FiAlertCircle },
  receives: { variant: "info", label: "Receives", icon: FiCheckCircle },
  settled: { variant: "success", label: "Settled", icon: FiCheckCircle },
 },

 // MealMate — notification outbox states
 outbox: {
  pending: { variant: "warning", label: "Pending", icon: FiClock },
  sent: { variant: "info", label: "Sent", icon: FiCheckCircle },
  delivered: { variant: "success", label: "Delivered", icon: FiCheckCircle },
  read: { variant: "success", label: "Read", icon: FiCheckCircle },
  failed: { variant: "danger", label: "Failed", icon: FiXCircle },
  skipped: { variant: "secondary", label: "Skipped", icon: FiXCircle },
  not_configured: { variant: "secondary", label: "Not Configured", icon: FiXCircle },
 },

 // MealMate — support ticket statuses
 ticket: {
  open: { variant: "info", label: "Open", icon: FiClock },
  answered: { variant: "info", label: "Answered", icon: FiCheckCircle },
  awaiting_admin: { variant: "warning", label: "Awaiting Admin", icon: FiClock },
  resolved: { variant: "success", label: "Resolved", icon: FiCheckCircle },
  closed: { variant: "secondary", label: "Closed", icon: FiXCircle },
 },
};

// UNIFIED STATUS BADGE COMPONENT

export const StatusBadge = ({
 status,
 type = "driver", // 'driver' | 'document' | 'boolean' | 'online' | 'availability' | 'payment' | 'booking' | 'expense' | 'money' | 'period' | 'statement_item' | 'outbox' | 'ticket'
 config: customConfig,
 size = "sm",
 colorScheme = "subtle",
 isRounded = true,
 showIcon = true,
 fallback = "pending",
 ...props
}) => {
 // Use custom config or lookup from type
 const configMap =
  customConfig || STATUS_CONFIGS[type] || STATUS_CONFIGS.driver;

 // Normalize status to string key
 const key =
  typeof status === "boolean"
   ? String(status)
   : status
   ? String(status).trim().toLowerCase()
   : "";

 // 1. Direct lookup in selected config map
 let cfg = key && configMap[key] ? configMap[key] : null;

 // 2. If not found in selected configMap, search across other standard STATUS_CONFIGS
 if (!cfg && key && !customConfig) {
  for (const group of Object.values(STATUS_CONFIGS)) {
   if (group && group[key]) {
    cfg = group[key];
    break;
   }
  }
 }

 // 3. Fallback lookup if status is empty or explicitly matches fallback
 if (!cfg) {
  if (fallback && configMap[fallback] && (!status || key === fallback)) {
   cfg = configMap[fallback];
  }
 }

 // 4. Safe fallback for any unrecognized status
 if (!cfg) {
  const formattedLabel =
   typeof status === "string" && status.trim()
    ? status
      .split(/[-_ ]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
    : "Unknown";

  cfg = {
   variant: "secondary",
   label: formattedLabel,
   icon: null,
  };
 }

 return (
  <Badge
   variant={cfg.variant}
   colorScheme={colorScheme}
   size={size}
   isRounded={isRounded}
   icon={showIcon ? cfg.icon : null}
   {...props}
  >
   {cfg.label}
  </Badge>
 );
};

// CONVENIENCE WRAPPERS (for backward compatibility)

export const DriverStatusBadge = ({ status, ...props }) => (
 <StatusBadge type="driver" status={status} {...props} />
);

export const DocumentStatusBadge = ({ status, ...props }) => (
 <StatusBadge type="document" status={status} {...props} />
);

export const PaymentStatusBadge = ({ status, ...props }) => (
 <StatusBadge type="payment" status={status} {...props} />
);

export const OnlineStatusBadge = ({ isOnline, ...props }) => (
 <StatusBadge
  type="online"
  status={isOnline ? "online" : "offline"}
  {...props}
 />
);

export const AvailabilityBadge = ({ isAvailable, isOnline, ...props }) => {
 let status = "unavailable";
 if (isOnline && isAvailable) status = "available";
 else if (isOnline && !isAvailable) status = "onTrip";

 return <StatusBadge type="availability" status={status} {...props} />;
};

// Generic boolean badge
export const BooleanBadge = ({
 value,
 activeLabel = "Active",
 inactiveLabel = "Inactive",
 ...props
}) => (
 <StatusBadge
  type="boolean"
  status={Boolean(value)}
  config={{
   true: { variant: "success", label: activeLabel, icon: FiCheckCircle },
   false: { variant: "secondary", label: inactiveLabel, icon: FiXCircle },
  }}
  {...props}
 />
);

// LEGACY SUPPORT: Function-style badges

export const getStatusBadge = (value, options = {}) => {
 const { type = "driver", ...rest } = options;
 return <StatusBadge type={type} status={value} {...rest} />;
};

export const getOnlineStatus = (isOnline, options = {}) => (
 <OnlineStatusBadge isOnline={isOnline} {...options} />
);
