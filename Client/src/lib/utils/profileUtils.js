/** Resolve an avatar source to a usable image URL. Returns null when there is no src. */
export function getAvatarUrl(src) {
  if (!src || typeof src !== "string") return null;
  const s = src.trim();
  if (!s) return null;
  // Absolute URLs, data URIs and root-relative paths are usable as-is.
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("/")) return s;
  return s;
}
