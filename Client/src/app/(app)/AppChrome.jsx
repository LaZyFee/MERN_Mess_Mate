"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuBookOpen, LuHouse, LuLifeBuoy, LuReceipt, LuUtensils, LuUsers, LuWallet } from "react-icons/lu";
import InboxBell from "@/components/inbox/InboxBell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useT } from "@/lib/i18n/LangProvider";

const NAV = [
  { key: "home", href: "/dashboard", icon: LuHouse },
  { key: "groups", tkey: "home.title", href: "/dashboard", icon: LuUsers },
  { key: "meals", href: "/groups", icon: LuUtensils },
  { key: "expenses", href: "/groups", icon: LuReceipt },
  { key: "summary", href: "/groups", icon: LuWallet },
  { key: "more", tkey: "shell.profile", href: "/profile", icon: LuUsers },
];

function itemLabel(key, t) {
  if (key === "groups") return t("home.title");
  if (key === "more") return t("shell.profile");
  return t(`shell.${key}`);
}

function isActive(pathname, key) {
  if (key === "home") return pathname === "/" || pathname === "/dashboard";
  if (key === "more") return pathname === "/profile" || pathname.startsWith("/profile/");
  if (key === "groups") return pathname === "/groups" || pathname === "/groups/create" || pathname === "/join";
  if (key === "meals") return pathname.startsWith("/groups/") && pathname.endsWith("/meals");
  if (key === "expenses") return pathname.startsWith("/groups/") && pathname.endsWith("/expenses");
  if (key === "summary") return pathname.startsWith("/groups/") && pathname.endsWith("/statements");
  return false;
}

export default function AppChrome({ children }) {
  const t = useT();
  const pathname = usePathname() || "/";
  const inGroup = pathname.startsWith("/groups/") && pathname !== "/groups/create";
  const navigation = inGroup ? NAV.filter(({ key }) => key !== "groups") : NAV;

  return (
    <div className="min-h-[100dvh] bg-(--bg)">
      <header className="sticky top-0 z-30 border-b border-(--bd) bg-(--bgs)/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
          <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-extrabold tracking-tight text-(--tp) no-underline">
            <span className="grid size-8 place-items-center rounded-xl bg-(--p) text-(--bgs)">
              <LuUtensils size={16} />
            </span>
            <span className="hidden xs:inline">MealMate</span>
          </Link>

          <nav aria-label={t("shell.primaryNav")} className="hidden items-center gap-1 md:flex">
            {navigation.map(({ key, href, icon: Icon }) => {
              const active = isActive(pathname, key);
              return (
                <Link key={key} href={href} aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold no-underline transition-colors ${active ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm) hover:text-(--p)"}`}>
                  <Icon size={16} />{itemLabel(key, t)}
                </Link>
              );
            })}
            <Link href="/guide" aria-current={pathname === "/guide" ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold no-underline transition-colors ${pathname === "/guide" ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm) hover:text-(--p)"}`}>
              <LuBookOpen size={16} />{t("shell.guide")}
            </Link>
            <Link href="/support" aria-current={pathname.startsWith("/support") ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold no-underline transition-colors ${pathname.startsWith("/support") ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm) hover:text-(--p)"}`}>
              <LuLifeBuoy size={16} />{t("shell.support")}
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <InboxBell />
            <ThemeToggle />
            <LanguageToggle className="min-h-11" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>

      <nav aria-label={t("shell.primaryNav")} className="fixed inset-x-0 bottom-0 z-30 border-t border-(--bd) bg-(--bgs)/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-20px_var(--tp)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto flex max-w-lg list-none items-stretch justify-around px-1">
          {navigation.map(({ key, href, icon: Icon }) => {
            const active = isActive(pathname, key);
            return (
              <li key={key} className="min-w-0 flex-1">
                <Link href={href} aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold no-underline transition-colors ${active ? "text-(--p)" : "text-(--tm)"}`}>
                  <span className={`grid size-8 place-items-center rounded-xl transition-colors ${active ? "bg-(--pale)" : ""}`}>
                    <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                  </span>
                  <span className="max-w-full truncate">{itemLabel(key, t)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
