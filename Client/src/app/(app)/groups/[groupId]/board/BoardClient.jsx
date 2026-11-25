"use client";

/**
 * Board tab shell — duties, menu, notices, hand-overs, shopping list,
 * kitchen inventory and polls in one mobile-first segmented view.
 */
import { useState } from "react";
import {
  LuCalendarCheck,
  LuChefHat,
  LuListChecks,
  LuPackage,
  LuSlidersHorizontal,
  LuStickyNote,
  LuUsers,
  LuVote,
} from "react-icons/lu";
import DutiesClient from "./DutiesClient";
import MenuClient from "./MenuClient";
import NoticeBoardClient from "./NoticeBoardClient";
import HandoverComposer from "./HandoverComposer";
import ShoppingListPanel from "./ShoppingListPanel";
import KitchenInventoryPanel from "./KitchenInventoryPanel";
import PollsPanel from "./PollsPanel";
import RosterPanel from "./RosterPanel";

const SECTIONS = [
  { key: "duties", label: "Duties", icon: LuCalendarCheck },
  { key: "rosters", label: "Rosters", icon: LuSlidersHorizontal },
  { key: "menu", label: "Menu", icon: LuChefHat },
  { key: "notices", label: "Notices", icon: LuStickyNote },
  { key: "handover", label: "Hand-over", icon: LuUsers },
  { key: "bazar", label: "Bazar", icon: LuListChecks },
  { key: "stock", label: "Stock", icon: LuPackage },
  { key: "polls", label: "Polls", icon: LuVote },
];

export default function BoardClient({
  groupId,
  canManage,
  canConvert,
  memberships = [],
  categories = [],
  initialBoard,
  initialMenus = [],
  initialNotes = [],
  initialRosters = [],
  initialShopping = null,
  initialInventory = [],
  initialPolls = [],
}) {
  const [section, setSection] = useState("duties");
  const todayMenu = initialBoard?.menu || initialMenus.find((plan) => plan.date === initialBoard?.date) || null;

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Board sections">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--r-pill)] px-4 text-xs font-semibold transition-[var(--transition)] ${section === key
                ? "bg-(--p) text-(--bgs)"
                : "border border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--p) hover:text-(--p)"
              }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {section === "duties" && <DutiesClient groupId={groupId} memberships={memberships} />}
      {section === "rosters" && canManage && (
        <RosterPanel groupId={groupId} memberships={memberships} initialRosters={initialRosters} />
      )}
      {section === "menu" && (
        <MenuClient
          groupId={groupId}
          initialPlans={initialMenus}
          canEdit={canManage}
          memberships={memberships}
          todayMenu={todayMenu}
        />
      )}
      {section === "notices" && (
        <NoticeBoardClient
          groupId={groupId}
          initialNotes={initialNotes}
          canManage={canManage}
          memberships={memberships}
        />
      )}
      {section === "handover" && (
        <HandoverComposer
          groupId={groupId}
          memberships={memberships}
          activeHandovers={initialBoard?.activeHandovers || []}
          activeDate={initialBoard?.date || null}
        />
      )}
      {section === "bazar" && (
        <ShoppingListPanel
          groupId={groupId}
          initialList={initialShopping}
          categories={categories}
          canConvert={canConvert}
        />
      )}
      {section === "stock" && <KitchenInventoryPanel groupId={groupId} initialItems={initialInventory} />}
      {section === "polls" && <PollsPanel groupId={groupId} initialPolls={initialPolls} canManage={canManage} />}
    </div>
  );
}
