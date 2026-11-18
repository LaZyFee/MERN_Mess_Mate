"use client";

import { useTheme } from "@/context/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";
import { useState } from "react";

export default function ThemeToggle({
  className = "",
  scrolled = false,
  topbar = false,
} = {}) {
  const { dark, themeMode, setThemeMode, mounted } = useTheme();
  const [hovered, setHovered] = useState(false);

  if (!mounted) {
    return (
      <div
        className={`w-10 h-10 rounded-full border border-slate-200 dark:border-white/20 bg-slate-100 dark:bg-black/20 ${className}`}
      />
    );
  }

  // Adapt button colors depending on scrolled state & theme mode
  const buttonBg = topbar
    ? "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50 shadow-xs"
    : scrolled
      ? "bg-slate-200/80 dark:bg-slate-800/90 border-slate-300 dark:border-white/20 text-slate-800 dark:text-white shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700"
      : "bg-black/30 border-white/25 text-white hover:bg-black/50 hover:border-white/40 shadow-sm backdrop-blur-md";

  const moonColor = topbar
    ? "text-slate-600 dark:text-zinc-400"
    : scrolled
      ? "text-[#045029] dark:text-emerald-300 drop-shadow-[0_0_6px_rgba(4,80,41,0.4)] dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      : "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]";

  const options = [
    { id: "system", label: "System Default", desc: "Syncs with system theme" },
    { id: "light", label: "Light", desc: "Light mode appearance" },
    { id: "dark", label: "Dark", desc: "Dark mode appearance" },
    { id: "time", label: "Time Default", desc: "Auto dark (6 PM - 6 AM)" },
  ];

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        aria-label="Toggle theme mode"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer overflow-hidden active:scale-95 ${buttonBg} ${className}`}
      >
        {/* Glowing background halo */}
        <span
          className={`absolute inset-0 rounded-full transition-opacity duration-300 ${dark ? "bg-amber-400/20 opacity-0 group-hover:opacity-100" : "bg-emerald-400/20 opacity-0 group-hover:opacity-100"}`}
        />

        {/* Sun Icon (shown in dark mode to switch to light mode) */}
        <span
          className={`absolute flex items-center justify-center transition-all duration-300 ${
            dark
              ? "opacity-100 rotate-0 scale-100 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              : "opacity-0 rotate-90 scale-50 text-slate-400"
          }`}
        >
          <FiSun size={17} />
        </span>

        {/* Moon Icon (shown in light mode to switch to dark mode) */}
        <span
          className={`absolute flex items-center justify-center transition-all duration-300 ${
            dark
              ? "opacity-0 -rotate-90 scale-50 text-slate-400"
              : `opacity-100 rotate-0 scale-100 ${moonColor}`
          }`}
        >
          <FiMoon size={17} />
        </span>
      </button>

      {/* Hover Tooltip / Menu */}
      <div
        className={`absolute top-full right-0 pt-2 z-99999 transition-all duration-200 ${
          hovered
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="min-w-48 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4)] space-y-0.5">
          {options.map((opt) => {
            const isActive = themeMode === opt.id;
            return (
              <button
                key={opt.id}

                onClick={() => setThemeMode(opt.id)}
                className={`w-full text-left px-3 py-1.5 rounded-xl transition-all flex flex-col cursor-pointer ${
                  isActive
                    ? "bg-[var(--p)] text-white shadow-md shadow-[var(--p)]/25"
                    : "hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider leading-normal">
                  {opt.label}
                </span>
                <span
                  className={`text-[8.5px] font-medium leading-none mt-0.5 ${isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}
                >
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
