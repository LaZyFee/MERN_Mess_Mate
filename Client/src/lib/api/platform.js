"use client";

import apiClient from "@/lib/api/browserApi";

const base = "/inbox";

export const inboxApi = {
  list: (filters = {}) => {
    const search = new URLSearchParams();
    if (filters.unread) search.set("unread", "1");
    if (filters.cursor) search.set("cursor", filters.cursor);
    if (filters.limit) search.set("limit", String(filters.limit));
    const qs = search.toString();
    return apiClient.get(`${base}${qs ? `?${qs}` : ""}`);
  },
  unreadCount: () => apiClient.get(`${base}/unread-count`),
  markRead: (payload) => apiClient.request(`${base}/read`, { method: "POST", body: payload }),
  preferences: () => apiClient.get(`${base}/preferences`),
  savePreferences: (payload) => apiClient.request(`${base}/preferences`, { method: "PUT", body: payload }),
};

export const supportApi = {
  listTickets: (filters = {}) => {
    const search = new URLSearchParams();
    if (filters.status) search.set("status", filters.status);
    if (filters.cursor) search.set("cursor", filters.cursor);
    const qs = search.toString();
    return apiClient.get(`/support/tickets${qs ? `?${qs}` : ""}`);
  },
  createTicket: (payload) => apiClient.post("/support/tickets", payload),
  ticket: (ticketId) => apiClient.get(`/support/tickets/${ticketId}`),
  addMessage: (ticketId, payload) => apiClient.post(`/support/tickets/${ticketId}/messages`, payload),
  resolve: (ticketId, payload = {}) => apiClient.post(`/support/tickets/${ticketId}/resolve`, payload),
  close: (ticketId, payload = {}) => apiClient.post(`/support/tickets/${ticketId}/close`, payload),
  reopen: (ticketId, payload = {}) => apiClient.post(`/support/tickets/${ticketId}/reopen`, payload),
  rate: (ticketId, payload) => apiClient.post(`/support/tickets/${ticketId}/rate`, payload),
  publicAction: (token) => apiClient.post(`/support/actions/${token}`, {}),
  appeal: (payload) => apiClient.post("/support/appeal", payload),
};

export const supportAdminApi = {
  tickets: (filters = {}) => {
    const search = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
    });
    const qs = search.toString();
    return apiClient.get(`/admin/support/tickets${qs ? `?${qs}` : ""}`);
  },
  ticket: (ticketId) => apiClient.get(`/admin/support/tickets/${ticketId}`),
  reply: (ticketId, payload) => apiClient.post(`/admin/support/tickets/${ticketId}/reply`, payload),
  internalNote: (ticketId, payload) => apiClient.post(`/admin/support/tickets/${ticketId}/internal-note`, payload),
  assign: (ticketId, payload) => apiClient.post(`/admin/support/tickets/${ticketId}/assign`, payload),
  patch: (ticketId, payload) => apiClient.request(`/admin/support/tickets/${ticketId}`, { method: "PATCH", body: payload }),
  action: (ticketId, action, payload = {}) => apiClient.post(`/admin/support/tickets/${ticketId}/${action}`, payload),
  redact: (ticketId, messageId, payload) =>
    apiClient.post(`/admin/support/tickets/${ticketId}/messages/${messageId}/redact`, payload),
  stats: () => apiClient.get("/admin/support/stats"),
  cannedReplies: () => apiClient.get("/admin/support/canned-replies"),
  createCannedReply: (payload) => apiClient.post("/admin/support/canned-replies", payload),
  updateCannedReply: (replyId, payload) => apiClient.put(`/admin/support/canned-replies/${replyId}`, payload),
  deleteCannedReply: (replyId) => apiClient.delete(`/admin/support/canned-replies/${replyId}`),
};

export const adminApi = {
  overview: () => apiClient.get("/admin/overview"),
  traffic: (params = "") => apiClient.get(`/admin/traffic${params}`),
  audit: (params = "") => apiClient.get(`/admin/audit${params}`),
  users: (params = "") => apiClient.get(`/admin/users${params}`),
  user: (userId) => apiClient.get(`/admin/users/${userId}`),
  updateUser: (userId, payload) => apiClient.request(`/admin/users/${userId}`, { method: "PATCH", body: payload }),
  groups: (params = "") => apiClient.get(`/admin/groups${params}`),
  group: (groupId) => apiClient.get(`/admin/groups/${groupId}`),
  archiveGroup: (groupId) => apiClient.delete(`/admin/groups/${groupId}`),
  jobs: () => apiClient.get("/admin/jobs"),
};
