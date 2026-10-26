import { copyFile, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(
  process.env.WRITER_TOOL_BACKEND ?? resolve(here, '../../../GolandProjects/writer-tool-backend'),
);
const source = resolve(backend, 'api/openapi.phase1.yaml');
const target = resolve(here, '../contracts/openapi.phase1.yaml');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);

// The Go and TypeScript calendar converters are checked against the same
// vectors. Keep a checked-in copy so frontend unit tests run without the
// backend checkout.
const calendarsTarget = resolve(here, '../src/features/timeline/fixtures');
await mkdir(calendarsTarget, { recursive: true });
await cp(resolve(backend, 'testdata/calendars'), calendarsTarget, { recursive: true });

console.log(`Synced ${source} -> ${target}`);
console.log(`Synced ${resolve(backend, 'testdata/calendars')} -> ${calendarsTarget}`);
