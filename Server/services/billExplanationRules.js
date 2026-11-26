// "Explain my bill" (S5.6) — pure builder, no DB access. Reads one frozen
// statement item and turns it into a structured, ordered breakdown with English
// and Bengali strings. Nothing here recomputes money: every figure comes from the
// frozen item, so the explanation can never drift from the finalized statement.

const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBengaliDigits = (value) => String(value).replace(/\d/g, d => bnDigits[Number(d)]);

/** Integer poisha → { taka: '1,250.50', bn: '১,২৫০.৫০' } (no float rounding drift). */
export const formatPoisha = (poisha) => {
    const n = Math.trunc(Number(poisha) || 0);
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const taka = Math.floor(abs / 100);
    const poishaPart = String(abs % 100).padStart(2, '0');
    const grouped = String(taka).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const en = `${sign}${grouped}.${poishaPart}`;
    return { en, bn: `${sign === '-' ? '-' : ''}${toBengaliDigits(grouped)}.${toBengaliDigits(poishaPart)}` };
};

const BN_LABELS = {
    opening: 'পূর্বের ব্যালেন্স',
    mealCost: 'খাবারের খরচ',
    otherCost: 'অন্যান্য খরচ',
    totalCharge: 'মোট চার্জ',
    contributions: 'আপনার জমা',
    personalPayments: 'সরাসরি পরিশোধ',
    settlementsPaid: 'সেটেলমেন্ট (আপনি দিয়েছেন)',
    settlementsReceived: 'সেটেলমেন্ট (আপনি পেয়েছেন)',
    payoutsReceived: 'ফান্ড থেকে গ্রহণ',
    closingCredit: 'চূড়ান্ত ব্যালেন্স',
    youOwe: 'আপনি গ্রুপকে দিতে পারেন',
    youReceive: 'গ্রুপ আপনাকে দেবে',
    settled: 'সব সমান',
};

/**
 * Build the breakdown.
 *   month: 'YYYY-MM'
 *   item:  Statement item (frozen)
 *   mealRate: poisha per meal unit (nullable)
 *   groupName: display name
 *   lang: 'en' | 'bn' — which expression to prefer for `label`
 * Returns { month, status, headline, sections: [{ key, rows: [{ key, label, labelBn, amountPoisha, display, emphasis }] }], summary }
 */
export const buildBillExplanation = ({ month, item = {}, mealRate = null, groupName = '', lang = 'en' }) => {
    const pick = (en, bn) => (lang === 'bn' ? bn : en);
    const row = (key, amountPoisha, { label, sign = 1, emphasis = false } = {}) => {
        const formatted = formatPoisha(Math.abs(amountPoisha));
        return {
            key,
            label: label || key,
            labelBn: BN_LABELS[key] || label || key,
            amountPoisha: Number(amountPoisha) || 0,
            sign,
            emphasis,
            display: { en: formatted.en, bn: formatted.bn },
            negative: (Number(amountPoisha) || 0) < 0,
        };
    };

    const charges = [
        row('mealCost', item.mealCost || 0, { label: 'Meal cost' }),
        row('otherCost', item.otherCost || 0, { label: 'Other charges' }),
    ];

    const credits = [
        row('contributions', item.contributions || 0, { label: 'Your contributions' }),
        row('personalPayments', item.personalPayments || 0, { label: 'Paid directly to suppliers' }),
        row('settlementsPaid', item.settlementsPaid || 0, { label: 'Settlements you paid' }),
        row('payoutsReceived', item.payoutsReceived || 0, { label: 'Received from fund' }),
        row('settlementsReceived', item.settlementsReceived || 0, { label: 'Settlements you received', sign: -1 }),
    ].filter(r => r.amountPoisha !== 0);

    const closing = Number(item.closingCredit) || 0;
    const status = closing > 0 ? 'receives' : closing < 0 ? 'owes' : 'settled';
    const absClosing = formatPoisha(Math.abs(closing));

    const headline = status === 'owes'
        ? pick(`You owe ৳${absClosing.en}`, `আপনি ৳${absClosing.bn} দিতে পারেন`)
        : status === 'receives'
            ? pick(`The group owes you ৳${absClosing.en}`, `গ্রুপ আপনাকে ৳${absClosing.bn} দেবে`)
            : pick('Settled — no money due', 'সমাপ্ত — কোনো টাকা বাকি নেই');

    const sections = [
        { key: 'opening', rows: [row('opening', item.openingCredit || 0, { label: 'Opening balance' })] },
        {
            key: 'charges',
            rows: [
                ...charges,
                row('totalCharge', item.totalCharge || 0, { label: 'Total charge', emphasis: true }),
                ...(mealRate != null && item.mealUnits
                    ? [{
                        key: 'mealRate',
                        label: `${item.mealUnits} meal units × ৳${formatPoisha(mealRate).en}`,
                        labelBn: `${toBengaliDigits(item.mealUnits)} মিল ইউনিট × ৳${formatPoisha(mealRate).bn}`,
                        amountPoisha: null,
                    }]
                    : []),
            ],
        },
        { key: 'credits', rows: credits },
        { key: 'closing', rows: [row('closingCredit', closing, { label: 'Closing balance', emphasis: true })] },
    ];

    return {
        month,
        groupName,
        displayName: item.displayName || '',
        status,
        headline,
        sections,
        summary: {
            mealUnits: item.mealUnits || 0,
            mealRatePoisha: mealRate,
            totalChargePoisha: item.totalCharge || 0,
            paidThisMonthPoisha: (item.contributions || 0) + (item.personalPayments || 0) + (item.settlementsPaid || 0),
            closingCreditPoisha: closing,
            closingDisplay: { en: absClosing.en, bn: absClosing.bn },
            note: pick(
                'Figures are frozen from the finalized statement; a later correction creates a new version.',
                'সব হিসাব অনুমোদিত স্টেটমেন্ট থেকে নেওয়া; পরবর্তী সংশোধন হলে নতুন ভার্সন তৈরি হবে।'
            ),
        },
    };
};
