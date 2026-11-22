import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

// InboxNotification — in-app notification row for one user (or the admin
// control-plane via scope:'admin'). Supports dedupe + TTL expiry (90 days).

const inboxNotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scope: { type: String, enum: ['user', 'admin'], default: 'user' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', default: null },
    type: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 120, required: true },
    body: { type: String, trim: true, maxlength: 300, default: '' },
    link: {
        kind: { type: String, default: null },
        id: { type: mongoose.Schema.Types.ObjectId, default: null },
        _id: false,
    },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, default: null },
    expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

inboxNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
inboxNotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true, sparse: true });
inboxNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

inboxNotificationSchema.plugin(uniqueValidator);

const InboxNotification = mongoose.model('InboxNotification', inboxNotificationSchema);
export default InboxNotification;
