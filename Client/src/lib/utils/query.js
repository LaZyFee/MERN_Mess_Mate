/**
 * Build a clean query string from an object.
 * Removes null, undefined, and empty string parameters.
 *
 * @param {Object} params - Query parameters
 * @returns {string} Query string starting with '?' or empty string
 */
export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.append(key, String(val));
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}
