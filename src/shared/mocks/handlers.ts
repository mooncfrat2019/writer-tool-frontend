import { delay, http, HttpResponse } from 'msw';
import type { components } from '@/shared/api/schema';
import { mockUser } from './data';
import { createMockIllustration } from './image';
import {
  endMockSession,
  getMockState,
  hasMockSession,
  recalculateMockState,
  saveMockState,
  startMockSession,
} from './store';

type Book = components['schemas']['Book'];
type BookNode = components['schemas']['BookNode'];
type BookNodeType = components['schemas']['BookNodeType'];
type Character = components['schemas']['Character'];
type CharacterRelation = components['schemas']['CharacterRelation'];
type Attachment = components['schemas']['Attachment'];
type Asset = components['schemas']['Asset'];
type ExportJob = components['schemas']['ExportJob'];
type Project = components['schemas']['Project'];
type ProjectSummary = components['schemas']['ProjectSummary'];

const api = '/api/v1';
const EXPORT_DURATION_MS = 2_600;

function problem(status: number, code: string, title: string, detail?: string) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title,
      status,
      code,
      detail,
    },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

function authResponse() {
  return {
    user: mockUser,
    accessToken: `mock.${Date.now()}`,
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

function bookNodes(bookId: string): BookNode[] {
  return getMockState().nodes.filter((node) => node.bookId === bookId);
}

function siblingsFor(bookId: string, parentId: string | null): BookNode[] {
  return bookNodes(bookId)
    .filter((node) => (node.parentId ?? null) === parentId)
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
}

function setSortKeys(nodes: BookNode[]): void {
  nodes.forEach((node, index) => {
    node.sortKey = String(index).padStart(6, '0');
  });
}

function canContain(parentType: BookNodeType | null, childType: BookNodeType): boolean {
  if (parentType === null) {
    return childType === 'part' || childType === 'chapter';
  }
  if (parentType === 'part') {
    return childType === 'chapter' || childType === 'scene';
  }
  if (parentType === 'chapter') {
    return childType === 'scene';
  }
  return false;
}

function buildTree(bookId: string, parentId: string | null = null): BookNode[] {
  return siblingsFor(bookId, parentId).map((node) => ({
    ...node,
    children: buildTree(bookId, node.id),
  }));
}

function findNode(nodeId: string): BookNode | undefined {
  return getMockState().nodes.find((node) => node.id === nodeId);
}

function isInsideSubtree(ancestorId: string, candidateId: string): boolean {
  let current = findNode(candidateId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = findNode(current.parentId);
  }
  return ancestorId === candidateId;
}

function descendantsOf(bookId: string, nodeId: string): string[] {
  const result = [nodeId];
  let index = 0;
  while (index < result.length) {
    const parentId = result[index];
    for (const node of bookNodes(bookId)) {
      if (node.parentId === parentId) {
        result.push(node.id);
      }
    }
    index += 1;
  }
  return result;
}

function validateVersion(current: number, requested: number | undefined) {
  return requested === undefined || requested === current;
}

function conflictVersion() {
  return problem(
    409,
    'version_conflict',
    'Version conflict',
    'The record was changed by someone else.',
  );
}

function summaryFromProject(project: Project): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    genre: project.genre,
    language: project.language,
    role: project.role,
    membersCount: project.membersCount ?? 1,
    booksCount: project.booksCount ?? 0,
    wordCount: project.wordCount ?? 0,
    coverUrl: project.coverUrl ?? null,
    updatedAt: project.updatedAt,
  };
}

function touchProject(projectId: string): void {
  const project = getMockState().projects.find((candidate) => candidate.id === projectId);
  if (project) {
    project.updatedAt = new Date().toISOString();
  }
}

function exportDownloadUrl(jobId: string, format: ExportJob['format']): string {
  return `https://example.com/exports/${jobId}.${format}`;
}

