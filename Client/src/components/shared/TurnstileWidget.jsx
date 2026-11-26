"use client";

/**
 * Cloudflare Turnstile widget (T14.4). Renders nothing when no site key is
 * configured, so local/dev builds and deployments with CAPTCHA off stay usable.
 * The token is passed to the backend as `captchaToken`; the backend verifies it
 * with `TURNSTILE_SECRET` and, in dev/test only, honours `CAPTCHA_DEV_BYPASS`.
 */
import { useEffect, useRef, useState } from "react";
import { LuShieldCheck } from "react-icons/lu";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

let loaderPromise = null;
function loadScript() {
  if (typeof window === "undefined" || !TURNSTILE_SITE_KEY) return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export default function TurnstileWidget({ onToken, isRequired = false, theme = "auto" }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [status, setStatus] = useState(TURNSTILE_SITE_KEY ? "loading" : "off");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ready = await loadScript();
      if (!ready || cancelled || !containerRef.current) {
        if (!ready) setStatus("unavailable");
        return;
      }
      if (!window.turnstile || widgetIdRef.current != null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme,
        callback: (token) => {
          setStatus("verified");
          onToken?.(token);
        },
        "expired-callback": () => {
          setStatus("expired");
          onToken?.("");
        },
        "error-callback": () => {
          setStatus("unavailable");
          onToken?.("");
        },
      });
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* already gone */ }
      }
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className="space-y-1">
      <div ref={containerRef} className="min-h-14" />
      <p className="flex items-center gap-1 text-[11px] text-(--tm)">
        <LuShieldCheck size={12} />
        {status === "verified"
          ? "Verified — this form is protected."
          : status === "expired"
            ? "Verification expired, reload the widget to continue."
            : status === "unavailable"
              ? "Could not load the captcha check. Try again or contact support."
              : isRequired ? "Complete the captcha check before submitting." : "Bot protection"}
      </p>
    </div>
  );
}
