"use client";

import apiClient from "@/lib/api/browserApi";

export const mealsApi = {
  upsert: (groupId, body) => apiClient.post(`/meals/${groupId}`, body),
  getMonth: (groupId, month) =>
    apiClient.get(`/meals/${groupId}?month=${encodeURIComponent(month)}`),
  createGuest: (groupId, body) => apiClient.post(`/meals/${groupId}/guests`, body),
  getGuests: (groupId, from, to, cursor) => {
    const params = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...(cursor ? { cursor, limit: "50" } : {}) });
    return apiClient.get(`/meals/${groupId}/guests?${params.toString()}`);
  },
  previewBulk: (groupId, entries) =>
    apiClient.post(`/meals/${groupId}/bulk/preview`, { entries }),
  applyBulk: (groupId, entries) =>
    apiClient.post(`/meals/${groupId}/bulk/apply`, { entries }),
  previewAbsence: (groupId, body) =>
    apiClient.post(`/meals/${groupId}/absence/preview`, body),
  applyAbsence: (groupId, body) =>
    apiClient.post(`/meals/${groupId}/absence/apply`, body),
  updateEntry: (entryId, slots) =>
    apiClient.put(`/meals/entry/${entryId}`, { slots }),
  deleteEntry: (entryId) =>
    apiClient.delete(`/meals/entry/${entryId}`),
};
