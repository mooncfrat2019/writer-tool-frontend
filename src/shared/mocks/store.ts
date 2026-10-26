import { countProseMirrorWords } from '@/shared/lib/wordCount';
import { createInitialMockState, type MockState } from './data';

export const MOCK_STORAGE_KEY = 'writer-tool.mock.v1';
export const MOCK_SESSION_KEY = 'writer-tool.mock.session.v1';
const STORAGE_VERSION = 1;

type PersistedMockState = {
  version: number;
  data: MockState;
};

let state: MockState | null = null;
let memorySession = false;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is a convenience in mock mode. The in-memory state still works.
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

function isMockState(value: unknown): value is MockState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<MockState>;
  return (
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.books) &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.documents) &&
    Array.isArray(candidate.characters) &&
    Array.isArray(candidate.relations) &&
    Array.isArray(candidate.attachments) &&
    Array.isArray(candidate.assets) &&
    Array.isArray(candidate.exports)
  );
}

function loadState(): MockState {
  const raw = safeGet(MOCK_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedMockState>;
      if (parsed.version === STORAGE_VERSION && isMockState(parsed.data)) {
        return parsed.data;
      }
    } catch {
      // Corrupted demo state is reset to the fixture.
    }
    safeRemove(MOCK_STORAGE_KEY);
  }
  const initial = createInitialMockState();
  recalculateMockState(initial);
  return initial;
}

/**
 * Recomputes document, node, book and project word counts so every screen
 * stays consistent after edits and structural changes.
 */
export function recalculateMockState(target: MockState): void {
  for (const document of target.documents) {
    if (document.kind === 'text' && document.canonical) {
      document.wordCount = countProseMirrorWords(document.canonical);
    }
  }

  const documents = new Map(target.documents.map((document) => [document.id, document]));
  const byParent = new Map<string | null, typeof target.nodes>();
  for (const node of target.nodes) {
    const siblings = byParent.get(node.parentId ?? null) ?? [];
    siblings.push(node);
    byParent.set(node.parentId ?? null, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
  }

  const aggregate = (nodeId: string): number => {
    const node = target.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      return 0;
    }
    const ownWords = node.documentId ? (documents.get(node.documentId)?.wordCount ?? 0) : 0;
    const childWords = (byParent.get(node.id) ?? []).reduce(
      (total, child) => total + aggregate(child.id),
      0,
    );
    node.wordCount = ownWords + childWords;
    return node.wordCount;
  };

  for (const book of target.books) {
    const rootNodes = byParent.get(null) ?? [];
    let total = 0;
    for (const node of rootNodes) {
      if (node.bookId === book.id) {
        total += aggregate(node.id);
      }
    }
    book.wordCount = total;
  }

  for (const project of target.projects) {
    const projectBooks = target.books.filter((book) => book.projectId === project.id);
    project.booksCount = projectBooks.length;
    project.wordCount = projectBooks.reduce((total, book) => total + book.wordCount, 0);
  }
}

export function getMockState(): MockState {
  if (!state) {
    state = loadState();
  }
  return state;
}

export function saveMockState(): void {
  if (!state) {
    return;
  }
  recalculateMockState(state);
  const payload: PersistedMockState = { version: STORAGE_VERSION, data: state };
  safeSet(MOCK_STORAGE_KEY, JSON.stringify(payload));
}

export function hasMockSession(): boolean {
  return memorySession || safeGet(MOCK_SESSION_KEY) !== null;
}

export function startMockSession(): void {
  memorySession = true;
  safeSet(
    MOCK_SESSION_KEY,
    JSON.stringify({ signedInAt: new Date().toISOString(), userId: 'mock-author' }),
  );
}

export function endMockSession(): void {
  memorySession = false;
  safeRemove(MOCK_SESSION_KEY);
}

/**
 * Removes both the demo data and the mock session. The caller should reload
 * the app afterwards so the worker starts from the factory fixture.
 */
export function resetMockData(): void {
  state = null;
  memorySession = false;
  safeRemove(MOCK_STORAGE_KEY);
  safeRemove(MOCK_SESSION_KEY);
}
