"use client";

import apiClient, { idempotencyKey } from "@/lib/api/browserApi";

export const statementsApi = {
  list: (groupId) => apiClient.get(`/statements/groups/${groupId}/statements`),
  byMonth: (groupId, month) => apiClient.get(`/statements/groups/${groupId}/statements/${month}`),
  byId: (groupId, statementId) => apiClient.get(`/statements/groups/${groupId}/statements/id/${statementId}`),
  finalize: (groupId, month, payload = {}) =>
    apiClient.request(`/statements/groups/${groupId}/statements/${month}/finalize`, {
      method: "POST",
      body: payload,
      headers: { "Idempotency-Key": idempotencyKey() },
    }),
};

export const periodsApi = {
  list: (groupId) => apiClient.get(`/periods/groups/${groupId}/periods`),
  get: (groupId, month) => apiClient.get(`/periods/groups/${groupId}/periods/${month}`),
  preview: (groupId, month) => apiClient.get(`/periods/groups/${groupId}/periods/${month}/preview`),
  checklist: (groupId, month) => apiClient.get(`/periods/groups/${groupId}/periods/${month}/checklist`),
  beginReview: (groupId, month) =>
    apiClient.request(`/periods/groups/${groupId}/periods/${month}/begin-review`, { method: "POST", body: {} }),
  returnToOpen: (groupId, month, reason) =>
    apiClient.request(`/periods/groups/${groupId}/periods/${month}/return-to-open`, {
      method: "POST",
      body: { reason },
    }),
};
