// Stable cursor pagination helper (Doc §11)
// Encodes and decodes base64 cursors with explicit sort keys.

export const encodeCursor = (value) => {
    return Buffer.from(String(value)).toString('base64');
};

export const decodeCursor = (cursor) => {
    if (!cursor) return null;
    try {
        return Buffer.from(cursor, 'base64').toString('ascii');
    } catch {
        return null;
    }
};

/**
 * Execute a stable cursor-paginated query.
 */
export const paginateQuery = async ({
    model,
    filter = {},
    cursor = null,
    limit = 20,
    sortField = '_id',
    sortOrder = -1,
    populate = '',
    select = '',
}) => {
    const pageLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const queryFilter = { ...filter };

    const decoded = decodeCursor(cursor);
    if (decoded) {
        const comparator = sortOrder === -1 ? '$lt' : '$gt';
        queryFilter[sortField] = { [comparator]: decoded };
    }

    let q = model.find(queryFilter)
        .sort({ [sortField]: sortOrder })
        .limit(pageLimit + 1); // fetch +1 to check for next page

    if (populate) q = q.populate(populate);
    if (select) q = q.select(select);

    const docs = await q.lean();
    const hasMore = docs.length > pageLimit;
    const items = hasMore ? docs.slice(0, pageLimit) : docs;

    const nextCursor = hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1][sortField])
        : null;

    return {
        items,
        nextCursor,
        hasMore,
        count: items.length,
    };
};

