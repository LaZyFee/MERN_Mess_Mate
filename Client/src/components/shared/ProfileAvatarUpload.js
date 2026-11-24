"use client";

import React, { useRef, useState, useEffect } from "react";
import { FiCamera, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import Avatar from "@/components/shared/Avatar";
import Button from "@/components/shared/Button";
import { getAvatarUrl } from "@/utils/profileUtils";

/**
 * Shared ProfileAvatarUpload component
 * Used across all role profile edit modals (Customer, Admin, Vendor, Rider, Partner, Affiliate)
 */
export default function ProfileAvatarUpload({
 avatarPreview,
 avatarFile,
 name = "User",
 onFileChange,
 onRemove,
 error,
 maxSizeMB = 5,
 helperText,
 title = "Profile Photo",
 disabled = false,
 className = "",
}) {
 const fileInputRef = useRef(null);
 const [preview, setPreview] = useState(avatarPreview || null);
 const [localError, setLocalError] = useState("");
 const [imgError, setImgError] = useState(false);

 // Keep preview synced with avatarPreview when prop changes (unless user has chosen a file)
 useEffect(() => {
  if (!avatarFile) {
   setPreview(avatarPreview || null);
   setImgError(false);
  }
 }, [avatarPreview, avatarFile]);

 const handleInputChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > maxSizeMB * 1024 * 1024) {
   const msg = `Image size must be less than ${maxSizeMB}MB`;
   setLocalError(msg);
   if (typeof onFileChange === "function") {
    onFileChange(null, msg);
   }
   return;
  }

  // Flexible image check
  const isImage = file.type
   ? file.type.startsWith("image/")
   : /\.(jpe?g|png|webp|gif|bmp|jfif|avif|svg)$/i.test(file.name);

  if (!isImage) {
   const msg = "Please upload a valid image file (JPG, PNG, or WebP)";
   setLocalError(msg);
   if (typeof onFileChange === "function") {
    onFileChange(null, msg);
   }
   return;
  }

  setLocalError("");
  setImgError(false);

  // Instant local preview via ObjectURL
  let fallbackUrl = null;
  try {
   fallbackUrl = URL.createObjectURL(file);
   setPreview(fallbackUrl);
  } catch {
   fallbackUrl = null;
  }

  // Read Data URL for durable preview and notify parent
  const reader = new FileReader();
  reader.onload = (event) => {
   const dataUrl = event.target?.result;
   if (dataUrl) {
    setPreview(dataUrl);
   }
   if (typeof onFileChange === "function") {
    onFileChange(file, null, dataUrl || fallbackUrl);
   }
  };
  reader.onerror = () => {
   if (typeof onFileChange === "function") {
    onFileChange(file, null, fallbackUrl);
   }
  };
  reader.readAsDataURL(file);

  // Reset input value so selecting the same file again triggers onChange
  if (fileInputRef.current) {
   fileInputRef.current.value = "";
  }
 };

 const handleRemoveClick = () => {
  setPreview(null);
  setLocalError("");
  setImgError(false);
  if (fileInputRef.current) {
   fileInputRef.current.value = "";
  }
  if (typeof onRemove === "function") {
   onRemove();
  }
 };

 const resolvedPreview = getAvatarUrl(preview);
 const hasPhoto = Boolean(avatarFile || (resolvedPreview && !imgError));
 const displayError = error || localError;

 return (
  <div
   className={`p-4 sm:p-5 rounded-2xl bg-(--bgm)/50 border border-(--bd) flex flex-col sm:flex-row items-center gap-5 ${className}`}
  >
   {/* Avatar with Camera Trigger Overlay */}
   <div className="relative group shrink-0">
    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl shadow-md border-2 border-(--bd) overflow-hidden relative flex items-center justify-center bg-(--bgm)">
     {resolvedPreview && !imgError ? (
      <img
       src={resolvedPreview}
       alt={name || "Profile Photo"}
       className="w-full h-full object-cover"
       onError={() => setImgError(true)}
      />
     ) : (
      <Avatar
       size="xl"
       src={null}
       name={name}
       className="w-full h-full rounded-none"
      />
     )}
    </div>
    {!disabled && (
     <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-(--p) text-(--bgs) flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2 border-(--bgs) z-10"
      title="Upload new photo"
     >
      <FiCamera className="w-4 h-4" />
     </button>
    )}
   </div>

   {/* Info & Action Buttons */}
   <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
    <h4 className="text-sm font-bold text-(--tp)">{title}</h4>
    <p className="text-xs text-(--tm) leading-relaxed">
     {helperText ||
      `Upload a clear photo for your profile avatar. Supported formats: JPG, PNG, WebP (max ${maxSizeMB}MB).`}
    </p>

    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
     <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleInputChange}
      disabled={disabled}
      className="hidden"
     />

     {!disabled && (
      <Button
       type="button"
       variant="outline"
       size="sm"
       onClick={() => fileInputRef.current?.click()}
       leftIcon={<FiUploadCloud className="w-4 h-4" />}
      >
       {hasPhoto ? "Change Photo" : "Upload Photo"}
      </Button>
     )}

     {!disabled && hasPhoto && (
      <button
       type="button"
       onClick={handleRemoveClick}
       className="px-3 py-1.5 rounded-xl text-xs font-bold text-(--danger) hover:bg-(--danger-bg)0/10 border border-transparent transition-all cursor-pointer flex items-center gap-1.5"
      >
       <FiTrash2 className="w-3.5 h-3.5" />
       <span>Remove</span>
      </button>
     )}
    </div>

    {displayError && (
     <p className="text-xs text-(--danger) font-semibold pt-1">
      {displayError}
     </p>
    )}
   </div>
  </div>
 );
}
