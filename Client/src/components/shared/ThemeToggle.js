"use client";

import { LuSun, LuMoon } from "react-icons/lu";
import { useState } from "react";
import { useUiStore, setThemeCookie } from "@/lib/store/uiStore";

/**
 * Light/dark toggle. Theme is mirrored in the mm_theme cookie so SSR
 * renders the right theme without flash (see app/layout.jsx).
 */
export default function ThemeToggle({ className = "" } = {}) {
 const theme = useUiStore((s) => s.theme);
 const setTheme = useUiStore((s) => s.setTheme);
 const [open, setOpen] = useState(false);

 const toggle = () => {
  const next = theme === "dark" ? "light" : "dark";
  setTheme(next);
  setThemeCookie(next);
  document.documentElement.setAttribute("data-theme", next);
 };

 return (
  <button
   type="button"
   onClick={toggle}
   aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
   className={`flex h-11 w-11 items-center justify-center rounded-full border border-(--bd2) bg-(--bgs) text-(--ts) transition-[var(--transition)] hover:bg-(--bgm) hover:text-(--tp) active:scale-95 cursor-pointer ${className}`}
  >
   {theme === "dark" ? <LuSun size={18} /> : <LuMoon size={18} />}
  </button>
 );
}
