"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LuMenu, LuX, LuUtensils, LuLogOut, LuUser, LuLayoutDashboard, LuUsers, LuBell, LuLifeBuoy, LuBookOpen } from "react-icons/lu";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import Avatar from "./Avatar";
import Button from "./Button";
import { useT } from "@/lib/i18n/LangProvider";
import { useUser, useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/auth";

const PUBLIC_NAV = [
  { key: "home", tkey: "shell.home", href: "/" },
  { key: "how-it-works", tkey: "landing.nav.howItWorks", href: "/#how-it-works" },
  { key: "features", tkey: "landing.nav.features", href: "/#features" },
  { key: "guide", tkey: "shell.guide", href: "/guide" },
];

const ACCOUNT_NAV = [
  { href: "/dashboard", key: "home", icon: LuLayoutDashboard, label: "shell.home" },
  { href: "/inbox", key: "inbox", icon: LuBell, label: "shell.inbox" },
  { href: "/profile", key: "profile", icon: LuUser, label: "shell.profile" },
  { href: "/profile/sessions", key: "sessions", icon: LuUsers, label: "shell.sessions" },
  { href: "/support", key: "support", icon: LuLifeBuoy, label: "shell.support" },
  { href: "/guide", key: "guide", icon: LuBookOpen, label: "shell.guide" },
];

export default function Topbar() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const menuButton = useRef(null);
  const header = useRef(null);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hydratedUser = useUser();
  const [sessionUser, setSessionUser] = useState(null);
  const user = hydratedUser || sessionUser;
  const clearAuth = useAuthStore((s) => s.clear);

  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setDropdownOpen(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen && !open) return;
    const onPointerDown = (event) => {
      if (!header.current?.contains(event.target)) {
        setDropdownOpen(false);
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dropdownOpen, open]);

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors — clear local state regardless
    }
    clearAuth();
    router.push("/");
  }, [clearAuth, router]);

  useEffect(() => {
    if (hydratedUser || pathname === "/login" || pathname === "/register") return;
    let active = true;
    authApi.getProfile()
      .then((profile) => {
        if (active && profile) setSessionUser(profile.user || profile);
      })
      .catch(() => {
        if (active) setSessionUser(null);
      });
    return () => { active = false; };
  }, [hydratedUser, pathname]);

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
      if (!header.current?.contains(event.target)) {
        setOpen(false);
        setDropdownOpen(false);
      }
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
          {(user ? ACCOUNT_NAV : PUBLIC_NAV).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium aria-[current=page]:bg-(--bgs) aria-[current=page]:text-(--p) aria-[current=page]:shadow-sm text-(--ts) no-underline transition-colors hover:bg-(--bgm) hover:text-(--p)"
            >
              {item.icon ? <item.icon size={16} /> : null}
              {t(item.tkey || `shell.${item.key}`)}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <LanguageToggle className="min-h-11" />

          <div className="ml-1 hidden items-center gap-1 lg:flex">
            {user ? (
              <div
                className="relative inline-flex items-center gap-1"
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDropdownOpen((d) => !d)}
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                  aria-controls="account-menu"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-(--tp) no-underline transition-colors hover:bg-(--pale)"
                >
                  <Avatar
                    name={user.username || user.email}
                    src={user.profilePic}
                    size="xs"
                    className="mr-1"
                  />
                  <span>{user.username || user.email}</span>
                  <LuUser size={14} className="ml-1 opacity-60" />
                </Button>
                {dropdownOpen && (
                  <div
                    id="account-menu"
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-(--bd) bg-(--bgs) p-2 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="truncate px-3 pb-2 pt-1 text-xs text-(--tm)">{user.email}</p>
                    {ACCOUNT_NAV.map(({ href, key, icon: Icon }) => (
                      <Link key={key} href={href} role="menuitem" onClick={() => setDropdownOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-(--tp) no-underline hover:bg-(--pale) hover:text-(--p)">
                        <Icon size={17} />{t(ACCOUNT_NAV.find((item) => item.key === key)?.label || `shell.${key}`)}
                      </Link>
                    ))}
                    <div className="my-2 border-t border-(--bd)" />
                    <Button
                      type="button"
                      variant="danger"
                      size="md"
                      isFullWidth
                      role="menuitem"
                      onClick={handleLogout}
                      className="!h-11 !justify-start !rounded-xl !px-3 !text-sm"
                    >
                      <LuLogOut size={16} /> {t("shell.logout")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
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
              {(user ? ACCOUNT_NAV : PUBLIC_NAV).map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-h-12 items-center gap-3 text-base font-medium text-(--tp) no-underline active:text-(--p)"
                  >
                    {item.icon ? <item.icon size={18} /> : null}
                    {t(item.tkey || `shell.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {user ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { closeMenu(); handleLogout(); }}
                    className="!h-auto min-h-12 !whitespace-normal !rounded-xl !px-3 !text-sm !text-(--danger)"
                  >
                    <LuLogOut size={18} className="mr-1" /> {t("shell.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    as={Link}
                    href="/register"
                    variant="primary"
                    size="md"
                    className="min-h-12 !h-auto !whitespace-normal !rounded-xl !px-3 !text-sm"
                    onClick={closeMenu}
                  >
                    {t("auth.register.title")}
                  </Button>
                  <Button
                    as={Link}
                    href="/login"
                    variant="outline"
                    size="md"
                    className="min-h-12 !h-auto !whitespace-normal !rounded-xl !px-3 !text-sm"
                    onClick={closeMenu}
                  >
                    {t("auth.login.title")}
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
