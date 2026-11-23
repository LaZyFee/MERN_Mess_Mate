"use client";

import { useState, useEffect, useCallback } from "react";
import RateLimitCatcher from "./RateLimitCatcher";

/**
 * RateLimitListener
 * Mounts globally in the root layout to listen for client-side 429 responses
 * dispatched by apiClient.js ("discovia:rate-limit-exceeded").
 * When triggered, displays the RateLimitCatcher overlay with the exact 429 error details.
 */
export default function RateLimitListener() {
 const [rateLimitState, setRateLimitState] = useState(null);

 const handleRateLimitExceeded = useCallback((event) => {
  const detail = event?.detail || {
   status: 429,
   statusText: "Too Many Requests",
   data: { message: "Too many requests, please try again later" },
   retryAfter: null,
  };
  setRateLimitState(detail);
 }, []);

 const handleDismiss = useCallback(() => {
  setRateLimitState(null);
 }, []);

 const handleRetry = useCallback(() => {
  setRateLimitState(null);
  if (typeof window !== "undefined") {
   window.location.reload();
  }
 }, []);

 const checkRateLimitCookie = useCallback(() => {
  if (typeof document === "undefined") return;
  const match = document.cookie
   .split("; ")
   .find((row) => row.startsWith("discovia_rate_limit="));
  if (match) {
   try {
    const val = decodeURIComponent(match.split("=")[1]);
    const parsed = JSON.parse(val);
    // Clear cookie so it doesn't repeatedly trigger on fresh page views
    document.cookie =
     "discovia_rate_limit=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
    if (parsed && (parsed.status === 429 || parsed.statusCode === 429)) {
     setRateLimitState(parsed);
    }
   } catch (err) {
    console.error("Failed to parse rate limit cookie:", err);
   }
  }
 }, []);

 useEffect(() => {
  if (typeof window === "undefined") return;

  // Check cookie on mount
  checkRateLimitCookie();

  // Global trigger for manual dispatch
  window.__triggerRateLimit = (detail) => {
   handleRateLimitExceeded({ detail });
  };

  window.addEventListener(
   "discovia:rate-limit-exceeded",
   handleRateLimitExceeded
  );

  // Global fetch interceptor to catch any raw fetch 429s
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
   const response = await originalFetch(...args);
   if (response && response.status === 429) {
    try {
     const clone = response.clone();
     const data = await clone.json().catch(() => ({}));
     const rawRetryHeader = response.headers?.get?.("Retry-After");
     const rawRetry =
      rawRetryHeader ?? data?.retryAfter ?? data?.retry_after ?? null;
     const parsedRetry =
      rawRetry != null ? parseInt(rawRetry, 10) : null;
     let retryAfter = null;
     if (!isNaN(parsedRetry) && parsedRetry > 0) {
      if (parsedRetry > 1000000000) {
       const targetTime =
        parsedRetry > 1e11 ? parsedRetry : parsedRetry * 1000;
       retryAfter = Math.max(
        1,
        Math.ceil((targetTime - Date.now()) / 1000),
       );
      } else if (parsedRetry >= 1000) {
       retryAfter = Math.ceil(parsedRetry / 1000);
      } else {
       retryAfter = parsedRetry;
      }
     }

     const endpoint =
      typeof args[0] === "string"
       ? args[0]
       : args[0]?.url || "";

     handleRateLimitExceeded({
      detail: {
       status: 429,
       statusText: response.statusText || "Too Many Requests",
       data: data || {
        message: "Too many requests, please try again later",
       },
       retryAfter,
       endpoint,
       method: args[1]?.method || "GET",
      },
     });
    } catch {
     // Ignore clone parsing errors
    }
   }
   return response;
  };

  return () => {
   window.removeEventListener(
    "discovia:rate-limit-exceeded",
    handleRateLimitExceeded
   );
   window.fetch = originalFetch;
   delete window.__triggerRateLimit;
  };
 }, [handleRateLimitExceeded, checkRateLimitCookie]);

 if (!rateLimitState) return null;

 return (
  <RateLimitCatcher
   error={rateLimitState}
   onClose={handleDismiss}
   onRetry={handleRetry}
   isOverlay={true}
  />
 );
}
