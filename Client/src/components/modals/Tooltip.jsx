"use client";

import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function placeTip(anchor, tip, preferred) {
  const gap = 8;
  const room = {
    top: anchor.top, bottom: window.innerHeight - anchor.bottom,
    left: anchor.left, right: window.innerWidth - anchor.right,
  };
  const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const vertical = preferred === "top" || preferred === "bottom";
  const other = opposite[preferred];
  const side = room[preferred] < (vertical ? tip.height : tip.width) + gap && room[other] > room[preferred]
    ? other : preferred;
  let left = anchor.left + (anchor.width - tip.width) / 2;
  let top = anchor.top + (anchor.height - tip.height) / 2;
  if (vertical) top = side === "top" ? anchor.top - tip.height - gap : anchor.bottom + gap;
  else left = side === "left" ? anchor.left - tip.width - gap : anchor.right + gap;
  return {
    left: Math.max(gap, Math.min(left, window.innerWidth - tip.width - gap)),
    top: Math.max(gap, Math.min(top, window.innerHeight - tip.height - gap)),
  };
}

export default function Tooltip({ children, content, placement = "top", delay = 0, isDisabled = false, className = "", style, id, ...props }) {
  const generatedId = useId();
  const tipId = id || generatedId;
  const trigger = useRef(null);
  const tip = useRef(null);
  const timer = useRef(null);
  const [open, setOpen] = useState(false);
  const visible = open && !isDisabled;

  function show() {
    clearTimeout(timer.current);
    if (!isDisabled) timer.current = setTimeout(() => setOpen(true), delay);
  }

  function close() {
    clearTimeout(timer.current);
    setOpen(false);
  }

  function leave() {
    clearTimeout(timer.current);
    if (!trigger.current?.matches(":focus-within")) timer.current = setTimeout(close, 150);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    if (!visible) return;
    const anchor = trigger.current;
    const bubble = tip.current;
    function update() {
      const rect = anchor.getBoundingClientRect();
      const { left, top } = placeTip(rect, bubble.getBoundingClientRect(), placement);
      bubble.style.left = left + "px";
      bubble.style.top = top + "px";
      bubble.style.visibility = rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth ? "hidden" : "visible";
    }
    function outside(event) {
      if (!anchor.contains(event.target) && !bubble.contains(event.target)) close();
    }
    function escape(event) {
      if (event.key === "Escape") close();
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    observer.observe(bubble);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [visible, placement]);

  const child = isValidElement(children) && visible
    ? cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], tipId].filter(Boolean).join(" ") })
    : children;
  return (
    <div ref={trigger} className="inline-flex max-w-full align-middle"
      onPointerEnter={(event) => { if (event.pointerType !== "touch") show(); }}
      onPointerLeave={leave} onFocus={show} onBlur={close}
      onPointerUp={(event) => { if (event.pointerType === "touch") show(); }}>
      {child}
      {visible && createPortal(
        <div {...props} ref={tip} id={tipId} role="tooltip" style={style}
          onPointerEnter={() => clearTimeout(timer.current)} onPointerLeave={leave}
          className={`fixed z-[1000] w-max max-w-[min(20rem,calc(100vw-1rem))] break-words rounded-xl bg-(--tp) px-3 py-2 text-sm leading-relaxed text-(--bgs) shadow-lg ${className}`}>
          {content}
        </div>, document.body)}
    </div>
  );
}
