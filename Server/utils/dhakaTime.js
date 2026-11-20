// Dhaka (UTC+6) civil-time helpers shared by controllers, services, and tests.
// A "day" is always the Asia/Dhaka local civil date, stored as UTC midnight.

/** Format any date-ish value as the Asia/Dhaka civil date "YYYY-MM-DD". */
export const dayString = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
};

/** UTC midnight Date for a Dhaka civil day string. */
export const dateAtDay = (day) => new Date(`${day}T00:00:00.000Z`);

/** "YYYY-MM" month of a Dhaka civil day. */
export const monthOfDay = (day) => day.slice(0, 7);

/** Enumerate inclusive civil days between two Dhaka day strings. */
export const enumerateDays = (from, to) => {
    const days = [];
    const cursor = dateAtDay(from);
    const end = dateAtDay(to);
    for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        days.push(cursor.toISOString().slice(0, 10));
    }
    return days;
};
