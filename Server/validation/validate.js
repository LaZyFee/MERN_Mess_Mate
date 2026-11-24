// Generic zod validation middleware.
// validate(schema, source) — source: 'body' | 'params' (default body)
// Also strips Mongo operators ($gt, $ne, etc.) from the target — NoSQL injection defense.
// (Express 5: req.query is getter-only, so we sanitize body/params only, which is where
// all of this app's user input lives.)

const deepSanitize = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepSanitize);
    const out = {};
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) continue; // drop Mongo operator keys
        out[key] = deepSanitize(obj[key]);
    }
    return out;
};

export const validate = (schema, source = 'body') => (req, res, next) => {
    const cleaned = deepSanitize(req[source] || {});

    const result = schema.safeParse(cleaned);
    if (!result.success) {
        return res.status(400).json({
            msg: 'Validation failed',
            errors: result.error.issues.map(i => ({
                field: i.path.join('.'),
                message: i.message,
            })),
        });
    }
    // Replace with parsed/coerced/cleaned values
    // Express 5: req.query is getter-only → for query, stash parsed result on req.validated
    if (source === 'body') req.body = result.data;
    else if (source === 'params') Object.assign(req.params, result.data);
    else if (source === 'query') req.validated = { ...(req.validated || {}), query: result.data };
    next();
};
