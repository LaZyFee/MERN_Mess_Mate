"use client";

/**
 * More / group settings — a compact hub.
 * Mobile-first: a grid of setting tiles launches one panel at a time instead of
 * stacking six heavy cards on a phone; desktop shows the same panels in a
 * two-column masonry-ish grid.
 */
import { useMemo, useState } from "react";
import {
  LuKey,
  LuTag,
  LuPiggyBank,
  LuMegaphone,
  LuMessageSquareWarning,
  LuScale,
  LuBox,
  LuSlidersHorizontal,
  LuArrowLeft,
  LuShieldAlert,
} from "react-icons/lu";
import { useGroupStore } from "@/lib/store/groupStore";
import { useT } from "@/lib/i18n/LangProvider";
import { SectionCard } from "../GroupUI";
import { useGroup } from "../GroupShell";
import InviteSection, { CategoriesSection } from "./SettingsSections";
import BudgetsPanel from "./BudgetsPanel";
import NotificationsPanel from "./NotificationsPanel";
import DisputesPanel from "./DisputesPanel";
import ReconciliationPanel from "./ReconciliationPanel";
import AssetsPanel from "./AssetsPanel";

export default function GroupMoreClient({ initialInviteMeta = null, initialCategories = [] }) {
  const t = useT();
  const storeRole = useGroupStore((s) => s.myRole);
  const storeGroupId = useGroupStore((s) => s.groupId);
  // Prefer the shell's role (resolved from membership intervals) over the store.
  const context = useGroup() || {};
  const myRole = context.myRole || storeRole;
  const groupId = context.groupId || storeGroupId;
  const isAdmin = ["owner", "manager"].includes(myRole);
  const isTreasurer = ["owner", "manager", "treasurer"].includes(myRole);

  const sections = useMemo(
    () => [
      { key: "invite", label: t("more.invitePeople"), icon: LuKey, show: isAdmin, group: "access" },
      { key: "categories", label: t("more.expenseCategories"), icon: LuTag, show: isAdmin, group: "access" },
      { key: "budgets", label: t("more.budgets"), icon: LuPiggyBank, show: true, group: "money" },
      { key: "reconciliation", label: t("recon.title"), icon: LuScale, show: isTreasurer, group: "money" },
      { key: "assets", label: t("more.depositAssets"), icon: LuBox, show: isTreasurer, group: "money" },
      { key: "notifications", label: t("more.notifications"), icon: LuMegaphone, show: isAdmin, group: "ops" },
      { key: "disputes", label: t("more.disputes"), icon: LuMessageSquareWarning, show: isAdmin, group: "ops" },
    ],
    [isAdmin, isTreasurer, t],
  );

  const visible = sections.filter((section) => section.show);

  const [active, setActive] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!groupId) return null;

  if (visible.length === 0) {
    return (
      <SectionCard icon={LuShieldAlert} tone="warning" title={t("more.groupSettings")}>
        <p className="text-sm text-(--tm)">{t("more.settingsRestricted")}</p>
      </SectionCard>
    );
  }

  const renderPanel = (key) => {
    switch (key) {
      case "invite":
        return <InviteSection groupId={groupId} initialMeta={initialInviteMeta} />;
      case "categories":
        return <CategoriesSection groupId={groupId} initialCategories={initialCategories} />;
      case "budgets":
        return <BudgetsPanel groupId={groupId} categories={initialCategories} canEdit={isTreasurer} />;
      case "reconciliation":
        return <ReconciliationPanel groupId={groupId} />;
      case "assets":
        return <AssetsPanel groupId={groupId} canManage={isTreasurer} />;
      case "notifications":
        return <NotificationsPanel groupId={groupId} />;
      case "disputes":
        return <DisputesPanel groupId={groupId} canManage={isAdmin} />;
      default:
        return null;
    }
  };

  const activeMeta = visible.find((section) => section.key === active);

  return (
    <div className="min-w-0 space-y-3">
      {/* ── Mobile: tile grid → single panel ─────────────────── */}
      <div className="lg:hidden">
        {!mobileOpen ? (
          <SectionCard icon={LuSlidersHorizontal} title={t("more.groupSettings")} subtitle={`${visible.length}`}>
            <div className="grid grid-cols-2 gap-2">
              {visible.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActive(key);
                    setMobileOpen(true);
                  }}
                  className="flex min-h-[84px] flex-col items-start justify-between gap-2 rounded-2xl border border-(--bd) bg-(--bgs) p-3 text-left transition-colors hover:border-(--p)/50 active:scale-[0.99]"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-(--pale) text-(--p)">
                    <Icon size={15} />
                  </span>
                  <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-(--tp)">{label}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-(--bd) bg-(--bgs) px-3 text-[12.5px] font-semibold text-(--ts)"
            >
              <LuArrowLeft size={14} /> {t("more.groupSettings")}
            </button>
            <div className="flex min-w-0 items-center gap-2 px-1">
              {activeMeta && (
                <>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--p) text-(--bgs)">
                    <activeMeta.icon size={14} />
                  </span>
                  <h2 className="truncate text-[15px] font-extrabold text-(--tp)">{activeMeta.label}</h2>
                </>
              )}
            </div>
            {renderPanel(active)}
          </div>
        )}
      </div>

      {/* ── Desktop: all panels in a 2-col grid ──────────────── */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-2 lg:items-start">
        {visible.map(({ key }) => (
          <div key={key} className="min-w-0">
            {renderPanel(key)}
          </div>
        ))}
      </div>
    </div>
  );
}
