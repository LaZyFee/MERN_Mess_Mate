/** Server-side role gate for layouts/server components. */
export function requireRole(session, roles = []) {
  const role = session?.myRole || session?.role;
  if (!role || roles.length === 0) return true;
  const rank = { owner: 5, manager: 4, treasurer: 3, auditor: 2, member: 1 };
  const r = rank[role] || 0;
  return roles.some((need) => r >= (rank[need] ?? 99));
}
