"use client";

import { useEffect, useRef, useState } from "react";

export default function ScrollReveal({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  threshold = 0.12,
  style = {},
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const base = "transition-all duration-700 ease-out";
  const variants = {
    "fade-up": visible
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-10",
    "fade-left": visible
      ? "opacity-100 translate-x-0"
      : "opacity-0 -translate-x-10",
    "fade-right": visible
      ? "opacity-100 translate-x-0"
      : "opacity-0 translate-x-10",
    "fade-in": visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
  };

  return (
    <div
      ref={ref}
      className={`${base} ${variants[animation] ?? variants["fade-up"]} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}
