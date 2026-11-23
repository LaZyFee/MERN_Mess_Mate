"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
 IoChevronBack,
 IoChevronForward,
 IoCalendarOutline,
 IoTimeOutline,
 IoClose,
} from "react-icons/io5";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
 "January",
 "February",
 "March",
 "April",
 "May",
 "June",
 "July",
 "August",
 "September",
 "October",
 "November",
 "December",
];

// Minute options are shown in 10-minute steps: 0, 10, 20, 30, 40, 50.
const MINUTE_STEP = 10;
const MINUTE_LIST = Array.from(
 { length: Math.ceil(60 / MINUTE_STEP) },
 (_, i) => i * MINUTE_STEP,
);

// Round an arbitrary minute onto the nearest selectable step (max 50).
function snapMinute(m) {
 return Math.min(Math.round(m / MINUTE_STEP) * MINUTE_STEP, 60 - MINUTE_STEP);
}

function pad(n) {
 return String(n).padStart(2, "0");
}

function to12h(h) {
 if (h === 0) return 12;
 if (h > 12) return h - 12;
 return h;
}

function buildCalendar(year, month) {
 const firstDay = new Date(year, month, 1).getDay();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const daysInPrev = new Date(year, month, 0).getDate();
 const cells = [];

 for (let i = firstDay - 1; i >= 0; i--) {
  cells.push({
   day: daysInPrev - i,
   month: month - 1,
   year: month === 0 ? year - 1 : year,
   outside: true,
  });
 }
 for (let d = 1; d <= daysInMonth; d++) {
  cells.push({ day: d, month, year, outside: false });
 }
 const remaining = 42 - cells.length;
 for (let d = 1; d <= remaining; d++) {
  cells.push({
   day: d,
   month: month + 1,
   year: month === 11 ? year + 1 : year,
   outside: true,
  });
 }
 return cells;
}

function parseValue(val) {
 if (!val) return null;
 if (val instanceof Date) {
  return isNaN(val.getTime()) ? null : val;
 }
 if (typeof val === "string") {
  const trimmed = val.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
   const [y, m, d] = trimmed.split("-").map(Number);
   return new Date(y, m - 1, d);
  }

  const timeMatch = trimmed.match(
   /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i,
  );
  if (timeMatch) {
   let h = parseInt(timeMatch[1], 10);
   const m = parseInt(timeMatch[2], 10);
   const meridiem = timeMatch[4]?.toLowerCase();
   if (meridiem === "pm" && h < 12) h += 12;
   if (meridiem === "am" && h === 12) h = 0;
   const d = new Date();
   d.setHours(h, m, 0, 0);
   return d;
  }
 }
 const d = new Date(val);
 return isNaN(d.getTime()) ? null : d;
}

/**
 * Custom DateTimePicker matching the site theme.
 */
