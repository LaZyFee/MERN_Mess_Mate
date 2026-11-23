"use client";
import Link from "next/link";
import { sanitizeHtml } from "@/utils/sanitize";

/**
 * SectionHeader
 *
 * @prop {string}  rotatedLabel  — vertical side label     default: ""
 * @prop {string}  eyebrow    — small line above headline  default: ""
 * @prop {string[]} headingLines  — array of 1–4 lines; middle line(s) get the gradient
 * @prop {string}  ctaLabel    — button text         default: ""
 * @prop {string}  ctaHref    — button link         default: ""
 * @prop {string}  description  — supporting copy below header default: ""
 * @prop {string}  accentFrom   — gradient start color     default: "var(--p)"
 * @prop {string}  accentTo    — gradient end color      default: "var(--p2)"
 */
export default function SectionHeader({
 rotatedLabel = "",
 eyebrow = "",
 headingLines = [],
 ctaLabel = "",
 ctaHref = "",
 description = "",
 accentFrom = "var(--p)",
 accentTo = "var(--p2)",
}) {
 const isAccent = (i) => i > 0 && i < headingLines.length - 1;

 return (
  <div className="flex flex-col mb-16">
   <div className="flex items-stretch gap-8 lg:gap-12">
    {/* Vertical rotated label */}
    <div className="hidden lg:flex flex-col items-center gap-3 shrink-0">
     <div className="w-px flex-1 min-h-12 bg-(--p)/30" />
     <span
      className="text-[10px] font-bold uppercase tracking-[0.25em] whitespace-nowrap text-(--tm) transition-colors duration-300"
      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
     >
      {rotatedLabel}
     </span>
    </div>

    {/* Headline block */}
    <div className="flex-1 flex flex-col gap-8">
     <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="flex-1">
       {/* Eyebrow */}
       <div className="flex items-center gap-3 mb-5">
        <span className="h-px w-12 bg-(--bd)" />
        <span className="text-xs font-semibold uppercase tracking-widest text-(--p)">
         {eyebrow}
        </span>
       </div>

       {/* Headline */}
       <h2
        className="font-bold leading-none tracking-tight text-(--tp)"
        style={{ fontSize: "clamp(2rem, 4vw, 4rem)" }}
       >
        {headingLines.map((line, i) =>
         isAccent(i) ? (
          <span
           key={i}
           className="block text-(--p)"
           dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }}
          />
         ) : (
          <span
           key={i}
           className="block text-(--tp)"
           dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }}
          />
         ),
        )}
       </h2>
      </div>

      {/* CTA */}
      {ctaLabel && ctaHref && (
       <Link
        href={ctaHref}
        className="group shrink-0 inline-flex items-center gap-4 bg-(--tp) text-(--bg) px-7 py-4 font-bold text-sm uppercase tracking-widest transition-all duration-300 hover:bg-(--p) hover:-translate-y-0.5"
        style={{
         clipPath:
          "polygon(0 0, calc(100% - 14px) 0, 100% 100%, 14px 100%)",
        }}
       >
        <span>{ctaLabel}</span>
        <span className="text-lg text-(--p) group-hover:text-(--bg) transition-colors duration-300">
         ↗
        </span>
       </Link>
      )}
     </div>

     {/* Description */}
     {description && (
      <div className="max-w-2xl">
       <p className="text-(--tm) text-[0.95rem] leading-relaxed">
        {description}
       </p>
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
