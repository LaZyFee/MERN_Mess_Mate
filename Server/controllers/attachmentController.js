import Attachment from '../models/Attachment.js';
import Expense from '../models/Expense.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import { verifyMagicBytes, computeFileSha256 } from '../middleware/receiptUpload.js';
import fs from 'fs';

// Attachment controller — upload, magic byte check, and authorized private download (Doc §10, §15)

/**
 * POST /api/attachments/groups/:groupId/upload
 */
export const uploadAttachment = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const { groupId } = req.params;
        const { targetType = 'expense_receipt', targetId = null } = req.body;
        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        // Magic bytes validation
        const isValidSignature = verifyMagicBytes(filePath, mimeType);
        if (!isValidSignature) {
            fs.unlinkSync(filePath); // delete invalid/disguised file
            return res.status(400).json({ msg: 'File signature does not match claimed MIME type (rejected)' });
        }

        // SHA-256 hash
        const sha256 = await computeFileSha256(filePath);

        const attachment = await Attachment.create({
            groupId,
            uploadedBy: req.user.id,
            originalName: req.file.originalname,
            storedName: req.file.filename,
            storagePath: filePath,
            mimeType,
            size: req.file.size,
            sha256,
            scanStatus: 'clean',
            targetType,
            targetId: targetId || null,
        });

        // Link to target if provided
        if (targetId) {
            if (targetType === 'expense_receipt') {
                await Expense.findOneAndUpdate(
                    { _id: targetId, groupId },
                    { receiptUrl: `/api/attachments/groups/${groupId}/${attachment._id}` }
                );
            } else if (targetType === 'payment_evidence') {
                await MoneyTransaction.findOneAndUpdate(
                    { _id: targetId, groupId },
                    { evidenceUrl: `/api/attachments/groups/${groupId}/${attachment._id}` }
                );
            }
        }

        res.status(201).json({
            msg: 'Attachment uploaded and verified',
            attachment: {
                id: attachment._id,
                originalName: attachment.originalName,
                mimeType: attachment.mimeType,
                size: attachment.size,
                sha256: attachment.sha256,
                url: `/api/attachments/groups/${groupId}/${attachment._id}`,
            },
        });
    } catch (err) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
        }
        next(err);
    }
};

/**
 * GET /api/attachments/groups/:groupId/:attachmentId — secure authorized download
 */
export const downloadAttachment = async (req, res, next) => {
    try {
        const { groupId, attachmentId } = req.params;

        const attachment = await Attachment.findOne({ _id: attachmentId, groupId }).lean();
        if (!attachment) {
            return res.status(404).json({ msg: 'Attachment not found' });
        }

        if (!fs.existsSync(attachment.storagePath)) {
            return res.status(404).json({ msg: 'File no longer exists on storage' });
        }

        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');

        const stream = fs.createReadStream(attachment.storagePath);
        stream.pipe(res);
    } catch (err) {
        next(err);
    }
};

