#!/usr/bin/env node
// Manual collaboration load check: opens real Hocuspocus clients across many
// documents and measures how long an edit takes to reach the peer clients.
//
//   node scripts/collab-load.mjs --docs 50 --clients 2
//
// It talks to the API over HTTP and to the same-origin /collab proxy.

import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values[key] = 'true';
    } else {
      values[key] = next;
      index += 1;
    }
  }
  return values;
}

const args = parseArgs(process.argv.slice(2));
const apiBase = (args.api ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');
const documentCount = Number(args.docs ?? 50);
const clientsPerDocument = Number(args.clients ?? 2);
const cleanup = args.cleanup !== 'false';
const email = args.email ?? `collab-load+${Date.now()}@example.com`;
const password = args.password ?? 'password123';

if (documentCount < 1 || clientsPerDocument < 1) {
  console.error('collab-load: docs and clients must be positive');
  process.exit(1);
}

async function request(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(apiBase + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${method} ${path}: ${response.status} ${text}`);
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

async function loginOrRegister() {
  try {
    return await request('POST', '/auth/login', { email, password });
  } catch (error) {
    if (error.status !== 401 && error.status !== 404) throw error;
    return request('POST', '/auth/register', {
      email,
      password,
      displayName: 'Collab Load',
    });
  }
}

function websocketUrl(websocketPath, collabToken) {
  const url = new URL(apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = websocketPath;
  url.search = `?token=${encodeURIComponent(collabToken)}`;
  return url.toString();
}

function waitForSync(provider) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sync timeout')), 30_000);
    provider.on('synced', ({ state }) => {
      if (state) {
        clearTimeout(timer);
        resolve();
      }
    });
    provider.on('authenticationFailed', () => {
      clearTimeout(timer);
      reject(new Error('collab authentication failed'));
    });
  });
}

const providers = [];
let projectId = null;
let token = null;

try {
  const auth = await loginOrRegister();
  token = auth.accessToken;
  const project = await request(
    'POST',
    '/projects',
    { title: `Collab load ${Date.now()}`, language: 'ru' },
    token,
  );
  projectId = project.id;
  const book = await request(
    'POST',
    `/projects/${projectId}/books`,
    { title: 'Collab load book' },
    token,
  );

  const documentIds = [];
  for (let index = 0; index < documentCount; index += 1) {
    const chapter = await request(
      'POST',
      `/books/${book.id}/nodes`,
      { type: 'chapter', title: `Load chapter ${String(index + 1).padStart(2, '0')}` },
      token,
    );
    if (!chapter.documentId) {
      throw new Error(`chapter ${index + 1} has no document`);
    }
    documentIds.push(chapter.documentId);
  }

  const connections = new Map();
  for (const documentId of documentIds) {
    const collab = await request(
      'POST',
      `/documents/${documentId}/collab-token`,
      null,
      token,
    );
    if (!collab.collabAvailable) {
      throw new Error(`collab is unavailable for ${documentId}`);
    }
    const url = websocketUrl(collab.websocketPath, collab.token);
    const list = [];
    connections.set(documentId, list);
    for (let index = 0; index < clientsPerDocument; index += 1) {
      const doc = new Y.Doc();
      const provider = new HocuspocusProvider({
        url,
        name: documentId,
        document: doc,
      });
      providers.push(provider);
      list.push({ doc, provider, synced: waitForSync(provider) });
    }
  }

  await Promise.all(
    [...connections.values()].flatMap((list) => list.map((item) => item.synced)),
  );
  console.log(
    `connected ${documentCount * clientsPerDocument} clients across ${documentCount} documents`,
  );

  const latencies = [];
  let failures = 0;
  for (let index = 0; index < documentIds.length; index += 1) {
    const list = connections.get(documentIds[index]);
    const marker = `load-${String(index + 1).padStart(2, '0')}`;
    const writer = list[0];
    const start = performance.now();
    writer.doc.transact(() => {
      writer.doc.getText('t').insert(0, marker);
    });
    const deadline = Date.now() + 10_000;
    let converged = false;
    while (Date.now() < deadline) {
      const missing = list
        .slice(1)
        .some((item) => item.doc.getText('t').toString() !== marker);
      if (!missing) {
        converged = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    if (converged) {
      latencies.push(performance.now() - start);
    } else {
      failures += 1;
      console.error(`document ${documentIds[index]} did not converge`);
    }
  }

  if (latencies.length > 0) {
    latencies.sort((left, right) => left - right);
    const percentile = (value) =>
      latencies[Math.min(latencies.length - 1, Math.floor((latencies.length * value) / 100))];
    console.log(
      `propagation p50=${percentile(50).toFixed(0)}ms ` +
        `p95=${percentile(95).toFixed(0)}ms ` +
        `max=${latencies.at(-1).toFixed(0)}ms ` +
        `documents=${latencies.length} failures=${failures}`,
    );
  }
  if (failures > 0 || latencies.length !== documentIds.length) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`collab-load: ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const provider of providers) {
    provider.destroy();
  }
  if (cleanup && projectId && token) {
    try {
      await request('DELETE', `/projects/${projectId}`, undefined, token);
    } catch (error) {
      console.error(`collab-load cleanup: ${error.message}`);
    }
  }
}
