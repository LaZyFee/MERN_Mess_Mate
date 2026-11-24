"use client";

import React, { useState, useRef, useEffect } from "react";

/**
 * Tooltip component for displaying additional information on hover
 */
const Tooltip = ({
 children,
 content,
 placement = "top",
 delay = 0,
 isDisabled = false,
 className = "",
 ...props
}) => {
 const [isVisible, setIsVisible] = useState(false);
 const [position, setPosition] = useState({ top: 0, left: 0 });
 const targetRef = useRef(null);
 const tooltipRef = useRef(null);
 const timerRef = useRef(null);

 useEffect(() => {
  return () => {
   if (timerRef.current) clearTimeout(timerRef.current);
  };
 }, []);

 const updatePosition = () => {
  if (!targetRef.current || !tooltipRef.current) return;

  const targetRect = targetRef.current.getBoundingClientRect();
  const tooltipRect = tooltipRef.current.getBoundingClientRect();

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  let top = 0;
  let left = 0;

  switch (placement) {
   case "top":
    top = targetRect.top + scrollTop - tooltipRect.height - 8;
    left =
     targetRect.left +
     scrollLeft +
     targetRect.width / 2 -
     tooltipRect.width / 2;
    break;
   case "bottom":
    top = targetRect.bottom + scrollTop + 8;
    left =
     targetRect.left +
     scrollLeft +
     targetRect.width / 2 -
     tooltipRect.width / 2;
    break;
   case "left":
    top =
     targetRect.top +
     scrollTop +
     targetRect.height / 2 -
     tooltipRect.height / 2;
    left = targetRect.left + scrollLeft - tooltipRect.width - 8;
    break;
   case "right":
    top =
     targetRect.top +
     scrollTop +
     targetRect.height / 2 -
     tooltipRect.height / 2;
    left = targetRect.right + scrollLeft + 8;
    break;
   default:
    break;
  }

  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
   left = window.innerWidth - tooltipRect.width - 10;
  }

  if (top < 10) top = 10;
  if (top + tooltipRect.height > window.innerHeight + scrollTop - 10) {
   top = window.innerHeight + scrollTop - tooltipRect.height - 10;
  }

  setPosition({ top, left });
 };

 const handleMouseEnter = () => {
  if (isDisabled) return;

  if (timerRef.current) clearTimeout(timerRef.current);

  timerRef.current = setTimeout(() => {
   setIsVisible(true);
   setTimeout(updatePosition, 0);
  }, delay);
 };

 const handleMouseLeave = () => {
  if (timerRef.current) clearTimeout(timerRef.current);
  setIsVisible(false);
 };

 const arrowClasses = {
  top: "bottom-0 translate-y-full left-1/2 -translate-x-1/2 border-t-(--bgs) border-l-transparent border-r-transparent border-b-transparent",
  bottom:
   "top-0 -translate-y-full left-1/2 -translate-x-1/2 border-b-(--bgs) border-l-transparent border-r-transparent border-t-transparent",
  left: "right-0 translate-x-full top-1/2 -translate-y-1/2 border-l-(--bgs) border-t-transparent border-b-transparent border-r-transparent",
  right:
   "left-0 -translate-x-full top-1/2 -translate-y-1/2 border-r-(--bgs) border-t-transparent border-b-transparent border-l-transparent",
 };

 return (
  <div
   className="inline-block relative"
   onMouseEnter={handleMouseEnter}
   onMouseLeave={handleMouseLeave}
  >
   <div ref={targetRef}>{children}</div>

   {isVisible && (
    <div
     ref={tooltipRef}
     
     className={[`
      absolute z-50 bg-(--bgs) text-(--ts) px-3 py-1.5 rounded-lg text-sm shadow-lg border border-(--bd)
      ${className}
     `, "[top:var(--inline-top)]", "[left:var(--inline-left)]"].filter(Boolean).join(" ")} style={{ "--inline-top": `${position.top}px`, "--inline-left": `${position.left}px` }}
     {...props}
    >
     {content}
     <div
      className={`absolute w-0 h-0 border-solid border-4 ${arrowClasses[placement]}`}
     />
    </div>
   )}
  </div>
 );
};

export default Tooltip;
