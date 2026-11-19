import DepositAsset from '../models/DepositAsset.js';
import Membership from '../models/Membership.js';
import { audit } from '../models/AuditEvent.js';
import { sumPoisha } from '../utils/money.js';

// DepositAsset controller (Doc §6, §16: landlord deposits, kitchen assets)

/** GET /api/assets/groups/:groupId */
export const listAssets = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const assets = await DepositAsset.find({ groupId }).sort({ createdAt: -1 }).lean();
        res.json({ assets });
    } catch (err) { next(err); }
};

/** POST /api/assets/groups/:groupId */
export const createAsset = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { name, kind = 'landlord_deposit', initialAmount, fundingShares = [], custodianId = null, notes = '' } = req.body;

        if (!name || !initialAmount || initialAmount < 1) {
            return res.status(400).json({ msg: 'name and positive initialAmount in poisha required' });
        }
        if (!Array.isArray(fundingShares) || fundingShares.length === 0) {
            return res.status(400).json({ msg: 'fundingShares must include at least one member share' });
        }

        const totalFunded = sumPoisha(fundingShares.map(s => Number(s.amount)));
        if (totalFunded !== Number(initialAmount)) {
            return res.status(422).json({ msg: `Funding shares total (৳${totalFunded / 100}) must equal initial amount (৳${initialAmount / 100})` });
        }

        const asset = await DepositAsset.create({
            groupId,
            name,
            kind,
            initialAmount,
            currentValuation: initialAmount,
            status: 'active',
            fundingShares,
            custodianId,
            notes,
            createdBy: req.user.id,
        });

        await audit({
            groupId, actorId: req.user.id, action: 'asset.created', targetType: 'deposit_asset', targetId: asset._id,
            after: { name, kind, initialAmount },
        });

        res.status(201).json({ msg: 'Asset/deposit tracked successfully', asset });
    } catch (err) { next(err); }
};

/** POST /api/assets/groups/:groupId/:assetId/refund — record refund to departing or credited member */
export const recordAssetRefund = async (req, res, next) => {
    try {
        const { groupId, assetId } = req.params;
        const { membershipId, amount, note = '', moneyTransactionId = null } = req.body;

        const asset = await DepositAsset.findOne({ _id: assetId, groupId });
        if (!asset) return res.status(404).json({ msg: 'Asset not found' });

        const share = asset.fundingShares.find(s => String(s.membershipId) === String(membershipId));
        if (!share) return res.status(404).json({ msg: 'Member not found in asset funding shares' });

        const maxRefundable = share.amount - share.refundedAmount;
        if (amount > maxRefundable) {
            return res.status(422).json({ msg: `Amount exceeds maximum remaining refundable share (৳${maxRefundable / 100})` });
        }

        share.refundedAmount += Number(amount);
        asset.refunds.push({
            membershipId,
            amount: Number(amount),
            refundedAt: new Date(),
            moneyTransactionId,
            note,
        });

        asset.currentValuation = Math.max(0, asset.currentValuation - Number(amount));

        const allFullyRefunded = asset.fundingShares.every(s => s.refundedAmount >= s.amount);
        asset.status = allFullyRefunded ? 'fully_refunded' : 'partially_refunded';
        await asset.save();

        await audit({
            groupId, actorId: req.user.id, action: 'asset.refunded', targetType: 'deposit_asset', targetId: asset._id,
            after: { membershipId, amount, status: asset.status },
        });

        res.json({ msg: 'Asset refund recorded', asset });
    } catch (err) { next(err); }
};

