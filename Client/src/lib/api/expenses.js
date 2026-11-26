"use client";

import apiClient, { idempotencyKey } from "@/lib/api/browserApi";

function queryString(filters = {}, keys = []) {
  const params = new URLSearchParams();
  keys.forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

const withKey = () => ({ headers: { "Idempotency-Key": idempotencyKey() } });

export const expensesApi = {
  previewImport: (groupId, { file, rows }) => {
    if (file) {
      const form = new FormData();
      form.append("file", file);
      return apiClient.request(`/expenses/groups/${groupId}/expenses/import/preview`, {
        method: "POST",
        body: form,
        isFormData: true,
      });
    }
    return apiClient.request(`/expenses/groups/${groupId}/expenses/import/preview`, {
      method: "POST",
      body: { rows },
    });
  },
  applyImport: (groupId, { file, rows, previewHash }) => {
    if (file) {
      const form = new FormData();
      form.append("file", file);
      return apiClient.request(`/expenses/groups/${groupId}/expenses/import/apply`, {
        method: "POST",
        body: form,
        isFormData: true,
        headers: { "Idempotency-Key": idempotencyKey() },
      });
    }
    return apiClient.request(`/expenses/groups/${groupId}/expenses/import/apply`, {
      method: "POST",
      body: { rows, previewHash },
      headers: { "Idempotency-Key": idempotencyKey() },
    });
  },
  list: (groupId, filters = {}) =>
    apiClient.get(
      `/expenses/groups/${groupId}/expenses${queryString(filters, [
        "status",
        "costPeriod",
        "payable",
        "cursor",
        "limit",
      ])}`,
    ),

  createDraft: (groupId, payload) =>
    apiClient.request(`/expenses/groups/${groupId}/expenses`, {
      method: "POST",
      body: payload,
      ...withKey(),
    }),

  submit: (groupId, expenseId) =>
    apiClient.request(`/expenses/groups/${groupId}/expenses/${expenseId}/submit`, {
      method: "POST",
      body: {},
    }),

  approve: (groupId, expenseId, reason) =>
    apiClient.request(`/expenses/groups/${groupId}/expenses/${expenseId}/approve`, {
      method: "POST",
      body: { reason: reason || undefined },
      ...withKey(),
    }),

  reject: (groupId, expenseId, reason) =>
    apiClient.request(`/expenses/groups/${groupId}/expenses/${expenseId}/reject`, {
      method: "POST",
      body: { reason },
    }),

  reverse: (groupId, expenseId, reason) =>
    apiClient.request(`/expenses/groups/${groupId}/expenses/${expenseId}/reverse`, {
      method: "POST",
      body: { reason },
      ...withKey(),
    }),

  /** Legacy simple CRUD (advanced collapse) */
  legacyCreate: (groupId, payload) =>
    apiClient.request(`/expenses/${groupId}`, { method: "POST", body: payload }),
  legacyUpdate: (entryId, payload) =>
    apiClient.request(`/expenses/entry/${entryId}`, { method: "PUT", body: payload }),
  legacyDelete: (entryId) =>
    apiClient.request(`/expenses/entry/${entryId}`, { method: "DELETE" }),
};

export const attachmentsApi = {
  upload: (groupId, file) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.request(`/attachments/groups/${groupId}/upload`, {
      method: "POST",
      body: form,
      isFormData: true,
    });
  },
};

export const assetsApi = {
  list: (groupId, cursor) =>
    apiClient.get(`/assets/groups/${groupId}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  refund: (groupId, assetId, body) =>
    apiClient.request(`/assets/groups/${groupId}/${assetId}/refund`, { method: "POST", body }),
};
