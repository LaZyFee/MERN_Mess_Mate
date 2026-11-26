// Stable cursor pagination helper (Doc §11)
// Encodes and decodes base64 cursors with explicit sort keys.

export const encodeCursor = (value) => {
    if (typeof value === 'function') return Buffer.from(String(value())).toString('base64');
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
 *
 * `sortField` must be a document path (default `_id`). When the sort path is not a
 * raw ObjectId, the returned rows are also used to build the cursor via
 * `cursorField(row)` (default: `row[sortField]`), so a Date sort key is serialised
 * as its ISO string and decodes back to a comparable value. Cursors are
 * exclusive-boundary; the (sortField, _id) pair is assumed unique per document.
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
    cursorField = null,
}) => {
    const pageLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const queryFilter = { ...filter };

    const decoded = decodeCursor(cursor);
    if (decoded) {
        const comparator = sortOrder === -1 ? '$lt' : '$gt';
        const isDateField = model.schema?.path?.(sortField)?.instance === 'Date';
        queryFilter[sortField] = { [comparator]: isDateField ? new Date(decoded) : decoded };
    }

    let q = model.find(queryFilter)
        .sort({ [sortField]: sortOrder, _id: sortOrder })
        .limit(pageLimit + 1); // fetch +1 to check for next page

    if (populate) q = q.populate(populate);
    if (select) q = q.select(select);

    const docs = await q.lean();
    const hasMore = docs.length > pageLimit;
    const items = hasMore ? docs.slice(0, pageLimit) : docs;

    const last = items[items.length - 1];
    const nextCursor = hasMore && last
        ? encodeCursor(() => {
            const raw = cursorField ? cursorField(last) : last[sortField];
            return raw instanceof Date ? raw.toISOString() : String(raw);
        })
        : null;

    return {
        items,
        nextCursor,
        hasMore,
        count: items.length,
    };
};

