import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    meals: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
    }],
    costs: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number, default: 0 },
        description: { type: String },
    }],
});

const messGroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, unique: true, index: true }, // join code, e.g. "MM-7K2QPX"
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        _id: false
    }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    entries: [entrySchema],
    extras: [{
        name: { type: String },
        amount: { type: Number },
        _id: false
    }],
});


// Indexes for scalability
messGroupSchema.index({ admin: 1 });
messGroupSchema.index({ 'members.user': 1 });
messGroupSchema.index({ 'entries.date': 1 });
messGroupSchema.index({ createdAt: -1 });

const MessGroup = mongoose.model('MessGroup', messGroupSchema);
export default MessGroup;