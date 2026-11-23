"use client";

import { useEffect } from "react";
import { useAuthStore } from "./authStore";

/**
 * Seeds the client authStore from server-rendered session props.
 * Rendered once in the protected layout with initialUser.
 */
export default function AuthHydrator({ initialUser }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (initialUser) {
      hydrate({
        user: initialUser,
        roles: initialUser.roles || [],
        isAdmin: Boolean(initialUser.isAdmin),
      });
    } else {
      useAuthStore.getState().clear();
    }
  }, [initialUser, hydrate]);

  return null;
}
