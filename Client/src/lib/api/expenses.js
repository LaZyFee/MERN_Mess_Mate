"use client";

import apiClient from "@/lib/api/browserApi";

export const expensesApi = {
  list: (groupId, filters = {}) => {
    const params = new URLSearchParams();
    ["status", "costPeriod", "payable", "cursor", "limit"].forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        params.set(key, String(filters[key]));
      }
    });
    const query = params.toString();
    return apiClient.get(
      `/expenses/groups/${groupId}/expenses${query ? `?${query}` : ""}`,
    );
  },
};
