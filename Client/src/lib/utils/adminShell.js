/**
 * Admin chrome preference (collapsed nav) — non-sensitive UI-only flag kept in a
 * plain cookie so SSR renders the same shell without a flash and without
 * touching localStorage (§8.2).
 */
export const ADMIN_SHELL_COOKIE = "mm_admin_shell";

/** Server helper: read the collapsed flag from the request cookie jar. */
export function readShellCollapsed(cookieJar) {
  return cookieJar?.get?.(ADMIN_SHELL_COOKIE)?.value === "1";
}

/** Browser helper: set/clear the collapsed flag. */
export function setShellCollapsed(collapsed) {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_SHELL_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=strict`;
}
