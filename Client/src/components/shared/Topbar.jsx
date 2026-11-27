"use client";

/**
 * Topbar — mobile-first header for public and auth pages.
 *
 * Mobile: logo left; theme + language + menu button right. The menu opens a
 * full-width sheet under the bar with large (48px) touch rows and two stacked CTAs.
 * Desktop (md+): logo left, nav centered, actions right.
 * All colors come from CSS variables. No literal colors, no SVG.
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { LuMenu, LuX, LuUtensils } from "react-icons/lu";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useT } from "@/lib/i18n/LangProvider";

const PUBLIC_NAV = [
  { key: "home", tkey: "shell.home", href: "/" },
  { key: "how-it-works", tkey: "landing.nav.howItWorks", href: "/#how-it-works" },
  { key: "features", tkey: "landing.nav.features", href: "/#features" },
  { key: "guide", tkey: "shell.guide", href: "/guide" },
];

export default function Topbar() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Close on Escape, and when the viewport grows past the mobile breakpoint.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = (e) => e.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-(--bd) bg-(--bgs)/90 backdrop-blur-md">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto] items-center gap-2 px-4 md:grid-cols-[1fr_auto_1fr] lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-h-11 w-fit items-center gap-2 text-base font-extrabold tracking-tight text-(--tp) no-underline"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-(--p) text-(--bgs)">
            <LuUtensils size={16} />
          </span>
          MealMate
        </Link>

        {/* Desktop nav (centered) */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-(--ts) no-underline transition-colors hover:bg-(--bgm) hover:text-(--p)"
            >
              {t(item.tkey)}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <LanguageToggle />

          <div className="ml-1 hidden items-center gap-1 md:flex">
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-(--p) no-underline transition-colors hover:bg-(--pale)"
            >
              {t("auth.login.title")}
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center rounded-lg bg-(--p) px-4 text-sm font-semibold text-(--bgs) no-underline transition-colors hover:bg-(--p3)"
            >
              {t("auth.register.title")}
            </Link>
          </div>

          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("shell.closeMenu") : t("shell.openMenu")}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-(--bd) text-(--tp) transition-colors hover:bg-(--bgm) md:hidden"
          >
            {open ? <LuX size={20} /> : <LuMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-(--bd) bg-(--bgs) shadow-lg md:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto max-w-6xl px-4 pb-5 pt-2">
            <ul className="divide-y divide-(--bd)">
              {PUBLIC_NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center text-base font-medium text-(--tp) no-underline active:text-(--p)"
                  >
                    {t(item.tkey)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2">
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex min-h-12 items-center justify-center rounded-xl bg-(--p) px-4 text-base font-semibold text-(--bgs) no-underline active:bg-(--p3)"
              >
                {t("auth.register.title")}
              </Link>
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex min-h-12 items-center justify-center rounded-xl border border-(--bd) px-4 text-base font-semibold text-(--p) no-underline active:bg-(--pale)"
              >
                {t("auth.login.title")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}