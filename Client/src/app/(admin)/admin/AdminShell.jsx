"use client";

/**
 * Layer 3 — CSR shell for the hidden admin plane. Receives the SSR overview,
 * owns nav state and wraps children in ToastProvider so admin mutations can
 * report results with the shared toast system. Deliberately chrome-light and
 * unlinked from the app: no link anywhere in the user-facing UI points here.
 */
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuLayoutDashboard,
  LuUsers,
  LuBoxes,
  LuScrollText,
  LuLifeBuoy,
  LuChevronRight,
} from "react-icons/lu";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { ToastProvider } from "@/components/shared/ToastProvider";

const NAV = [
  { key: "overview", label: "Overview", href: "/admin", icon: LuLayoutDashboard },
  { key: "users", label: "Users", href: "/admin/users", icon: LuUsers },
  { key: "groups", label: "Groups", href: "/admin/groups", icon: LuBoxes },
  { key: "support", label: "Support", href: "/admin/support", icon: LuLifeBuoy },
  { key: "audit", label: "Audit", href: "/admin/audit", icon: LuScrollText },
];

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname?.startsWith(href);
}

export default function AdminShell({ initialOverview, children }) {
  const pathname = usePathname();
  const totals = initialOverview?.totals || {};

  return (
    <ToastProvider>
      <div className="min-h-[100dvh] bg-(--bg)">
        <header className="sticky top-0 z-30 border-b border-(--bd) bg-(--bgs)/95 backdrop-blur-sm">
          <div className="mx-auto flex min-h-12 max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-(--p) text-(--bgs)">
                <LuScrollText size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-(--tp)">Control plane</p>
                <p className="truncate text-[10px] text-(--tm)">
                  {totals.users ?? 0} users · {totals.groups ?? 0} groups
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-(--tm) no-underline transition-[var(--transition)] hover:bg-(--bgm) hover:text-(--p)"
              >
                <LuArrowLeft size={13} /> App
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <nav aria-label="Admin sections" className="mx-auto max-w-6xl overflow-x-auto px-2 pb-1 sm:px-4">
            <ul className="flex list-none items-stretch gap-1">
              {NAV.map(({ key, label, href, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={key} className="shrink-0">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[11px] font-semibold no-underline transition-[var(--transition)] ${active
                        ? "bg-(--pale) text-(--p)"
                        : "text-(--tm) hover:bg-(--bgm) hover:text-(--p)"
                        }`}
                    >
                      <Icon size={14} /> {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-6xl px-3 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 sm:px-4">
          <p className="mb-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-(--tl)">
            Hidden surface <LuChevronRight size={11} /> visible to platform admins only
          </p>
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
