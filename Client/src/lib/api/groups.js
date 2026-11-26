"use client";

import apiClient from "@/lib/api/browserApi";

export const groupsApi = {
  myGroups: () => apiClient.get("/messgroups/my-groups"),
  getGroup: (groupId) => apiClient.get(`/messgroups/${groupId}`),
  createGroup: (body) => apiClient.post("/messgroups/create", body),
  joinRequest: (groupId) => apiClient.post(`/messgroups/join-request/${groupId}`),
  joinByCode: (body) => apiClient.post("/invite/join-by-code", body),
  getInviteCode: (groupId) => apiClient.get(`/invite/codes/${groupId}`),
  createInviteCode: (body) => apiClient.post("/invite/codes", body),
  getGroupCode: (groupId) => apiClient.get(`/messgroups/code/${groupId}`),
  inviteByEmail: (groupId, body) => apiClient.post(`/messgroups/invite/${groupId}`, body),
  getCategories: (groupId) => apiClient.get(`/messgroups/categories/${groupId}`),
  createCategory: (groupId, body) => apiClient.post(`/messgroups/categories/${groupId}`, body),
  updateCategory: (groupId, catId, body) => apiClient.put(`/messgroups/categories/${groupId}/${catId}`, body),
  deleteCategory: (groupId, catId) => apiClient.delete(`/messgroups/categories/${groupId}/${catId}`),
  getDashboard: (groupId) => apiClient.get(`/stats/groups/${groupId}/dashboard`),
  getExtras: (groupId) => apiClient.get(`/messgroups/extras/${groupId}`),
  getMemberships: (groupId, cursor) =>
    apiClient.get(`/memberships/groups/${groupId}/memberships${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  createMembership: (groupId, body) => apiClient.post(`/memberships/groups/${groupId}/memberships`, body),
  updateMembership: (membershipId, body) => apiClient.patch(`/memberships/${membershipId}`, body),
  departMembership: (membershipId, body) => apiClient.post(`/memberships/${membershipId}/depart`, body),
  getMembers: (groupId) => apiClient.get(`/users/groups/${groupId}/members`),
  leaveGroup: (groupId, userId) => apiClient.delete(`/messgroups/remove-member/${groupId}/${userId}`),
  getPolicy: (groupId) => apiClient.get(`/policies/groups/${groupId}/policies`),
  createPolicy: (groupId, body) => apiClient.post(`/policies/groups/${groupId}/policies`, body),
  getRecurring: (groupId) => apiClient.get(`/recurring/groups/${groupId}/recurring`),
  createRecurring: (groupId, body) => apiClient.post(`/recurring/groups/${groupId}/recurring`, body),
  updateRecurring: (ruleId, body) => apiClient.put(`/recurring/${ruleId}`, body),
  generateRecurring: (ruleId, body) => apiClient.post(`/recurring/${ruleId}/generate`, body),
};

export const budgetsApi = {
  list: (groupId, month) => apiClient.get(`/budgets/groups/${groupId}?month=${month}`),
  variance: (groupId, month) => apiClient.get(`/budgets/groups/${groupId}/variance?month=${month}`),
  upsert: (groupId, body) => apiClient.post(`/budgets/groups/${groupId}`, body),
  remove: (groupId, budgetId) => apiClient.delete(`/budgets/groups/${groupId}/${budgetId}`),
};

export const auditApi = {
  groupLog: (groupId, filters = {}) => {
    const params = new URLSearchParams();
    ["action", "actorId", "cursor", "limit"].forEach((key) => {
      if (filters[key]) params.set(key, filters[key]);
    });
    const qs = params.toString();
    return apiClient.get(`/messgroups/audit-log/${groupId}${qs ? `?${qs}` : ""}`);
  },
};
