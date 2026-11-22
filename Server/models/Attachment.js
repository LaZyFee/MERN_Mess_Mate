import mongoose from 'mongoose';

// Attachment — private file storage metadata for expense receipts,
// payment screenshots, and documents (Doc §10, §15).
// Files are validated for magic-byte signatures and stored privately;
// access is strictly authenticated and group-scoped.

const attachmentSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        originalName: { type: String, trim: true, maxlength: 200, required: true },
        storedName: { type: String, trim: true, maxlength: 200, required: true },
        storagePath: { type: String, required: true },
        mimeType: {
            type: String,
            required: true,
            enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        },
        size: { type: Number, required: true, max: 10 * 1024 * 1024 }, // max 10MB
        sha256: { type: String, required: true },
        scanStatus: {
            type: String,
            enum: ['clean', 'pending', 'rejected'],
            default: 'clean',
        },
        // Cloud storage (item #5): provider, public id and secure url for
        // signed-URL access. `storagePath` holds the logical path (Cloudinary
        // public_id) for cloud uploads, or a local disk path for legacy files.
        provider: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
        publicId: { type: String, trim: true },
        secureUrl: { type: String, trim: true },
        resourceType: { type: String, enum: ['image', 'raw'], default: 'image' },
        targetType: {
            type: String,
            enum: ['expense_receipt', 'payment_evidence', 'other'],
            default: 'expense_receipt',
        },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    { timestamps: true }
);

attachmentSchema.index({ groupId: 1, targetType: 1, targetId: 1 });
attachmentSchema.index({ sha256: 1 });

const Attachment = mongoose.model('Attachment', attachmentSchema);
export default Attachment;

