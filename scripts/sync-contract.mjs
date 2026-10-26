import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(
  process.env.WRITER_TOOL_BACKEND ?? resolve(here, '../../../GolandProjects/writer-tool-backend'),
  'api/openapi.phase1.yaml',
);
const target = resolve(here, '../contracts/openapi.phase1.yaml');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Synced ${source} -> ${target}`);
