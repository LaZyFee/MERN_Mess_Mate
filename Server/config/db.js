import { connect } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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
            // Point at a replica set (or sharded cluster) so multi-document
            // transactions are supported. Omit MONGO_REPLICA_SET for a
            // standalone dev instance — mongoose still connects, transactions
            // gracefully degrade via utils/transaction.js.
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