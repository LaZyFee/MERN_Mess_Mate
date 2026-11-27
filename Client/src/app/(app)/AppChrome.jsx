"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuBookOpen,
  LuHouse,
  LuLifeBuoy,
  LuBell,
  LuUtensils,
  LuUser,
  LuMenu,
  LuLayoutDashboard,
  LuUsers,
  LuSettings,
} from "react-icons/lu";
import InboxBell from "@/components/inbox/InboxBell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import ThemeToggle from "@/components/shared/ThemeToggle";
import AccountMenu from "@/components/shared/AccountMenu";
import { useT } from "@/lib/i18n/LangProvider";

const SIDEBAR_NAV = [
  { key: "home", href: "/dashboard", icon: LuLayoutDashboard, labelKey: "shell.home" },
  { key: "groups", href: "/groups", icon: LuUsers, labelKey: "shell.groups" },
  { key: "inbox", href: "/inbox", icon: LuBell, labelKey: "shell.inbox" },
  { key: "profile", href: "/profile", icon: LuUser, labelKey: "shell.profile" },
  { key: "settings", href: "/profile", icon: LuSettings, labelKey: "shell.settings" },
  { key: "support", href: "/support", icon: LuLifeBuoy, labelKey: "shell.support" },
  { key: "guide", href: "/guide", icon: LuBookOpen, labelKey: "shell.guide" },
];

const MOBILE_NAV = [
  { key: "home", href: "/dashboard", icon: LuHouse },
  { key: "inbox", href: "/inbox", icon: LuBell },
  { key: "profile", href: "/profile", icon: LuUser },
];

function isActive(pathname, key) {
  if (key === "home") return pathname === "/" || pathname === "/dashboard";
  if (key === "groups") return pathname.startsWith("/groups");
  if (key === "inbox") return pathname.startsWith("/inbox");
  if (key === "profile") return pathname === "/profile" || pathname.startsWith("/profile/");
  if (key === "support") return pathname.startsWith("/support");
  if (key === "guide") return pathname === "/guide";
  return false;
}

export default function AppChrome({ children }) {
  const t = useT();
  const pathname = usePathname() || "/";

  return (
    <div className="min-h-[100dvh] bg-(--bg) relative">
      {/* Header — always visible */}
      <header className="sticky top-0 z-40 border-b border-(--bd) bg-(--bgs)/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-extrabold tracking-tight text-(--tp) no-underline"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-(--p) text-(--bgs)">
              <LuUtensils size={16} />
            </span>
            <span className="hidden md:inline">MealMate</span>
          </Link>

          {/* Mobile sidebar toggle */}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full bg-(--pale) text-(--p) transition-colors hover:bg-(--bgm) lg:hidden"
            aria-label="Toggle sidebar"
          >
            <LuMenu size={20} />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <InboxBell />
            <ThemeToggle />
            <LanguageToggle className="min-h-11" />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Sidebar — desktop only (lg+) */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 border-r border-(--bd) bg-(--bgs)/95 backdrop-blur-xl flex-col"
      >
        <div className="flex flex-col h-full">
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {SIDEBAR_NAV.map(({ key, href, icon: Icon, labelKey }) => {
              const active = isActive(pathname, key);
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium no-underline transition-colors ${active ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm) hover:text-(--p)"}`}
                >
                  <Icon size={18} />
                  <span>{labelKey ? t(labelKey) : t(`shell.${key}`)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-(--bd)">
            <Link
              href="/support"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-(--ts) no-underline hover:bg-(--bgm) hover:text-(--p) transition-colors"
            >
              <LuLifeBuoy size={18} /> {t("shell.support")}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content — padded right for sidebar on desktop */}
      <main className={`mx-auto min-w-0 max-w-7xl pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-8 lg:pl-72 lg:mr-auto`}>
        {children}
      </main>

      {/* Bottom nav — mobile only (hidden lg+) */}
      <nav
        aria-label={t("shell.primaryNav")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-(--bd) bg-(--bgs)/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-20px_var(--tp)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto flex max-w-md list-none items-stretch justify-around px-2">
          {MOBILE_NAV.map(({ key, href, icon: Icon }) => {
            const active = isActive(pathname, key);
            return (
              <li key={key} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold no-underline transition-colors ${active ? "text-(--p)" : "text-(--tm)"}`}
                >
                  <span className={`grid size-8 place-items-center rounded-xl transition-colors ${active ? "bg-(--pale)" : ""}`}>
                    <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                  </span>
                  <span className="max-w-full truncate">{t(`shell.${key}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
