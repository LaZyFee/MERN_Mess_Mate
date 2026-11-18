"use client";

import React, { useMemo } from "react";
import { FiCheck, FiShield, FiAlertCircle } from "react-icons/fi";

/**
 * Calculates password strength and returns score (0-4), status, and checks.
 */
export function getPasswordStrength(password = "") {
  const pwd = String(password || "");

  const checks = [
    {
      id: "length",
      label: "At least 8 characters",
      met: pwd.length >= 8,
    },
    {
      id: "uppercase",
      label: "At least 1 uppercase letter (A-Z)",
      met: /[A-Z]/.test(pwd),
    },
    {
      id: "lowercase",
      label: "At least 1 lowercase letter (a-z)",
      met: /[a-z]/.test(pwd),
    },
    {
      id: "number",
      label: "At least 1 number (0-9)",
      met: /[0-9]/.test(pwd),
    },
    {
      id: "special",
      label: "At least 1 special symbol (!@#$%^&*)",
      met: /[^A-Za-z0-9]/.test(pwd),
    },
  ];

  const metCount = checks.filter((c) => c.met).length;

  // Derive score from 0 to 4
  let score = 0;
  if (pwd.length === 0) {
    score = 0;
  } else if (pwd.length < 6) {
    score = 1; // Very short
  } else if (metCount <= 2) {
    score = 1;
  } else if (metCount === 3) {
    score = 2;
  } else if (metCount === 4) {
    score = 3;
  } else if (metCount === 5) {
    score = 4;
  }

  // Bonus for 12+ chars if at least 3 criteria met
  if (pwd.length >= 12 && metCount >= 4) {
    score = 4;
  }

  const levels = [
    {
      label: "Too weak",
      color: "bg-gray-200 dark:bg-gray-700",
      textColor: "text-gray-400",
      pillBg: "bg-gray-100 dark:bg-gray-800 text-gray-500",
    },
    {
      label: "Weak",
      color: "bg-red-500",
      textColor: "text-red-500",
      pillBg:
        "bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50",
    },
    {
      label: "Fair",
      color: "bg-amber-500",
      textColor: "text-amber-500",
      pillBg:
        "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/50",
    },
    {
      label: "Good",
      color: "bg-sky-500",
      textColor: "text-sky-600",
      pillBg:
        "bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-900/50",
    },
    {
      label: "Strong",
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      pillBg:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-900/50",
    },
  ];

  const currentLevel = levels[score] || levels[0];

  // Actionable suggestions
  const unmetChecks = checks.filter((c) => !c.met);
  let suggestion = "";
  if (pwd.length === 0) {
    suggestion =
      "Enter a strong password with a mix of letters, numbers & symbols.";
  } else if (unmetChecks.length > 0) {
    const firstMissing = unmetChecks[0];
    suggestion = `Suggestion: ${firstMissing.label.replace("At least 1 ", "Add a ")}.`;
  } else {
    suggestion = "Great! Your password is strong and secure.";
  }

  return {
    score, // 0 to 4
    level: currentLevel,
    checks,
    unmetChecks,
    suggestion,
    isStrong: score >= 3,
  };
}

/**
 * Reusable PasswordStrengthMeter component
 */
export default function PasswordStrengthMeter({
  password = "",
  showSuggestions = true,
  compact = false,
  className = "",
}) {
  const { score, level, checks, suggestion, isStrong } = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const hasInput = Boolean(password && password.length > 0);

  return (
    <div
      className={`space-y-2 mt-2 w-full transition-all duration-200 ${className}`}
    >
      {/* Meter Bar and Score Label */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 flex gap-1.5 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 p-0.5">
          {[1, 2, 3, 4].map((step) => {
            const isFilled = hasInput && score >= step;
            return (
              <div
                key={step}
                className={`flex-1 h-full rounded-full transition-all duration-300 ${
                  isFilled ? level.color : "bg-gray-200 dark:bg-gray-700/60"
                }`}
              />
            );
          })}
        </div>

        {hasInput && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all shrink-0 ${level.pillBg}`}
          >
            {level.label}
          </span>
        )}
      </div>

      {/* Live Suggestions & Requirements */}
      {showSuggestions && hasInput && (
        <div className="rounded-xl border border-(--bd2) bg-(--bgl)/40 p-2.5 sm:p-3 space-y-2 text-xs">
          {/* Actionable tip banner */}
          <div className="flex items-center gap-1.5 text-[11.5px]">
            {isStrong ? (
              <FiShield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <FiAlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span
              className={`font-medium truncate ${
                isStrong
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {suggestion}
            </span>
          </div>

          {!compact && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-(--bd2)/60 text-[11px]">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-center gap-1.5 transition-colors ${
                    check.met
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-(--tm)/70"
                  }`}
                >
                  {check.met ? (
                    <FiCheck className="w-3 h-3 text-emerald-500 shrink-0 stroke-[2.5]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-(--tm)/40 shrink-0 ml-0.5 mr-1" />
                  )}
                  <span className="truncate">{check.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
