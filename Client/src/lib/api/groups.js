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
  getMemberships: (groupId) => apiClient.get(`/memberships/groups/${groupId}/memberships`),
  createMembership: (groupId, body) => apiClient.post(`/memberships/groups/${groupId}/memberships`, body),
  updateMembership: (membershipId, body) => apiClient.patch(`/memberships/${membershipId}`, body),
  departMembership: (membershipId, body) => apiClient.post(`/memberships/${membershipId}/depart`, body),
  getMembers: (groupId) => apiClient.get(`/users/groups/${groupId}/members`),
  getPolicy: (groupId) => apiClient.get(`/policies/groups/${groupId}/policies`),
  createPolicy: (groupId, body) => apiClient.post(`/policies/groups/${groupId}/policies`, body),
  getRecurring: (groupId) => apiClient.get(`/recurring/groups/${groupId}/recurring`),
  createRecurring: (groupId, body) => apiClient.post(`/recurring/groups/${groupId}/recurring`, body),
  updateRecurring: (ruleId, body) => apiClient.put(`/recurring/${ruleId}`, body),
  generateRecurring: (ruleId, body) => apiClient.post(`/recurring/${ruleId}/generate`, body),
};
