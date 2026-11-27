"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const menuButton = useRef(null);
  const header = useRef(null);
  const [open, setOpen] = useState(false);

  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Close on Escape, and when the viewport grows past the mobile breakpoint.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const onOutside = (event) => {
      if (!header.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = (e) => e.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header ref={header} className="sticky top-0 z-40 border-b border-(--bd) bg-(--bgs)/90 backdrop-blur-md">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-2 px-4 lg:grid-cols-[auto_1fr_auto] lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-h-11 w-fit items-center gap-2 text-base font-extrabold tracking-tight text-(--tp) no-underline"
        >
          <span className="grid size-9 place-items-center rounded-2xl bg-(--p) text-(--bgs)">
            <LuUtensils size={16} />
          </span>
          MealMate
        </Link>

        {/* Desktop nav (centered) */}
        <nav aria-label="Primary" className="hidden justify-self-center items-center rounded-full border border-(--bd) bg-(--bg) p-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium aria-[current=page]:bg-(--bgs) aria-[current=page]:text-(--p) aria-[current=page]:shadow-sm text-(--ts) no-underline transition-colors hover:bg-(--bgm) hover:text-(--p)"
            >
              {t(item.tkey)}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <LanguageToggle className="min-h-11" />

          <div className="ml-1 hidden items-center gap-1 lg:flex">
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-(--p) no-underline transition-colors hover:bg-(--pale)"
            >
              {t("auth.login.title")}
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center rounded-full bg-(--p) px-4 text-sm font-semibold text-(--bgs) no-underline transition-colors hover:bg-(--p3)"
            >
              {t("auth.register.title")}
            </Link>
          </div>

          <button
            type="button"
            ref={menuButton}
            onClick={toggleMenu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("shell.closeMenu") : t("shell.openMenu")}
            className="inline-flex size-11 items-center justify-center rounded-full bg-(--pale) text-(--p) transition-colors hover:bg-(--bgm) lg:hidden"
          >
            {open ? <LuX size={20} /> : <LuMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-2 top-full mt-1 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border sm:left-auto sm:w-80 border-(--bd) bg-(--bgs) shadow-lg lg:hidden"
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
            <div className="mt-4 grid grid-cols-2 gap-2">
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