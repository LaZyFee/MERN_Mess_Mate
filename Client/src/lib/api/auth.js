"use client";

import apiClient from "@/lib/api/browserApi";

export const authApi = {
  register: (body) => apiClient.post("/users/register", body),
  login: (body) => apiClient.post("/users/login", body),
  logout: () => apiClient.post("/users/logout"),
  refresh: () => apiClient.post("/users/refresh"),
  forgotPassword: (email) => apiClient.post("/users/forgot-password", { email }),
  resetPassword: (token, password) =>
    apiClient.post("/users/reset-password", { token, password }),
  verifyEmail: (token) => apiClient.get(`/users/verify-email/${token}`),
  twoFactorChallenge: (body) => apiClient.post("/users/login/2fa-challenge", body),
  twoFactorLogin: (body) => apiClient.post("/users/login/2fa", body),
  setupTwoFactor: () => apiClient.post("/users/2fa/setup", {}),
  verifyTwoFactor: (code) => apiClient.post("/users/2fa/verify", { code }),
  disableTwoFactor: (body) => apiClient.post("/users/2fa/disable", body),
  changePassword: (body) => apiClient.post("/users/change-password", body),
  getProfile: () => apiClient.get("/users/profile"),
  updateProfile: (body) => apiClient.put("/users/profile", body),
  getSessions: () => apiClient.get("/sessions/users/sessions"),
  uploadProfilePic: (file) => {
    const form = new FormData();
    form.append("image", file);
    return apiClient.request("/users/profile-pic", { method: "POST", body: form, isFormData: true });
  },
  revokeSession: (familyId) => apiClient.delete(`/sessions/users/sessions/${familyId}`),
  revokeAllSessions: (exceptFamilyId) => apiClient.request("/sessions/users/sessions", {
    method: "DELETE",
    body: exceptFamilyId ? { exceptFamilyId } : {},
  }),
};
