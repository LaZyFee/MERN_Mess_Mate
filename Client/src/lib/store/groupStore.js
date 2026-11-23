"use client";

import { create } from "zustand";

/** Current group + my role within it (5-tier: owner > manager > treasurer > auditor > member). */
export const useGroupStore = create((set) => ({
  group: null,
  groupId: null,
  myRole: null,
  myMembership: null,

  setGroup: (group) =>
    set({ group, groupId: group?._id || null, myRole: group?.myRole || null, myMembership: group?.myMembership || null }),

  setMyRole: (myRole) => set({ myRole }),

  clear: () => set({ group: null, groupId: null, myRole: null, myMembership: null }),
}));
