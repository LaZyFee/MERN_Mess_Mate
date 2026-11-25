"use client";

/**
 * Browser transport for the hidden platform-admin control plane.
 * Every call goes through the same-origin BFF; the BFF adds the optional
 * X-Admin-Key and the backend answers 404 to non-admins (route stays hidden).
 */
import apiClient from "@/lib/api/browserApi";

function qs(filters = {}) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const out = search.toString();
  return out ? `?${out}` : "";
}

export const adminApi = {
  overview: () => apiClient.get("/admin/overview"),
  traffic: (days = 30) => apiClient.get(`/admin/traffic${qs({ days })}`),
  audit: (filters = {}) => apiClient.get(`/admin/audit${qs(filters)}`),
  users: (filters = {}) => apiClient.get(`/admin/users${qs(filters)}`),
  user: (userId) => apiClient.get(`/admin/users/${userId}`),
  updateUser: (userId, payload) =>
    apiClient.request(`/admin/users/${userId}`, { method: "PATCH", body: payload }),
  groups: (filters = {}) => apiClient.get(`/admin/groups${qs(filters)}`),
  group: (groupId) => apiClient.get(`/admin/groups/${groupId}`),
  archiveGroup: (groupId, reason) =>
    apiClient.request(`/admin/groups/${groupId}`, { method: "DELETE", body: { reason } }),
  jobs: () => apiClient.get("/admin/jobs"),
};

export const adminSupportApi = {
  tickets: (filters = {}) => apiClient.get(`/admin/support/tickets${qs(filters)}`),
  ticket: (ticketId) => apiClient.get(`/admin/support/tickets/${ticketId}`),
  reply: (ticketId, payload) => apiClient.post(`/admin/support/tickets/${ticketId}/reply`, payload),
  internalNote: (ticketId, payload) =>
    apiClient.post(`/admin/support/tickets/${ticketId}/internal-note`, payload),
  assign: (ticketId, payload) => apiClient.post(`/admin/support/tickets/${ticketId}/assign`, payload),
  patch: (ticketId, payload) =>
    apiClient.request(`/admin/support/tickets/${ticketId}`, { method: "PATCH", body: payload }),
  action: (ticketId, action, payload = {}) =>
    apiClient.post(`/admin/support/tickets/${ticketId}/${action}`, payload),
  stats: () => apiClient.get("/admin/support/stats"),
  cannedReplies: () => apiClient.get("/admin/support/canned-replies"),
};
