"use client";

import { useGroupRole } from "@/lib/hooks/useGroupRole";

/**
 * Client role gate. fallback: "hide" (default, render nothing) | "404" | message node.
 */
export default function Protected({ roles = [], fallback = "hide", children }) {
  const { myRole } = useGroupRole();
  const allowed = roles.length === 0 || roles.some((r) => myRole === r || (r === "manager" && myRole === "owner") || (r === "treasurer" && (myRole === "owner" || myRole === "manager")));

  if (allowed) return children;
  if (fallback === "404") throw new Error("Not found");
  if (typeof fallback === "string" && fallback === "hide") return null;
  return fallback;
}
