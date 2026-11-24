"use client";

/**
 * T9.7 — Realtime bridge.
 * Connects Socket.IO with the HttpOnly `mm_at` cookie (no token in JS), joins
 * the active group room and broadcasts domain events on `window` so feature
 * clients can refresh only the data they own.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { useGroupStore } from "@/lib/store/groupStore";

export const REALTIME_EVENT = "mealmate:realtime";

const GROUP_EVENTS = [
  "meal-updated",
  "expense-updated",
  "duty-updated",
  "menu-updated",
  "note-created",
  "note-updated",
  "shoppingList-updated",
  "kitchenInventory-updated",
  "roster-published",
];

const USER_EVENTS = ["inbox-new"];

const SOCKET_URL = undefined;

function broadcast(event, payload) {
  try {
    window.dispatchEvent(new CustomEvent(REALTIME_EVENT, { detail: { event, payload } }));
  } catch {
    /* no-op: Event constructor unavailable */
  }
}

export default function RealtimeProvider() {
  const groupId = useGroupStore((s) => s.groupId);
  const pathname = usePathname();
  const socketRef = useRef(null);
  const joinedRef = useRef(null);

  // Connect once per authenticated session.
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
    });
    socketRef.current = socket;

    GROUP_EVENTS.forEach((event) => socket.on(event, (payload) => broadcast(event, payload)));
    USER_EVENTS.forEach((event) => socket.on(event, (payload) => broadcast(event, payload)));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = null;
    };
  }, []);

  // Join/leave the group room as the user navigates between groups.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (groupId && joinedRef.current && joinedRef.current !== groupId) {
      socket.emit("leave-group", joinedRef.current);
    }
    if (groupId) {
      socket.emit("join-group", groupId);
      joinedRef.current = groupId;
    }
  }, [groupId, pathname]);

  return null;
}

/** Subscribe to a realtime event; handler is called with the event payload. */
export function onRealtime(handler) {
  if (typeof window === "undefined") return () => { };
  const listener = (e) => handler(e.detail.event, e.detail.payload);
  window.addEventListener(REALTIME_EVENT, listener);
  return () => window.removeEventListener(REALTIME_EVENT, listener);
}
