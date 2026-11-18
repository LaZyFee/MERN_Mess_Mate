"use client";

import Link from "next/link";
import { FiLock, FiFileText } from "react-icons/fi";

/**
 * BlockedFormOverlay
 *
 * Wraps form contents (stepper + fields) and disables all interaction
 * when required prerequisite documents are missing during entity creation.
 *
 * @param {boolean} isBlocked - Whether the form should be locked and non-interactive
 * @param {string} title - Overlay card title
 * @param {string} description - Overlay card explanation
 * @param {string} uploadHref - URL to redirect to document upload
 * @param {string} uploadButtonText - CTA button text
 * @param {React.ReactNode} children - Form and stepper components
 */
export default function BlockedFormOverlay({
  isBlocked = false,
  title = "Form Blocked",
  description = "You cannot fill out or submit this form until the required prerequisite documents are uploaded and verified.",
  uploadHref = "/vendor/profile?tab=documents&edit=true",
  uploadButtonText = "Upload Required Documents",
  children,
}) {
  if (!isBlocked) {
    return children;
  }

  return (
    <div className="relative">
      {/* Sticky Lock Card Overlay */}
      <div className="absolute inset-0 z-20 bg-(--bgs)/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-start pt-12 sm:pt-20 p-6 text-center">
        <div className="sticky top-24 max-w-md w-full bg-(--bgs) border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <FiLock size={28} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-(--tp)">{title}</h3>
            <p className="text-xs sm:text-sm text-(--tm) mt-2 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={uploadHref}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg"
            >
              <FiFileText size={16} />
              {uploadButtonText}
            </Link>
          </div>
        </div>
      </div>

      {/* Visually dimmed and non-interactive form content */}
      <fieldset
        disabled={isBlocked}
        className="pointer-events-none select-none filter blur-[1px] opacity-40 border-0 p-0 m-0 min-w-0"
      >
        {children}
      </fieldset>
    </div>
  );
}
