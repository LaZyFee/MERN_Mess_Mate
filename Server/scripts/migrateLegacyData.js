import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MessGroup from '../models/MessGroup.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import PolicyVersion from '../models/PolicyVersion.js';
import RecurringRule from '../models/RecurringRule.js';
import Expense from '../models/Expense.js';
import PaymentNote from '../models/PaymentNote.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import { seedDefaultCategories } from '../controllers/expenseCategoryController.js';

dotenv.config();

/**
 * Migration Script for Legacy MealMate Data (Doc §11 Legacy Migration Map).
 *
 * Safe & Idempotent:
 *  - Preserves historical records without destructive rewrites.
 *  - Establishes V2 Memberships and PolicyVersions for legacy groups.
 *  - Converts static group.extras into date-bounded RecurringRules.
 *  - Ensures expenses carry integer poisha, lines, and costPeriod.
 *
 * Usage:
 *   node scripts/migrateLegacyData.js [--dry-run]
 */

const isDryRun = process.argv.includes('--dry-run');

export const runMigration = async () => {
    console.log(`\n--- Starting MealMate Legacy Migration (${isDryRun ? 'DRY RUN' : 'LIVE'}) ---`);
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mealmate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let migratedGroups = 0;
    let migratedMemberships = 0;
    let migratedRecurring = 0;
    let migratedExpenses = 0;

    const groups = await MessGroup.find().lean();
    console.log(`Found ${groups.length} mess groups.`);

    for (const group of groups) {
        const groupId = group._id;
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // 1. Ensure PolicyVersion exists
        const policy = await PolicyVersion.findOne({ groupId });
        if (!policy) {
            console.log(`[Group ${group.name}] Initializing PolicyVersion v1...`);
            if (!isDryRun) {
                await PolicyVersion.create({
                    groupId,
                    version: 1,
                    effectiveFrom: monthStr,
                    mealWeights: { breakfast: 500, lunch: 1000, dinner: 1000 },
                    allowedPortions: [0, 0.5, 1, 1.5, 2],
                    currency: 'BDT',
                    timezone: 'Asia/Dhaka',
                    publishedBy: group.admin,
                });
            }
        }

        // 2. Ensure Seed Categories
        if (!isDryRun) {
            await seedDefaultCategories({ groupId, userId: group.admin });
        }

        // 3. Migrate embedded members to Membership collection
        const existingMemberships = await Membership.find({ groupId }).lean();
        const existingUserIds = new Set(existingMemberships.map(m => String(m.user)).filter(Boolean));

        // Owner membership
        if (!existingUserIds.has(String(group.admin))) {
            const adminUser = await User.findById(group.admin).lean();
            console.log(`[Group ${group.name}] Creating Owner Membership for ${adminUser?.username || 'Admin'}...`);
            if (!isDryRun) {
                await Membership.create({
                    groupId,
                    user: group.admin,
                    displayName: adminUser?.username || 'Owner',
                    role: 'owner',
                    startDate: group.createdAt || now,
                    createdBy: group.admin,
                });
            }
            migratedMemberships++;
        }

        // Other members
        for (const memberItem of (group.members || [])) {
            const userId = memberItem.user;
            if (userId && !existingUserIds.has(String(userId)) && String(userId) !== String(group.admin)) {
                const u = await User.findById(userId).lean();
                console.log(`[Group ${group.name}] Creating Membership for ${u?.username || 'Member'}...`);
                if (!isDryRun) {
                    await Membership.create({
                        groupId,
                        user: userId,
                        displayName: u?.username || 'Member',
                        role: memberItem.role === 'admin' ? 'manager' : 'member',
                        startDate: group.createdAt || now,
                        createdBy: group.admin,
                    });
                }
                migratedMemberships++;
            }
        }

        // 4. Convert legacy group extras to RecurringRules
        if (group.extras && group.extras.length > 0) {
            for (const extra of group.extras) {
                const ruleExists = await RecurringRule.findOne({ groupId, name: extra.name });
                if (!ruleExists && extra.amount > 0) {
                    console.log(`[Group ${group.name}] Converting extra "${extra.name}" (৳${extra.amount}) to RecurringRule...`);
                    if (!isDryRun) {
                        await RecurringRule.create({
                            groupId,
                            name: extra.name,
                            amount: Math.round(extra.amount * 100), // convert Taka to integer poisha
                            splitMode: 'equal_all',
                            effectiveFrom: monthStr,
                            isActive: true,
                            createdBy: group.admin,
                        });
                    }
                    migratedRecurring++;
                }
            }
        }

        migratedGroups++;
    }

    // 5. Migrate legacy Expenses (ensure integer poisha and lines)
    const expenses = await Expense.find({ lines: { $size: 0 } });
    console.log(`Found ${expenses.length} legacy expenses needing lines/poisha migration.`);

    for (const exp of expenses) {
        const costPeriod = exp.costPeriod || exp.month || `${new Date(exp.date).getFullYear()}-${String(new Date(exp.date).getMonth() + 1).padStart(2, '0')}`;
        // If amount looks like Taka (float with decimals or low integer), convert to poisha
        const poishaAmount = exp.schemaVersion === 2 ? exp.amount : Math.round(exp.amount * 100);

        if (!isDryRun) {
            exp.costPeriod = costPeriod;
            exp.month = costPeriod;
            exp.amount = poishaAmount;
            exp.schemaVersion = 2;
            exp.lines = [{
                description: exp.description || exp.category || 'Expense',
                categoryId: exp.categoryId || (await ExpenseCategory.findOne({ groupId: exp.groupId }))?._id,
                amount: poishaAmount,
                splitMode: 'equal_all',
            }];
            await exp.save();
        }
        migratedExpenses++;
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Groups verified: ${migratedGroups}`);
    console.log(`Memberships initialized: ${migratedMemberships}`);
    console.log(`Recurring rules created from extras: ${migratedRecurring}`);
    console.log(`Expenses normalized: ${migratedExpenses}`);
    console.log('Migration finished successfully.\n');

    await mongoose.disconnect();
};

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('migrateLegacyData.js')) {
    runMigration().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}

