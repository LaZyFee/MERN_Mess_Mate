"use client";
import Button from "@/components/shared/buttons/Button";

import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useId,
  Children,
  cloneElement,
  isValidElement,
  useRef,
  useLayoutEffect,
} from "react";

// Create context for tabs state
const TabsContext = createContext({});

// Custom hook to use tabs context
const useTabsContext = () => useContext(TabsContext);

// Variants that get the shared sliding indicator instead of a static
// per-tab active state. Kept small on purpose — it's the one bold move,
// everything else stays quiet.
const INDICATOR_VARIANTS = new Set(["line", "underline"]);

/**
 * TabList component to contain tab buttons.
 * Renders a shared sliding indicator (for line/underline variants) and
 * implements roving-tabindex arrow key navigation per the WAI-ARIA tabs pattern.
 */
export const TabList = ({ children, className = "", ...props }) => {
  const {
    orientation,
    variant,
    size,
    isFitted,
    activeTabIndex,
    setActiveTabIndex,
  } = useTabsContext();

  const listRef = useRef(null);
  const nodeMap = useRef(new Map());
  const [indicator, setIndicator] = useState(null);
  const [ready, setReady] = useState(false);

  const showIndicator = INDICATOR_VARIANTS.has(variant);
  const count = Children.count(children);

  const measure = useCallback(() => {
    if (!showIndicator) return;
    const list = listRef.current;
    const node = nodeMap.current.get(activeTabIndex);
    if (!list || !node) return;

    const listRect = list.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();

    setIndicator(
      orientation === "horizontal"
        ? { start: nodeRect.left - listRect.left, size: nodeRect.width }
        : { start: nodeRect.top - listRect.top, size: nodeRect.height },
    );
  }, [activeTabIndex, orientation, showIndicator]);

  // Re-measure whenever the active tab, the tab count, or the viewport changes.
  useLayoutEffect(() => {
    measure();
  }, [measure, count]);

  useLayoutEffect(() => {
    if (!showIndicator) return undefined;
    // Skip the very first transition so the indicator doesn't animate in from 0.
    const raf = requestAnimationFrame(() => setReady(true));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [measure, showIndicator]);

  const handleKeyDown = (index) => (e) => {
    const isHorizontal = orientation === "horizontal";
    const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
    const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

    let nextIndex = null;
    if (e.key === nextKey) nextIndex = (index + 1) % count;
    else if (e.key === prevKey) nextIndex = (index - 1 + count) % count;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = count - 1;
    else return;

    e.preventDefault();
    setActiveTabIndex(nextIndex);
    nodeMap.current.get(nextIndex)?.querySelector("[role='tab']")?.focus();
  };

  // Each tab is wrapped in a plain div we hold a ref to, so measuring and
  // focus management never depend on Button forwarding refs internally.
  const tabs = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return null;

    return (
      <div
        key={index}
        ref={(node) => {
          if (node) nodeMap.current.set(index, node);
          else nodeMap.current.delete(index);
        }}
        className={isFitted ? "flex-1" : ""}
        onKeyDown={handleKeyDown(index)}
      >
        {cloneElement(child, {
          isActive: activeTabIndex === index,
          onClick: () => setActiveTabIndex(index),
          variant,
          size,
          orientation,
          isFitted,
        })}
      </div>
    );
  });

  const orientationClasses = {
    horizontal: "flex-row border-b border-(--bd)",
    vertical: "flex-col border-r border-(--bd)",
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      className={`relative flex ${orientationClasses[orientation]} ${className}`}
      {...props}
    >
      {tabs}

      {showIndicator && indicator && (
        <span
          aria-hidden="true"
          className={`absolute rounded-full bg-(--p) pointer-events-none ${ready
            ? "transition-[transform,width,height] duration-300 ease-out"
            : ""
            }`}
          style={
            orientation === "horizontal"
              ? {
                bottom: -1,
                left: 0,
                height: 2,
                width: indicator.size,
                transform: `translateX(${indicator.start}px)`,
              }
              : {
                right: -1,
                top: 0,
                width: 2,
                height: indicator.size,
                transform: `translateY(${indicator.start}px)`,
              }
          }
        />
      )}
    </div>
  );
};

/**
 * Tab component for individual tab buttons
 */
