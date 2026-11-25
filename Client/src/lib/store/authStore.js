"use client";

import { create } from "zustand";

/**
 * Auth store — holds ONLY non-sensitive profile data hydrated from the server.
 * No tokens, no persist. Tokens live in HttpOnly cookies (mm_at / refreshToken).
 */
export const useAuthStore = create((set) => ({
  user: null,
  roles: [],
  isAdmin: false,
  hydrated: false,

  hydrate: ({ user, roles = [], isAdmin = false }) =>
    set({ user, roles, isAdmin, hydrated: true }),

  setUser: (user) => set({ user }),

  clear: () => set({ user: null, roles: [], isAdmin: false, hydrated: false }),
}));

export const useUser = () => useAuthStore((s) => s.user);
