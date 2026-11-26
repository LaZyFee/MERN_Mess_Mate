"use client";

import apiClient from "@/lib/api/browserApi";

export const notificationsApi = {
  outbox: (groupId, filters = {}) => {
    const params = new URLSearchParams();
    ["statementId", "state", "cursor", "limit"].forEach((key) => {
      if (filters[key]) params.set(key, filters[key]);
    });
    const qs = params.toString();
    return apiClient.get(`/notifications/groups/${groupId}/notifications${qs ? `?${qs}` : ""}`);
  },
  resend: (groupId, messageId) =>
    apiClient.request(`/notifications/groups/${groupId}/notifications/${messageId}/resend`, {
      method: "POST",
      body: {},
    }),
  manualShare: (groupId, statementId) =>
    apiClient.request(`/notifications/groups/${groupId}/notifications/manual-share`, {
      method: "POST",
      body: { statementId: statementId || undefined },
    }),
  setWhatsappConsent: (whatsappConsent) =>
    apiClient.put("/notifications/whatsapp/consent", { whatsappConsent }),
};

export const disputesApi = {
  list: (groupId, status, cursor) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();
    return apiClient.get(`/disputes/groups/${groupId}/disputes${qs ? `?${qs}` : ""}`);
  },
  open: (groupId, payload) =>
    apiClient.request(`/disputes/groups/${groupId}/disputes`, { method: "POST", body: payload }),
  respond: (groupId, disputeId, text) =>
    apiClient.request(`/disputes/groups/${groupId}/disputes/${disputeId}/respond`, {
      method: "POST",
      body: { text },
    }),
  resolve: (groupId, disputeId, payload) =>
    apiClient.request(`/disputes/groups/${groupId}/disputes/${disputeId}/resolve`, {
      method: "POST",
      body: payload,
    }),
};

export const reconciliationApi = {
  list: (groupId) => apiClient.get(`/reconciliation/groups/${groupId}/reconciliations`),
  equation: (groupId) => apiClient.get(`/reconciliation/groups/${groupId}/reconciliations/equation`),
  suggestions: (groupId, month) =>
    apiClient.get(`/reconciliation/groups/${groupId}/reconciliations/suggestions${month ? `?month=${month}` : ""}`),
  create: (groupId, payload) =>
    apiClient.request(`/reconciliation/groups/${groupId}/reconciliations`, { method: "POST", body: payload }),
  resolve: (groupId, recId, payload) =>
    apiClient.request(`/reconciliation/groups/${groupId}/reconciliations/${recId}/resolve`, {
      method: "POST",
      body: payload,
    }),
};
