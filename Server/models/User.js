import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = new mongoose.Schema({
    googleId: { type: String },
    // Password reset / email verification
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    verifyEmailToken: { type: String },
    refreshToken: { type: String }, // hashed refresh token
    username: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },
    email: { type: String, required: true, unique: true },
    phone: {
        type: String,
        default: "",
    },
    // Optional WhatsApp number (with country code, digits only) — used by admins
    // to send month-end summaries. Not mandatory.
    whatsapp: {
        type: String,
        default: "",
    },
    // Recipient consent for automated notifications (Doc §13)
    whatsappConsent: {
        type: Boolean,
        default: true,
    },
    // Platform-level suspension (admin panel only): blocks logins & API access
    suspended: { type: Boolean, default: false, index: true },
    whatsappConsentAt: {
        type: Date,
        default: Date.now,
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },
    profilePic: {
        type: String,
        default: "",
    },
    messGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup' }],
    // Per-type notification preferences (B0.1). Unknown types default to on.
    notificationPrefs: {
        types: { type: mongoose.Schema.Types.Mixed, default: {} },
        quietHours: {
            from: { type: String, default: '22:00' },
            to: { type: String, default: '07:00' },
            _id: false,
        },
        _id: false,
    },
    // ---- TOTP 2FA (B3.2) ----
    twoFactor: {
        enabled: { type: Boolean, default: false },
        secretEnc: { type: String, default: '' }, // AES-256-GCM encrypted TOTP secret
        enabledAt: { type: Date, default: null },
        recoveryCodesHash: [{ type: String }], // sha256 hashes, single-use
    },
    // ---- Consent timestamps (B3.4) ----
    termsAcceptedAt: { type: Date, default: null },
    privacyAcceptedAt: { type: Date, default: null },
    supportContextConsentAt: { type: Date, default: null },
    emailNotificationsConsentAt: { type: Date, default: null },
});

userSchema.plugin(uniqueValidator);

// Indexes for common lookups
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

export default User;
