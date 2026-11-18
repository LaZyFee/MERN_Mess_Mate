"use client";

import { useState, useRef } from "react";
import {
  FiUpload,
  FiX,
  FiRefreshCw,
  FiImage,
  FiCheck,
  FiEye,
} from "react-icons/fi";
import { MdWarningAmber } from "react-icons/md";

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ImageUpload({
  images = [],
  onAdd,
  onRemove,
  label = "Upload image",
  hideRemove = false,
  single = false,
  showCoverBadge = false,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeMB = 1,
  isInvalid = false,
  errorMessage = "",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const activeError = uploadError || (isInvalid ? errorMessage : "");

  // Auto-detect single slot if label indicates front/back or if single is true
  const isSingle =
    single ||
    (typeof label === "string" &&
      (label.toLowerCase().includes("front") ||
        label.toLowerCase().includes("back")));

  const handleFiles = (filesList) => {
    let hasLimitExceeded = false;
    let limitMessage = "";

    const files = Array.from(filesList || []).filter((file) => {
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        hasLimitExceeded = true;
        const actualMB = (file.size / (1024 * 1024)).toFixed(1);
        limitMessage = `File "${file.name}" (${actualMB} MB) exceeds the ${maxSizeMB} MB limit.`;
        return false;
      }
      return true;
    });

    if (hasLimitExceeded) {
      setUploadError(limitMessage);
    } else {
      setUploadError("");
    }

    if (files.length > 0) {
      if (isSingle) {
        onAdd([files[0]]);
      } else {
        onAdd(files);
      }
    }
  };

  const handleChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const openPicker = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    inputRef.current?.click();
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={!isSingle}
      onChange={handleChange}
      className="hidden"
    />
  );

  // ── SINGLE IMAGE MODE (Document Front/Back, Profile, Certificate) ──
  if (isSingle) {
    const image = images[0];
    const imageSize = image?.size || image?.file?.size;

    return (
      <div className="w-full">
        {fileInput}

        {!image ? (
          <div>
            <div
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPicker();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full h-36 sm:h-40 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-3 text-center group select-none ${
                activeError
                  ? "border-red-400 dark:border-red-500/60 bg-red-50/10 ring-2 ring-red-500/20"
                  : isDragging
                    ? "border-(--p) bg-(--pale) ring-4 ring-(--pale)"
                    : "border-(--bd2) bg-(--bgs)/60 hover:border-(--p) hover:bg-(--pale)/25"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all duration-200 shadow-xs ${
                  activeError
                    ? "bg-red-100 dark:bg-red-950/40 text-red-500"
                    : isDragging
                      ? "bg-(--p) text-white scale-110"
                      : "bg-(--pale) text-(--p) group-hover:scale-110 group-hover:bg-(--p) group-hover:text-white"
                }`}
              >
                <FiUpload size={18} className="stroke-[2.2]" />
              </div>

              <span
                className={`text-xs sm:text-[13px] font-bold transition-colors ${
                  activeError
                    ? "text-red-600 dark:text-red-400"
                    : "text-(--tp) group-hover:text-(--p)"
                }`}
              >
                {label}
              </span>

              <span className="text-[11px] text-(--tm) mt-0.5 font-medium">
                JPG, PNG, WebP · max {maxSizeMB}MB
              </span>
            </div>

            {activeError && (
              <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1.5 animate-fadeIn">
                <MdWarningAmber className="w-4 h-4 shrink-0 text-red-500" />
                <span>{activeError}</span>
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="w-full h-36 sm:h-40 rounded-2xl overflow-hidden border-[1.5px] border-(--bd2) bg-(--bgm) relative group shadow-xs hover:shadow-md transition-all duration-200">
              {/* Image Preview */}
              <img
                src={image.preview}
                alt={label || "Uploaded document"}
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
              />

              {/* Permanent Top Badges (Uploaded Status & Live Size) */}
              <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[10.5px] font-bold backdrop-blur-md shadow-xs">
                  <FiCheck className="w-3 h-3 stroke-3" />
                  Uploaded
                </span>
                {imageSize ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/65 text-white text-[10px] font-semibold backdrop-blur-md shadow-xs">
                    {formatFileSize(imageSize)} / {maxSizeMB}MB
                  </span>
                ) : null}
              </div>



              {/* Hover Action Overlay */}
              <div className="absolute inset-0 z-20 bg-linear-to-t from-black/80 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openPicker}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-gray-900 text-xs font-bold hover:bg-white/90 shadow-md hover:scale-105 transition-all cursor-pointer"
                  >
                    <FiRefreshCw size={12} />
                    Replace
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModalImg(image.preview);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md shadow-md hover:scale-105 transition-all cursor-pointer"
                  >
                    <FiEye size={12} />
                    View
                  </button>

                  {!hideRemove && onRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(image.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
                    >
                      <FiX size={12} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {activeError && (
              <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1.5 animate-fadeIn">
                <MdWarningAmber className="w-4 h-4 shrink-0 text-red-500" />
                <span>{activeError}</span>
              </p>
            )}
          </div>
        )}

        {/* Fullscreen Lightbox Modal */}
        {previewModalImg && (
          <div
            className="fixed inset-0 z-100000 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setPreviewModalImg(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                aria-label="Close preview"
              >
                <FiX size={18} />
              </button>
              <img
                src={previewModalImg}
                alt="Full size document preview"
                className="w-auto h-auto max-h-[85vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MULTI-IMAGE MODE (Galleries, Vehicle Photos, etc.) ──
  const totalBytes = images.reduce(
    (acc, curr) => acc + (curr.size || curr.file?.size || 0),
    0,
  );
  const totalFormatted = formatFileSize(totalBytes);

  return (
    <div className="space-y-3 w-full">
      {fileInput}

      {/* Multi Dropzone */}
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full h-28 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-4 text-center group select-none ${
            activeError
              ? "border-red-400 dark:border-red-500/60 bg-red-50/10 ring-2 ring-red-500/20"
              : isDragging
                ? "border-(--p) bg-(--pale) ring-4 ring-(--pale)"
                : "border-(--bd2) bg-(--bgs)/60 hover:border-(--p) hover:bg-(--pale)/25"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-200 shadow-xs ${
              activeError
                ? "bg-red-100 dark:bg-red-950/40 text-red-500"
                : isDragging
                  ? "bg-(--p) text-white scale-110"
                  : "bg-(--pale) text-(--p) group-hover:scale-110 group-hover:bg-(--p) group-hover:text-white"
            }`}
          >
            <FiUpload size={17} className="stroke-[2.2]" />
          </div>

          <span
            className={`text-xs sm:text-sm font-bold transition-colors ${
              activeError
                ? "text-red-600 dark:text-red-400"
                : "text-(--tp) group-hover:text-(--p)"
            }`}
          >
            {label}
          </span>

          <span className="text-[11px] text-(--tm) mt-0.5 font-medium">
            JPG, PNG, WebP · max {maxSizeMB}MB per file
          </span>
        </div>

        {activeError && (
          <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1.5 animate-fadeIn">
            <MdWarningAmber className="w-4 h-4 shrink-0 text-red-500" />
            <span>{activeError}</span>
          </p>
        )}
      </div>

      {/* Uploaded Images Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {images.map((img, index) => {
              const itemSize = img.size || img.file?.size;
              return (
                <div
                  key={img.id}
                  className="relative rounded-2xl overflow-hidden border-[1.5px] border-(--bd2) bg-(--bgm) aspect-square group shadow-xs hover:shadow-md transition-all duration-200"
                >
                  <img
                    src={img.preview}
                    alt="Upload preview"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />

                  {showCoverBadge && index === 0 && (
                    <span className="absolute top-2 left-2 z-10 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs">
                      Cover
                    </span>
                  )}

                  {itemSize ? (
                    <span className="absolute bottom-2 left-2 z-10 text-[9.5px] font-semibold text-white bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded shadow-xs">
                      {formatFileSize(itemSize)}
                    </span>
                  ) : null}

                  {!hideRemove && onRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(img.id);
                      }}
                      className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md hover:scale-110 transition-all cursor-pointer"
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <FiX size={14} />
                    </button>
                  )}

                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewModalImg(img.preview)}
                  >
                    <span className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all">
                      <FiEye size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-(--tm) font-semibold pt-1 pl-1">
            <FiImage size={13} className="text-(--p)" />
            {images.length} file{images.length !== 1 ? "s" : ""} uploaded
            {totalBytes > 0 && ` (${totalFormatted})`}
          </p>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-100000 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              aria-label="Close preview"
            >
              <FiX size={18} />
            </button>
            <img
              src={previewModalImg}
              alt="Full size preview"
              className="w-auto h-auto max-h-[85vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}