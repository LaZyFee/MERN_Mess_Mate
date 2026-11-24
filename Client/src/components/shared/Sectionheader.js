"use client";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { sanitizeHtml } from "@/utils/sanitize";
/**
 * SectionHeader — marketing header block (props: rotatedLabel, eyebrow, headingLines[], ctaLabel, ctaHref, description).
 */
export default function SectionHeader({
 rotatedLabel = "",
 eyebrow = "",
 headingLines = [],
 ctaLabel = "",
 ctaHref = "",
 description = "",
}) {
 const isAccent = (i) => i > 0 && i < headingLines.length - 1;

 return (
  <div className="flex flex-col mb-16">
   <div className="flex items-stretch gap-8 lg:gap-12">
    {/* Vertical rotated label */}
    <div className="hidden lg:flex flex-col items-center gap-3 shrink-0">
     <div className="w-px flex-1 min-h-12 bg-(--p)/30" />
     <span
      className="text-[10px] font-bold uppercase tracking-[0.25em] whitespace-nowrap text-(--tm) transition-colors duration-300 [writing-mode:vertical-rl][-rotate-180]"
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
        className="font-bold leading-none tracking-tight text-(--tp) [font-size:var(--headline-size)]"
        style={{ "--headline-size": "clamp(2rem, 4vw, 4rem)" }}
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
        className="group shrink-0 inline-flex items-center gap-4 bg-(--tp) text-(--bg) px-7 py-4 font-bold text-sm uppercase tracking-widest transition-all duration-300 hover:bg-(--p) hover:-translate-y-0.5 [clip-path:polygon(0_0,_calc(100%_-_14px)_0,_100%_100%,_14px_100%)]"
       >
        <span>{ctaLabel}</span>
        <span className="text-lg text-(--p) group-hover:text-(--bg) transition-colors duration-300">
         <LuArrowRight size={18} aria-hidden="true" />
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