export default function DateTimePicker({
 id,
 value,
 onChange,
 placeholder = "Select date & time",
 showTime = true,
 timeOnly = false,
 minDate,
 maxDate,
 disablePast = false,
 disableFuture = false,
 label,
 disabled = false,
 customTrigger,
 use24h = false,
 isRequired = false,
 isInvalid = false,
 errorMessage,
 size = "md",
}) {
 // Stable fallback id when the caller doesn't provide one. Without this,
 // every DateTimePicker instance in a list would share the same implicit
 // id — which broke label/trigger association and let validation styles
 // appear to leak between instances.
 const autoId = useId();
 const pickerId = id || autoId;

 const today = new Date();
 const parsed = parseValue(value);

 // Normalize boundary dates to avoid local time/midnight offset discrepancies
 const toStartOfDay = (d) => {
  if (!d) return null;
  const date = parseValue(d);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
 };

 const toEndOfDay = (d) => {
  if (!d) return null;
  const date = parseValue(d);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
 };

 const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
 const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

 let effectiveMin = minDate ? toStartOfDay(minDate) : null;
 if (disablePast) {
  effectiveMin = effectiveMin ? (effectiveMin > todayStart ? effectiveMin : todayStart) : todayStart;
 }

 let effectiveMax = maxDate ? toEndOfDay(maxDate) : null;
 if (disableFuture) {
  effectiveMax = effectiveMax ? (effectiveMax < todayEnd ? effectiveMax : todayEnd) : todayEnd;
 }

 const parsedMinTime =
  (typeof minDate === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(minDate)) ||
  minDate instanceof Date
   ? parseValue(minDate)
   : null;

 const parsedMaxTime =
  (typeof maxDate === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(maxDate)) ||
  maxDate instanceof Date
   ? parseValue(maxDate)
   : null;

 let initialHour = parsed
  ? parsed.getHours()
  : disablePast || timeOnly
   ? today.getHours()
   : 0;
 let initialMinute = parsed ? snapMinute(parsed.getMinutes()) : 0;

 if (!parsed && (disablePast || timeOnly)) {
  const nextStep = Math.ceil(today.getMinutes() / MINUTE_STEP) * MINUTE_STEP;
  if (nextStep >= 60) {
   initialHour = (initialHour + 1) % 24;
   initialMinute = 0;
  } else {
   initialMinute = nextStep;
  }
 }

 const defaultViewDate =
  parsed ||
  (effectiveMax && effectiveMax < today
   ? effectiveMax
   : effectiveMin && effectiveMin > today
    ? effectiveMin
    : today);

 const [open, setOpen] = useState(false);
 const [tab, setTab] = useState(timeOnly ? "time" : "date");
 const [is24h, setIs24h] = useState(use24h);
 const [ampm, setAmpm] = useState(initialHour >= 12 ? "PM" : "AM");
 const [viewYear, setViewYear] = useState(defaultViewDate.getFullYear());
 const [viewMonth, setViewMonth] = useState(defaultViewDate.getMonth());
 const [selectedDate, setSelectedDate] = useState(parsed);
 const [hour, setHour] = useState(initialHour);
 const [minute, setMinute] = useState(initialMinute);
 const [dateView, setDateView] = useState("calendar"); // "calendar", "month", "year"

 const wrapperRef = useRef(null);
 const hourScrollRef = useRef(null);
 const minScrollRef = useRef(null);
 const yearScrollRef = useRef(null);
 const dropdownRef = useRef(null);

 useEffect(() => {
  if (!open) return;
  setDateView("calendar"); // Reset view when opened
  if (timeOnly) {
   setTab("time");
  }
  if (!value && !selectedDate) {
   const defaultDate =
    effectiveMax && effectiveMax < today
     ? effectiveMax
     : effectiveMin && effectiveMin > today
      ? effectiveMin
      : today;
   setViewYear(defaultDate.getFullYear());
   setViewMonth(defaultDate.getMonth());
  }
  const onOutside = (e) => {
   const isInsideWrapper =
    wrapperRef.current && wrapperRef.current.contains(e.target);
   const isInsideDropdown =
    dropdownRef.current && dropdownRef.current.contains(e.target);
   if (!isInsideWrapper && !isInsideDropdown) {
    setOpen(false);
   }
  };
  document.addEventListener("mousedown", onOutside);
  return () => document.removeEventListener("mousedown", onOutside);
 }, [open, timeOnly]);

 // Scroll selected items into view
 useEffect(() => {
  if (tab !== "time") return;
  const ITEM_H = 37;
  if (hourScrollRef.current)
   hourScrollRef.current.scrollTop = hour * ITEM_H - 72;
  if (minScrollRef.current)
   minScrollRef.current.scrollTop =
    (snapMinute(minute) / MINUTE_STEP) * ITEM_H - 72;
 }, [tab, hour, minute]);

 useEffect(() => {
  if (dateView === "year" && yearScrollRef.current) {
   const btn = yearScrollRef.current.querySelector(".active");
   if (btn) {
    const container = yearScrollRef.current;
    container.scrollTop =
     btn.offsetTop - container.offsetHeight / 2 + btn.offsetHeight / 2;
   }
  }
 }, [dateView]);

 // Sync external value changes
 useEffect(() => {
  const p = parseValue(value);
  setSelectedDate(p);
  if (p) {
   setViewYear(p.getFullYear());
   setViewMonth(p.getMonth());
   setHour(p.getHours());
   setMinute(snapMinute(p.getMinutes()));
   setAmpm(p.getHours() >= 12 ? "PM" : "AM");
  }
 }, [value]);

 const emit = (date, h, m) => {
  const baseDate =
   date ||
   selectedDate ||
   (parsedMinTime ? new Date(parsedMinTime) : null) ||
   today;
  const d = new Date(baseDate);
  const snappedM = snapMinute(m);
  d.setHours(h, snappedM, 0, 0);
  setSelectedDate(d);

  if (!showTime && !timeOnly) {
   // Return only the date part YYYY-MM-DD
   const yyyy = d.getFullYear();
   const mm = String(d.getMonth() + 1).padStart(2, "0");
   const dd = String(d.getDate()).padStart(2, "0");
   onChange?.(`${yyyy}-${mm}-${dd}`);
  } else {
   onChange?.(d.toISOString());
  }
 };

 // Convert 12h display hour + ampm → 24h internal hour
 const resolve24h = (displayHour, currentAmpm) => {
  let h = displayHour % 12;
  if (currentAmpm === "PM") h += 12;
  return h;
 };

 const isHourDisabled = (h24, onDate = selectedDate) => {
  const checkDate = onDate || (timeOnly ? today : null);
  const isToday =
   checkDate &&
   checkDate.getDate() === today.getDate() &&
   checkDate.getMonth() === today.getMonth() &&
   checkDate.getFullYear() === today.getFullYear();

  if (disablePast && isToday && h24 < today.getHours()) {
   return true;
  }
  if (disableFuture && isToday && h24 > today.getHours()) {
   return true;
  }

  const isMinDay =
   checkDate &&
   parsedMinTime &&
   checkDate.getDate() === parsedMinTime.getDate() &&
   checkDate.getMonth() === parsedMinTime.getMonth() &&
   checkDate.getFullYear() === parsedMinTime.getFullYear();

  if (isMinDay && h24 < parsedMinTime.getHours()) {
   return true;
  }

  const isMaxDay =
   checkDate &&
   parsedMaxTime &&
   checkDate.getDate() === parsedMaxTime.getDate() &&
   checkDate.getMonth() === parsedMaxTime.getMonth() &&
   checkDate.getFullYear() === parsedMaxTime.getFullYear();

  if (isMaxDay && h24 > parsedMaxTime.getHours()) {
   return true;
  }

  return false;
 };

 const isMinuteDisabled = (m, checkHour = hour, onDate = selectedDate) => {
  const checkDate = onDate || (timeOnly ? today : null);
  const isToday =
   checkDate &&
   checkDate.getDate() === today.getDate() &&
   checkDate.getMonth() === today.getMonth() &&
   checkDate.getFullYear() === today.getFullYear();

  if (
   disablePast &&
   isToday &&
   checkHour === today.getHours() &&
   m < today.getMinutes()
  ) {
   return true;
  }
  if (
   disableFuture &&
   isToday &&
   checkHour === today.getHours() &&
   m > today.getMinutes()
  ) {
   return true;
  }

  const isMinDay =
   onDate &&
   parsedMinTime &&
   onDate.getDate() === parsedMinTime.getDate() &&
   onDate.getMonth() === parsedMinTime.getMonth() &&
   onDate.getFullYear() === parsedMinTime.getFullYear();

  if (
   isMinDay &&
   checkHour === parsedMinTime.getHours() &&
   m < parsedMinTime.getMinutes()
  ) {
   return true;
  }

  const isMaxDay =
   onDate &&
   parsedMaxTime &&
   onDate.getDate() === parsedMaxTime.getDate() &&
   onDate.getMonth() === parsedMaxTime.getMonth() &&
   onDate.getFullYear() === parsedMaxTime.getFullYear();

  if (
   isMaxDay &&
   checkHour === parsedMaxTime.getHours() &&
   m > parsedMaxTime.getMinutes()
  ) {
   return true;
  }

  return false;
 };

 // An hour is only usable when at least one stepped minute is valid for it.
 const hasSelectableMinute = (h24, onDate = selectedDate) =>
  MINUTE_LIST.some((m) => !isMinuteDisabled(m, h24, onDate));

 // First stepped minute (0, 10, …, 50) valid for the given hour/date.
 const firstEnabledMinute = (h24, onDate = selectedDate) => {
  const found = MINUTE_LIST.find((m) => !isMinuteDisabled(m, h24, onDate));
  return found === undefined ? null : found;
 };

 const isPeriodDisabled = (period, onDate = selectedDate) => {
  const startHour = period === "AM" ? 0 : 12;
  for (let h = startHour; h < startHour + 12; h++) {
   if (!isHourDisabled(h, onDate) && hasSelectableMinute(h, onDate)) {
    return false;
   }
  }
  return true;
 };

 // Keep the selected minute on a valid step for the current hour/date —
 // e.g. an externally supplied 10:37 against a 10:35 max, or "now" being
 // 10:57 with disablePast, where no stepped minute fits that hour.
 useEffect(() => {
  if (!showTime && !timeOnly) return;
  if (!isMinuteDisabled(minute, hour, selectedDate)) return;
  const fallback = firstEnabledMinute(hour, selectedDate);
  if (fallback !== null) {
   setMinute(fallback);
   return;
  }
  for (let i = 1; i <= 24; i++) {
   const h = (hour + i) % 24;
   if (isHourDisabled(h, selectedDate)) continue;
   const m = firstEnabledMinute(h, selectedDate);
   if (m !== null) {
    setHour(h);
    setMinute(m);
    setAmpm(h >= 12 ? "PM" : "AM");
    break;
   }
  }
 }, [hour, minute, selectedDate]);

 const selectDay = (cell) => {
  const d = new Date(cell.year, cell.month, cell.day);
  setSelectedDate(d);
  if (!cell.outside) {
   setViewYear(cell.year);
   setViewMonth(cell.month);
  }

  let nextHour = hour;
  let nextMinute = minute;

  if (showTime) {
   nextMinute = snapMinute(nextMinute);
   if (isHourDisabled(nextHour, d) || !hasSelectableMinute(nextHour, d)) {
    for (let h = 0; h < 24; h++) {
     if (!isHourDisabled(h, d) && hasSelectableMinute(h, d)) {
      nextHour = h;
      break;
     }
    }
   }
   if (isMinuteDisabled(nextMinute, nextHour, d)) {
    const fallback = firstEnabledMinute(nextHour, d);
    if (fallback !== null) nextMinute = fallback;
   }
   setHour(nextHour);
   setMinute(nextMinute);
   setAmpm(nextHour >= 12 ? "PM" : "AM");
  }

  if (!showTime) {
   emit(d, nextHour, nextMinute);
   setOpen(false);
  } else {
   setTab("time");
   emit(d, nextHour, nextMinute);
  }
 };

 const confirmTime = () => {
  emit(selectedDate, hour, minute);
  setOpen(false);
 };

 const isDisabledDay = (cell) => {
  if (cell.outside) return true;
  const d = new Date(cell.year, cell.month, cell.day, 0, 0, 0, 0);
  if (effectiveMin && d < effectiveMin) return true;
  if (effectiveMax && d > effectiveMax) return true;
  return false;
 };

 const isMonthDisabled = (monthIndex) => {
  const monthStart = new Date(viewYear, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(viewYear, monthIndex + 1, 0, 23, 59, 59, 999);
  if (effectiveMin && monthEnd < effectiveMin) return true;
  if (effectiveMax && monthStart > effectiveMax) return true;
  return false;
 };

 const isYearDisabled = (y) => {
  const yearStart = new Date(y, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
  if (effectiveMin && yearEnd < effectiveMin) return true;
  if (effectiveMax && yearStart > effectiveMax) return true;
  return false;
 };

 const isPrevMonthDisabled = () => {
  if (!effectiveMin) return false;
  const prevMonthEnd = new Date(viewYear, viewMonth, 0, 23, 59, 59, 999);
  return prevMonthEnd < effectiveMin;
 };

 const isNextMonthDisabled = () => {
  if (!effectiveMax) return false;
  const nextMonthStart = new Date(viewYear, viewMonth + 1, 1, 0, 0, 0, 0);
  return nextMonthStart > effectiveMax;
 };

 const isToday = (cell) => {
  const d = new Date(cell.year, cell.month, cell.day);
  return (
   d.getDate() === today.getDate() &&
   d.getMonth() === today.getMonth() &&
   d.getFullYear() === today.getFullYear()
  );
 };

 const isSelected = (cell) => {
  if (!selectedDate) return false;
  return (
   cell.day === selectedDate.getDate() &&
   cell.month === selectedDate.getMonth() &&
   cell.year === selectedDate.getFullYear()
  );
 };

 const prevMonth = () => {
  if (isPrevMonthDisabled()) return;
  if (viewMonth === 0) {
   setViewMonth(11);
   setViewYear((y) => y - 1);
  } else setViewMonth((m) => m - 1);
 };

 const nextMonth = () => {
  if (isNextMonthDisabled()) return;
  if (viewMonth === 11) {
   setViewMonth(0);
   setViewYear((y) => y + 1);
  } else setViewMonth((m) => m + 1);
 };

 const displayTime = () => {
  if (is24h) return `${pad(hour)}:${pad(minute)}`;
  return `${pad(to12h(hour))}:${pad(minute)} ${hour >= 12 ? "PM" : "AM"}`;
 };

 const [dropdownPos, setDropdownPos] = useState({
  top: 0,
  left: 0,
  width: 300,
 });
 const triggerRef = useRef(null);

 useEffect(() => {
  if (!open || !triggerRef.current) return;

  const updatePos = () => {
   if (!triggerRef.current) return;
   const rect = triggerRef.current.getBoundingClientRect();
   const scrollY = window.scrollY;
   const scrollX = window.scrollX;

   // Try to get real height if available, fallback to safe estimate
   const dropdownHeight = dropdownRef.current?.offsetHeight || 420;

   // Constrain width to viewport and maximum allowed
   let width = Math.min(340, Math.max(300, rect.width));
   if (width > window.innerWidth - 20) {
    width = window.innerWidth - 20;
   }

   // Default: show below
   let top = rect.bottom + scrollY + 8;
   let left = rect.left + scrollX;

   // Vertical collision check
   const spaceBelow = window.innerHeight - rect.bottom;
   const spaceAbove = rect.top;

   if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
    // Show above if there's more space above than below
    top = rect.top + scrollY - dropdownHeight - 8;
   }

   // Horizontal collision check
   if (left + width > window.innerWidth + scrollX) {
    // Align right edge to viewport right edge
    left = window.innerWidth - width - 10 + scrollX;
   }
   if (left < scrollX + 10) left = scrollX + 10; // Clamp to left edge

   setDropdownPos({ top, left, width });
  };

  // Run once on mount/open
  updatePos();

  // Run again after a tiny delay to catch the real height if it was just rendered
  const timer = setTimeout(updatePos, 0);

  window.addEventListener("scroll", updatePos, true);
  window.addEventListener("resize", updatePos);
  return () => {
   clearTimeout(timer);
   window.removeEventListener("scroll", updatePos, true);
   window.removeEventListener("resize", updatePos);
  };
 }, [open, tab, dateView]);

 const displayValue = () => {
  if (!selectedDate) return null;
  if (timeOnly) {
   return displayTime();
  }
  const dateStr = `${MONTHS[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  if (!showTime) return dateStr;
  return `${dateStr} ${displayTime()}`;
 };

 const hourList = is24h
  ? Array.from({ length: 24 }, (_, h) => h)
  : Array.from({ length: 12 }, (_, h) => h + 1);

 const cells = buildCalendar(viewYear, viewMonth);

 const dropdownContent = open && (
  <div
   ref={dropdownRef}
   style={{
    position: "absolute",
    top: `${dropdownPos.top}px`,
    left: `${dropdownPos.left}px`,
    width: `${dropdownPos.width}px`,
    maxWidth: "340px",
    zIndex: 2147483647, // Max z-index
    background: "var(--bgs)",
    border: "1.5px solid var(--bd2)",
    borderRadius: "var(--r-lg)",
    boxShadow: "var(--shadow-xl)",
    overflow: "hidden",
    animation: "dtpFadeIn 0.15s ease-out",
   }}
  >
   <style
    dangerouslySetInnerHTML={{
     __html: `
        @keyframes dtpFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to  { opacity: 1; transform: translateY(0); }
        }
        .dtp-day-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--tp);
          transition: background 0.14s, color 0.14s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dtp-day-btn:hover:not(:disabled) {
          background: var(--pale);
          color: var(--p);
        }
        .dtp-day-btn.today {
          border: 1.5px solid var(--p);
          color: var(--p);
        }
        .dtp-day-btn.selected {
          background: var(--p) !important;
          color: var(--bgs) !important;
          font-weight: 800;
        }
        .dtp-day-btn.outside {
          color: var(--tl);
          opacity: 0.45;
        }
        .dtp-day-btn:disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }
        .dtp-time-scroll {
          height: 180px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--p2) var(--bgm);
        }
        .dtp-time-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .dtp-time-scroll::-webkit-scrollbar-track {
          background: var(--bgm);
          border-radius: 999px;
        }
        .dtp-time-scroll::-webkit-scrollbar-thumb {
          background: var(--p2);
          border-radius: 999px;
        }
        .dtp-time-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--p);
        }
        .dtp-time-item {
          height: 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--ts);
          border-radius: var(--r-sm);
          transition: background 0.12s, color 0.12s;
          user-select: none;
        }
        .dtp-time-item:hover {
          background: var(--pale);
          color: var(--p);
        }
        .dtp-time-item.active {
          background: var(--p);
          color: var(--bgs);
          font-weight: 800;
        }
        .dtp-tab-btn {
          flex: 1;
          padding: 9px 0;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: color 0.15s, background 0.15s;
          border-bottom: 2px solid transparent;
        }
        .dtp-tab-btn.active {
          color: var(--p);
          border-bottom-color: var(--p);
        }
        .dtp-tab-btn:not(.active) {
          color: var(--tm);
        }
        .dtp-nav-btn {
          width: 32px;
          height: 32px;
          border: 1.5px solid var(--bd2);
          border-radius: var(--r-sm);
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--tm);
          transition: background 0.14s, color 0.14s, border-color 0.14s;
        }
        .dtp-nav-btn:hover {
          background: var(--pale);
          color: var(--p);
          border-color: var(--p);
        }
        .dtp-nav-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
          pointer-events: none;
        }
        .dtp-grid-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
          pointer-events: none;
        }
        .dtp-time-item.disabled {
          opacity: 0.25;
          cursor: not-allowed;
          pointer-events: none;
        }
        .dtp-format-toggle {
          display: flex;
          border-radius: var(--r-sm);
          overflow: hidden;
          border: 1.5px solid var(--bd2);
        }
        .dtp-format-btn {
          flex: 1;
          padding: 4px 10px;
          border: none;
          background: transparent;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          cursor: pointer;
          color: var(--tm);
          transition: background 0.14s, color 0.14s;
        }
        .dtp-format-btn.active {
          background: var(--p);
          color: var(--bgs);
        }
        .dtp-ampm-btn {
          width: 46px;
          padding: 0;
          border: none;
          border-radius: var(--r-sm);
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: background 0.14s, color 0.14s;
        }
        .dtp-ampm-btn.active {
          background: var(--p);
          color: var(--bgs);
        }
        .dtp-ampm-btn:not(.active) {
          background: var(--bgm);
          color: var(--tm);
        }
        .dtp-select {
          appearance: none;
          -webkit-appearance: none;
          background-color: var(--bg);
          border: 1.5px solid var(--bd2);
          color: var(--tp);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          outline: none;
          font-family: inherit;
          padding: 4px 22px 4px 8px;
          border-radius: var(--r-sm);
          transition: all 0.15s ease;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%23888888%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 6px center;
        }
        .dtp-select:hover, .dtp-select:focus {
          border-color: var(--p);
          background-color: var(--pale);
        }
        .dtp-select-wrapper {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .dtp-grid-btn {
          padding: 10px 4px;
          border: 1.5px solid transparent;
          background: var(--bg);
          border-radius: var(--r-sm);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--ts);
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dtp-grid-btn:hover {
          background: var(--pale);
          color: var(--p);
        }
        .dtp-grid-btn.active {
          background: var(--p);
          color: var(--bgs);
          border-color: var(--p);
        }
        .dtp-grid-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 4px 0;
        }
        .dtp-year-scroll {
          max-height: 250px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--p2) var(--bgm);
          padding-right: 4px;
          border-radius: 15px;
        }
        .dtp-year-scroll::-webkit-scrollbar { width: 5px; }
        .dtp-year-scroll::-webkit-scrollbar-track { background: var(--bgm); border-radius: 999px; }
        .dtp-year-scroll::-webkit-scrollbar-thumb { background: var(--p2); border-radius: 999px; }
      `,
    }}
   />

   {/* Tabs */}
   {showTime && !timeOnly && (
    <div
     style={{
      display: "flex",
      borderBottom: "1.5px solid var(--bd)",
      background: "var(--bg)",
     }}
    >
     <button
      type="button"
      className={`dtp-tab-btn ${tab === "date" ? "active" : ""}`}
      onClick={() => setTab("date")}
     >
      <IoCalendarOutline /> Date
     </button>
     <button
      type="button"
      className={`dtp-tab-btn ${tab === "time" ? "active" : ""}`}
      onClick={() => setTab("time")}
     >
      <IoTimeOutline /> Time
     </button>
    </div>
   )}

   {/* Date Panel */}
   {tab === "date" && (
    <div style={{ padding: "16px", height: "340px", overflow: "hidden" }}>
     {dateView === "calendar" && (
      <>
       {/* Month/Year Nav */}
       <div
        style={{
         display: "flex",
         alignItems: "center",
         justifyContent: "space-between",
         marginBottom: "14px",
        }}
       >
        <button
         type="button"
         className="dtp-nav-btn"
         disabled={isPrevMonthDisabled()}
         onClick={prevMonth}
        >
         <IoChevronBack style={{ fontSize: "0.95rem" }} />
        </button>

        <div className="dtp-select-wrapper">
         <button
          type="button"
          onClick={() => setDateView("month")}
          className="dtp-select"
          style={{
           borderRadius: "8px",
           fontSize: "0.75rem",
           padding: "8px 24px 8px 12px",
          }}
         >
          {MONTHS[viewMonth].slice(0, 3)}
         </button>
         <button
          type="button"
          onClick={() => setDateView("year")}
          className="dtp-select"
          style={{
           borderRadius: "8px",
           fontSize: "0.75rem",
           padding: "8px 24px 8px 12px",
          }}
         >
          {viewYear}
         </button>
        </div>

        <button
         type="button"
         className="dtp-nav-btn"
         disabled={isNextMonthDisabled()}
         onClick={nextMonth}
        >
         <IoChevronForward style={{ fontSize: "0.95rem" }} />
        </button>
       </div>

       {/* Day labels */}
       <div
        style={{
         display: "grid",
         gridTemplateColumns: "repeat(7, 1fr)",
         marginBottom: "6px",
        }}
       >
        {DAYS.map((d) => (
         <div
          key={d}
          style={{
           textAlign: "center",
           fontSize: "0.7rem",
           fontWeight: 800,
           textTransform: "uppercase",
           letterSpacing: "0.05em",
           color: "var(--tl)",
           paddingBottom: "4px",
          }}
         >
          {d}
         </div>
        ))}
       </div>

       {/* Day cells */}
       <div
        style={{
         display: "grid",
         gridTemplateColumns: "repeat(7, 1fr)",
         gap: "2px",
        }}
       >
        {cells.map((cell, i) => (
         <div
          key={i}
          style={{ display: "flex", justifyContent: "center" }}
         >
          <button
           type="button"
           disabled={isDisabledDay(cell)}
           className={`dtp-day-btn ${cell.outside ? "outside" : ""} ${isToday(cell) && !isSelected(cell) ? "today" : ""} ${isSelected(cell) ? "selected" : ""}`}
           onClick={() => !isDisabledDay(cell) && selectDay(cell)}
          >
           {cell.day}
          </button>
         </div>
        ))}
       </div>

       {showTime && (
        <p
         style={{
          textAlign: "center",
          fontSize: "0.72rem",
          color: "var(--tl)",
          marginTop: "12px",
          fontWeight: 600,
         }}
        >
         Select a date, then set the time →
        </p>
       )}
      </>
     )}

     {dateView === "month" && (
      <>
       <div
        style={{
         display: "flex",
         alignItems: "center",
         justifyContent: "space-between",
         marginBottom: "14px",
        }}
       >
        <button
         type="button"
         className="dtp-nav-btn"
         onClick={() => setDateView("calendar")}
        >
         <IoChevronBack style={{ fontSize: "0.95rem" }} />
        </button>
        <span
         style={{
          fontWeight: 800,
          fontSize: "0.95rem",
          color: "var(--tp)",
         }}
        >
         Select Month
        </span>
        <div style={{ width: "32px" }}></div>
       </div>
       <div
        className="dtp-grid-container"
        style={{ height: "250px", gridTemplateRows: "repeat(4, 1fr)" }}
       >
        {MONTHS.map((m, i) => (
         <button
          type="button"
          key={m}
          disabled={isMonthDisabled(i)}
          className={`dtp-grid-btn ${i === viewMonth ? "active" : ""}`}
          onClick={() => {
           if (!isMonthDisabled(i)) {
            setViewMonth(i);
            setDateView("calendar");
           }
          }}
         >
          {m.slice(0, 3)}
         </button>
        ))}
       </div>
      </>
     )}

     {dateView === "year" && (
      <>
       <div
        style={{
         display: "flex",
         alignItems: "center",
         justifyContent: "space-between",
         marginBottom: "14px",
        }}
       >
        <button
         type="button"
         className="dtp-nav-btn"
         onClick={() => setDateView("calendar")}
        >
         <IoChevronBack style={{ fontSize: "0.95rem" }} />
        </button>
        <span
         style={{
          fontWeight: 800,
          fontSize: "0.95rem",
          color: "var(--tp)",
         }}
        >
         Select Year
        </span>
        <div style={{ width: "32px" }}></div>
       </div>
       <div
        className="dtp-grid-container dtp-year-scroll"
        ref={yearScrollRef}
       >
        {Array.from({ length: 201 }, (_, i) => 1900 + i).map((y) => (
         <button
          type="button"
          key={y}
          disabled={isYearDisabled(y)}
          className={`dtp-grid-btn ${y === viewYear ? "active" : ""}`}
          onClick={() => {
           if (!isYearDisabled(y)) {
            setViewYear(y);
            setDateView("calendar");
           }
          }}
         >
          {y}
         </button>
        ))}
       </div>
      </>
     )}
    </div>
   )}

   {/* Time Panel */}
   {(tab === "time" || timeOnly) && (showTime || timeOnly) && (
    <div style={{ padding: "16px", height: "340px", overflow: "hidden" }}>
     {/* Header: big clock + format toggle */}
     <div
      style={{
       display: "flex",
       alignItems: "center",
       justifyContent: "space-between",
       marginBottom: "14px",
      }}
     >
      {/* Big time display */}
      <span
       style={{
        fontSize: "2.4rem",
        fontWeight: 900,
        color: "var(--p)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
       }}
      >
       {is24h ? pad(hour) : pad(to12h(hour))}
       <span style={{ opacity: 0.35, margin: "0 2px" }}>:</span>
       {pad(minute)}
       {!is24h && (
        <span
         style={{
          fontSize: "1rem",
          fontWeight: 800,
          marginLeft: "6px",
          color: "var(--ts)",
         }}
        >
         {hour >= 12 ? "PM" : "AM"}
        </span>
       )}
      </span>

      {/* 12h / 24h toggle */}
      <div className="dtp-format-toggle">
       <button
        type="button"
        className={`dtp-format-btn ${!is24h ? "active" : ""}`}
        onClick={() => setIs24h(false)}
       >
        12H
       </button>
       <button
        type="button"
        className={`dtp-format-btn ${is24h ? "active" : ""}`}
        onClick={() => setIs24h(true)}
       >
        24H
       </button>
      </div>
     </div>

     {/* Columns: Hour | Minute | (AM/PM if 12h) */}
     <div
      style={{
       display: "grid",
       gridTemplateColumns: is24h ? "1fr 1fr" : "1fr 1fr 46px",
       gap: "10px",
      }}
     >
      {/* Hour */}
      <div>
       <p
        style={{
         textAlign: "center",
         fontSize: "0.68rem",
         fontWeight: 700,
         textTransform: "uppercase",
         letterSpacing: "0.06em",
         color: "var(--tl)",
         marginBottom: "6px",
        }}
       >
        Hour
       </p>
       <div className="dtp-time-scroll" ref={hourScrollRef}>
        {hourList.map((h) => {
         const h24 = is24h ? h : resolve24h(h, ampm);
         const disabledHour =
          isHourDisabled(h24) || !hasSelectableMinute(h24);
         const active24 = is24h ? h === hour : to12h(hour) === h;
         return (
          <div
           key={h}
           className={`dtp-time-item ${active24 ? "active" : ""} ${disabledHour ? "disabled" : ""}`}
           onClick={() => {
            if (disabledHour) return;
            const nextH = is24h ? h : resolve24h(h, ampm);
            const nextM = isMinuteDisabled(minute, nextH)
             ? (firstEnabledMinute(nextH) ?? minute)
             : minute;
            setHour(nextH);
            setMinute(nextM);
            emit(selectedDate, nextH, nextM);
           }}
           style={disabledHour ? { opacity: 0.25, cursor: "not-allowed", pointerEvents: "none" } : {}}
          >
           {pad(h)}
          </div>
         );
        })}
       </div>
      </div>

      {/* Minute */}
      <div>
       <p
        style={{
         textAlign: "center",
         fontSize: "0.68rem",
         fontWeight: 700,
         textTransform: "uppercase",
         letterSpacing: "0.06em",
         color: "var(--tl)",
         marginBottom: "6px",
        }}
       >
        Min
       </p>
       <div className="dtp-time-scroll" ref={minScrollRef}>
        {MINUTE_LIST.map((m) => {
         const disabledMin = isMinuteDisabled(m);
         return (
          <div
           key={m}
           className={`dtp-time-item ${m === minute ? "active" : ""} ${disabledMin ? "disabled" : ""}`}
           onClick={() => {
            if (disabledMin) return;
            setMinute(m);
            emit(selectedDate, hour, m);
           }}
           style={disabledMin ? { opacity: 0.25, cursor: "not-allowed", pointerEvents: "none" } : {}}
          >
           {pad(m)}
          </div>
         );
        })}
       </div>
      </div>

      {/* AM / PM column (12h only) */}
      {!is24h && (
       <div>
        <p
         style={{
          textAlign: "center",
          fontSize: "0.68rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--tl)",
          marginBottom: "6px",
         }}
        >
         &nbsp;
        </p>
        <div
         style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          height: "180px",
          justifyContent: "center",
         }}
        >
         {["AM", "PM"].map((period) => {
          const disabledPeriod = isPeriodDisabled(period);
          return (
           <button
            type="button"
            key={period}
            disabled={disabledPeriod}
            className={`dtp-ampm-btn ${(period === "AM" ? hour < 12 : hour >= 12) ? "active" : ""}`}
            style={disabledPeriod ? { opacity: 0.25, cursor: "not-allowed", pointerEvents: "none" } : {}}
            onClick={() => {
             if (disabledPeriod) return;
             setAmpm(period);
             const resolved = resolve24h(to12h(hour), period);
             let validHour = resolved;
             if (
              isHourDisabled(validHour) ||
              !hasSelectableMinute(validHour)
             ) {
              const startH = period === "AM" ? 0 : 12;
              for (let h = startH; h < startH + 12; h++) {
               if (
                !isHourDisabled(h) &&
                hasSelectableMinute(h)
               ) {
                validHour = h;
                break;
               }
              }
             }
             const validMinute = isMinuteDisabled(
              minute,
              validHour,
             )
              ? (firstEnabledMinute(validHour) ?? minute)
              : minute;
             setHour(validHour);
             setMinute(validMinute);
             emit(selectedDate, validHour, validMinute);
            }}
           >
            {period}
           </button>
          );
         })}
        </div>
       </div>
      )}
     </div>

     <button
      type="button"
      onClick={confirmTime}
      style={{
       marginTop: "14px",
       width: "100%",
       padding: "10px",
       background: "var(--p)",
       color: "var(--bgs)",
       border: "none",
       borderRadius: "8px",
       fontSize: "0.88rem",
       fontWeight: 800,
       letterSpacing: "0.04em",
       cursor: "pointer",
       transition: "opacity 0.15s",
      }}
     >
      Confirm
     </button>
    </div>
   )}
  </div>
 );

 return (
  <div
   className="dtp-root"
   ref={wrapperRef}
   style={{
    position: "relative",
    display: "inline-block",
    width: "100%",
    zIndex: open ? 999 : 1,
   }}
  >
   {label && (
    <label
     className={`block font-semibold mb-2 ${
      isInvalid ? "text-(--danger)" : "text-(--ts)"
     } ${
      size === "sm"
       ? "text-[11px]"
       : size === "md"
        ? "text-[13px]"
        : size === "lg"
         ? "text-[13.5px]"
         : "text-[15px]"
     }`}
     htmlFor={pickerId}
    >
     {label}
     {isRequired && (
      <span style={{ color: "var(--red-500)", marginLeft: "4px" }}>
       *
      </span>
     )}
    </label>
   )}

   {/* Trigger */}
   <div ref={triggerRef} style={{ width: "100%" }}>
    {customTrigger ? (
     <div
      onClick={() => !disabled && setOpen((o) => !o)}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
     >
      {customTrigger}
     </div>
    ) : (
     <button
      type="button"
      id={pickerId}
      disabled={disabled}
      onClick={() => !disabled && setOpen((o) => !o)}
      style={{
       width: "100%",
       display: "flex",
       alignItems: "center",
       gap: "10px",
       height:
        size === "sm"
         ? "2rem"
         : size === "md"
          ? "2.5rem"
          : size === "lg"
           ? "3rem"
           : "3.5rem",
       padding:
        size === "sm"
         ? "0 0.75rem"
         : size === "md" || size === "lg"
          ? "0 1rem"
          : "0 1.25rem",
       borderRadius: size === "sm" ? "0.75rem" : "1rem",
       border: `1.5px solid ${isInvalid ? "var(--red-500)" : open ? "var(--p)" : "var(--bd2)"}`,
       background: open ? "var(--pale)" : "var(--bgs)",
       color: displayValue() ? "var(--tp)" : "var(--tl)",
       fontSize:
        size === "sm"
         ? "0.75rem"
         : size === "md" || size === "lg"
          ? "0.875rem"
          : "1rem",
       fontWeight: 500,
       cursor: disabled ? "not-allowed" : "pointer",
       transition:
        "border-color 0.18s, background 0.18s, box-shadow 0.18s",
       boxShadow: open ? "0 0 0 4px var(--pale)" : "none",
       opacity: disabled ? 0.5 : 1,
       outline: "none",
       textAlign: "left",
      }}
     >
      {timeOnly ? (
       <IoTimeOutline
        style={{
         color: "var(--p)",
         fontSize:
          size === "sm"
           ? "0.95rem"
           : size === "md" || size === "lg"
            ? "1.1rem"
            : "1.25rem",
         flexShrink: 0,
        }}
       />
      ) : (
       <IoCalendarOutline
        style={{
         color: "var(--p)",
         fontSize:
          size === "sm"
           ? "0.95rem"
           : size === "md" || size === "lg"
            ? "1.1rem"
            : "1.25rem",
         flexShrink: 0,
        }}
       />
      )}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
       {displayValue() ?? placeholder}
      </span>
      {selectedDate && !disabled && (
       <span
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
         e.key === "Enter" &&
         (e.stopPropagation(), setSelectedDate(null), onChange?.(""))
        }
        onClick={(e) => {
         e.stopPropagation();
         setSelectedDate(null);
         onChange?.("");
        }}
        style={{ color: "var(--tl)", lineHeight: 1, cursor: "pointer" }}
       >
        <IoClose style={{ fontSize: "1rem" }} />
       </span>
      )}
     </button>
    )}
   </div>

   {/* Dropdown via Portal */}
   {open &&
    typeof document !== "undefined" &&
    createPortal(dropdownContent, document.body)}

   {isInvalid && errorMessage && (
    <div className="mt-1.5 text-xs text-(--danger)" role="alert">
     {errorMessage}
    </div>
   )}
  </div>
 );
}