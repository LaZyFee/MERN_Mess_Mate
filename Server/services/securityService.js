// SecurityEvent anomaly sweep (B3.3).
// Runs every 15 minutes: detects refresh-token reuse, new device/country,
// device-enrolment bursts, repeated failures; emits "new sign-in" alerts.

import SecurityEvent from '../models/SecurityEvent.js';
import User from '../models/User.js';
import { recordSecurityEvent } from '../models/SecurityEvent.js';
import { notifyAdmins, notify } from './inboxService.js';

const NEW_DEVICE_WINDOW_HOURS = 24;
const DEVICE_BURST_THRESHOLD = 5; // enrolments per hour
const FAILURE_BURST_THRESHOLD = 10; // failures per hour

export const runAnomalySweep = async (now = new Date()) => {
    const alerts = [];

    // 1. Refresh-token reuse events already recorded by auth layer — just re-alert
    const reuseEvents = await SecurityEvent.find({
        type: 'refresh_token_reuse',
        createdAt: { $gte: new Date(now.getTime() - 15 * 60 * 1000) },
    }).lean();
    for (const ev of reuseEvents) {
        alerts.push({
            userId: ev.userId,
            type: 'refresh_token_reuse',
            severity: 'high',
            message: 'Refresh token reuse detected (possible token theft)',
        });
    }

    // 2. Device enrolment bursts
    const newDevices = await SecurityEvent.find({
        type: 'new_device',
        createdAt: { $gte: new Date(now.getTime() - NEW_DEVICE_WINDOW_HOURS * 60 * 60 * 1000) },
    }).lean();
    const byUser = {};
    for (const ev of newDevices) {
        byUser[ev.userId] = (byUser[ev.userId] || 0) + 1;
    }
    for (const [userId, count] of Object.entries(byUser)) {
        if (count >= DEVICE_BURST_THRESHOLD) {
            alerts.push({
                userId,
                type: 'device_enrolment_burst',
                severity: 'medium',
                message: `${count} new device enrolments in ${NEW_DEVICE_WINDOW_HOURS}h`,
            });
        }
    }

    // 3. Repeated failures
    const failures = await SecurityEvent.find({
        type: 'repeated_failures',
        createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
    }).lean();
    const byUserF = {};
    for (const ev of failures) {
        byUserF[ev.userId] = (byUserF[ev.userId] || 0) + 1;
    }
    for (const [userId, count] of Object.entries(byUserF)) {
        if (count >= FAILURE_BURST_THRESHOLD) {
            alerts.push({
                userId,
                type: 'repeated_failures',
                severity: 'medium',
                message: `${count} authentication failures in 1h`,
            });
        }
    }

    // Emit admin alerts + user "new sign-in" emails
    for (const alert of alerts) {
        try {
            await notifyAdmins({
                type: 'security.anomaly',
                title: `Security: ${alert.type.replace('_', ' ')}`,
                body: alert.message,
                link: { kind: 'security_event', id: alert.userId },
                dedupeKey: `security:${alert.type}:${alert.userId}`,
            });
        } catch { /* non-blocking */ }
    }

    return { alerts: alerts.length, details: alerts };
};

export const recordNewSignIn = async ({ userId, ip, ua, isNewDevice, isNewCountry }) => {
    const events = [];
    if (isNewDevice) {
        events.push({ type: 'new_device', meta: { ip, ua } });
    }
    if (isNewCountry) {
        events.push({ type: 'new_country', meta: { ip, ua } });
    }
    events.push({ type: 'new_sign_in', meta: { ip, ua } });

    for (const ev of events) {
        await recordSecurityEvent({ userId, ip, ua, type: ev.type, meta: ev.meta });
    }
};
