"use client";

import apiClient, { idempotencyKey } from "@/lib/api/browserApi";

function queryString(filters = {}, keys = []) {
  const params = new URLSearchParams();
  keys.forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

const withKey = () => ({ headers: { "Idempotency-Key": idempotencyKey() } });

export const moneyApi = {
  list: (groupId, filters = {}) =>
    apiClient.get(
      `/money/groups/${groupId}/money${queryString(filters, ["status", "kind", "cursor", "limit"])}`,
    ),

  create: (groupId, payload) =>
    apiClient.request(`/money/groups/${groupId}/money`, {
      method: "POST",
      body: payload,
      ...withKey(),
    }),

  confirm: (groupId, txId) =>
    apiClient.request(`/money/groups/${groupId}/money/${txId}/confirm`, {
      method: "POST",
      body: {},
      ...withKey(),
    }),

  reject: (groupId, txId, reason) =>
    apiClient.request(`/money/groups/${groupId}/money/${txId}/reject`, {
      method: "POST",
      body: { reason },
    }),

  reverse: (groupId, txId, reason) =>
    apiClient.request(`/money/groups/${groupId}/money/${txId}/reverse`, {
      method: "POST",
      body: { reason },
      ...withKey(),
    }),

  memberBalance: (groupId, membershipId) =>
    apiClient.get(`/money/groups/${groupId}/memberships/${membershipId}/balance`),

  funds: (groupId) => apiClient.get(`/money/groups/${groupId}/funds`),

  createFund: (groupId, payload) =>
    apiClient.request(`/money/groups/${groupId}/funds`, { method: "POST", body: payload }),

  changeCustodian: (groupId, fundId, newCustodianId) =>
    apiClient.request(`/money/groups/${groupId}/funds/${fundId}/custodian`, {
      method: "POST",
      body: { newCustodianId },
    }),
};
