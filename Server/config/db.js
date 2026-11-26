import { connect } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Production requires a replica set for multi-document transactions.
// Refuse to boot in production without MONGO_REPLICA_SET configured.
if (process.env.NODE_ENV === 'production' && !process.env.MONGO_REPLICA_SET) {
    console.error('FATAL: NODE_ENV=production requires MONGO_REPLICA_SET (transactions need a replica set).');
    process.exit(1);
}

const connectDB = async () => {
    try {
        const mongoose = (await import('mongoose')).default;
        // Tests may pre-open the connection (in-memory server) — reuse it.
        if (mongoose.connection.readyState === 1) {
            console.log('MongoDB already connected');
            return;
        }
        const opts = {
            retryWrites: true,
            w: 'majority',
            readPreference: 'primaryPreferred',
            serverSelectionTimeoutMS: 10000,
            ...(process.env.MONGO_REPLICA_SET ? { replicaSet: process.env.MONGO_REPLICA_SET } : {}),
        };
        await connect(process.env.MONGO_URI, opts);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

export default connectDB;