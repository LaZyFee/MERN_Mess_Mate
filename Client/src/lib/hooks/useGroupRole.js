"use client";

import { useGroupStore } from "@/lib/store/groupStore";

export const ROLE_RANK = { owner: 5, manager: 4, treasurer: 3, auditor: 2, member: 1 };

/**
 * Role helpers for the 5-tier model. UI gating is cosmetic; the server enforces.
 */
export function roleAtLeast(myRole, min) {
  if (!myRole) return false;
  return (ROLE_RANK[myRole] || 0) >= (ROLE_RANK[min] || 99);
}

export function useGroupRole() {
  const myRole = useGroupStore((s) => s.myRole);
  return {
    myRole,
    isOwner: myRole === "owner",
    isManager: roleAtLeast(myRole, "manager"),
    isTreasurer: roleAtLeast(myRole, "treasurer"),
    isAuditor: roleAtLeast(myRole, "auditor"),
    can: (min) => roleAtLeast(myRole, min),
  };
}

/** Server-side / generic check without hooks. */
export function requireRole(myRole, roles = []) {
  if (!myRole) return false;
  return roles.some((r) => roleAtLeast(myRole, r));
}
