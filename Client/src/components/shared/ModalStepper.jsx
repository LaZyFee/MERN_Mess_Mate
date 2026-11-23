"use client";

import { FiCheck } from "react-icons/fi";

export default function ModalStepper({
 steps = [],
 currentStep = 1,
 onStepClick = null,
 className = "",
}) {
 if (!steps || steps.length <= 1) return null;

 return (
  <div
   className={`bg-(--bgl) rounded-2xl border border-(--bd) p-3 sm:p-4 mb-5 shadow-xs ${className}`}
  >
   <div className="flex items-center justify-between relative max-w-2xl mx-auto px-2 sm:px-4">
    {/* Connecting progress track */}
    <div className="absolute top-4 left-6 right-6 sm:left-8 sm:right-8 h-0.5 bg-(--bd2) z-0 rounded-full overflow-hidden">
     <div
      className="h-full bg-(--p) transition-all duration-300 rounded-full"
      style={{
       width:
        steps.length > 1
         ? `${((currentStep - 1) / (steps.length - 1)) * 100}%`
         : "100%",
      }}
     />
    </div>

    {steps.map((step) => {
     const isCompleted = currentStep > step.id;
     const isCurrent = currentStep === step.id;
     const Icon = step.icon;

     return (
      <button
       key={step.id}
       type="button"
       disabled={!onStepClick}
       onClick={() => onStepClick?.(step.id)}
       className={`flex flex-col items-center relative z-10 group focus:outline-none transition-all px-1 ${
        onStepClick ? "cursor-pointer" : "cursor-default"
       }`}
       title={`Step ${step.id}: ${step.label}`}
      >
       <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-xs ${
         isCompleted
          ? "bg-(--p) text-(--bgs) ring-3 ring-(--pale)"
          : isCurrent
           ? "bg-(--p) text-(--bgs) ring-4 ring-(--p)/20 shadow-sm scale-105"
           : "bg-(--bgs) text-(--tm) border border-(--bd2) group-hover:border-(--p) group-hover:text-(--p)"
        }`}
       >
        {isCompleted ? (
         <FiCheck className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : Icon ? (
         <Icon size={14} />
        ) : (
         step.id
        )}
       </div>
       <span
        className={`mt-1.5 text-[11px] sm:text-xs font-semibold text-center transition-colors max-w-16 sm:max-w-24 leading-tight truncate ${
         isCurrent
          ? "text-(--tp) font-bold"
          : isCompleted
           ? "text-(--p)"
           : "text-(--tm)"
        }`}
       >
        {step.label}
       </span>
       {step.subtitle && (
        <span className="hidden sm:block text-[9.5px] text-(--tl) text-center max-w-24 truncate mt-0.5">
         {step.subtitle}
        </span>
       )}
      </button>
     );
    })}
   </div>
  </div>
 );
}
