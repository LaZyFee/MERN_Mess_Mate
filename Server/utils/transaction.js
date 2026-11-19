import mongoose from 'mongoose';

/**
 * Executes a callback within a MongoDB multi-document transaction (Doc §12).
 *
 * If running against a replica set or mongos cluster, wraps operations
 * inside `session.withTransaction()`.
 * If running against a standalone MongoDB server (local dev/test), gracefully
 * executes with the session so code runs without breaking on standalone topology.
 */
export const withTransaction = async (fn) => {
    const session = await mongoose.startSession();
    try {
        let result;
        const topologyType = mongoose.connection?.client?.topology?.description?.type;
        const isReplicaSet = topologyType === 'ReplicaSetWithPrimary' ||
            topologyType === 'Sharded' ||
            (mongoose.connection?.client?.topology?.description?.servers?.size > 1);

        if (isReplicaSet) {
            await session.withTransaction(async () => {
                result = await fn(session);
            });
        } else {
            // Standalone fallback: execute directly passing the session
            result = await fn(session);
        }
        return result;
    } finally {
        await session.endSession();
    }
};

export default withTransaction;

