"use client";

import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  hasAccess as hasRoleAccess,
  getUserType,
  normalizeRole,
  extractRolesFromUser,
  BASE_ROLES,
} from "@/utils/roleUtils";
import { ROLES, getDashboardUrl, getProfileUrl } from "@/constants/navigation";
import Loading from "@/components/shared/feedback/Loading";

export default function ProtectedLayout({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  requiredAnyPermission = [],
}) {
  const {
    user,
    userRoles = [],
    isLoading: authLoading,
    currentRole,
  } = useAuth();
  const {
    canAccessRoute,
    isLoading: permLoading,
    permissionList,
    userRole,
  } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const redirectAttempted = useRef(false);

  const isLoading = authLoading || permLoading;

  // Resolve all roles the user holds across context, user object, and active role
  const userRolesList = useMemo(() => {
    const fromContext =
      Array.isArray(userRoles) && userRoles.length > 0 ? userRoles : [];
    const fromUserObj = user ? extractRolesFromUser(user) : [];
    return [
      ...new Set(
        [...fromContext, ...fromUserObj, currentRole, userRole]
          .map(normalizeRole)
          .filter(Boolean),
      ),
    ];
  }, [userRoles, user, currentRole, userRole]);

  const isApproved = useMemo(() => {
    if (!user) return false;
    return String(user?.is_approved || "").toLowerCase().trim() === "approved";
  }, [user]);

  const effectiveRole = useMemo(() => {
    if (pathname?.startsWith("/vendor")) return ROLES.Vendor;
    if (pathname?.startsWith("/rider")) return ROLES.Driver;
    if (pathname?.startsWith("/partner")) return ROLES.Partner;
    if (pathname?.startsWith("/user")) return ROLES.Customer;
    if (pathname?.startsWith("/affiliate")) return ROLES.Affiliate;
    return currentRole || userRole || (user ? getUserType(user) : null);
  }, [pathname, currentRole, userRole, user]);

  const profileUrl = useMemo(() => {
    if (pathname?.startsWith("/vendor")) return "/vendor/profile";
    if (pathname?.startsWith("/rider")) return "/rider/profile";
    if (pathname?.startsWith("/partner")) return "/partner/profile";
    if (pathname?.startsWith("/user")) return "/user/profile";
    if (pathname?.startsWith("/affiliate")) return "/affiliate/profile";
    return getProfileUrl(effectiveRole);
  }, [pathname, effectiveRole]);

  const isProfileRoute = useMemo(() => {
    if (!pathname || !profileUrl) return false;
    return pathname === profileUrl || pathname.startsWith(profileUrl + "/");
  }, [pathname, profileUrl]);

  const hasAccess = useMemo(() => {
    if (isLoading) return false;
    if (!user) return false;

    // Support routes are accessible by any user type
    if (pathname?.startsWith("/support")) {
      return true;
    }

    // Super admin bypasses all role and permission restrictions across all pages
    const isSuperAdmin =
      userRolesList.includes("super_admin") ||
      userRolesList.includes(BASE_ROLES.SUPER_ADMIN);
    if (isSuperAdmin) {
      return true;
    }

    // If user is not approved, they can ONLY access their profile page
    if (!isApproved) {
      return isProfileRoute;
    }

    // Check allowed roles if provided
    if (allowedRoles.length > 0) {
      const roleAllowed = hasRoleAccess(userRolesList, allowedRoles);
      // If the user's roles don't match allowedRoles, but this component requires
      // specific permissions, allow access if the user holds those permissions
      if (!roleAllowed) {
        const hasSpecificPerms =
          requiredPermissions.length > 0 || requiredAnyPermission.length > 0;
        if (!hasSpecificPerms) {
          return false;
        }
      }
    }

    // Check specific permissions if provided
    if (requiredPermissions.length > 0) {
      return requiredPermissions.every(
        ({ feature, action }) =>
          permissionList.includes(`${feature}.${action}`) ||
          permissionList.includes(`${feature}.*`) ||
          permissionList.includes("*"),
      );
    }

    // Check any permission if provided
    if (requiredAnyPermission.length > 0) {
      return requiredAnyPermission.some(
        ({ feature, action }) =>
          permissionList.includes(`${feature}.${action}`) ||
          permissionList.includes(`${feature}.*`) ||
          permissionList.includes("*"),
      );
    }

    // Otherwise check route-based permissions
    return canAccessRoute(pathname, userRolesList);
  }, [
    isLoading,
    user,
    userRolesList,
    pathname,
    allowedRoles,
    requiredPermissions,
    requiredAnyPermission,
    permissionList,
    canAccessRoute,
    isApproved,
    isProfileRoute,
  ]);

  useEffect(() => {
    if (isLoading) return;

    // Reset redirect attempt when pathname changes
    redirectAttempted.current = false;

    // Redirect if no access and not already redirecting
    if (!hasAccess && !redirectAttempted.current) {
      redirectAttempted.current = true;

      if (user) {
        const targetUrl = isApproved
          ? getDashboardUrl(effectiveRole)
          : profileUrl;
        router.replace(targetUrl);
      } else {
        // If not authenticated, go to login
        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set("redirect", pathname);
        router.replace(loginUrl.toString());
      }
    }
  }, [
    isLoading,
    hasAccess,
    user,
    effectiveRole,
    isApproved,
    profileUrl,
    pathname,
    router,
  ]);

  // Show loading while checking permissions
  if (isLoading) {
    return <Loading size="md" text="Verifying permissions..." fullScreen />;
  }

  // Don't render if no access (prevents flash)
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
