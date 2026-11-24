/**
 * Layer 1 — Server Actions: statements & periods domain.
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getStatements(groupId) {
  const data = await serverApi.get(`/statements/groups/${groupId}/statements`);
  return data?.statements || data || [];
}

export async function getStatementVersions(groupId, month) {
  const data = await serverApi.get(`/statements/groups/${groupId}/statements/${month}`);
  return Array.isArray(data?.statements) ? data.statements : Array.isArray(data) ? data : [];
}

export async function getPeriods(groupId) {
  const data = await serverApi.get(`/periods/groups/${groupId}/periods`);
  return data?.periods || data || [];
}

export async function getPeriod(groupId, month) {
  const data = await serverApi.get(`/periods/groups/${groupId}/periods/${month}`);
  return data?.period || null;
}

export async function getCloseChecklist(groupId, month) {
  try {
    const data = await serverApi.get(`/periods/groups/${groupId}/periods/${month}/checklist`);
    return data;
  } catch (error) {
    if (error?.status === 403 || error?.status === 404) return null;
    throw error;
  }
}

export async function getStatementsPageData(groupId, closeMonth) {
  const [statements, periods] = await Promise.all([
    getStatements(groupId),
    getPeriods(groupId).catch(() => []),
  ]);
  const latestMonth = statements?.[0]?.month || closeMonth;
  const [versions, period, checklist] = latestMonth
    ? await Promise.all([
      getStatementVersions(groupId, latestMonth).catch(() => []),
      getPeriod(groupId, latestMonth).catch(() => null),
      getCloseChecklist(groupId, latestMonth),
    ])
    : [[], null, null];
  return { statements, periods, latestMonth, versions, period, checklist };
}
