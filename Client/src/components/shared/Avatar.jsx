"use client";

import React, { useState, useEffect } from "react";
import { getAvatarUrl } from "@/utils/profileUtils";

/**
 * Avatar component for user profile images
 * @param {Object} props - Component props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md'] - Avatar size
 * @param {string} [props.src] - Image source URL
 * @param {string} [props.alt] - Alternative text for image
 * @param {string} [props.name] - Name to derive initials from
 * @param {string} [props.bgColor] - Custom background color for fallback
 * @param {boolean} [props.hasBorder=false] - Whether avatar has a border
 * @param {string} [props.status] - Status indicator ('online', 'offline', 'busy', 'away')
 * @param {boolean} [props.isSquare=false] - Whether avatar is square instead of round
 * @param {string} [props.className] - Additional classes
 */
const Avatar = ({
 size = "md",
 src,
 alt,
 name,
 bgColor,
 hasBorder = false,
 status,
 isSquare = false,
 className = "",
 ...props
}) => {
 const [hasError, setHasError] = useState(false);
 const resolvedSrc = getAvatarUrl(src);

 useEffect(() => {
  setHasError(false);
 }, [src]);
 // Size classes for the avatar
 const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
 };

 // Generate initials from name
 const getInitials = () => {
  if (!name) return "";

  const names = name.split(" ");
  if (names.length === 1) return name.charAt(0).toUpperCase();

  return (
   names[0].charAt(0) + names[names.length - 1].charAt(0)
  ).toUpperCase();
 };

 // Generate a consistent background color from CSS variables only
 const AVATAR_BG_VARS = ["var(--p)", "var(--p3)", "var(--info)", "var(--gold)", "var(--tm)", "var(--success)"];
 const getBackgroundColor = () => {
  if (bgColor) return bgColor;

  if (!name) return "var(--tm)";

  const hash = name.split("").reduce((acc, char) => {
   return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return AVATAR_BG_VARS[Math.abs(hash) % AVATAR_BG_VARS.length];
 };

 // Status indicator colors
 const statusColors = {
  online: "bg-(--success)",
  offline: "bg-(--tm)",
  busy: "bg-(--danger)",
  away: "bg-(--gold)",
 };

 // Base avatar classes
 const avatarClasses = [
  sizeClasses[size],
  "relative flex items-center justify-center object-cover",
  isSquare ? "rounded-xl" : "rounded-full",
  hasBorder ? "ring-2 ring-(--bgs)" : "",
  className,
 ].join(" ");

 return (
  <div className="relative inline-block">
   {resolvedSrc && !hasError ? (
    <img
     src={resolvedSrc}
     alt={alt || name || "Avatar"}
     className={avatarClasses}
     onError={() => setHasError(true)}
     {...props}
    />
   ) : (
    <div
     className={[avatarClasses, "[background-color:var(--avatar-bg)]"].filter(Boolean).join(" ")}
     style={{ "--avatar-bg": bgColor || getBackgroundColor() }}
     {...props}
    >
     <span className="font-semibold text-(--bgs)">{getInitials()}</span>
    </div>
   )}

   {status && (
    <span
     className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${statusColors[status]} ring-2 ring-(--bgs)`}
     aria-label={`Status: ${status}`}
    />
   )}
  </div>
 );
};

/**
 * AvatarGroup component for displaying multiple avatars
 * @param {Object} props - Component props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md'] - Size for all avatars
 * @param {number} [props.max] - Maximum avatars to display before showing extras count
 * @param {React.ReactNode} props.children - Avatar components
 * @param {string} [props.className] - Additional classes
 */
export const AvatarGroup = ({
 size = "md",
 max,
 children,
 className = "",
 ...props
}) => {
 // Get valid children (only Avatar components)
 const avatars = React.Children.toArray(children).filter(
  (child) => React.isValidElement(child) && child.type === Avatar,
 );

 // Limit the number of avatars shown if max is set
 const visibleAvatars = max ? avatars.slice(0, max) : avatars;
 const extraAvatars = max ? avatars.length - max : 0;

 // Size for spacing (negative margin)
 const spacing = {
  xs: "-mr-1.5",
  sm: "-mr-2",
  md: "-mr-2.5",
  lg: "-mr-3",
  xl: "-mr-4",
  "2xl": "-mr-5",
 };

 // Size for the extra count avatar
 const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
 };

 return (
  <div className={`flex items-center ${className}`} {...props}>
   {visibleAvatars.map((avatar, index) => (
    <div key={index} className={index !== 0 ? spacing[size] : ""}>
     {React.cloneElement(avatar, { size, hasBorder: true })}
    </div>
   ))}

   {extraAvatars > 0 && (
    <div className={spacing[size]}>
     <div
      className={`${sizeClasses[size]} bg-(--bgl) text-(--ts) rounded-full flex items-center justify-center ring-2 ring-(--bgs) font-semibold`}
     >
      <span>+{extraAvatars}</span>
     </div>
    </div>
   )}
  </div>
 );
};

export default Avatar;
