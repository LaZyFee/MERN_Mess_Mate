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

// Platform-admin transports live in lib/api/admin.js (adminApi / adminSupportApi).