function advanceExports(): void {
  const state = getMockState();
  let changed = false;
  const nowMs = Date.now();

  for (const job of state.exports) {
    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'canceled') {
      continue;
    }

    const startedAtMs = new Date(job.createdAt).getTime();
    const elapsed = nowMs - startedAtMs;
    if (elapsed < 450) {
      continue;
    }

    job.startedAt = job.startedAt ?? new Date(startedAtMs + 450).toISOString();
    if (elapsed < EXPORT_DURATION_MS) {
      job.status = 'running';
      job.progress = Math.min(
        94,
        Math.max(8, Math.round(((elapsed - 450) / (EXPORT_DURATION_MS - 450)) * 86) + 8),
      );
    } else {
      job.status = 'succeeded';
      job.progress = 100;
      job.finishedAt = new Date(startedAtMs + EXPORT_DURATION_MS).toISOString();
      job.downloadUrl = exportDownloadUrl(job.id, job.format);
      job.warnings = ['Сцены без текста пропущены — это нормально для черновика.'];
    }
    changed = true;
  }

  if (changed) {
    saveMockState();
  }
}

export const handlers = [
  http.post(`${api}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    if (!body.email || !body.password || !body.displayName) {
      return problem(422, 'validation_failed', 'Validation failed', 'All fields are required');
    }
    if (body.password.length < 8) {
      return problem(422, 'validation_failed', 'Validation failed', 'Password is too short');
    }
    startMockSession();
    await delay(160);
    return HttpResponse.json(
      {
        user: {
          ...mockUser,
          email: body.email,
          displayName: body.displayName,
        },
        accessToken: `mock.${Date.now()}`,
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      { status: 201 },
    );
  }),

  http.post(`${api}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password || body.password.length < 8) {
      return problem(401, 'invalid_credentials', 'Invalid email or password');
    }
    startMockSession();
    await delay(180);
    return HttpResponse.json({
      ...authResponse(),
      user: { ...mockUser, email: body.email },
    });
  }),

  http.post(`${api}/auth/refresh`, async () => {
    await delay(80);
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    return HttpResponse.json(authResponse());
  }),

  http.post(`${api}/auth/logout`, () => {
    endMockSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/auth/me`, () => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    return HttpResponse.json(mockUser);
  }),

  http.get(`${api}/projects`, async () => {
    const state = getMockState();
    recalculateMockState(state);
    await delay(110);
    return HttpResponse.json({
      items: state.projects.map(summaryFromProject),
      nextCursor: null,
    });
  }),

  http.post(`${api}/projects`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      genre?: string;
      language?: string;
    };
    if (!body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }

    const timestamp = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      description: body.description?.trim() ?? '',
      genre: body.genre?.trim() ?? '',
      language: body.language || 'ru',
      role: 'owner',
      membersCount: 1,
      booksCount: 0,
      wordCount: 0,
      coverUrl: null,
      updatedAt: timestamp,
      settings: {},
      createdAt: timestamp,
      version: 1,
    };
    getMockState().projects = [project, ...getMockState().projects];
    saveMockState();
    await delay(140);
    return HttpResponse.json(project, { status: 201 });
  }),

  http.get(`${api}/projects/:projectId`, async ({ params }) => {
    recalculateMockState(getMockState());
    const project = getMockState().projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    await delay(80);
    return HttpResponse.json(project);
  }),

  http.patch(`${api}/projects/:projectId`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      genre?: string;
      language?: string;
      version?: number;
    };
    if (!validateVersion(project.version, body.version)) {
      return conflictVersion();
    }
    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
      }
      project.title = body.title.trim();
    }
    if (body.description !== undefined) project.description = body.description;
    if (body.genre !== undefined) project.genre = body.genre;
    if (body.language !== undefined) project.language = body.language;
    project.version += 1;
    project.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(project);
  }),

  http.delete(`${api}/projects/:projectId`, ({ params }) => {
    const state = getMockState();
    const bookIds = state.books
      .filter((book) => book.projectId === params.projectId)
      .map((book) => book.id);
    const characterIds = state.characters
      .filter((character) => character.projectId === params.projectId)
      .map((character) => character.id);
    state.projects = state.projects.filter((project) => project.id !== params.projectId);
    state.books = state.books.filter((book) => !bookIds.includes(book.id));
    state.nodes = state.nodes.filter((node) => !bookIds.includes(node.bookId));
    state.documents = state.documents.filter((document) => document.projectId !== params.projectId);
    state.characters = state.characters.filter(
      (character) => !characterIds.includes(character.id),
    );
    state.relations = state.relations.filter(
      (relation) => relation.projectId !== params.projectId,
    );
    state.attachments = state.attachments.filter(
      (attachment) => !characterIds.includes(attachment.targetId),
    );
    state.exports = state.exports.filter((job) => job.projectId !== params.projectId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/projects/:projectId/members`, ({ params }) => {
    const project = getMockState().projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    return HttpResponse.json({
      items: [
        {
          userId: mockUser.id,
          displayName: mockUser.displayName,
          email: mockUser.email,
          avatarUrl: null,
          role: project.role,
          joinedAt: project.createdAt,
        },
      ],
    });
  }),

  http.post(`${api}/projects/:projectId/invitations`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; role?: string };
    if (!body.email) {
      return problem(422, 'validation_failed', 'Email is required');
    }
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        email: body.email,
        role: body.role === 'viewer' ? 'viewer' : 'editor',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.get(`${api}/projects/:projectId/books`, async ({ params }) => {
    recalculateMockState(getMockState());
    const items = getMockState().books.filter((book) => book.projectId === params.projectId);
    await delay(70);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/projects/:projectId/books`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as {
      title?: string;
      subtitle?: string;
      seriesOrder?: number;
      synopsis?: string;
      targetWordCount?: number;
    };
    if (!body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    const timestamp = new Date().toISOString();
    const book: Book = {
      id: crypto.randomUUID(),
      projectId: project.id,
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() ?? '',
      seriesOrder:
        body.seriesOrder ??
        state.books.filter((candidate) => candidate.projectId === project.id).length + 1,
      status: 'planning',
      synopsis: body.synopsis ?? '',
      coverUrl: null,
      targetWordCount: body.targetWordCount ?? 0,
      wordCount: 0,
      characterCount: 0,
      authorSheets: 0,
      language: project.language,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.books = [...state.books, book];
    touchProject(project.id);
    saveMockState();
    await delay(120);
    return HttpResponse.json(book, { status: 201 });
  }),

  http.get(`${api}/books/:bookId`, async ({ params }) => {
    recalculateMockState(getMockState());
    const book = getMockState().books.find((item) => item.id === params.bookId);
    if (!book) {
      return problem(404, 'not_found', 'Book not found');
    }
    return HttpResponse.json(book);
  }),

  http.patch(`${api}/books/:bookId`, async ({ params, request }) => {
    const state = getMockState();
    const book = state.books.find((item) => item.id === params.bookId);
    if (!book) {
      return problem(404, 'not_found', 'Book not found');
    }
    const body = (await request.json()) as Partial<Book>;
    if (!validateVersion(book.version, body.version)) {
      return conflictVersion();
    }
    const updatable: (keyof Book)[] = [
      'title',
      'subtitle',
      'seriesOrder',
      'status',
      'synopsis',
      'targetWordCount',
    ];
    for (const field of updatable) {
      const value = body[field];
      if (value !== undefined) {
        Object.assign(book, { [field]: value });
      }
    }
    book.version += 1;
    book.updatedAt = new Date().toISOString();
    touchProject(book.projectId);
    saveMockState();
    return HttpResponse.json(book);
  }),

  http.get(`${api}/books/:bookId/tree`, async ({ params }) => {
    const state = getMockState();
    recalculateMockState(state);
    const book = state.books.find((item) => item.id === params.bookId);
    if (!book) {
      return problem(404, 'not_found', 'Book not found');
    }
    await delay(90);
    return HttpResponse.json({ book, nodes: buildTree(book.id) });
  }),

  http.post(`${api}/books/:bookId/nodes`, async ({ params, request }) => {
    const state = getMockState();
    const book = state.books.find((item) => item.id === params.bookId);
    if (!book) {
      return problem(404, 'not_found', 'Book not found');
    }
    const body = (await request.json()) as {
      type?: BookNodeType;
      title?: string;
      parentId?: string | null;
      afterId?: string | null;
      synopsis?: string;
      notes?: string;
      targetWordCount?: number;
      povCharacterId?: string | null;
    };
    if (!body.type || !body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Type and title are required');
    }

    const parentId = body.parentId ?? null;
    const parent = parentId ? findNode(parentId) : null;
    if (parentId && (!parent || parent.bookId !== book.id)) {
      return problem(422, 'validation_failed', 'Validation failed', 'Parent node not found');
    }
    if (!canContain(parent?.type ?? null, body.type)) {
      return problem(
        422,
        'invalid_parent',
        'Invalid parent',
        'This node type cannot be placed under the selected parent.',
      );
    }

    const timestamp = new Date().toISOString();
    const documentId = body.type === 'part' ? null : crypto.randomUUID();
    const node: BookNode = {
      id: crypto.randomUUID(),
      bookId: book.id,
      parentId,
      type: body.type,
      title: body.title.trim(),
      synopsis: body.synopsis ?? '',
      notes: body.notes ?? '',
      status: 'idea',
      sortKey: '999999',
      targetWordCount: body.targetWordCount ?? 0,
      povCharacterId: body.povCharacterId ?? null,
      documentId,
      wordCount: 0,
      characterCount: 0,
      authorSheets: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };

    if (documentId) {
      state.documents.push({
        id: documentId,
        projectId: book.projectId,
        kind: 'text',
        title: node.title,
        wordCount: 0,
        characterCount: 0,
        authorSheets: 0,
        version: 1,
        snapshotAt: null,
        updatedAt: timestamp,
        canonical: { type: 'doc', content: [{ type: 'paragraph' }] },
      });
    }

    const siblings = siblingsFor(book.id, parentId);
    const afterIndex = body.afterId
      ? siblings.findIndex((candidate) => candidate.id === body.afterId)
      : -1;
    const insertionIndex = afterIndex >= 0 ? afterIndex + 1 : siblings.length;
    siblings.splice(insertionIndex, 0, node);
    setSortKeys(siblings);

    state.nodes.push(node);
    book.updatedAt = timestamp;
    touchProject(book.projectId);
    saveMockState();
    await delay(110);
    return HttpResponse.json(node, { status: 201 });
  }),

  http.patch(`${api}/nodes/:nodeId`, async ({ params, request }) => {
    const state = getMockState();
    const node = findNode(String(params.nodeId));
    if (!node) {
      return problem(404, 'not_found', 'Node not found');
    }
    const body = (await request.json()) as {
      title?: string;
      synopsis?: string;
      notes?: string;
      status?: BookNode['status'];
      targetWordCount?: number;
      povCharacterId?: string | null;
      version?: number;
    };
    if (!validateVersion(node.version, body.version)) {
      return conflictVersion();
    }
    if (body.title !== undefined && !body.title.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    if (body.title !== undefined) {
      node.title = body.title.trim();
      const document = node.documentId
        ? state.documents.find((candidate) => candidate.id === node.documentId)
        : undefined;
      if (document) {
        document.title = node.title;
      }
    }
    if (body.synopsis !== undefined) node.synopsis = body.synopsis;
    if (body.notes !== undefined) node.notes = body.notes;
    if (body.status !== undefined) node.status = body.status;
    if (body.targetWordCount !== undefined) node.targetWordCount = body.targetWordCount;
    if (body.povCharacterId !== undefined) node.povCharacterId = body.povCharacterId;
    node.version += 1;
    node.updatedAt = new Date().toISOString();
    touchProject(state.books.find((book) => book.id === node.bookId)?.projectId ?? '');
    saveMockState();
    return HttpResponse.json(node);
  }),

  http.post(`${api}/nodes/:nodeId/move`, async ({ params, request }) => {
    const node = findNode(String(params.nodeId));
    if (!node) {
      return problem(404, 'not_found', 'Node not found');
    }
    const body = (await request.json()) as {
      parentId: string | null;
      beforeId?: string | null;
      afterId?: string | null;
      version?: number;
    };
    if (!validateVersion(node.version, body.version)) {
      return conflictVersion();
    }

    const newParentId = body.parentId ?? null;
    const newParent = newParentId ? findNode(newParentId) : null;
    if (newParentId && (!newParent || newParent.bookId !== node.bookId)) {
      return problem(422, 'validation_failed', 'Validation failed', 'Parent node not found');
    }
    if (!canContain(newParent?.type ?? null, node.type)) {
      return problem(
        422,
        'invalid_parent',
        'Invalid parent',
        'This node type cannot be placed under the selected parent.',
      );
    }
    if (
      newParentId &&
      (newParentId === node.id || isInsideSubtree(node.id, newParentId))
    ) {
      return problem(422, 'invalid_parent', 'Invalid parent', 'Cannot move a node into itself');
    }

    const oldParentId = node.parentId ?? null;
    const targetSiblings = siblingsFor(node.bookId, newParentId).filter(
      (candidate) => candidate.id !== node.id,
    );
    let insertionIndex = targetSiblings.length;
    if (body.beforeId) {
      const index = targetSiblings.findIndex((candidate) => candidate.id === body.beforeId);
      if (index >= 0) {
        insertionIndex = index;
      }
    } else if (body.afterId) {
      const index = targetSiblings.findIndex((candidate) => candidate.id === body.afterId);
      if (index >= 0) {
        insertionIndex = index + 1;
      }
    }
    targetSiblings.splice(insertionIndex, 0, node);
    node.parentId = newParentId;
    setSortKeys(targetSiblings);

    if (oldParentId !== newParentId) {
      const oldSiblings = siblingsFor(node.bookId, oldParentId).filter(
        (candidate) => candidate.id !== node.id,
      );
      setSortKeys(oldSiblings);
    }

    node.version += 1;
    node.updatedAt = new Date().toISOString();
    touchProject(getMockState().books.find((book) => book.id === node.bookId)?.projectId ?? '');
    saveMockState();
    await delay(100);
    return HttpResponse.json(node);
  }),

  http.delete(`${api}/nodes/:nodeId`, ({ params, request }) => {
    const state = getMockState();
    const node = findNode(String(params.nodeId));
    if (!node) {
      return problem(404, 'not_found', 'Node not found');
    }
    const strategy = new URL(request.url).searchParams.get('strategy') ?? 'reject_if_children';
    const nodeIds = descendantsOf(node.bookId, node.id);
    if (nodeIds.length > 1 && strategy !== 'cascade') {
      return problem(
        409,
        'node_has_children',
        'Node has children',
        'Delete the child nodes or use the cascade strategy.',
      );
    }
    const documentIds = state.nodes
      .filter((candidate) => nodeIds.includes(candidate.id))
      .map((candidate) => candidate.documentId)
      .filter((id): id is string => Boolean(id));
    state.nodes = state.nodes.filter((candidate) => !nodeIds.includes(candidate.id));
    state.documents = state.documents.filter((document) => !documentIds.includes(document.id));
    touchProject(state.books.find((book) => book.id === node.bookId)?.projectId ?? '');
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/documents/:documentId`, async ({ params }) => {
    const document = getMockState().documents.find((item) => item.id === params.documentId);
    if (!document) {
      return problem(404, 'not_found', 'Document not found');
    }
    await delay(90);
    return HttpResponse.json(document);
  }),

  http.put(`${api}/documents/:documentId/content`, async ({ params, request }) => {
    const state = getMockState();
    const document = state.documents.find((item) => item.id === params.documentId);
    if (!document) {
      return problem(404, 'not_found', 'Document not found');
    }
    const body = (await request.json()) as {
      canonical?: Record<string, unknown>;
      version?: number;
    };
    if (!body.canonical) {
      return problem(422, 'validation_failed', 'Canonical content is required');
    }
    if (body.version === undefined || body.version !== document.version) {
      return conflictVersion();
    }

    document.canonical = body.canonical;
    document.version += 1;
    document.updatedAt = new Date().toISOString();
    document.snapshotAt = document.updatedAt;

    const node = state.nodes.find((candidate) => candidate.documentId === document.id);
    if (node) {
      node.updatedAt = document.updatedAt;
      touchProject(document.projectId);
    }
    saveMockState();
    await delay(120);
    return HttpResponse.json(document);
  }),

  http.get(`${api}/projects/:projectId/characters`, async ({ params, request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('ru');
    const role = url.searchParams.get('role');
    const items = getMockState()
      .characters.filter((character) => character.projectId === params.projectId)
      .filter((character) => !role || character.role === role)
      .filter((character) => {
        if (!query) {
          return true;
        }
        return [character.name, character.fullName ?? '', ...character.tags]
          .join(' ')
          .toLocaleLowerCase('ru')
          .includes(query);
      });
    await delay(80);
    return HttpResponse.json({ items, nextCursor: null });
  }),

  http.post(`${api}/projects/:projectId/characters`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<Character>;
    if (!body.name?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const timestamp = new Date().toISOString();
    const character: Character = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: body.name.trim(),
      fullName: body.fullName?.trim() ?? '',
      aliases: body.aliases ?? [],
      role: body.role ?? 'supporting',
      age: body.age ?? null,
      birthDate: body.birthDate ?? null,
      appearance: body.appearance ?? '',
      personality: body.personality ?? '',
      motivation: body.motivation ?? '',
      goal: body.goal ?? '',
      conflict: body.conflict ?? '',
      arc: body.arc ?? '',
      backstory: body.backstory ?? '',
      voice: body.voice ?? '',
      secrets: body.secrets ?? '',
      notes: body.notes ?? '',
      status: body.status ?? 'alive',
      tags: body.tags ?? [],
      color: body.color ?? '#8a5a2b',
      avatarUrl: null,
      customFields: body.customFields ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.characters = [character, ...state.characters];
    touchProject(project.id);
    saveMockState();
    await delay(130);
    return HttpResponse.json(character, { status: 201 });
  }),

  http.get(`${api}/characters/:characterId`, async ({ params }) => {
    const character = getMockState().characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    await delay(70);
    return HttpResponse.json(character);
  }),

  http.patch(`${api}/characters/:characterId`, async ({ params, request }) => {
    const state = getMockState();
    const character = state.characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    const body = (await request.json()) as Partial<Character>;
    if (!validateVersion(character.version, body.version)) {
      return conflictVersion();
    }
    if (body.name !== undefined && !body.name.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const fields: (keyof Character)[] = [
      'name',
      'fullName',
      'aliases',
      'role',
      'age',
      'birthDate',
      'appearance',
      'personality',
      'motivation',
      'goal',
      'conflict',
      'arc',
      'backstory',
      'voice',
      'secrets',
      'notes',
      'status',
      'tags',
      'color',
      'customFields',
    ];
    for (const field of fields) {
      const value = body[field];
      if (value !== undefined) {
        Object.assign(character, { [field]: value });
      }
    }
    character.version += 1;
    character.updatedAt = new Date().toISOString();
    touchProject(character.projectId);
    saveMockState();
    return HttpResponse.json(character);
  }),

  http.delete(`${api}/characters/:characterId`, ({ params }) => {
    const state = getMockState();
    const character = state.characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    state.characters = state.characters.filter((item) => item.id !== params.characterId);
    state.relations = state.relations.filter(
      (relation) =>
        relation.fromCharacterId !== params.characterId &&
        relation.toCharacterId !== params.characterId,
    );
    state.attachments = state.attachments.filter(
      (attachment) => attachment.targetId !== params.characterId,
    );
    touchProject(character.projectId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/characters/:characterId/relations`, async ({ params }) => {
    const character = getMockState().characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    const items = getMockState().relations.filter(
      (relation) =>
        relation.fromCharacterId === params.characterId ||
        relation.toCharacterId === params.characterId,
    );
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/characters/:characterId/relations`, async ({ params, request }) => {
    const state = getMockState();
    const character = state.characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    const body = (await request.json()) as {
      toCharacterId?: string;
      type?: CharacterRelation['type'];
      label?: string;
      strength?: number;
      isMutual?: boolean;
      notes?: string;
    };
    if (!body.toCharacterId || !body.type) {
      return problem(
        422,
        'validation_failed',
        'Validation failed',
        'Target character and relation type are required',
      );
    }
    const target = state.characters.find((item) => item.id === body.toCharacterId);
    if (!target || target.projectId !== character.projectId) {
      return problem(422, 'validation_failed', 'Validation failed', 'Character not found');
    }
    if (body.toCharacterId === character.id) {
      return problem(422, 'validation_failed', 'Validation failed', 'Cannot relate to self');
    }
    if (
      body.strength !== undefined &&
      (!Number.isFinite(body.strength) || body.strength < -100 || body.strength > 100)
    ) {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid strength');
    }
    const timestamp = new Date().toISOString();
    const relation: CharacterRelation = {
      id: crypto.randomUUID(),
      projectId: character.projectId,
      fromCharacterId: character.id,
      toCharacterId: target.id,
      type: body.type,
      label: body.label?.trim() ?? '',
      strength: body.strength ?? 0,
      isMutual: body.isMutual ?? false,
      notes: body.notes ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.relations = [...state.relations, relation];
    saveMockState();
    await delay(150);
    return HttpResponse.json(relation, { status: 201 });
  }),

  http.patch(`${api}/character-relations/:relationId`, async ({ params, request }) => {
    const relation = getMockState().relations.find((item) => item.id === params.relationId);
    if (!relation) {
      return problem(404, 'not_found', 'Relation not found');
    }
    const body = (await request.json()) as Partial<CharacterRelation>;
    if (body.type !== undefined) relation.type = body.type;
    if (body.label !== undefined) relation.label = body.label;
    if (body.strength !== undefined) relation.strength = body.strength;
    if (body.isMutual !== undefined) relation.isMutual = body.isMutual;
    if (body.notes !== undefined) relation.notes = body.notes;
    relation.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(relation);
  }),

  http.delete(`${api}/character-relations/:relationId`, ({ params }) => {
    const state = getMockState();
    const relation = state.relations.find((item) => item.id === params.relationId);
    if (!relation) {
      return problem(404, 'not_found', 'Relation not found');
    }
    state.relations = state.relations.filter((item) => item.id !== params.relationId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/characters/:characterId/attachments`, async ({ params }) => {
    const character = getMockState().characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    const items = getMockState().attachments.filter(
      (attachment) => attachment.targetId === params.characterId,
    );
    await delay(70);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/characters/:characterId/attachments`, async ({ params, request }) => {
    const state = getMockState();
    const character = state.characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    const body = (await request.json()) as {
      assetId?: string;
      role?: Attachment['role'];
      caption?: string;
      sortOrder?: number;
    };
    if (!body.assetId || !body.role) {
      return problem(422, 'validation_failed', 'Validation failed', 'Asset and role are required');
    }
    const asset = state.assets.find((item) => item.id === body.assetId);
    if (!asset) {
      return problem(422, 'validation_failed', 'Validation failed', 'Asset not found');
    }
    const attachment: Attachment = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      targetType: 'character',
      targetId: character.id,
      role: body.role,
      caption: body.caption?.trim() ?? '',
      sortOrder:
        body.sortOrder ??
        state.attachments.filter((item) => item.targetId === character.id).length,
      url: asset.url ?? null,
      thumbUrl: asset.thumbUrl ?? null,
      createdAt: new Date().toISOString(),
    };
    state.attachments = [...state.attachments, attachment];
    if (body.role === 'avatar') {
      character.avatarUrl = asset.url ?? null;
      character.updatedAt = new Date().toISOString();
      character.version += 1;
    }
    saveMockState();
    await delay(100);
    return HttpResponse.json(attachment, { status: 201 });
  }),

  http.patch(`${api}/attachments/:attachmentId`, async ({ params, request }) => {
    const attachment = getMockState().attachments.find((item) => item.id === params.attachmentId);
    if (!attachment) {
      return problem(404, 'not_found', 'Attachment not found');
    }
    const body = (await request.json()) as Partial<Attachment>;
    if (body.role !== undefined) attachment.role = body.role;
    if (body.caption !== undefined) attachment.caption = body.caption;
    if (body.sortOrder !== undefined) attachment.sortOrder = body.sortOrder;
    saveMockState();
    return HttpResponse.json(attachment);
  }),

  http.delete(`${api}/attachments/:attachmentId`, ({ params }) => {
    const state = getMockState();
    const attachment = state.attachments.find((item) => item.id === params.attachmentId);
    if (!attachment) {
      return problem(404, 'not_found', 'Attachment not found');
    }
    state.attachments = state.attachments.filter((item) => item.id !== params.attachmentId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/projects/:projectId/assets/uploads`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as {
      filename?: string;
      mime?: string;
      sizeBytes?: number;
    };
    if (!body.filename || !body.mime || !body.sizeBytes) {
      return problem(422, 'validation_failed', 'Validation failed', 'File metadata is required');
    }
    if (!body.mime.startsWith('image/')) {
      return problem(422, 'validation_failed', 'Validation failed', 'Only images are supported');
    }
    if (body.sizeBytes > 20 * 1024 * 1024) {
      return problem(413, 'payload_too_large', 'File is too large');
    }
    const assetId = crypto.randomUUID();
    const asset: Asset = {
      id: assetId,
      projectId: project.id,
      mime: body.mime,
      sizeBytes: body.sizeBytes,
      width: null,
      height: null,
      status: 'pending',
      url: null,
      thumbUrl: null,
      createdAt: new Date().toISOString(),
    };
    state.assets = [...state.assets, asset];
    saveMockState();
    const host = new URL(request.url).origin;
    return HttpResponse.json(
      {
        assetId,
        uploadUrl: `${host}/mock-uploads/${assetId}`,
        method: 'PUT',
        headers: { 'Content-Type': body.mime },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      { status: 201 },
    );
  }),

  http.put('/mock-uploads/:assetId', async () => {
    await delay(80);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/assets/:assetId/complete`, async ({ params }) => {
    const state = getMockState();
    const asset = state.assets.find((item) => item.id === params.assetId);
    if (!asset) {
      return problem(404, 'not_found', 'Asset not found');
    }
    const label = `Иллюстрация ${asset.id.slice(0, 6)}`;
    asset.status = 'ready';
    asset.width = 960;
    asset.height = 640;
    asset.url = createMockIllustration(label);
    asset.thumbUrl = createMockIllustration(label);
    saveMockState();
    await delay(180);
    return HttpResponse.json(asset, { status: 202 });
  }),

  http.get(`${api}/assets/:assetId`, ({ params }) => {
    const asset = getMockState().assets.find((item) => item.id === params.assetId);
    if (!asset) {
      return problem(404, 'not_found', 'Asset not found');
    }
    return HttpResponse.json(asset);
  }),

  http.get(`${api}/projects/:projectId/exports`, async ({ params }) => {
    advanceExports();
    const items = getMockState()
      .exports.filter((job) => job.projectId === params.projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    await delay(70);
    return HttpResponse.json({ items, nextCursor: null });
  }),

  http.post(`${api}/projects/:projectId/exports`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as {
      format?: ExportJob['format'];
      options?: Record<string, unknown>;
    };
    if (body.format !== 'docx' && body.format !== 'fb2') {
      return problem(422, 'validation_failed', 'Validation failed', 'Unknown export format');
    }
    const timestamp = new Date().toISOString();
    const job: ExportJob = {
      id: crypto.randomUUID(),
      projectId: project.id,
      format: body.format,
      status: 'queued',
      progress: 0,
      error: null,
      warnings: [],
      downloadUrl: null,
      createdAt: timestamp,
      startedAt: null,
      finishedAt: null,
    };
    state.exports = [job, ...state.exports];
    saveMockState();
    await delay(180);
    return HttpResponse.json(job, { status: 202 });
  }),

  http.get(`${api}/exports/:exportId`, async ({ params }) => {
    advanceExports();
    const job = getMockState().exports.find((item) => item.id === params.exportId);
    if (!job) {
      return problem(404, 'not_found', 'Export not found');
    }
    await delay(60);
    return HttpResponse.json(job);
  }),

  http.delete(`${api}/exports/:exportId`, ({ params }) => {
    const state = getMockState();
    if (!state.exports.some((job) => job.id === params.exportId)) {
      return problem(404, 'not_found', 'Export not found');
    }
    state.exports = state.exports.filter((job) => job.id !== params.exportId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/exports/:exportId/download`, ({ params }) => {
    const job = getMockState().exports.find((item) => item.id === params.exportId);
    if (!job?.downloadUrl) {
      return problem(409, 'export_not_ready', 'Export is not ready');
    }
    return new HttpResponse(null, {
      status: 302,
      headers: { Location: job.downloadUrl },
    });
  }),
];
