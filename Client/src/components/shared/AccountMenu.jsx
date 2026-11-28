"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LuBell, LuBookOpen, LuLayoutDashboard, LuLifeBuoy, LuLogOut, LuUser, LuUsers } from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import Button from "@/components/shared/Button";
import { useT } from "@/lib/i18n/LangProvider";
import { authApi } from "@/lib/api/auth";
import { setThemeCookie } from "@/lib/store/uiStore";
import { useAuthStore, useUser } from "@/lib/store/authStore";

const LINKS = [
  ["/dashboard", "shell.home", LuLayoutDashboard],
  ["/inbox", "shell.inbox", LuBell],
  ["/profile", "shell.profile", LuUser],
  ["/profile/sessions", "shell.sessions", LuUsers],
  ["/support", "shell.support", LuLifeBuoy],
  ["/guide", "shell.guide", LuBookOpen],
];

export default function AccountMenu() {
  const t = useT();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const storedUser = useUser();
  const clearAuth = useAuthStore((state) => state.clear);
  const [sessionUser, setSessionUser] = useState(null);
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const user = storedUser || sessionUser;

  useEffect(() => {
    if (storedUser || sessionUser || pathname === "/login" || pathname === "/register") return;
    let active = true;
    authApi.getProfile().then((result) => {
      if (active) setSessionUser(result?.user || result || null);
    }).catch(() => {
      if (active) setSessionUser(null);
    });
    return () => { active = false; };
  }, [storedUser, sessionUser, pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const closeEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    setOpen(false);
    try { await authApi.logout(); } catch { /* Clear local state even if the request fails. */ }
    // Keep the user's theme preference across logout (mm_theme is not session data).
    setThemeCookie(document.documentElement.dataset.theme || "light");
    clearAuth();
    router.replace("/");
  };

  if (!user) return null;

  return (
    <div ref={root} className="relative">
      <Button type="button" variant="ghost" onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu" aria-expanded={open} aria-label={user.username || user.email || t("shell.profile")}
        className="!size-11 !min-h-11 !rounded-full !p-1">
        <Avatar name={user.username || user.email} src={user.profilePic} size="sm" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-(--bd) bg-(--bgs) p-2 shadow-xl">
          <div className="mb-1 border-b border-(--bd) px-3 py-2">
            <p className="truncate text-sm font-semibold text-(--tp)">{user.username || user.email}</p>
            {user.username && <p className="truncate text-xs text-(--tm)">{user.email}</p>}
          </div>
          {LINKS.map(([href, label, Icon]) => (
            <Link key={`${href}-${label}`} href={href} role="menuitem" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-(--tp) no-underline hover:bg-(--pale) hover:text-(--p)">
              <Icon size={17} />{t(label)}
            </Link>
          ))}
          <div className="my-1 border-t border-(--bd)" />
          <Button type="button" variant="danger" isFullWidth onClick={logout} className="!min-h-11 !justify-start !rounded-xl !px-3">
            <LuLogOut size={16} />{t("shell.logout")}
          </Button>
        </div>
      )}
    </div>
  );
}
