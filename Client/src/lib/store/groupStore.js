"use client";

import { create } from "zustand";

/** Current group + my role within it (5-tier: owner > manager > treasurer > auditor > member). */
export const useGroupStore = create((set) => ({
  group: null,
  groupId: null,
  myRole: null,
  myMembership: null,
  leftNotice: null, // { message } — set when an ex-member lands on a group route

  setGroup: (group) =>
    set({ group, groupId: group?._id || null, myRole: group?.myRole || null, myMembership: group?.myMembership || null }),

  setMyRole: (myRole) => set({ myRole }),

  setLeftNotice: (leftNotice) => set({ leftNotice }),

  clear: () => set({ group: null, groupId: null, myRole: null, myMembership: null, leftNotice: null }),
}));
