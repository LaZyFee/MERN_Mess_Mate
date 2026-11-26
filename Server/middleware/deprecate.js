// Marks legacy routes with `Deprecation` / `Sunset` headers (RFC 8594 style).
// Attach before the handler on any route kept only for old clients.

export const deprecate = ({ successor = null, sunsetDate = null } = {}) => (req, res, next) => {
    const sunset = sunsetDate || process.env.LEGACY_SUNSET_DATE || '2027-03-31';
    const sunsetAt = new Date(`${sunset}T23:59:59.999Z`);
    if (!Number.isNaN(sunsetAt.getTime()) && Date.now() > sunsetAt.getTime()) {
        res.set('Deprecation', 'true');
        res.set('Sunset', sunset);
        if (successor) res.set('Link', `<${successor}>; rel="successor-version"`);
        return res.status(410).json({ msg: 'Legacy API is retired; use the successor endpoint' });
    }
    res.set('Deprecation', 'true');
    res.set('Sunset', sunset);
    if (successor) res.set('Link', `<${successor}>; rel="successor-version"`);
    next();
};
