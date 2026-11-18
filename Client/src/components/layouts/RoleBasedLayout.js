"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import Sidebar from "@/components/shared/layout/Sidebar";
import TopBar from "@/components/shared/navigation/TopBar";
import Loading from "@/components/shared/feedback/Loading";
import {
  NAVIGATION_REGISTRY,
  getDashboardUrl,
  getProfileUrl,
  ROLES,
} from "@/constants/navigation";
import { normalizeRole } from "@/utils/roleUtils";
import { getRiderProfile } from "@/actions/riderActions";
import AccountAccessWarningBanner from "@/components/shared/feedback/AccountAccessWarningBanner";

export default function RoleBasedLayout({
  children,
  incomingRequests,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const savedState = localStorage.getItem("sidebarCollapsed");
        if (savedState !== null) {
          return JSON.parse(savedState);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return false;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    userRoles = [],
    isAuthenticated,
    currentRole,
    logout,
    isLoading: authLoading,
    isSwitchingRole,
  } = useAuth();
  const {
    filterNavigation,
    canAccessRoute,
    isLoading: permLoading,
  } = usePermissions();
  const isReady = !authLoading && !permLoading && !!user && isAuthenticated;

  const allRolesList = useMemo(() => {
    const fromContext =
      Array.isArray(userRoles) && userRoles.length > 0 ? userRoles : [];
    return [...new Set([...fromContext, currentRole].filter(Boolean))];
  }, [userRoles, currentRole]);

  const isDriverRole = useMemo(() => {
    // If we're on another portal route (vendor, partner, customer), we are NOT acting as a driver
    if (
      pathname?.startsWith("/vendor") ||
      pathname?.startsWith("/partner") ||
      pathname?.startsWith("/user") ||
      pathname?.startsWith("/affiliate")
    ) {
      return false;
    }
    if (pathname?.startsWith("/rider")) {
      return true;
    }
    const norm = normalizeRole(currentRole);
    return norm === "driver" || currentRole === ROLES.Driver;
  }, [currentRole, pathname]);

  // Account approval status (is_approved: "approved")
  const isAccountApproved = useMemo(() => {
    if (!user) return false;
    return String(user?.is_approved || "").toLowerCase().trim() === "approved";
  }, [user]);

  // Driver profile 404 check
  const [isDriverProfileNotFound, setIsDriverProfileNotFound] = useState(false);
  const [isCheckingDriverProfile, setIsCheckingDriverProfile] = useState(false);

  useEffect(() => {
    if (!isReady || !isDriverRole) {
      setIsDriverProfileNotFound(false);
      return;
    }

    let isMounted = true;
    const checkDriverProfile = async () => {
      try {
        setIsCheckingDriverProfile(true);
        const res = await getRiderProfile();
        if (!isMounted) return;

        const isNotFound =
          res?.status === 404 ||
          res?.statusCode === 404 ||
          res?.statusText === "Not Found" ||
          (res?.status === false &&
            (res?.data?.message?.toLowerCase()?.includes("driver profile not found") ||
              res?.message?.toLowerCase()?.includes("driver profile not found"))) ||
          (res?.data?.status === false &&
            res?.data?.message?.toLowerCase()?.includes("driver profile not found"));

        setIsDriverProfileNotFound(Boolean(isNotFound));
      } catch (err) {
        if (!isMounted) return;
        const isNotFound =
          err?.status === 404 ||
          err?.statusCode === 404 ||
          err?.statusText === "Not Found" ||
          err?.data?.message?.toLowerCase()?.includes("driver profile not found") ||
          err?.message?.toLowerCase()?.includes("driver profile not found");
        setIsDriverProfileNotFound(Boolean(isNotFound));
      } finally {
        if (isMounted) {
          setIsCheckingDriverProfile(false);
        }
      }
    };

    checkDriverProfile();

    const handleDriverProfileUpdated = () => {
      checkDriverProfile();
    };

    const handleDriverProfileNotFound = () => {
      setIsDriverProfileNotFound(true);
    };

    window.addEventListener(
      "discovia:driver-profile-updated",
      handleDriverProfileUpdated,
    );
    window.addEventListener(
      "discovia:driver-profile-not-found",
      handleDriverProfileNotFound,
    );
    return () => {
      isMounted = false;
      window.removeEventListener(
        "discovia:driver-profile-updated",
        handleDriverProfileUpdated,
      );
      window.removeEventListener(
        "discovia:driver-profile-not-found",
        handleDriverProfileNotFound,
      );
    };
  }, [isReady, isDriverRole]);

  const roleProfileUrl = useMemo(() => {
    if (pathname?.startsWith("/vendor")) return "/vendor/profile";
    if (pathname?.startsWith("/rider")) return "/rider/profile";
    if (pathname?.startsWith("/partner")) return "/partner/profile";
    if (pathname?.startsWith("/user")) return "/user/profile";
    if (pathname?.startsWith("/affiliate")) return "/affiliate/profile";
    return getProfileUrl(currentRole);
  }, [currentRole, pathname]);

  const isProfileRoute = useMemo(() => {
    if (!pathname || !roleProfileUrl) return false;
    return pathname === roleProfileUrl || pathname.startsWith(roleProfileUrl + "/");
  }, [pathname, roleProfileUrl]);

  const isAccessRestricted = useMemo(() => {
    if (isDriverRole && isDriverProfileNotFound) return true;
    if (!isAccountApproved) return true;
    return false;
  }, [isDriverRole, isDriverProfileNotFound, isAccountApproved]);

  const restrictionType = useMemo(() => {
    if (isDriverRole && isDriverProfileNotFound) {
      return "driver_profile_missing";
    }
    return "approval_pending";
  }, [isDriverRole, isDriverProfileNotFound]);

  const handleMenuClick = useCallback(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => {
        const newState = !prev;
        try {
          localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
        } catch (e) {
          console.warn(e);
        }
        return newState;
      });
    }
  }, []);

  // Company-only nav groups (e.g. vendor "Tours Management") are hidden
  // for individual accounts. A vendor is a company when its profile or the
  // auth user carries `is_company === true` / `isCompany === true`.
  const isCompanyAccount = useMemo(() => {
    return (
      user?.is_company === true ||
      user?.isCompany === true ||
      user?.vendor?.is_company === true ||
      user?.vendor?.isCompany === true
    );
  }, [user]);

  // Get base navigation for role
  const baseNavGroups = useMemo(() => {
    if (!currentRole) return [];
    const groups = NAVIGATION_REGISTRY[currentRole];
    if (groups && groups.length > 0) {
      return groups.filter((group) => !group.isCompanyOnly || isCompanyAccount);
    }

    const portalRoot = getDashboardUrl(currentRole) || "/dashboard";
    const portalGroups =
      portalRoot === "/vendor"
        ? NAVIGATION_REGISTRY[ROLES.Vendor]
        : portalRoot === "/rider"
          ? NAVIGATION_REGISTRY[ROLES.Driver]
          : portalRoot === "/user"
            ? NAVIGATION_REGISTRY[ROLES.Customer]
            : portalRoot === "/partner"
              ? NAVIGATION_REGISTRY[ROLES.Partner]
              : portalRoot === "/affiliate"
                ? NAVIGATION_REGISTRY[ROLES.Affiliate]
                : NAVIGATION_REGISTRY[ROLES.SuperAdmin];

    const fallbackGroups = [...portalGroups].map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href?.startsWith(portalRoot)),
    }));

    const mergedGroups = [];
    const groupMap = new Map();

    fallbackGroups.forEach((group) => {
      const key = `${group.id}::${group.label}`;
      const existing = groupMap.get(key);
      if (!existing) {
        groupMap.set(key, {
          ...group,
          items: [...group.items],
        });
        return;
      }

      const uniqueItems = group.items.filter(
        (item) =>
          !existing.items.some(
            (existingItem) => existingItem.href === item.href,
          ),
      );
      existing.items = [...existing.items, ...uniqueItems];
    });

    groupMap.forEach((group) => mergedGroups.push(group));
    return mergedGroups.filter(
      (group) => !group.isCompanyOnly || isCompanyAccount,
    );
  }, [currentRole, isCompanyAccount]);

  const navGroups = useMemo(() => {
    if (!baseNavGroups.length) return [];
    return filterNavigation(
      baseNavGroups,
      allRolesList.length > 0 ? allRolesList : currentRole,
    );
  }, [baseNavGroups, filterNavigation, allRolesList, currentRole]);

  // Lock non-profile items when access is restricted
  const accessibleNavGroups = useMemo(() => {
    if (!navGroups.length) return [];
    if (!isAccessRestricted) return navGroups;

    return navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const isItemProfile =
          item.href === roleProfileUrl ||
          item.href?.startsWith(roleProfileUrl + "/");
        if (isItemProfile) {
          return item;
        }
        return {
          ...item,
          disabled: true,
          disabledBadge: "Locked",
          disabledReason:
            restrictionType === "driver_profile_missing"
              ? "Driver profile required"
              : "Account approval required",
        };
      }),
    }));
  }, [navGroups, isAccessRestricted, roleProfileUrl, restrictionType]);

  const checkRouteAccess = useCallback(
    (path, role) => {
      if (!role || !path) return false;
      if (role === ROLES.SuperAdmin || allRolesList.includes(ROLES.SuperAdmin))
        return true;

      // When restricted, ONLY the profile route is accessible
      if (isAccessRestricted) {
        return path === roleProfileUrl || path.startsWith(roleProfileUrl + "/");
      }

      return canAccessRoute(
        path,
        allRolesList.length > 0 ? allRolesList : role,
      );
    },
    [canAccessRoute, allRolesList, isAccessRestricted, roleProfileUrl],
  );

  const hasAccess =
    isReady && currentRole ? checkRouteAccess(pathname, currentRole) : false;

  useEffect(() => {
    if (!isReady || !currentRole) return;

    if (isAccessRestricted) {
      if (!isProfileRoute && pathname !== roleProfileUrl) {
        router.replace(roleProfileUrl);
      }
      return;
    }

    if (!hasAccess) {
      let redirectUrl = getDashboardUrl(currentRole);

      // If they don't have access to the default dashboard URL,
      // find the first accessible route from their navGroups
      if (
        !checkRouteAccess(redirectUrl, currentRole) &&
        navGroups &&
        navGroups.length > 0
      ) {
        const firstGroupWithItems = navGroups.find(
          (group) => group.items && group.items.length > 0,
        );
        if (firstGroupWithItems && firstGroupWithItems.items.length > 0) {
          redirectUrl = firstGroupWithItems.items[0].href;
        }
      }

      // Only redirect if the target URL is different from the current path
      if (pathname !== redirectUrl) {
        router.replace(redirectUrl);
      }
    }
  }, [
    pathname,
    currentRole,
    isReady,
    router,
    hasAccess,
    checkRouteAccess,
    navGroups,
    isAccessRestricted,
    isProfileRoute,
    roleProfileUrl,
  ]);

  const handleBannerAction = useCallback(() => {
    if (restrictionType === "driver_profile_missing") {
      window.dispatchEvent(new CustomEvent("discovia:open-driver-edit"));
    } else {
      window.dispatchEvent(new CustomEvent("discovia:open-documents"));
    }
  }, [restrictionType]);

  const isWaitingDriverCheck =
    isCheckingDriverProfile &&
    isDriverRole &&
    !isProfileRoute;

  if (!isReady || !hasAccess || isSwitchingRole || isWaitingDriverCheck) {
    return <Loading fullScreen />;
  }

  return (
    <div className="flex h-screen bg-(--bg)">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navGroups={accessibleNavGroups}
        user={{ ...user, role: currentRole }}
        isCollapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
        onLogout={logout}
        searchQuery={searchQuery}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 w-full transition-all duration-200 ease-in-out overflow-hidden ${
          sidebarCollapsed ? "md:ml-18" : "md:ml-66.25"
        }`}
      >
        <TopBar
          onMenuClick={handleMenuClick}
          user={{ ...user, role: currentRole }}
          sidebarCollapsed={sidebarCollapsed}
          onLogout={logout}
          incomingRequests={incomingRequests}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onRefresh={onRefresh}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
        <main className="flex-1 overflow-auto scrollbar-hidden p-4 md:p-6 lg:p-8 w-full">
          {isAccessRestricted && (
            <div className="mb-6">
              <AccountAccessWarningBanner
                type={restrictionType}
                profileUrl={roleProfileUrl}
                onActionClick={isProfileRoute ? handleBannerAction : undefined}
              />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
