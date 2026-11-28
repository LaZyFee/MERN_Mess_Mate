"use client";

/**
 * Feature-level layout helpers for the group tabs.
 * These are thin compositions of the shared components (Card, Button, Skeleton,
 * Badge) so every tab gets the same mobile-first rhythm:
 *
 *   <SectionCard icon={LuReceipt} title="Expenses" actions={…}>…</SectionCard>
 *   <EmptyState icon={LuReceipt} title="…" body="…" action={…} />
 *
 * Nothing here hardcodes colours — every tone maps to a CSS variable.
 */
import { LuInbox } from "react-icons/lu";
import Button from "@/components/shared/Button";

/** Page-level section heading for tabs that are not wrapped in a card. */
export function TabHeading({ eyebrow, title, description, actions, className = "" }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-2 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-(--p)">{eyebrow}</p>
        )}
        <h2 className="mt-0.5 truncate text-[17px] font-extrabold leading-tight tracking-tight text-(--tp) sm:text-lg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-(--tm)">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/**
 * Card with a consistent header: round icon chip, bold title, right-side actions.
 * `footer` renders a sticky-ish action bar on mobile.
 */
export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
  footer,
  className = "",
  bodyClassName = "",
  tone = "default",
}) {
  const chipTone =
    tone === "warning"
      ? "bg-(--warning-bg) text-(--warning)"
      : tone === "danger"
        ? "bg-(--danger-bg) text-(--danger)"
        : "bg-(--pale) text-(--p)";

  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs) ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-(--bd) px-3.5 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${chipTone}`}>
                <Icon size={14} />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-bold text-(--tp)">{title}</h2>}
              {subtitle && <p className="truncate text-[11px] leading-tight text-(--tm)">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={`min-w-0 px-3.5 py-3 sm:px-4 ${bodyClassName}`}>{children}</div>
      {footer && <div className="border-t border-(--bd) px-3.5 py-2.5 sm:px-4">{footer}</div>}
    </section>
  );
}

/** Friendly empty state — icon, title, body and an optional CTA. */
export function EmptyState({ icon: Icon = LuInbox, title, body, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center px-4 py-8 text-center ${className}`}>
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-(--bgm) text-(--tl)">
        <Icon size={22} />
      </span>
      {title && <p className="text-sm font-bold text-(--tp)">{title}</p>}
      {body && <p className="mt-1 max-w-xs text-xs leading-relaxed text-(--tm)">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Inline "stat" chip used inside cards and summary strips. */
export function MiniStat({ label, value, tone = "default", className = "" }) {
  const valueTone =
    tone === "danger"
      ? "text-(--danger)"
      : tone === "success"
        ? "text-(--success)"
        : tone === "warning"
          ? "text-(--warning)"
          : "text-(--tp)";
  return (
    <div className={`min-w-0 rounded-xl bg-(--bgm) px-2.5 py-2 ${className}`}>
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-extrabold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}

/** Horizontally scrollable segmented control (mobile-friendly pill tabs). */
export function SegmentedControl({ options, value, onChange, ariaLabel, className = "" }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(optionValue)}
            className={`inline-flex min-h-10 shrink-0 snap-center items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${active
                ? "bg-(--p) text-(--bgs) shadow-sm shadow-(--p)/25"
                : "border border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--p)/50 hover:text-(--p)"
              }`}
          >
            {Icon && <Icon size={14} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Sticky bottom action bar (mobile) that becomes inline on desktop. */
export function StickyActions({ children, className = "" }) {
  return (
    <div
      className={`sticky bottom-2 z-20 rounded-2xl border border-(--bd) bg-(--glb) p-2 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none ${className}`}
    >
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export { Button };
