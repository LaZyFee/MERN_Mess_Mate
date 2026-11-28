"use client";

/**
 * Board tab shell — duties, rosters, menu, notices, hand-overs, bazar list,
 * kitchen stock and polls.
 *
 * Mobile-first: a snap-scrolling icon rail selects the section; only the active
 * panel is mounted (cheaper on low-end phones). Every section keeps its own
 * container so the page never nests cards inside cards.
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
  LuClipboardList,
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

  const sections = SECTIONS.filter(({ key }) => key !== "rosters" || canManage);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div
        role="tablist"
        aria-label={t_boardLabel}
        className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map(({ key, label, icon: Icon }) => {
          const active = section === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(key)}
              className={`inline-flex min-h-11 shrink-0 snap-center items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${active
                  ? "bg-(--p) text-(--bgs) shadow-sm shadow-(--p)/25"
                  : "border border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--p)/50 hover:text-(--p)"
                }`}
            >
              <Icon size={15} strokeWidth={active ? 2.3 : 1.8} /> {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-w-0">
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
    </div>
  );
}

const t_boardLabel = "Board sections";
