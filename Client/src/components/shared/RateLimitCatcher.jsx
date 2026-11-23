"use client";

import { useEffect, useState, useMemo } from "react";
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
    ((initialCooldown - secondsLeft) / (initialCooldown || 1)) * 100
   )
  )
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
    <div
     className="absolute inset-0"
     style={{
      background:
       "linear-gradient(color-mix(in srgb, var(--bg) 65%, transparent), color-mix(in srgb, var(--bg) 85%, transparent))",
     }}
    />
   </div>

   {/* Ambient gradient blobs in warm amber & orange */}
   <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-(--gold)/20 blur-[130px]" />
    <div className="absolute bottom-[-10%] right-[-8%] w-[45vw] h-[45vw] rounded-full bg-(--gold)/15 blur-[110px]" />
   </div>

   {/* Floating dots pattern */}
   {[
    { cls: "cs-dot-1", style: { top: "15%", left: "7%" } },
    { cls: "cs-dot-2", style: { top: "75%", left: "6%" } },
    { cls: "cs-dot-3", style: { top: "10%", right: "8%" } },
    { cls: "cs-dot-4", style: { top: "60%", right: "7%" } },
    { cls: "cs-dot-5", style: { top: "40%", left: "3%" } },
   ].map(({ cls, style }, i) => (
    <div
     key={i}
     className={`${cls} absolute w-1.5 h-1.5 rounded-full bg-(--gold)/50 pointer-events-none`}
     style={style}
    />
   ))}

   {/* Optional top-right dismiss button for overlay mode */}
   {isOverlay && onClose && (
    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
     <button
      type="button"
      onClick={onClose}
      aria-label="Dismiss notice"
      className="p-2 sm:p-2.5 rounded-full text-(--bgs)/70 hover:text-(--bgs) bg-(--bgs)/10 hover:bg-(--bgs)/20 border border-(--bgs)/15 transition-colors cursor-pointer"
     >
      <MdClose size={18} />
     </button>
    </div>
   )}

   {/* Main content */}
   <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 w-full max-w-xl mx-auto text-center my-auto">
    {/* Eyebrow pill */}
    <div className="cs-fade-up cs-delay-1 inline-flex items-center gap-2 bg-(--warning-bg)0/15 border border-(--warning)/30 rounded-full px-3.5 py-1 mb-4">
     <span className="w-1.5 h-1.5 rounded-full bg-(--warning) animate-pulse" />
     <span className="text-[0.65rem] tracking-[0.2em] uppercase text-(--warning) font-semibold">
      Rate Limit Notice
     </span>
    </div>

    {/* 429 giant watermark number */}
    <h1
     className="cs-fade-up cs-delay-2 font-black leading-none text-(--bgs) text-center mb-1 select-none"
     style={{ fontSize: "clamp(4.5rem, 16vw, 9rem)", opacity: 0.15 }}
    >
     429
    </h1>

    {/* Heading */}
    <p
     className="cs-lora cs-fade-up cs-delay-2 text-(--warning) italic text-center font-bold leading-snug -mt-3 mb-3"
     style={{ fontSize: "clamp(1.2rem, 3vw, 1.75rem)" }}
    >
     Too Many Requests
    </p>

    {/* Primary API message */}
    <p className="cs-fade-up cs-delay-3 text-(--bgs)/90 text-sm sm:text-base leading-relaxed text-center max-w-md mb-2 font-medium">
     {errorMessage}
    </p>

    {endpointInfo && (
     <div className="cs-fade-up cs-delay-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-(--bgs)/5 border border-(--bgs)/10 text-(--bgs)/60 font-mono text-[10px] mb-3">
      <span className="text-(--warning) font-bold">{endpointInfo.method}:</span>
      <span className="truncate max-w-65 sm:max-w-none">{endpointInfo.endpoint}</span>
     </div>
    )}

    <p className="cs-fade-up cs-delay-3 text-(--bgs)/60 text-xs leading-relaxed text-center max-w-sm mb-5">
     You have temporarily exceeded our request rate limit. Please take a brief pause before retrying.
    </p>

    {/* Cooldown Timer & Progress Bar Card - Only rendered if API provided cooldown */}
    {initialCooldown > 0 && (
     <div className="cs-fade-up cs-delay-3 w-full max-w-sm sm:max-w-md bg-(--p4)/40 border border-(--warning)/25 rounded-2xl p-4 sm:p-5 mb-5 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between text-xs mb-2.5">
       <span className="flex items-center gap-1.5 text-(--gold) font-medium">
        {secondsLeft > 0 ? (
         <>
          <MdAccessTime className="animate-spin text-(--warning) shrink-0" style={{ animationDuration: "3s" }} size={15} />
          <span>Cooldown in progress</span>
         </>
        ) : (
         <>
          <MdCheckCircle className="text-(--success) shrink-0" size={15} />
          <span className="text-(--success) font-semibold">Ready to retry</span>
         </>
        )}
       </span>
       <span className="font-mono text-xs text-(--bgs)/80 font-bold bg-(--bgs)/10 px-2 py-0.5 rounded-md">
        {formatTimeLeft(secondsLeft)}
       </span>
      </div>

      {/* Progress bar track */}
      <div className="w-full h-2 rounded-full bg-(--bgs)/10 overflow-hidden relative">
       <div
        className={`h-full transition-all duration-1000 ease-linear rounded-full ${
         secondsLeft === 0
          ? "bg-(--success) shadow-[var(--shadow-md)]"
          : "bg-(--gold) shadow-[var(--shadow-md)]"
        }`}
        style={{ width: `${progressPercent}%` }}
       />
      </div>

      <p className="text-[11px] text-(--bgs)/50 text-center mt-2.5">
       {secondsLeft > 0
        ? `You can safely retry in ${formatTimeLeft(secondsLeft)}.`
        : "You may now safely retry your request."}
      </p>
     </div>
    )}

    {/* Actions Grid */}
    <div className="cs-fade-up cs-delay-4 w-full max-w-sm sm:max-w-md space-y-2.5">
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
      <button
       type="button"
       onClick={handleRetry}
       disabled={secondsLeft > 0}
       className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
        secondsLeft === 0
         ? "bg-(--gold) hover:opacity-90 text-(--bgs) shadow-[var(--shadow-lg)] active:scale-98 animate-pulse"
         : "bg-(--bgs)/10 text-(--bgs)/45 border border-(--bgs)/10 cursor-not-allowed"
       }`}
      >
       <MdRefresh
        size={17}
        className={secondsLeft > 0 ? "animate-spin text-(--warning)" : ""}
        style={{ animationDuration: "2s" }}
       />
       <span>{secondsLeft > 0 ? `Wait (${secondsLeft}s)` : "Try Again Now"}</span>
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
       Dismiss this notice
      </button>
     )}
    </div>
   </main>
  </div>
 );
}
