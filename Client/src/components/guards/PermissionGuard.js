"use client";

import { useGroupRole } from "@/lib/hooks/useGroupRole";
import Loading from "@/components/shared/Loading";

/**
 * Component that renders children only if user has the required 5-tier role.
 * Roles: owner > manager > treasurer > auditor > member.
 * UI gating is cosmetic; the server enforces authorisation.
 *
 * @example
 * <PermissionGuard roles={["owner", "manager"]}>
 *  <CreateGroupButton />
 * </PermissionGuard>
 *
 * @example
 * <PermissionGuard roles={["treasurer"]} fallback={<span>Treasurer only</span>}>
 *  <ApproveExpenseButton />
 * </PermissionGuard>
 */
export default function PermissionGuard({
 roles = [],
 children,
 fallback = null,
 showLoading = true,
}) {
  const { myRole, isLoading } = useGroupRole();

  const allowed =
    roles.length === 0 ||
    roles.some(
      (r) =>
        myRole === r ||
        (r === "manager" && myRole === "owner") ||
        (r === "treasurer" && (myRole === "owner" || myRole === "manager")) ||
        (r === "auditor" && (myRole === "owner" || myRole === "manager" || myRole === "treasurer")) ||
        (r === "member" && true),
    );

  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loading size="sm" text="Checking access…" />
      </div>
    );
  }

  if (!allowed) return fallback;
  return children;
}
