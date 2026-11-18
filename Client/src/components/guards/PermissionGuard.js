"use client";

import { usePermissions } from "@/hooks/usePermissions";
import Loading from "@/components/shared/feedback/Loading";

/**
 * Component that renders children only if user has required permissions
 *
 * @example
 * // Single permission
 * <PermissionGuard feature="vehicles" action="create">
 *   <CreateVehicleButton />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard
 *   requiredPermissions={[
 *     { feature: "vehicles", action: "edit" },
 *     { feature: "vehicles", action: "view" }
 *   ]}
 * >
 *   <EditVehicleForm />
 * </PermissionGuard>
 *
 * @example
 * // Any of the permissions
 * <PermissionGuard
 *   requiredAnyPermission={[
 *     { feature: "vehicles", action: "edit" },
 *     { feature: "vehicles", action: "manage" }
 *   ]}
 * >
 *   <AdminControls />
 * </PermissionGuard>
 */
export default function PermissionGuard({
  feature,
  action = "view",
  requiredPermissions = [],
  requiredAnyPermission = [],
  children,
  fallback = null,
  showLoading = true,
  // New API: single permission string or array of permission strings (e.g. 'vehicles.view')
  permission = null,
}) {
  const { can, canAll, canAny, isLoading } = usePermissions();

  // Build requirements from props
  let requirements = requiredPermissions;
  let checkMethod = canAll;

  if (feature) {
    requirements = [{ feature, action }];
    checkMethod = can;
  } else if (requiredAnyPermission.length > 0) {
    requirements = requiredAnyPermission;
    checkMethod = canAny;
  } else if (requiredPermissions.length > 0) {
    requirements = requiredPermissions;
    checkMethod = canAll;
  }

  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loading size="sm" text="Checking permissions..." />
      </div>
    );
  }

  // New API handling: permission as string or array
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];

    // Convert 'feature.action' strings into calls to can(feature, action)
    const hasAll = perms.every((p) => {
      const parts = String(p).split(".");
      if (parts.length === 0) return false;
      let feat, act;
      if (parts.length > 1) {
        act = parts.pop();
        feat = parts.join(".");
      } else {
        feat = parts[0];
        act = "view";
      }
      return can(feat, act);
    });

    if (!hasAll) return fallback;
    return children;
  }

  if (!checkMethod(requirements)) {
    return fallback;
  }

  return children;
}
