#!/usr/bin/env node
// Read-only comparison against every application model's declared indexes.
import 'dotenv/config';
import mongoose from 'mongoose';
import { readdir } from 'node:fs/promises';

try {
    const modelDirectory = new URL('../models/', import.meta.url);
    for (const file of await readdir(modelDirectory)) {
        if (file.endsWith('.js')) await import(new URL(file, modelDirectory));
    }
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
        autoCreate: false,
        autoIndex: false,
    });
    for (const model of Object.values(mongoose.models)) {
        const { toCreate } = await model.diffIndexes();
        if (toCreate.length) {
            console.error(model.collection.name, 'missing or mismatched indexes', toCreate);
            process.exitCode = 1;
        }
    }
    if (!process.exitCode) console.log('All declared model indexes are present.');
} catch (error) {
    console.error('Index inspection failed:', error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
