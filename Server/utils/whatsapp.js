import User from '../models/User.js';

/**
 * WhatsApp notifications for month-end summaries.
 *
 * Two modes:
 *  1. **Deep-link mode (default, zero-config)** — generates wa.me links the admin
 *     clicks to open WhatsApp with a pre-filled message per member. No API needed.
 *  2. **Cloud API mode (optional)** — if WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set,
 *     sends directly via the WhatsApp Cloud API.
 *
 * Only members who saved a WhatsApp number on register/edit-profile are included.
 */

export const normalizeWaNumber = (raw) => {
    if (!raw) return null;
    const digits = String(raw).replace(/[^\d]/g, '');
    if (digits.length < 10 || digits.length > 15) return null;
    return digits; // wa.me expects country-code digits without '+'
};

export const buildWaLink = (waNumber, message) => {
    const num = normalizeWaNumber(waNumber);
    if (!num) return null;
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
};

export const buildMemberSummaryMessage = ({ groupName, username, month, mealRate, totalMeals, mealCost, otherCost, totalDue, amountPaid, balance, note }) => {
    const lines = [
        `📋 *${groupName}* — Monthly Summary (${month})`,
        ``,
        `Hi *${username}*, here is your month-end bill:`,
        ``,
        `🍽️ Meals: ${totalMeals} × ৳${mealRate} = *৳${mealCost}*`,
        `🏠 Other costs (rent/bills/extras): *৳${otherCost}*`,
        `💰 *Total due: ৳${totalDue}*`,
        `💳 You paid: ৳${amountPaid}`,
        `${balance >= 0 ? `✅ You receive: ৳${balance}` : `🔴 You owe: ৳${Math.abs(balance)}`}`,
    ];
    if (note) lines.push(``, `📝 Note from admin: ${note}`);
    lines.push(``, `— sent via MealMate`);
    return lines.join('\n');
};

// Build per-member WhatsApp payloads from a computed/frozen summary
export const buildWaSummaryLinks = async ({ group, summary }) => {
    const members = await User.find({
        _id: { $in: group.members.map(m => m.user) },
    }).select('username whatsapp').lean();

    const waMap = new Map(members.map(u => [String(u._id), u]));

    const results = [];
    for (const us of summary.userSummaries) {
        const user = waMap.get(String(us.userId));
        if (!user?.whatsapp) {
            results.push({ userId: us.userId, username: user?.username || 'Member', waLink: null, reason: 'no whatsapp number saved' });
            continue;
        }
        const message = buildMemberSummaryMessage({
            groupName: group.name,
            username: user.username,
            month: summary.month,
            mealRate: summary.mealRate,
            totalMeals: us.totalMeals,
            mealCost: us.mealCost,
            otherCost: us.otherCost,
            totalDue: us.totalDue,
            amountPaid: us.mealExpenses,
            balance: us.balance,
        });
        results.push({ userId: us.userId, username: user.username, waLink: buildWaLink(user.whatsapp, message), message });
    }
    return results;
};

// Optional: direct send via WhatsApp Cloud API (Meta). Configure to enable.
export const sendWaDirect = async (waNumber, message) => {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) return false;

    const num = normalizeWaNumber(waNumber);
    if (!num) return false;

    const res = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: num,
                type: 'text',
                text: { body: message },
            }),
        }
    );
    return res.ok;
};
