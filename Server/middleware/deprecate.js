// Marks legacy routes with `Deprecation` / `Sunset` headers (RFC 8594 style).
// Attach before the handler on any route kept only for old clients.

export const deprecate = ({ successor = null, sunsetDate = null } = {}) => (req, res, next) => {
    res.set('Deprecation', 'true');
    if (sunsetDate) res.set('Sunset', sunsetDate);
    if (successor) res.set('Link', `<${successor}>; rel="successor-version"`);
    next();
};
