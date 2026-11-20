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
});

userSchema.plugin(uniqueValidator);

// Indexes for common lookups
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

export default User;
