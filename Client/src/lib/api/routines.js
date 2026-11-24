"use client";

import apiClient from "@/lib/api/browserApi";

const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : "";
};

const base = (groupId) => `/routines/groups/${groupId}`;

export const routinesApi = {
  boardToday: (groupId) => apiClient.get(`${base(groupId)}/board/today`),
  duties: (groupId, filters = {}) => apiClient.get(`${base(groupId)}/duties${qs(filters)}`),
  markDutyDone: (groupId, assignmentId) =>
    apiClient.request(`${base(groupId)}/duties/${assignmentId}/done`, { method: "POST", body: {} }),
  dutyFairness: (groupId) => apiClient.get(`${base(groupId)}/duties/fairness`),
  swaps: (groupId, payload) => apiClient.request(`${base(groupId)}/swaps`, { method: "POST", body: payload }),
  respondSwap: (groupId, swapId, accept) =>
    apiClient.request(`${base(groupId)}/swaps/${swapId}/respond`, { method: "POST", body: { accept } }),
  menu: (groupId, filters = {}) => apiClient.get(`${base(groupId)}/menu${qs(filters)}`),
  setMenu: (groupId, payload) => apiClient.request(`${base(groupId)}/menu`, { method: "POST", body: payload }),
  bazarSuggestions: (groupId, weekStart) =>
    apiClient.get(`${base(groupId)}/menu/bazar-suggestions${qs({ weekStart })}`),
  notes: (groupId, filters = {}) => apiClient.get(`${base(groupId)}/notes${qs(filters)}`),
  createNote: (groupId, payload) => apiClient.request(`${base(groupId)}/notes`, { method: "POST", body: payload }),
  updateNote: (groupId, noteId, payload) =>
    apiClient.request(`${base(groupId)}/notes/${noteId}`, { method: "PATCH", body: payload }),
  deleteNote: (groupId, noteId) =>
    apiClient.request(`${base(groupId)}/notes/${noteId}`, { method: "DELETE" }),
  ackNote: (groupId, noteId) =>
    apiClient.request(`${base(groupId)}/notes/${noteId}/ack`, { method: "POST", body: {} }),
  taskAction: (groupId, noteId, taskId, action) =>
    apiClient.request(`${base(groupId)}/notes/${noteId}/tasks/${taskId}/${action}`, {
      method: "POST",
      body: {},
    }),
  rosters: (groupId) => apiClient.get(`${base(groupId)}/rosters`),
  roster: (groupId, rosterId) => apiClient.get(`${base(groupId)}/rosters/${rosterId}`),
  createRoster: (groupId, payload) => apiClient.request(`${base(groupId)}/rosters`, { method: "POST", body: payload }),
  updateRoster: (groupId, rosterId, payload) =>
    apiClient.request(`${base(groupId)}/rosters/${rosterId}`, { method: "PATCH", body: payload }),
  publishRoster: (groupId, rosterId) =>
    apiClient.request(`${base(groupId)}/rosters/${rosterId}/publish`, { method: "POST", body: {} }),
  extendRoster: (groupId, rosterId) =>
    apiClient.request(`${base(groupId)}/rosters/${rosterId}/extend-horizon`, { method: "POST", body: {} }),
  emergencyBroadcast: (groupId, payload) =>
    apiClient.request(`${base(groupId)}/emergency-broadcast`, { method: "POST", body: payload }),
};

export const shoppingApi = {
  list: (groupId) => apiClient.get(`/shopping-list/groups/${groupId}`),
  addItem: (groupId, payload) => apiClient.request(`/shopping-list/groups/${groupId}`, { method: "POST", body: payload }),
  updateItem: (groupId, itemId, payload) =>
    apiClient.request(`/shopping-list/groups/${groupId}/${itemId}`, { method: "PATCH", body: payload }),
  deleteItem: (groupId, itemId) =>
    apiClient.request(`/shopping-list/groups/${groupId}/${itemId}`, { method: "DELETE" }),
  toExpense: (groupId, payload) =>
    apiClient.request(`/shopping-list/groups/${groupId}/to-expense`, { method: "POST", body: payload }),
  history: (groupId) => apiClient.get(`/shopping-list/groups/${groupId}/history`),
};

export const inventoryApi = {
  list: (groupId) => apiClient.get(`/kitchen-inventory/groups/${groupId}`),
  addItem: (groupId, payload) => apiClient.request(`/kitchen-inventory/groups/${groupId}`, { method: "POST", body: payload }),
  updateItem: (groupId, itemId, payload) =>
    apiClient.request(`/kitchen-inventory/groups/${groupId}/${itemId}`, { method: "PATCH", body: payload }),
  deleteItem: (groupId, itemId) =>
    apiClient.request(`/kitchen-inventory/groups/${groupId}/${itemId}`, { method: "DELETE" }),
  refill: (groupId, itemId, payload) =>
    apiClient.request(`/kitchen-inventory/groups/${groupId}/${itemId}/refill`, { method: "POST", body: payload }),
};

export const pollsApi = {
  list: (groupId) => apiClient.get(`/polls/groups/${groupId}`),
  create: (groupId, payload) => apiClient.request(`/polls/groups/${groupId}`, { method: "POST", body: payload }),
  vote: (groupId, pollId, optionIndex) =>
    apiClient.request(`/polls/groups/${groupId}/${pollId}/vote`, { method: "POST", body: { optionIndex } }),
  close: (groupId, pollId) => apiClient.request(`/polls/groups/${groupId}/${pollId}/close`, { method: "POST", body: {} }),
  results: (groupId, pollId) => apiClient.get(`/polls/groups/${groupId}/${pollId}/results`),
};
