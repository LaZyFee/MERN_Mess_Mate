"use client";
import React from "react";
import { usePermission } from "@/context/PermissionContext";

/**
 * A component that renders or disables its children according to permissions.
 *
 * Mode:
 * - "hide" (default): hides the children if not allowed, rendering fallback instead.
 * - "disable": clones children and passes disabled props (disabled: true, custom styles).
 *
 * Props for permission checking:
 * - feature & action: e.g. feature="vehicles" action="edit"
 * - permission: string ('vehicles.edit') or array of strings (['vehicles.edit', 'vehicles.create'])
 * - requiredPermissions: array of { feature, action }
 * - requiredAnyPermission: array of { feature, action }
 */
export default function ProtectedComponent({
  feature,
  action = "view",
  permission,
  requiredPermissions = [],
  requiredAnyPermission = [],
  mode = "hide", // "hide" or "disable"
  fallback = null,
  showLoading = false,
  children,
}) {
  const { can, canAll, canAny, isLoading } = usePermission();

  if (isLoading) {
    if (showLoading) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          <svg
            className="animate-spin h-3.5 w-3.5 text-current"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Checking...
        </span>
      );
    }
    return null;
  }

  const normalizePermission = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      const parts = value.split(".");
      if (parts.length > 1) {
        const action = parts.pop();
        const feature = parts.join(".");
        return { feature, action };
      }
      return { feature: value, action: "view" };
    }
    if (typeof value === "object" && value.feature) {
      return { feature: value.feature, action: value.action || "view" };
    }
    return null;
  };

  const isAllowedFromPermissionProp = (() => {
    if (permission == null) return null;

    const perms = Array.isArray(permission) ? permission : [permission];
    if (perms.length === 0) return false;

    return perms.every((perm) => {
      const normalized = normalizePermission(perm);
      return normalized ? can(normalized.feature, normalized.action) : false;
    });
  })();

  const isAllowed = (() => {
    if (isAllowedFromPermissionProp !== null) {
      return isAllowedFromPermissionProp;
    }
    if (requiredAnyPermission.length > 0) {
      return canAny(requiredAnyPermission);
    }
    if (requiredPermissions.length > 0) {
      return canAll(requiredPermissions);
    }
    if (feature) {
      return can(feature, action);
    }
    return true;
  })();

  // Support function-as-child pattern
  if (typeof children === "function") {
    return children(isAllowed);
  }

  if (isAllowed) {
    return children;
  }

  if (mode === "disable") {
    const disabledChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      const existingClassName = child.props.className || "";
      const newClassName = [existingClassName, "opacity-50 cursor-not-allowed"]
        .filter(Boolean)
        .join(" ");

      return React.cloneElement(child, {
        disabled: true,
        className: newClassName,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          return undefined;
        },
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
          }
          if (typeof child.props.onKeyDown === "function") {
            child.props.onKeyDown(e);
          }
        },
      });
    });

    return disabledChildren;
  }

  return fallback;
}
