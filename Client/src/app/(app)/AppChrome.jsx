"use client";

/**
 * Client chrome for the protected app: desktop top bar, mobile bottom nav and
 * a safe-area padded content frame with room for the thumb-zone navigation.
 */
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LuHouse,
  LuUtensils,
  LuReceipt,
  LuFileText,
  LuMenu,
  LuEarth,
  LuBookOpen,
} from "react-icons/lu";
import ThemeToggle from "@/components/shared/ThemeToggle";
import LanguageToggle from "@/components/shared/LanguageToggle";
import InboxBell from "@/components/inbox/InboxBell";
import { useT } from "@/lib/i18n/LangProvider";

const NAV = [
  { key: "home", label: "Home", href: "/", icon: LuHouse },
  { key: "meals", label: "Meals", href: "/groups", icon: LuUtensils },
  { key: "expenses", label: "Expenses", href: "/groups", icon: LuReceipt },
  { key: "summary", label: "Summary", href: "/groups", icon: LuFileText },
  { key: "more", label: "More", href: "/profile", icon: LuMenu },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function AppChrome({ children }) {
  const t = useT();
  const pathname = usePathname();
  const inGroup = pathname?.startsWith("/groups/") && !pathname?.startsWith("/groups/create");

  return (
    <div className="min-h-[100dvh] bg-(--bg)">
      <header className="sticky top-0 z-30 hidden border-b border-(--bd) bg-(--bgs) md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2 text-sm font-extrabold text-(--tp)">
            <span className="grid size-8 place-items-center rounded-lg bg-(--p) text-(--bgs)">
              <LuUtensils size={16} />
            </span>
            MealMate
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.slice(0, 4).map(({ key, href, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold no-underline transition-[var(--transition)] ${isActive(pathname, href)
                  ? "bg-(--pale) text-(--p)"
                  : "text-(--tm) hover:bg-(--bgm) hover:text-(--p)"
                  }`}
              >
                <Icon size={15} /> {t(`shell.${key}`)}
              </Link>
            ))}
            <Link
              href="/guide"
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold no-underline transition-[var(--transition)] ${isActive(pathname, "/guide")
                ? "bg-(--pale) text-(--p)"
                : "text-(--tm) hover:bg-(--bgm) hover:text-(--p)"
                }`}
            >
              <LuBookOpen size={15} /> {t("shell.guide")}
            </Link>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-(--tm) no-underline transition-[var(--transition)] hover:bg-(--bgm) hover:text-(--p)"
            >
              <LuEarth size={15} /> {t("shell.support")}
            </Link>
          </nav>
          <div className="flex items-center gap-1">
            <InboxBell />
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="md:hidden">
        <div className="sticky top-0 z-30 flex h-12 items-center justify-end gap-1 border-b border-(--bd) bg-(--bgs)/95 px-2 backdrop-blur-sm">
          <InboxBell />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      <main className="mx-auto w-full min-w-0 max-w-6xl pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-6">
        {children}
      </main>

      {!inGroup && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-(--bd) bg-(--bgs)/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-md list-none items-stretch justify-around">
            {NAV.map(({ key, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={key} className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold no-underline transition-[var(--transition)] ${active ? "text-(--p)" : "text-(--tm)"
                      }`}
                  >
                    <Icon size={19} />
                    <span className="truncate">{t(`shell.${key}`)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}