import 'dotenv/config';
import { glob } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Module-import smoke test (S3.9): every route/controller/service/model must be
// loadable. A syntax or import error in a route file silently kills its endpoints
// while pure rule tests still pass — this catches that before deployment.

const roots = ['routes', 'controllers', 'services', 'models', 'validation', 'utils', 'middleware'];
const skip = new Set(['config/passportJs.js', 'middleware/receiptUpload.js']);
let failures = 0;
let loaded = 0;

for (const root of roots) {
    for await (const file of glob(`${root}/**/*.js`)) {
        if (skip.has(file)) continue;
        try {
            // pathToFileURL is required on Windows (bare `d:\...` is not a valid ESM specifier)
            await import(pathToFileURL(file).href);
            loaded++;
        } catch (err) {
            failures++;
            console.error(`FAIL ${file}: ${err.message}`);
        }
    }
}

console.log(`import smoke: ${loaded} modules loaded, ${failures} failures`);
if (failures) process.exitCode = 1;
