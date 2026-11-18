"use client";

import { useEffect } from "react";
import { getSocketClient } from "@/lib/socketClient";
import { getSocketToken } from "@/actions/authActions";

export default function SocketInitializer() {
  useEffect(() => {
    let active = true;

    getSocketToken()
      .then((token) => {
        if (active && token) {
          try {
            getSocketClient(token);
          } catch (err) {
            console.warn("[SocketInitializer] Socket initialization failed:", err);
          }
        }
      })
      .catch((err) => {
        console.warn("[SocketInitializer] Failed to retrieve socket token:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