export const Tab = ({
  children,
  isActive = false,
  isDisabled = false,
  variant = "line",
  size = "md",
  orientation = "horizontal",
  isFitted = false,
  onClick,
  className = "",
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: "text-xs py-1.5 px-3 rounded-lg",
    md: "text-sm py-2 px-4 rounded-xl",
    lg: "text-base py-2.5 px-5 rounded-xl",
  };

  // Variant classes for different styles using CSS variables.
  // line/underline no longer draw their own border — the shared sliding
  // indicator in TabList handles that, so only text styling lives here.
  const variantClasses = {
    line: {
      base: "border-b-2 border-transparent",
      active: "border-(--p) text-(--p)",
      inactive: "text-(--tm) hover:text-(--ts) hover:border-(--bd2)",
    },
    enclosed: {
      base: "border-b border-transparent",
      active: "border border-(--bd2) border-b-(--bgs) rounded-t-md bg-(--bgs)",
      inactive: "text-(--tm) hover:text-(--ts)",
    },
    "soft-rounded": {
      base: "rounded-full",
      active: "bg-(--bgm) text-(--tp)",
      inactive: "text-(--tm) hover:text-(--ts) hover:bg-(--bgm)",
    },
    "solid-rounded": {
      base: "rounded-full",
      active: "bg-(--p) text-white",
      inactive: "text-(--tm) hover:text-(--ts) hover:bg-(--bgm)",
    },
  };

  const classes = [
    "relative flex items-center gap-2 font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/30 focus-visible:ring-offset-2 focus-visible:ring-offset-(--bgs)",
    orientation === "vertical" ? "justify-start" : "justify-center",
    isFitted ? "w-full" : "",
    sizeClasses[size] || sizeClasses.md,
    variantClasses[variant]?.base || "",
    isActive
      ? variantClasses[variant]?.active || ""
      : variantClasses[variant]?.inactive || "",
    isDisabled ? "opacity-50 cursor-not-allowed" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <Button
      role="tab"
      variant="custom"
      aria-selected={isActive}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      tabIndex={isActive ? 0 : -1}
      onClick={isDisabled ? undefined : onClick}
      className={classes}
      {...props}
    >
      {children}
    </Button>
  );
};

/**
 * TabPanels component to contain content panels
 */
export const TabPanels = ({ children, className = "", ...props }) => {
  const { activeTabIndex, isManual } = useTabsContext();

  const panels = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return null;

    if (isManual) {
      return cloneElement(child, {
        isActive: activeTabIndex === index,
      });
    } else if (activeTabIndex === index) {
      return child;
    }

    return null;
  });

  return (
    <div className={`mt-4 ${className}`} {...props}>
      {panels}
    </div>
  );
};

/**
 * TabPanel component for individual content panels
 */
export const TabPanel = ({
  children,
  isActive = true,
  className = "",
  ...props
}) => {
  return (
    <div
      role="tabpanel"
      className={`${className} ${!isActive ? "hidden" : ""} animate-in fade-in duration-300`}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Main Tabs component
 */
const Tabs = ({
  activeTab,
  defaultActiveTab = 0,
  onChange,
  variant = "line",
  size = "md",
  isFitted = false,
  isManual = false,
  orientation = "horizontal",
  children,
  className = "",
  ...props
}) => {
  // Generate unique ID for accessibility
  const id = useId();

  // State for active tab index (uncontrolled)
  const [activeTabIndex, setActiveTabIndexInternal] = useState(
    defaultActiveTab !== undefined ? defaultActiveTab : 0,
  );

  // Determine if component is controlled or uncontrolled
  const isControlled = activeTab !== undefined;
  const currentActiveTab = isControlled ? activeTab : activeTabIndex;

  // Handler for tab change
  const setActiveTabIndex = (index) => {
    if (!isControlled) {
      setActiveTabIndexInternal(index);
    }

    if (onChange) {
      onChange(index);
    }
  };

  // Context value
  const context = {
    activeTabIndex: currentActiveTab,
    setActiveTabIndex,
    variant,
    size,
    isFitted,
    isManual,
    orientation,
    id,
  };

  // Handle fitted tabs
  const fittedClasses = isFitted ? "w-full" : "";
  const rootClasses = [
    orientation === "horizontal" ? "w-full" : "flex",
    fittedClasses,
    className,
  ].join(" ");

  return (
    <TabsContext.Provider value={context}>
      <div className={rootClasses} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export default Tabs;
