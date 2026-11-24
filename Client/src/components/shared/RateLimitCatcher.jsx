"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MdHome,
  MdRefresh,
  MdAccessTime,
  MdClose,
  MdCheckCircle,
} from "react-icons/md";

/**
 * RateLimitCatcher
 * Visually consistent error catcher UI for HTTP 429 (Too Many Requests).
 * Matches the design language of src/app/error.js with amber/orange traffic styling,
 * a 429 backdrop watermark, and a live cooldown countdown timer.
 *
 * @param {Object} props
 * @param {Object|string} [props.error] - Error object or string
 * @param {Function} [props.reset] - Next.js error boundary reset callback
 * @param {Function} [props.onRetry] - Custom retry callback
 * @param {Function} [props.onClose] - Optional callback to dismiss overlay
 * @param {boolean} [props.isOverlay=false] - Whether rendered as a full-screen overlay modal
 */
export default function RateLimitCatcher({
  error,
  reset,
  onRetry,
  onClose,
  isOverlay = false,
}) {
  const errorMessage = useMemo(() => {
    if (typeof error === "string") return error;
    return (
      error?.data?.message ||
      error?.message ||
      "Too many requests, please try again later"
    );
  }, [error]);

  const endpointInfo = useMemo(() => {
    if (typeof error === "object" && error?.endpoint) {
      return {
        endpoint: error.endpoint,
        method: error.method || "GET",
      };
    }
    return null;
  }, [error]);

  const initialCooldown = useMemo(() => {
    const retryVal =
      error?.retryAfter ??
      error?.data?.retryAfter ??
      error?.data?.retry_after;
    if (retryVal == null) return 0;

    const parsed = parseInt(retryVal, 10);
    if (isNaN(parsed) || parsed <= 0) return 0;

    // Case 1: Epoch timestamp (seconds or ms)
    if (parsed > 1000000000) {
      const targetTime = parsed > 1e11 ? parsed : parsed * 1000;
      return Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
    }

    // Case 2: Milliseconds from API (e.g. 5444 ms = ~5.4s -> 6 seconds)
    if (parsed >= 1000) {
      return Math.ceil(parsed / 1000);
    }

    // Case 3: Seconds directly from API
    return parsed;
  }, [error]);

  const [secondsLeft, setSecondsLeft] = useState(initialCooldown);

  useEffect(() => {
    setSecondsLeft(initialCooldown);
  }, [initialCooldown]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        ((initialCooldown - secondsLeft) / (initialCooldown || 1)) * 100,
      ),
    ),
  );

  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return "Ready now";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (reset) {
      reset();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const containerClass = isOverlay
    ? "fixed inset-0 z-[999999] overflow-y-auto flex flex-col bg-(--p4)/90 backdrop-blur-md"
    : "min-h-screen relative overflow-hidden flex flex-col bg-(--bg)";

  return (
    <div className={`cs-root ${containerClass}`}>
      {/* Background image */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1800&q=80"
          alt=""
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 [background:linear-gradient(color-mix(in_srgb,_var(--bg)_65%,_transparent),_color-mix(in_srgb,_var(--bg)_85%,_transparent))]" />
      </div>

      {/* Ambient gradient blobs in warm amber & orange */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-(--gold)/20 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[45vw] h-[45vw] rounded-full bg-(--gold)/15 blur-[110px]" />
      </div>

      {/* Floating dots pattern */}
      {[
        { top: "15%", left: "7%" },
        { top: "75%", left: "6%" },
        { top: "10%", right: "8%" },
        { top: "60%", right: "7%" },
        { top: "40%", left: "3%" },
      ].map(({ top, left, right }, i) => (
        <Fragment key={i}>
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-(--gold)/50 pointer-events-none"
            style={{ top, left, right }}
          />
        </Fragment>
      ))}

      {/* Centered content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* 429 watermark + icon */}
        <div className="cs-fade-up relative mb-6">
          <span className="absolute inset-0 flex items-center justify-center text-[8rem] sm:text-[10rem] font-black leading-none text-(--gold)/10 select-none pointer-events-none">
            429
          </span>
          <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-(--gold)/15 border border-(--gold)/30">
            <MdAccessTime className="w-10 h-10 sm:w-12 sm:h-12 text-(--gold)" />
          </div>
        </div>

        {/* Title */}
        <h1 className="cs-fade-up cs-delay-1 text-2xl sm:text-3xl font-bold text-(--tp) mb-2">
          Too Many Requests
        </h1>

        {/* Message */}
        <p className="cs-fade-up cs-delay-1 text-sm sm:text-base text-(--ts)/80 max-w-sm sm:max-w-md mb-6">
          {errorMessage}
        </p>

        {/* Endpoint badge */}
        {endpointInfo && (
          <div className="cs-fade-up cs-delay-2 inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-(--bgs)/10 border border-(--bgs)/15 text-[11px] sm:text-xs text-(--ts)/70 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-(--gold)/20 text-(--gold) font-bold">
              {endpointInfo.method}
            </span>
            <span className="truncate max-w-[16rem]">{endpointInfo.endpoint}</span>
          </div>
        )}

        {/* Cooldown progress */}
        {secondsLeft > 0 && (
          <div className="cs-fade-up cs-delay-2 w-full max-w-sm sm:max-w-md mb-6">
            <div className="flex items-center justify-between text-xs text-(--ts)/70 mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <MdAccessTime size={13} />
                Cooldown
              </span>
              <span className="font-mono font-medium text-(--gold)">
                {formatTimeLeft(secondsLeft)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-(--bgs)/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-(--gold) transition-[width] duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Ready state banner */}
        {secondsLeft === 0 && (
          <div className="cs-fade-up cs-delay-2 inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-(--success)/15 border border-(--success)/30 text-xs text-(--success)">
            <MdCheckCircle size={15} />
            Ready to retry
          </div>
        )}

        {/* Actions Grid */}
        <div className="cs-fade-up cs-delay-4 w-full max-w-sm sm:max-w-md space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleRetry}
              disabled={secondsLeft > 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${secondsLeft === 0
                ? "bg-(--gold) hover:opacity-90 text-(--bgs) shadow-[var(--shadow-lg)] active:scale-98 animate-pulse"
                : "bg-(--bgs)/10 text-(--bgs)/45 border border-(--bgs)/10 cursor-not-allowed"
                }`}
            >
              <MdRefresh
                size={17}
                className={`${secondsLeft > 0 ? "animate-spin text-(--warning)" : ""
                  } [animation-duration:2s]`}
              />
              <span>
                {secondsLeft > 0 ? `Wait (${secondsLeft}s)` : "Try Again Now"}
              </span>
            </button>

            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 text-(--bgs)/85 bg-(--bgs)/10 border border-(--bgs)/15 hover:bg-(--bgs)/20 hover:text-(--bgs) transition-all text-center active:scale-98"
            >
              <MdHome size={17} />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Tertiary dismiss button for overlay */}
          {isOverlay && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-(--bgs)/45 hover:text-(--bgs)/80 transition-colors cursor-pointer py-1 underline-offset-4 hover:underline block mx-auto"
            >
              <span className="inline-flex items-center gap-1">
                <MdClose size={13} />
                Dismiss this notice
              </span>
            </button>
          )}
        </div>

        {/* Footer retry hint */}
        <p className="text-[11px] text-(--bgs)/50 text-center mt-2.5">
          {secondsLeft > 0
            ? `You can safely retry in ${formatTimeLeft(secondsLeft)}.`
            : "You may now safely retry your request."}
        </p>
      </main>
    </div>
  );
}