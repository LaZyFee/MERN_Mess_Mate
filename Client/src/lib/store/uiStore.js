"use client";

import { create } from "zustand";

/** UI store: theme (mirrors mm_theme cookie for SSR), sheets/drawers. */
export const useUiStore = create((set) => ({
  theme: "light",
  openSheet: null, // id of the open bottom-sheet/drawer, if any

  setTheme: (theme) => set({ theme }),
  open: (id) => set({ openSheet: id }),
  close: () => set({ openSheet: null }),
}));

/** Set mm_theme cookie (the only non-HttpOnly cookie besides mm_csrf). */
export function setThemeCookie(theme) {
  document.cookie = `mm_theme=${theme}; path=/; max-age=31536000; samesite=strict`;
}
