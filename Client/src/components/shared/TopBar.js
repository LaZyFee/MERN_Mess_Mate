"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Loading from "@/components/shared/feedback/Loading";
import {
  FiSearch,
  FiBell,
  FiMenu,
  FiRefreshCw,
  FiNavigation,
  FiInbox,
  FiCheck,
  FiEye,
  FiShield,
  FiChevronDown,
  FiLogOut,
  FiUser,
  FiBriefcase,
  FiUsers,
  FiHeadphones,
  FiPercent,
  FiMapPin,
  FiPackage,
} from "react-icons/fi";
import {
  getPageTitle,
  getRoleDisplayName,
  NAVIGATION_REGISTRY,
  getAllNavItems,
} from "@/constants/navigation";
import Button from "@/components/shared/buttons/Button";
import ConfirmationModal from "@/components/shared/overlay/ConfirmationModal";
import Avatar from "@/components/shared/data-display/Avatar";
import { getDashboardUrl } from "@/utils/roleUtils";
import { LuCar } from "react-icons/lu";
import { getFormattedNotification, getNotificationHref } from "@/utils/notificationUtils";
import { formatShortDateTime } from "@/helper/formatTime";

const ROLE_ICONS = {
  super_admin: FiShield,
  vendor: FiBriefcase,
  driver: FiNavigation,
  customer: FiUser,
  partner: FiUsers,
  employee: FiHeadphones,
  affiliate: FiPercent,
};

const ROLE_BADGES = {
  super_admin: {
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-600 dark:text-red-400",
  },
  vendor: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  driver: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  customer: {
    bg: "bg-slate-50 dark:bg-slate-950/20",
    text: "text-slate-600 dark:text-slate-400",
  },
  partner: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  employee: {
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  affiliate: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    text: "text-purple-600 dark:text-purple-400",
  },
};

function RoleIcon({ role, size = 14, className = "" }) {
  const normalized = (role || "").toLowerCase();
  const Icon = ROLE_ICONS[normalized] || ROLE_ICONS.customer;
  return <Icon size={size} className={className} />;
}

const getRoleBadgeStyles = (role) => {
  const normalized = (role || "").toLowerCase();
  return ROLE_BADGES[normalized] || ROLE_BADGES.customer;
};

