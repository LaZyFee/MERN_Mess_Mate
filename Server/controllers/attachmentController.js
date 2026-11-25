import Attachment from '../models/Attachment.js';
import Expense from '../models/Expense.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import {
    verifyMagicBytes,
    computeBufferSha256,
    scanForViruses,
    uploadToCloudinary,
    signedReceiptUrl,
} from '../middleware/receiptUpload.js';

// Attachment controller — upload, magic byte check, and authorized private download (Doc §10, §15)

// Roles that can read any receipt in the group (money-handling + audit roles).
const PRIVILEGED = ['owner', 'manager', 'treasurer', 'auditor'];

/**
 * Authorization for a private receipt download.
 *
 * Allowed: the uploader, a privileged group role (owner/manager/treasurer/auditor),
 * the creator of the linked expense, or a member who paid the linked transaction.
 * Everyone else gets the same generic 404 so attachment ids cannot be probed.
 *
 * Throws an Error with `status: 404` when denied.
 */
const assertCanReadAttachment = async ({ req, attachment, groupId }) => {
    const deny = () => { throw Object.assign(new Error('Attachment not found'), { status: 404 }); };

    if (String(attachment.uploadedBy) === String(req.user.id)) return;
    if (PRIVILEGED.includes(req.groupRole)) return;

    if (attachment.targetId && attachment.targetType === 'expense_receipt') {
        const expense = await Expense.findOne({ _id: attachment.targetId, groupId }).select('createdBy userId').lean();
        const owner = expense && (String(expense.createdBy) === String(req.user.id) || String(expense.userId) === String(req.user.id));
        if (owner) return;
    }
    if (attachment.targetId && attachment.targetType === 'payment_evidence') {
        const tx = await MoneyTransaction.findOne({ _id: attachment.targetId, groupId }).select('submittedBy fromMember').lean();
        if (tx && String(tx.submittedBy) === String(req.user.id)) return;
    }
    return deny();
};

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
        const ALLOWED_TARGETS = ['expense_receipt', 'payment_evidence', 'support']; // 'support' = ticket attachment
        if (!ALLOWED_TARGETS.includes(targetType)) {
            return res.status(422).json({ msg: `targetType must be one of: ${ALLOWED_TARGETS.join(', ')}` });
        }
        const buffer = req.file.buffer;
        const mimeType = req.file.mimetype;

        // Magic bytes validation (reject disguised/executable files)
        const isValidSignature = verifyMagicBytes(buffer, mimeType);
        if (!isValidSignature) {
            return res
                .status(400)
                .json({ msg: 'File signature does not match claimed MIME type (rejected)' });
        }

        // SHA-256 hash
        const sha256 = computeBufferSha256(buffer);

        // AV-scan hook
        const scan = await scanForViruses(buffer);
        let scanStatus = 'clean';
        if (scan.verdict.startsWith('infected')) {
            return res.status(400).json({ msg: 'File failed antivirus scan (rejected)' });
        }
        if (!scan.scanned) {
            scanStatus = 'pending'; // clamscan unavailable → flag for central AV sweep
        }

        // Cloud storage as an authenticated resource (signed-URL only access)
        const { publicId, secureUrl, resourceType } = await uploadToCloudinary(
            buffer,
            mimeType,
            req.file.originalname
        );

        const attachment = await Attachment.create({
            groupId,
            uploadedBy: req.user.id,
            originalName: req.file.originalname,
            storedName: publicId,
            storagePath: publicId, // logical path on Cloudinary
            provider: 'cloudinary',
            publicId,
            secureUrl,
            resourceType,
            mimeType,
            size: req.file.size,
            sha256,
            scanStatus,
            targetType,
            targetId: targetId || null,
        });

        // Link to target if provided
        if (targetId) {
            const receiptUrl = `/api/attachments/groups/${groupId}/${attachment._id}`;
            if (targetType === 'expense_receipt') {
                await Expense.findOneAndUpdate({ _id: targetId, groupId }, { receiptUrl });
            } else if (targetType === 'payment_evidence') {
                await MoneyTransaction.findOneAndUpdate({ _id: targetId, groupId }, {
                    evidenceUrl: receiptUrl,
                });
            }
        }

        res.status(201).json({
            msg: 'Attachment uploaded to cloud storage, verified and scanned',
            scan: { scanned: scan.scanned, verdict: scan.verdict },
            attachment: {
                id: attachment._id,
                originalName: attachment.originalName,
                mimeType: attachment.mimeType,
                size: attachment.size,
                sha256: attachment.sha256,
                scanStatus: attachment.scanStatus,
                url: `/api/attachments/groups/${groupId}/${attachment._id}`,
            },
        });
    } catch (err) {
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

        // Receipts/payment evidence are PRIVATE. Being a member of the group is not
        // enough: the uploader, a treasurer+ role, or the expense's creator may read it.
        await assertCanReadAttachment({ req, attachment, groupId });

        if (attachment.provider === 'cloudinary' && attachment.publicId) {
            const resourceType =
                attachment.resourceType ||
                (attachment.mimeType === 'application/pdf' ? 'raw' : 'image');
            const url = signedReceiptUrl(attachment.publicId, resourceType);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.redirect(302, url);
        }

        // Legacy local storage fallback
        const fs = await import('fs');
        if (!fs.existsSync(attachment.storagePath)) {
            return res.status(404).json({ msg: 'File no longer exists on storage' });
        }

        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');

        const stream = fs.createReadStream(attachment.storagePath);
        stream.pipe(res);
    } catch (err) {
        if (err.status === 404) return res.status(404).json({ msg: 'Attachment not found' });
        next(err);
    }
};

