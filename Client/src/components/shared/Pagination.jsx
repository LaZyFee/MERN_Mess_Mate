"use client";

import React from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";

/**
 * Generate page range with ellipsis.
 */
function getPageRange(current, total, siblings = 1) {
  const totalNums = siblings * 2 + 3;
  if (totalNums >= total) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeft = left > 2;
  const showRight = right < total - 1;

  if (!showLeft && showRight) {
    const cnt = 3 + 2 * siblings;
    return [...Array.from({ length: cnt }, (_, i) => i + 1), "…", total];
  }
  if (showLeft && !showRight) {
    const cnt = 3 + 2 * siblings;
    return [
      1,
      "…",
      ...Array.from({ length: cnt }, (_, i) => total - cnt + i + 1),
    ];
  }
  if (showLeft && showRight) {
    return [
      1,
      "…",
      ...Array.from({ length: right - left + 1 }, (_, i) => left + i),
      "…",
      total,
    ];
  }
  return Array.from({ length: total }, (_, i) => i + 1);
}

/**
 * Enterprise-grade premium Pagination component.
 */
export default function Pagination({
  currentPage,
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  size = "md",
  showFirstLast = true,
  isCompact = false,
  className = "",

  // Advanced/DataTable props
  limit,
  itemsPerPage,
  totalItems,
  onLimitChange,
  loading = false,
}) {
  const activePage = Math.max(
    1,
    Math.min(page ?? currentPage ?? 1, totalPages ?? 1),
  );
  const activeLimit = limit ?? itemsPerPage;
  const hasAdvanced = activeLimit !== undefined && totalItems !== undefined;

  const handlePageClick = (p) => {
    if (loading || p < 1 || p > totalPages || p === activePage) return;
    if (onPageChange) onPageChange(p);
  };

  const range = getPageRange(activePage, totalPages, siblingCount);
  const limitOptions = [5, 10, 15, 20, 25, 50, 100, 200, 500, 1000];

  const startItem = totalItems === 0 ? 0 : (activePage - 1) * activeLimit + 1;
  const endItem = Math.min(activePage * activeLimit, totalItems);

  // Standard buttons render
  const renderButtons = () => {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {showFirstLast && (
          <button
            disabled={loading || activePage <= 1}
            onClick={() => handlePageClick(1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-(--bd) bg-(--bgs) text-(--ts) hover:bg-(--bgm)/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            title="First Page"
          >
            <FiChevronsLeft size={14} />
          </button>
        )}

        <button
          disabled={loading || activePage <= 1}
          onClick={() => handlePageClick(activePage - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-(--bd) bg-(--bgs) text-(--ts) hover:bg-(--bgm)/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
          title="Previous Page"
        >
          <FiChevronLeft size={14} />
        </button>

        {range.map((p, idx) => {
          if (p === "…") {
            return (
              <span
                key={`dots-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-xs text-(--tm) select-none"
              >
                …
              </span>
            );
          }
          const isActive = p === activePage;
          return (
            <button
              key={p}
              disabled={loading}
              onClick={() => handlePageClick(p)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-semibold cursor-pointer transition-all duration-150 ${
                isActive
                  ? "bg-(--p) border-(--p) text-white font-semibold shadow-xs"
                  : "border-(--bd) bg-(--bgs) hover:bg-(--bgm)/40 text-(--ts)"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          disabled={loading || activePage >= totalPages}
          onClick={() => handlePageClick(activePage + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-(--bd) bg-(--bgs) text-(--ts) hover:bg-(--bgm)/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
          title="Next Page"
        >
          <FiChevronRight size={14} />
        </button>

        {showFirstLast && (
          <button
            disabled={loading || activePage >= totalPages}
            onClick={() => handlePageClick(totalPages)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-(--bd) bg-(--bgs) text-(--ts) hover:bg-(--bgm)/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Last Page"
          >
            <FiChevronsRight size={14} />
          </button>
        )}

        {/* Go to Jump */}
        <div className="flex items-center gap-1.5 ml-1.5 text-(--tm) text-xs">
          <span>Go to</span>
          <div className="w-12">
            <input
              type="number"
              min={1}
              max={totalPages}
              disabled={loading}
              placeholder={String(activePage)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const targetPage = Number(e.currentTarget.value);
                  if (targetPage >= 1 && targetPage <= totalPages) {
                    handlePageClick(targetPage);
                    e.currentTarget.value = "";
                  }
                }
              }}
              className="w-full px-2 py-1 rounded-lg text-xs bg-(--bgs) border border-(--bd) text-(--tp) text-center focus:outline-none focus:border-(--p) transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs w-full ${className}`}
    >
      {hasAdvanced ? (
        <>
          {/* Range details */}
          <div className="text-(--tm) text-xs font-medium">
            Showing{" "}
            <span className="font-semibold text-(--tp)">{startItem}</span> to{" "}
            <span className="font-semibold text-(--tp)">{endItem}</span> of{" "}
            <span className="font-semibold text-(--tp)">{totalItems}</span>{" "}
            items
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Rows per page */}
            <div className="flex items-center gap-1.5 text-(--tm)">
              <span>Per page:</span>
              <div className="w-16">
                <select
                  disabled={loading}
                  value={activeLimit}
                  onChange={(e) =>
                    onLimitChange && onLimitChange(Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded-lg text-xs bg-(--bgs) border border-(--bd) text-(--tp) focus:outline-none focus:border-(--p) cursor-pointer transition-colors"
                >
                  {limitOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Page navigation */}
            {renderButtons()}
          </div>
        </>
      ) : (
        <div className="flex justify-center sm:justify-end w-full">
          {renderButtons()}
        </div>
      )}
    </div>
  );
}