const getRoleIconComponent = (role) => {
  const normalized = (role || "").toLowerCase();
  return ROLE_ICONS[normalized] || ROLE_ICONS.customer;
};
export default function TopBar({
  onMenuClick,
  incomingRequests = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onLogout,
  searchQuery,
  onSearchQueryChange,
  user: propUser,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user: authUser,
    currentRole,
    userRoles,
    switchRole,
    isSwitchingRole,
    setIsSwitchingRole,
  } = useAuth();

  const activeUser = propUser || authUser;
  const user = activeUser;
  const userAvatar =
    activeUser?.avatar ||
    activeUser?.user?.avatar ||
    authUser?.avatar ||
    authUser?.user?.avatar ||
    null;

  const [localSwitching, setLocalSwitching] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const inputRef = useRef(null);
  const unreadCount = (
    Array.isArray(incomingRequests) ? incomingRequests : []
  ).filter((req) => !req.is_read).length;

  // Compute search results based on navigation registry
  const currentNavGroups =
    NAVIGATION_REGISTRY[currentRole || "customer"] ||
    NAVIGATION_REGISTRY.customer;
  const allLinks = getAllNavItems(currentNavGroups || []);
  const activeRoleBadgeStyles = getRoleBadgeStyles(currentRole);

  const searchResults = searchQuery
    ? allLinks
      .filter(
        (link) =>
          link?.href &&
          (link.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.href.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      .slice(0, 8) // Limit to 8 results for cleaner UI
    : [];

  // Get dynamic page title from navigation config
  const pageTitle = getPageTitle(pathname);

  // Check if we're in user section (hide search for users)
  const isUserSection = pathname?.startsWith("/user");

  const displayName =
    [activeUser?.first_name, activeUser?.last_name].filter(Boolean).join(" ") ||
    activeUser?.name ||
    [authUser?.first_name, authUser?.last_name].filter(Boolean).join(" ") ||
    "User";
  const userRole = getRoleDisplayName(currentRole || "customer");

  // Keyboard shortcut: Ctrl+K or Cmd+K focuses search (only for admin section)
  useEffect(() => {
    if (isUserSection) return;

    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isUserSection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (role) => {
    if (role === currentRole) {
      setShowRoleDropdown(false);
      return;
    }
    setShowRoleDropdown(false);
    setLocalSwitching(true);
    if (setIsSwitchingRole) setIsSwitchingRole(true);

    try {
      const didSwitch = await switchRole(role);
      if (didSwitch !== false) {
        const url = getDashboardUrl(role);
        if (typeof window !== "undefined") {
          window.location.assign(url);
        } else {
          router.push(url);
        }
      } else {
        setLocalSwitching(false);
        if (setIsSwitchingRole) setIsSwitchingRole(false);
      }
    } catch (err) {
      console.error("Error switching role:", err);
      setLocalSwitching(false);
      if (setIsSwitchingRole) setIsSwitchingRole(false);
    }
  };

  const showFullLoading = localSwitching || isSwitchingRole;

  return (
    <>
      {showFullLoading && <Loading fullScreen />}
      <header className="flex items-center justify-between gap-1 md:gap-3 px-3 md:px-6 py-1.5 border-b border-slate-200/50 dark:border-zinc-900/50 bg-white dark:bg-zinc-950 h-16 shrink-0">
        {/* Left — hamburger (mobile only) */}
        <div className="flex items-center gap-2.5 md:gap-3 md:hidden">
          <button
            onClick={onMenuClick}
            className="p-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center h-10 w-10 shadow-sm border-0 cursor-pointer transition-all duration-150 hover:scale-102 active:scale-95 shrink-0"
            aria-label="Menu"
          >
            <FiMenu size={18} />
          </button>
        </div>

        {/* Right — actions - fixed width container to prevent shifting */}
        <div className="flex items-center justify-end gap-3 flex-1 ml-4">
          {/* Search */}
          <div className="relative hidden md:block w-full max-w-xs xl:max-w-sm">
            <div
              className="relative w-full group"
              onClick={() => inputRef.current?.focus()}
            >
              {/* Search icon */}
              <div className="absolute left-3.5 inset-y-0 flex items-center pointer-events-none">
                <FiSearch className="text-slate-400 dark:text-zinc-500 text-sm" />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search Pages..."
                className="w-full pl-9.5 pr-12 py-2 text-xs rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10"
              />

              {/* Keyboard shortcut hint — hidden on mobile */}
              {!searchQuery && (
                <div className="absolute right-3.5 inset-y-0 items-center hidden md:flex pointer-events-none">
                  <kbd className="text-[10px] text-slate-400 dark:text-zinc-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 font-mono leading-none">
                    ⌘K
                  </kbd>
                </div>
              )}

              {/* Search Results Dropdown */}
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden z-1001 max-h-[60vh] overflow-y-auto">
                  <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Navigation Links
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {searchResults.map((result, idx) => {
                      const Icon = result.icon || FiNavigation;
                      return (
                        <Link
                          key={idx}
                          href={result.href}
                          onClick={() => {
                            onSearchQueryChange("");
                            inputRef.current?.blur();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                        >
                          <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-zinc-900 text-slate-500 shrink-0">
                            <Icon size={12} />
                          </div>
                          <span className="font-semibold truncate">
                            {result.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl z-1001 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    No pages found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Theme toggle */}
          <ThemeToggle topbar />

          {/* Notification bell with red dot */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="relative flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50 shadow-xs transition-colors cursor-pointer"
              aria-label="Notifications"
              onClick={() => setShowNotif(!showNotif)}
            >
              <FiBell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-1 ring-white dark:ring-zinc-900 z-20 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-lg border border-(--bd) bg-(--bgs) shadow-lg z-1000 overflow-hidden transition-all duration-200 opacity-100 scale-100 origin-top-right">
                <div className="px-4 py-2.5 border-b border-(--bd) bg-(--bgm)/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-(--tp)">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-semibold text-white bg-red-500 px-1.5 py-0.5 rounded-full animate-pulse">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh?.();
                      }}
                      className="p-1.5 text-[10px] font-bold text-(--tm) hover:text-(--p) bg-(--bd)/40 hover:bg-(--bd)"
                      title="Refresh Notifications"
                    >
                      <FiRefreshCw className="w-3 h-3 animate-spin-slow" />{" "}
                      Refresh
                    </Button>
                    {unreadCount > 0 && (
                      <Button
                        variant="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAllAsRead?.();
                        }}
                        className="text-[10px] font-bold"
                        title="Mark All as Read"
                      >
                        Mark All
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="max-h-96 overflow-y-auto scrollbar-hidden pb-2">
                    {incomingRequests.length > 0 ? (
                      incomingRequests.map((req, idx) => {
                        const isUnread = !req.is_read;
                        const formattedNotif = getFormattedNotification(req);
                        const rideData = req.data || {};
                        const pickup =
                          rideData.pickup_address || req.pickup_address;
                        const dropoff =
                          rideData.dropoff_address || req.dropoff_address;
                        const distance =
                          rideData.distance_km ||
                          rideData.metadata?.distance_km ||
                          req.distance_km ||
                          req.metadata?.distance_km;
                        const duration =
                          rideData.duration_minutes ||
                          rideData.metadata?.duration_minutes ||
                          req.duration_minutes ||
                          req.metadata?.duration_minutes;
                        const fare =
                          rideData.fare?.total ||
                          rideData.estimated_fare ||
                          req.fare?.total ||
                          req.estimated_fare;
                        const targetId =
                          rideData.parcel_pickup_id ||
                          rideData.parcel_id ||
                          rideData.pickup_id ||
                          rideData.id ||
                          rideData.rental_id ||
                          rideData.transfer_id ||
                          rideData.tour_id ||
                          rideData.custom_request_id ||
                          rideData.custom_package_id ||
                          rideData.booking_id ||
                          rideData.ticket_id ||
                          rideData.ride_id ||
                          req.ride_id ||
                          req.id;
                        const bookingNumber =
                          rideData.reference_no ||
                          rideData.booking_number ||
                          req.booking_number;
                        const status = rideData.status || req.status;

                        const formattedTime = formatShortDateTime(req.created_at);

                        const detailsUrl = getNotificationHref(req, currentRole);

                        return (
                          <div
                            key={req.id || targetId || idx}
                            onClick={async () => {
                              if (status === "revoked") return;
                              setShowNotif(false);
                              if (isUnread && req.id) {
                                await onMarkAsRead?.(req.id);
                              }
                              if (detailsUrl && detailsUrl !== "/") {
                                router.push(detailsUrl);
                              }
                            }}
                            className={`p-4 border-b border-(--bd) last:border-0 hover:bg-(--bgm)/10 transition-colors relative cursor-pointer ${isUnread ? "bg-(--p)/5 border-l-2 border-l-(--p)" : ""} ${status === "revoked" ? "opacity-60 grayscale-[0.5]" : ""}`}
                          >
                            {status === "revoked" && (
                              <div className="absolute top-2.5 right-2.5 z-30">
                                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                                  Missed
                                </span>
                              </div>
                            )}

                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 flex items-start gap-3">
                                <div
                                  className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isUnread ? "bg-(--p)/20 animate-pulse" : "bg-(--p)/10"}`}
                                >
                                  {formattedNotif.badge === "Driver" ? (
                                    <FiUser className="text-sm text-(--p)" />
                                  ) : formattedNotif.badge === "Vendor" ? (
                                    <FiBriefcase className="text-sm text-(--p)" />
                                  ) : formattedNotif.badge === "Vehicle" ? (
                                    <LuCar className="text-sm text-(--p)" />
                                  ) : formattedNotif.badge === "Support" ? (
                                    <FiHeadphones className="text-sm text-(--p)" />
                                  ) : formattedNotif.badge === "Parcel" ? (
                                    <FiPackage className="text-sm text-(--p)" />
                                  ) : formattedNotif.badge === "Tour" || formattedNotif.badge === "Tour Package" ? (
                                    <FiMapPin className="text-sm text-(--p)" />
                                  ) : (
                                    <FiNavigation className="text-sm text-(--p)" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <span
                                        className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 rounded shrink-0 ${status === "revoked"
                                            ? "bg-(--tm)/20 text-(--tm)"
                                            : status === "accepted"
                                              ? "bg-blue-500/10 text-blue-500"
                                              : status === "in_progress"
                                                ? "bg-green-500/10 text-green-500"
                                                : status === "completed"
                                                  ? "bg-green-500 text-white"
                                                  : "bg-(--p)/10 text-(--p)"
                                          }`}
                                      >
                                        {status === "revoked"
                                          ? "Missed"
                                          : status === "in_progress"
                                            ? "Active"
                                            : status === "completed"
                                              ? "Done"
                                              : formattedNotif.badge}
                                      </span>
                                      {bookingNumber && (
                                        <span className="text-[9px] font-semibold text-(--tm) font-mono bg-(--bd)/40 px-1 rounded truncate max-w-25">
                                          {bookingNumber.startsWith("#") ? bookingNumber : `#${bookingNumber}`}
                                        </span>
                                      )}
                                      {isUnread && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                      )}
                                    </div>
                                    {formattedTime && (
                                      <span className="text-[10px] font-medium text-(--tm) font-mono whitespace-nowrap shrink-0">
                                        {formattedTime}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-xs font-bold text-(--tp) mb-0.5">
                                    {formattedNotif.title}
                                  </h4>
                                  <p className="text-xs text-(--tm) leading-tight mb-2">
                                    {formattedNotif.body}
                                  </p>

                                  {pickup && dropoff && (
                                    <div className="space-y-2 mb-2.5">
                                      <div className="flex items-start gap-2">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-(--tp) font-bold leading-tight line-clamp-1">
                                            {pickup}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-(--tp) font-bold leading-tight line-clamp-1">
                                            {dropoff}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {distance && (
                                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-(--bgm)/30 border border-(--bd)">
                                      <div className="text-center flex-1 border-r border-(--bd)/50">
                                        <p className="text-[8px] text-(--tm) uppercase font-bold">
                                          Dist
                                        </p>
                                        <p className="text-xs text-(--tp) font-black">
                                          {typeof distance === "number"
                                            ? distance.toFixed(1)
                                            : parseFloat(distance || 0).toFixed(
                                              1,
                                            )}{" "}
                                          KM
                                        </p>
                                      </div>
                                      <div className="text-center flex-1 border-r border-(--bd)/50">
                                        <p className="text-[8px] text-(--tm) uppercase font-bold">
                                          Time
                                        </p>
                                        <p className="text-xs text-(--tp) font-black">
                                          {Math.round(parseFloat(duration || 0))}{" "}
                                          MIN
                                        </p>
                                      </div>
                                      <div className="text-center flex-1">
                                        <p className="text-[8px] text-(--tm) uppercase font-bold">
                                          Fare
                                        </p>
                                        <p className="text-xs text-(--p) font-black">
                                          ETB {fare || 0}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action icons column - flexed on the right side */}
                              <div className="flex flex-col items-center gap-1.5 shrink-0 self-start mt-1">
                                {status === "revoked" ? (
                                  <span
                                    className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs"
                                    title="Missed Request"
                                  >
                                    Missed
                                  </span>
                                ) : (
                                  <Link
                                    href={detailsUrl}
                                    className="p-1.5 rounded-lg text-(--tm) hover:text-(--p) hover:bg-(--bgm)/50 transition-all border border-(--bd)/20 bg-(--bgs)/60 flex items-center justify-center cursor-pointer shadow-xs"
                                    title={
                                      status === "accepted"
                                        ? "View Route"
                                        : status === "in_progress"
                                          ? "Track Ride"
                                          : "View Details"
                                    }
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      setShowNotif(false);
                                      if (isUnread && req.id) {
                                        await onMarkAsRead(req.id);
                                      }
                                      router.push(detailsUrl);
                                    }}
                                  >
                                    <FiEye size={15} />
                                  </Link>
                                )}

                                {isUnread && req.id && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      onMarkAsRead?.(req.id);
                                    }}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                                    title="Mark as Read"
                                  >
                                    <FiCheck size={15} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 px-4 text-center">
                        <div className="flex justify-center mb-2 text-(--tm)">
                          <FiInbox size={24} />
                        </div>
                        <p className="text-xs text-(--tm) font-medium">
                          No new notifications
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Scroll hint gradient overlay to suggest more content */}
                  {incomingRequests.length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-(--bgs) to-transparent pointer-events-none z-10" />
                  )}
                </div>

                <div className="px-4 py-2 bg-(--bgm)/10 border-t border-(--bd) text-center relative z-20 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.3)]">
                  <Button
                    variant="link"
                    className="text-[9px] font-bold"
                    onClick={() => setShowNotif(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
          {/* Avatar + name */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                if (userRoles && userRoles.length > 1) {
                  setShowRoleDropdown(!showRoleDropdown);
                }
              }}
              className={`flex items-center gap-2.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full h-10 transition-all duration-150 ${userRoles && userRoles.length > 1 ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50" : "cursor-default"}`}
            >
              <div className="relative shrink-0">
                <Avatar
                  size="sm"
                  src={userAvatar}
                  name={displayName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-slate-200 dark:border-zinc-800"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-900 shadow-xs ${activeRoleBadgeStyles.bg} ${activeRoleBadgeStyles.text}`}
                  title={userRole}
                >
                  <RoleIcon role={currentRole} size={8} />
                </span>
              </div>
              <div className="hidden md:block text-left">
                <span className="text-[12px] font-extrabold text-slate-800 dark:text-zinc-100 whitespace-nowrap truncate block leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 block leading-none">
                  {userRole}
                </span>
              </div>
              {userRoles && userRoles.length > 1 && (
                <FiChevronDown
                  className={`text-slate-400 ml-1 transition-transform duration-200 ${showRoleDropdown ? "rotate-180" : ""}`}
                  size={12}
                />
              )}
            </button>

            {/* Role switcher dropdown inside profile */}
            {showRoleDropdown && userRoles && userRoles.length > 1 && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-lg z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[9px] font-black tracking-widest text-slate-400 dark:text-zinc-500 uppercase">
                    Switch Role
                  </p>
                </div>

                {userRoles.map((role) => {
                  const isActive = currentRole === role;
                  const IconComponent = getRoleIconComponent(role);
                  const badgeStyles = getRoleBadgeStyles(role);
                  return (
                    <button
                      key={role}
                      onClick={() => handleSwitch(role)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all duration-100 cursor-pointer
                      ${isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-extrabold"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                        }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${badgeStyles.bg} ${badgeStyles.text}`}
                      >
                        <IconComponent size={12} />
                      </div>
                      <span className="flex-1 text-left font-bold">
                        {getRoleDisplayName(role)}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logout icon button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-10 h-10 min-w-10 shrink-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
            title="Sign out"
          >
            <FiLogOut size={16} />
          </button>
        </div>

        {/* Logout Confirmation Modal */}
        <ConfirmationModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            onLogout?.();
          }}
          title="Confirm Sign Out"
          message="Are you sure you want to sign out of Discovia?"
          status="warning"
          confirmText="Sign Out"
          cancelText="Cancel"
        />
      </header>
    </>
  );
}
