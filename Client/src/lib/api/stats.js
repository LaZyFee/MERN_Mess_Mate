"use client";

import apiClient from "@/lib/api/browserApi";

export const statsApi = {
  get: (groupId, filters = {}) => {
    const params = new URLSearchParams();
    ["granularity", "year", "month", "userId"].forEach((key) => {
      if (filters[key]) params.set(key, filters[key]);
    });
    const qs = params.toString();
    return apiClient.get(`/stats/${groupId}${qs ? `?${qs}` : ""}`);
  },
  dashboard: (groupId, month) =>
    apiClient.get(`/stats/groups/${groupId}/dashboard${month ? `?month=${month}` : ""}`),
};
