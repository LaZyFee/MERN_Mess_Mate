"use client";

import { useState } from "react";
import Button from "@/components/shared/Button";

export default function FaqAccordion({ items }) {
 const [openIndex, setOpenIndex] = useState(null);

 return (
  <div className="flex flex-col gap-2">
   {items.map((item, i) => (
    <div
     key={i}
     className="bg-(--bg) rounded-2xl border border-(--bd) shadow-sm overflow-hidden"
    >
     <Button
      onClick={() => setOpenIndex(openIndex === i ? null : i)}
      className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors bg-(--bgs)"
     >
      <span className="text-[14px] font-semibold text-(--tp) pr-4">
       {item.question}
      </span>
      <span
       className={`text-(--tp) text-xl font-light shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-45" : ""}`}
      >
       +
      </span>
     </Button>

     <div
      className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
     >
      <p className="px-6 pb-5 text-[13.5px] text-(--tp) leading-relaxed border-t border-(--bd) pt-3">
       {item.answer}
      </p>
     </div>
    </div>
   ))}
  </div>
 );
}
