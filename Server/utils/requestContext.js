import { AsyncLocalStorage } from 'node:async_hooks';

// Request context (S3.5) — carries the per-request correlation id through async
// call chains so `audit()` can stamp AuditEvent.requestId without threading `req`
// into every service call.
const storage = new AsyncLocalStorage();

export const runWithRequestContext = (context, fn) => storage.run(context, fn);

export const currentRequestId = () => storage.getStore()?.requestId || '';

export const currentRequestIp = () => storage.getStore()?.ip || '';
