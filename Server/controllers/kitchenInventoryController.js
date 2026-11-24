import KitchenItem from '../models/KitchenItem.js';
import Membership from '../models/Membership.js';
import { audit } from '../models/AuditEvent.js';
import { emitGroup } from './routinesController.js';
import { z } from 'zod';

const itemCreateSchema = z.object({
    name: z.string().trim().min(1).max(80),
    unit: z.string().trim().max(20).optional().default(''),
    currentStock: z.number().nonnegative().optional().default(0),
    reorderThreshold: z.number().nonnegative().optional().default(0),
    averageConsumptionPerDay: z.number().nonnegative().optional().default(0),
});

const itemUpdateSchema = z.object({
    currentStock: z.number().nonnegative().optional(),
    reorderThreshold: z.number().nonnegative().optional(),
    averageConsumptionPerDay: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});

const refillSchema = z.object({
    quantity: z.number().positive(),
    unit: z.string().trim().max(20).optional().default(''),
    costPoisha: z.number().nonnegative().optional().default(0),
    note: z.string().trim().max(200).optional().default(''),
});

// GET /api/kitchen-inventory/groups/:groupId — list items
export const listKitchenItems = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const items = await KitchenItem.find({ groupId, isActive: true }).sort({ name: 1 }).lean();
        const now = new Date();
        const result = items.map(it => {
            const daysRemaining = it.averageConsumptionPerDay > 0
                ? Math.max(0, Math.floor(it.currentStock / it.averageConsumptionPerDay))
                : null;
            return {
                ...it,
                daysRemaining,
                needsRefill: it.currentStock <= it.reorderThreshold,
            };
        });
        res.json({ items: result });
    } catch (err) { next(err); }
};

// POST /api/kitchen-inventory/groups/:groupId — create item
export const createKitchenItem = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const data = itemCreateSchema.parse(req.body);
        const existing = await KitchenItem.findOne({ groupId, name: data.name, isActive: true });
        if (existing) return res.status(409).json({ msg: 'Item already exists' });

        const item = await KitchenItem.create({ ...data, groupId, createdBy: req.user.id });
        await audit({ groupId, actorId: req.user.id, action: 'kitchenItem.created', targetType: 'kitchenItem', targetId: item._id });
        res.status(201).json({ item });
    } catch (err) { next(err); }
};

// PATCH /api/kitchen-inventory/groups/:groupId/:itemId — update item
export const updateKitchenItem = async (req, res, next) => {
    try {
        const { groupId, itemId } = req.params;
        const data = itemUpdateSchema.parse(req.body);
        const item = await KitchenItem.findOneAndUpdate(
            { _id: itemId, groupId },
            { $set: data },
            { new: true }
        );
        if (!item) return res.status(404).json({ msg: 'Item not found' });
        await audit({ groupId, actorId: req.user.id, action: 'kitchenItem.updated', targetType: 'kitchenItem', targetId: item._id, after: data });
        res.json({ item });
    } catch (err) { next(err); }
};

// POST /api/kitchen-inventory/groups/:groupId/:itemId/refill — record a refill
export const recordRefill = async (req, res, next) => {
    try {
        const { groupId, itemId } = req.params;
        const { quantity, unit, costPoisha, note } = refillSchema.parse(req.body);
        const current = await KitchenItem.findOne({ _id: itemId, groupId }).select('unit').lean();
        if (!current) return res.status(404).json({ msg: 'Item not found' });
        const refilledAt = new Date();
        const item = await KitchenItem.findOneAndUpdate(
            { _id: itemId, groupId },
            {
                $inc: { currentStock: quantity },
                $set: { lastRefill: refilledAt },
                $push: { refills: { refilledAt, quantity, unit: unit || current.unit, costPoisha, refilledBy: req.user.id, note } },
            },
            { new: true, runValidators: true }
        );
        if (!item) return res.status(404).json({ msg: 'Item not found' });

        await audit({ groupId, actorId: req.user.id, action: 'kitchenItem.refilled', targetType: 'kitchenItem', targetId: item._id, after: { quantity, unit, costPoisha } });
        res.json({ item });
    } catch (err) { next(err); }
};

// DELETE /api/kitchen-inventory/groups/:groupId/:itemId — archive item
export const deleteKitchenItem = async (req, res, next) => {
    try {
        const { groupId, itemId } = req.params;
        const item = await KitchenItem.findOneAndUpdate(
            { _id: itemId, groupId },
            { $set: { isActive: false } },
            { new: true }
        );
        if (!item) return res.status(404).json({ msg: 'Item not found' });
        await audit({ groupId, actorId: req.user.id, action: 'kitchenItem.archived', targetType: 'kitchenItem', targetId: item._id });
        res.json({ msg: 'Item archived' });
    } catch (err) { next(err); }
};

// Helper used by other controllers for realtime emit
export const emitKitchenUpdate = (req, groupId) => {
    const io = req.app?.get('io');
    if (io) io.to(`group:${groupId}`).emit('kitchenInventory-updated', { groupId });
};