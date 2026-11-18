"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  FiLogOut,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiLock,
  FiShield,
  FiUser,
  FiBriefcase,
  FiUsers,
  FiNavigation,
  FiHeadphones,
  FiPercent,
} from "react-icons/fi";
import Image from "next/image";
import { getRoleDisplayName, ROLES } from "@/constants/navigation";
import { getUserType, getUserRole } from "@/utils/roleUtils";
import Button from "@/components/shared/buttons/Button";
import ConfirmationModal from "@/components/shared/overlay/ConfirmationModal";
import Avatar from "@/components/shared/data-display/Avatar";

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

const getRoleIconComponent = (role) => {
  const normalized = (role || "").toLowerCase();
  return ROLE_ICONS[normalized] || ROLE_ICONS.customer;
};

const getRoleBadgeStyles = (role) => {
  const normalized = (role || "").toLowerCase();
  return ROLE_BADGES[normalized] || ROLE_BADGES.customer;
};

export default function Sidebar({
  open,
  onClose,
  onLogout,
  user,
  isCollapsed: propCollapsed,
  onCollapseChange,
  navGroups,
  searchQuery,
}) {
  const pathname = usePathname();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed =
    propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userRole = getUserType(user) || getUserRole(user) || ROLES.Customer;
  const userAvatar =
    user?.avatar ||
    user?.user?.avatar ||
    user?.partner?.avatar ||
    user?.driver?.avatar ||
    user?.vendor?.avatar ||
    null;

  const displayNavGroups = navGroups || [];

  const isUUID = (str) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      str,
    );

  const normalizePath = (path) => {
    if (!path) return "";

    const segments = path.split("/").filter(Boolean);

    return (
      "/" +
      segments
        .filter(
          (segment) =>
            !isUUID(segment) && segment !== "create" && segment !== "edit",
        )
        .join("/")
    );
  };

  const isActive = useCallback(
    (href) => {
      if (!href || !pathname) return false;

      if (pathname === href) return true;

      const hasRawExactMatchElsewhere = navGroups.some((group) =>
        group.items.some(
          (item) => item.href !== href && item.href === pathname,
        ),
      );

      if (hasRawExactMatchElsewhere) {
        return false;
      }

      const normalizedPath = normalizePath(pathname);
      const exactMatch = normalizedPath === href;

      // Does this menu item have child menu items?
      const hasChildren = navGroups.some((group) =>
        group.items.some(
          (item) => item.href !== href && item.href.startsWith(href + "/"),
        ),
      );

      if (hasChildren) {
        return exactMatch;
      }

      return exactMatch || normalizedPath.startsWith(href + "/");
    },
    [pathname, navGroups],
  );

  // Auto-expand the group containing the active page, collapse all others if count > 3
  useEffect(() => {
    if (!navGroups || navGroups.length === 0 || !pathname) return;

    const activeGroup = navGroups.find((group) =>
      group.items.some((item) => isActive(item.href)),
    );

    if (activeGroup) {
      setExpandedGroups((prev) => {
        const nextState = { ...prev, [activeGroup.id]: true };
        const expandedKeys = navGroups
          .filter((g) => nextState[g.id] !== false)
          .map((g) => g.id);

        if (expandedKeys.length > 3) {
          // Collapse the oldest one that is NOT the active group
          const oldest = expandedKeys.find((key) => key !== activeGroup.id);
          if (oldest) {
            nextState[oldest] = false;
          }
        }
        return nextState;
      });
    }
  }, [pathname, navGroups, isActive]);

  const toggleGroup = (groupId) => {
    if (isCollapsed) return;

    const isCurrentlyExpanded = expandedGroups[groupId] ?? true;

    if (isCurrentlyExpanded) {
      setExpandedGroups((prev) => ({
        ...prev,
        [groupId]: false,
      }));
    } else {
      setExpandedGroups((prev) => {
        const nextState = { ...prev, [groupId]: true };
        const expandedKeys = navGroups
          .filter((g) => nextState[g.id] !== false)
          .map((g) => g.id);

        if (expandedKeys.length > 3) {
          // Collapse the oldest one that is NOT the currently expanded group
          const oldest = expandedKeys.find((key) => key !== groupId);
          if (oldest) {
            nextState[oldest] = false;
          }
        }
        return nextState;
      });
    }
  };

  const roleDisplayName = getRoleDisplayName(userRole);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem("sidebarCollapsed");
      if (savedState !== null) {
        const val = JSON.parse(savedState);
        setLocalCollapsed(val);
        onCollapseChange?.(val);
      }
    } catch (e) {
      console.warn("Failed to parse sidebar state");
    }
  }, [onCollapseChange]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    if (propCollapsed !== undefined) {
      onCollapseChange?.(newState);
    } else {
      setLocalCollapsed(newState);
      onCollapseChange?.(newState);
    }
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (
      user?.first_name?.[0]?.toUpperCase() ||
      user?.email?.[0]?.toUpperCase() ||
      "U"
    );
  };

  const getDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return (
      user?.first_name ||
      user?.last_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  };

  if (!navGroups || navGroups.length === 0) {
    return (
      <aside className="hidden md:flex flex-col h-full fixed top-0 left-0 z-40 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 w-66.25">
        <div className="p-4 text-center text-xs text-(--tm)">
          No menu items available
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full fixed top-0 left-0 z-40 transition-all duration-300 ease-in-out bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 ${isCollapsed ? "w-18" : "w-66.25"
          }`}
      >
        {/* Header */}
        <div
          className={`relative flex items-center h-16 shrink-0 border-b border-slate-100 dark:border-zinc-900/50 ${isCollapsed ? "justify-center px-2" : "justify-start px-5"
            }`}
        >
          <Link
            href="/"
            className="flex items-center select-none shrink-0 transition-transform duration-200 hover:scale-102"
          >
            {!isCollapsed ? (
              <Image
                src="/logo_wide.png"
                alt="Discovia"
                width={115}
                height={32}
                className="object-contain h-7 w-auto dark:brightness-0 dark:invert"
                priority
              />
            ) : (
              <Image
                src="/logo.png"
                alt="Discovia"
                width={32}
                height={32}
                className="object-contain h-8 w-8"
                priority
              />
            )}
          </Link>

          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-6 h-6 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <FiChevronRight size={12} />
            ) : (
              <FiChevronLeft size={12} />
            )}
          </button>
        </div>

        {/* User Profile */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-zinc-900/50 shrink-0 ${isCollapsed ? "justify-center px-2" : ""
            }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {(() => {
              const IconComponent = getRoleIconComponent(userRole);
              const badgeStyles = getRoleBadgeStyles(userRole);
              return (
                <div className="relative shrink-0">
                  <Avatar
                    size="md"
                    src={userAvatar}
                    name={getDisplayName()}
                    className="w-10 h-10 rounded-full object-cover shadow-xs border border-slate-200 dark:border-zinc-800"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-xs ${badgeStyles.bg} ${badgeStyles.text}`}
                    title={roleDisplayName}
                  >
                    <IconComponent size={9} />
                  </span>
                </div>
              );
            })()}
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-slate-800 dark:text-zinc-100 leading-snug truncate">
                  {getDisplayName()}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5 truncate">
                  {roleDisplayName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hidden">
          <style jsx>{`
            nav::-webkit-scrollbar {
              display: none;
            }
            nav {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {displayNavGroups.map(
            ({ id: groupId, label, items, icon: GroupIcon }) => {
              const isGroupExpanded = expandedGroups[groupId] ?? true;

              return (
                <div key={groupId || label} className="mb-2">
                  {!isCollapsed ? (
                    <div
                      className={`px-3.5 py-2 flex items-center justify-between cursor-pointer group hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-all duration-150 rounded-xl mb-1 ${isGroupExpanded ? "bg-slate-50/50 dark:bg-zinc-900/20" : ""}`}
                      onClick={() => toggleGroup(groupId)}
                    >
                      <div className="flex items-center gap-2.5">
                        {GroupIcon && (
                          <GroupIcon
                            className={`transition-colors ${isGroupExpanded ? "text-emerald-700 dark:text-emerald-500" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300"}`}
                            size={14}
                          />
                        )}
                        <p
                          className={`text-[12.5px] font-semibold tracking-wide transition-colors ${isGroupExpanded ? "text-emerald-700 dark:text-emerald-500" : "text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100"}`}
                        >
                          {label}
                        </p>
                      </div>
                      <span
                        className={`transition-colors ${isGroupExpanded ? "text-emerald-700 dark:text-emerald-500" : "text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400"}`}
                      >
                        {isGroupExpanded ? (
                          <FiChevronUp size={12} />
                        ) : (
                          <FiChevronDown size={12} />
                        )}
                      </span>
                    </div>
                  ) : (
                    GroupIcon && (
                      <div
                        className="flex justify-center py-2 text-slate-400 dark:text-zinc-600 border-t border-slate-200/30 dark:border-zinc-900/30 my-1 first:border-t-0"
                        title={label}
                      >
                        <GroupIcon size={14} />
                      </div>
                    )
                  )}

                  {/* Group Items */}
                  <div
                    className="overflow-auto transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight:
                        !isGroupExpanded && !isCollapsed ? "0px" : "500px",
                      opacity: !isGroupExpanded && !isCollapsed ? 0 : 1,
                      marginTop:
                        !isGroupExpanded && !isCollapsed ? "0px" : "4px",
                    }}
                  >
                    {items.map(
                      ({
                        label: itemLabel,
                        href,
                        icon: Icon,
                        disabled,
                        disabledBadge,
                        disabledReason,
                        active: navActive,
                      }) => {
                        // Hide items explicitly marked active: false in nav constants
                        if (navActive === false) return null;

                        const active = isActive(href);

                        // DISABLED ITEM: Grayed out, non-clickable, with lock icon
                        if (disabled) {
                          return (
                            <div
                              key={`${groupId}-${href}`}
                              className={`flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-xl cursor-not-allowed select-none ${isCollapsed ? "justify-center" : ""
                                }`}
                              title={
                                disabledReason ||
                                `${itemLabel} (${disabledBadge || "Coming soon"})`
                              }
                            >
                              <div className="relative">
                                <Icon
                                  size={isCollapsed ? 18 : 15}
                                  className="text-slate-300 dark:text-zinc-700"
                                />
                                <FiLock
                                  size={8}
                                  className="absolute -bottom-0.5 -right-1 text-slate-400 dark:text-zinc-500"
                                />
                              </div>
                              {!isCollapsed && (
                                <span className="truncate text-slate-400 dark:text-zinc-600 flex items-center gap-2">
                                  {itemLabel}
                                  <span className="text-[8px] px-1 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 font-bold uppercase tracking-wider">
                                    {disabledBadge || "Soon"}
                                  </span>
                                </span>
                              )}
                            </div>
                          );
                        }

                        // ACTIVE/NORMAL ITEM: Clickable link
                        return (
                          <Link
                            key={`${groupId}-${href}`}
                            href={href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-200 group/item relative ${active
                              ? "bg-[#edf7ed] dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-500/10 font-bold shadow-xs"
                              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900/30"
                              } ${isCollapsed ? "justify-center mx-auto w-9 h-9 px-0" : "pl-8"}`}
                            title={isCollapsed ? itemLabel : undefined}
                          >
                            <Icon
                              size={isCollapsed ? 18 : 15}
                              className={`shrink-0 transition-transform duration-200 group-hover/item:scale-105 ${active
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-slate-400 dark:text-zinc-500 group-hover/item:text-slate-600 dark:group-hover/item:text-zinc-300"
                                }`}
                            />
                            {!isCollapsed && (
                              <span className="truncate">{itemLabel}</span>
                            )}
                          </Link>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            },
          )}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-900/50 shrink-0 flex items-center gap-3">
          {!isCollapsed && (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold bg-zinc-800 dark:bg-zinc-800 text-white shrink-0">
              {user?.first_name?.[0]?.toUpperCase() || "N"}
            </div>
          )}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-extrabold rounded-xl border border-red-200 dark:border-red-950/30 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/20 transition-all duration-200 active:scale-98 cursor-pointer ${isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : ""
              }`}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <FiLogOut size={isCollapsed ? 18 : 15} className="shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        title="Confirm Sign Out"
        message="Are you sure you want to sign out of Discovia?"
        status="warning"
        confirmText="Sign Out"
        cancelText="Cancel"
      />

      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-68 flex flex-col z-50 transition-transform duration-200 ease-in-out bg-(--bg) border-r border-(--bd) md:hidden ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-(--bd) shrink-0">
          <Link href="/" className="flex items-center" onClick={onClose}>
            <Image
              src="/logo_wide.png"
              alt="Discovia"
              width={125}
              height={36}
              className="object-contain h-8 w-auto"
              priority
            />
          </Link>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-1.5 rounded-md bg-(--bgs) text-(--tm) hover:text-(--p)"
          >
            <FiX size={20} />
          </Button>
        </div>

        {/* Mobile User Profile */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-(--bd) shrink-0">
          {(() => {
            const IconComponent = getRoleIconComponent(userRole);
            const badgeStyles = getRoleBadgeStyles(userRole);
            return (
              <div className="relative shrink-0">
                <Avatar
                  size="md"
                  src={userAvatar}
                  name={getDisplayName()}
                  className="w-10 h-10 rounded-full object-cover shadow-xs border border-slate-200 dark:border-zinc-800"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-(--bg) shadow-xs ${badgeStyles.bg} ${badgeStyles.text}`}
                  title={roleDisplayName}
                >
                  <IconComponent size={9} />
                </span>
              </div>
            );
          })()}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-(--tp)">
              {getDisplayName()}
            </p>
            <p className="text-xs text-(--tm) font-medium truncate">{roleDisplayName}</p>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {displayNavGroups.map(
            ({ id: groupId, label, items, icon: GroupIcon }) => {
              const isGroupExpanded = expandedGroups[groupId] ?? true;

              return (
                <div key={groupId || label} className="mb-4">
                  {/* Mobile Group Label with Toggle */}
                  <div
                    className="px-3.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-zinc-900/40 transition-colors rounded-lg mb-1"
                    onClick={() => toggleGroup(groupId)}
                  >
                    <div className="flex items-center gap-2">
                      {GroupIcon && (
                        <GroupIcon
                          className="text-slate-400 dark:text-zinc-500"
                          size={13}
                        />
                      )}
                      <p className="text-[12px] font-semibold text-slate-600 dark:text-zinc-300 tracking-wide">
                        {label}
                      </p>
                    </div>
                    <span className="text-slate-300 dark:text-zinc-600">
                      {isGroupExpanded ? (
                        <FiChevronUp size={11} />
                      ) : (
                        <FiChevronDown size={11} />
                      )}
                    </span>
                  </div>

                  {/* Mobile Group Items */}
                  <div
                    className="space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: !isGroupExpanded ? "0px" : "500px",
                      opacity: !isGroupExpanded ? 0 : 1,
                      marginTop: !isGroupExpanded ? "0px" : "4px",
                    }}
                  >
                    {items.map(
                      ({
                        label: itemLabel,
                        href,
                        icon: Icon,
                        disabled,
                        disabledBadge,
                        disabledReason,
                        active: navActive,
                      }) => {
                        // Hide items explicitly marked active: false in nav constants
                        if (navActive === false) return null;

                        const active = isActive(href);

                        // DISABLED ITEM (Mobile)
                        if (disabled) {
                          return (
                            <div
                              key={`${groupId}-${href}`}
                              className="flex items-center gap-3 mx-2 px-3.5 py-2 rounded-lg cursor-not-allowed select-none"
                              title={
                                disabledReason ||
                                `${itemLabel} (${disabledBadge || "Coming soon"})`
                              }
                            >
                              <div className="relative">
                                <Icon size={18} className="text-(--tl)/30" />
                                <FiLock
                                  size={8}
                                  className="absolute -bottom-0.5 -right-1 text-(--tl)/40"
                                />
                              </div>
                              <span className="truncate text-(--tl)/30 flex items-center gap-2">
                                {itemLabel}
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--tl)/10 text-(--tl)/40 font-medium">
                                  {disabledBadge || "Soon"}
                                </span>
                              </span>
                            </div>
                          );
                        }

                        // ACTIVE ITEM (Mobile)
                        return (
                          <Link
                            key={`${groupId}-${href}`}
                            href={href}
                            onClick={onClose}
                            className={`flex items-center gap-3 mx-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                              ? "bg-(--p) text-white shadow-xs"
                              : "text-(--tm) hover:text-(--tp) hover:bg-(--p)/5"
                              }`}
                          >
                            <Icon
                              size={18}
                              className={active ? "text-white" : ""}
                            />
                            <span className="truncate">{itemLabel}</span>
                          </Link>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            },
          )}
        </nav>

        {/* Mobile Sign Out */}
        <div className="p-4 border-t border-(--bd) shrink-0">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500/80 hover:text-red-500 hover:bg-red-500/10 border border-red-500/20"
          >
            <FiLogOut size={18} />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
