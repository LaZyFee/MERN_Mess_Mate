import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = new mongoose.Schema({
    googleId: { type: String },
    username: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },
    email: { type: String, required: true, unique: true },
    phone: {
        type: String,
        required: function () {
            return !this.googleId;
        },
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

const User = mongoose.model('User', userSchema);

export default User;
