import { delay, http, HttpResponse } from 'msw';
import type { components } from '@/shared/api/schema';
import {
  mockAsset,
  mockAttachments,
  mockBook,
  mockCharacters,
  mockDocument,
  mockExports,
  mockMembers,
  mockNodes,
  mockProject,
  mockRelations,
  mockUser,
} from './data';

type Book = components['schemas']['Book'];
type BookNode = components['schemas']['BookNode'];
type Character = components['schemas']['Character'];
type CharacterRelation = components['schemas']['CharacterRelation'];
type Attachment = components['schemas']['Attachment'];
type ExportJob = components['schemas']['ExportJob'];
type Project = components['schemas']['Project'];

const api = '/api/v1';

let projects: Project[] = [mockProject];
let books: Book[] = [mockBook];
let treeNodes: BookNode[] = structuredClone(mockNodes);
let characters: Character[] = structuredClone(mockCharacters);
const documents = [structuredClone(mockDocument)];
let relations = structuredClone(mockRelations);
let attachments = structuredClone(mockAttachments);
let exports: ExportJob[] = structuredClone(mockExports);

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

function findNode(nodes: BookNode[], nodeId: string): BookNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const found = findNode(node.children ?? [], nodeId);
    if (found) {
      return found;
    }
  }
  return null;
}

function findParent(nodes: BookNode[], parentId: string): BookNode | null {
  return findNode(nodes, parentId);
}

function authResponse() {
  return {
    user: mockUser,
    accessToken: `mock.${Date.now()}`,
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

function countWords(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countWords(item), 0);
  }
  if (value && typeof value === 'object') {
    const node = value as { type?: string; text?: string; content?: unknown[] };
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text.trim() ? node.text.trim().split(/\s+/).length : 0;
    }
    return countWords(node.content ?? []);
  }
  return 0;
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
    await delay(150);
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
    if (!body.email || !body.password) {
      return problem(401, 'invalid_credentials', 'Invalid email or password');
    }
    await delay(150);
    return HttpResponse.json(authResponse());
  }),

  http.post(`${api}/auth/refresh`, async () => {
    await delay(60);
    return HttpResponse.json(authResponse());
  }),

  http.post(`${api}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${api}/auth/me`, () => HttpResponse.json(mockUser)),

  http.get(`${api}/projects`, async () => {
    await delay(120);
    return HttpResponse.json({
      items: projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        language: project.language,
        role: project.role,
        membersCount: mockMembers.length,
        booksCount: books.filter((book) => book.projectId === project.id).length,
        wordCount: project.wordCount,
        coverUrl: project.coverUrl,
        updatedAt: project.updatedAt,
      })),
      nextCursor: null,
    });
  }),

  http.post(`${api}/projects`, async ({ request }) => {
    const body = (await request.json()) as { title?: string; description?: string };
    const project: Project = {
      ...mockProject,
      id: crypto.randomUUID(),
      title: body.title || 'Новый проект',
      description: body.description ?? '',
      booksCount: 0,
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    projects = [project, ...projects];
    await delay(100);
    return HttpResponse.json(project, { status: 201 });
  }),

  http.get(`${api}/projects/:projectId`, ({ params }) => {
    const project = projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    return HttpResponse.json(project);
  }),

  http.patch(`${api}/projects/:projectId`, async ({ params, request }) => {
    const project = projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<Project>;
    Object.assign(project, body, {
      version: project.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return HttpResponse.json(project);
  }),

  http.delete(`${api}/projects/:projectId`, ({ params }) => {
    projects = projects.filter((item) => item.id !== params.projectId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/projects/:projectId/members`, () =>
    HttpResponse.json({ items: mockMembers }),
  ),

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

  http.get(`${api}/projects/:projectId/books`, ({ params }) => {
    const items = books.filter((book) => book.projectId === params.projectId);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/projects/:projectId/books`, async ({ params, request }) => {
    const body = (await request.json()) as { title?: string; subtitle?: string };
    const book: Book = {
      ...mockBook,
      id: crypto.randomUUID(),
      projectId: String(params.projectId),
      title: body.title || 'Новая книга',
      subtitle: body.subtitle ?? '',
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    books = [...books, book];
    return HttpResponse.json(book, { status: 201 });
  }),

  http.get(`${api}/books/:bookId/tree`, ({ params }) => {
    const book = books.find((item) => item.id === params.bookId) ?? mockBook;
    return HttpResponse.json({ book, nodes: treeNodes });
  }),

  http.post(`${api}/books/:bookId/nodes`, async ({ params, request }) => {
    const body = (await request.json()) as {
      type?: BookNode['type'];
      title?: string;
      parentId?: string | null;
      afterId?: string | null;
    };
    const node: BookNode = {
      id: crypto.randomUUID(),
      bookId: String(params.bookId),
      parentId: body.parentId ?? null,
      type: body.type ?? 'chapter',
      title: body.title || 'Новый элемент',
      synopsis: '',
      notes: '',
      status: 'idea',
      sortKey: `a${treeNodes.length}`,
      targetWordCount: 0,
      povCharacterId: null,
      documentId: crypto.randomUUID(),
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      children: [],
    };
    const parent = body.parentId ? findParent(treeNodes, body.parentId) : null;
    if (parent) {
      parent.children = [...(parent.children ?? []), node];
    } else {
      treeNodes = [...treeNodes, node];
    }
    return HttpResponse.json(node, { status: 201 });
  }),

  http.patch(`${api}/nodes/:nodeId`, async ({ params, request }) => {
    const node = findNode(treeNodes, String(params.nodeId));
    if (!node) {
      return problem(404, 'not_found', 'Node not found');
    }
    const body = (await request.json()) as Partial<BookNode>;
    Object.assign(node, body, {
      version: node.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return HttpResponse.json(node);
  }),

  http.post(`${api}/nodes/:nodeId/move`, ({ params }) => {
    const node = findNode(treeNodes, String(params.nodeId));
    if (!node) {
      return problem(404, 'not_found', 'Node not found');
    }
    node.version += 1;
    node.updatedAt = new Date().toISOString();
    return HttpResponse.json(node);
  }),

  http.delete(`${api}/nodes/:nodeId`, ({ params }) => {
    treeNodes = treeNodes.filter((node) => node.id !== params.nodeId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/documents/:documentId`, ({ params }) => {
    const document = documents.find((item) => item.id === params.documentId) ?? documents[0];
    if (!document) {
      return problem(404, 'not_found', 'Document not found');
    }
    return HttpResponse.json({ ...document, id: params.documentId });
  }),

  http.put(`${api}/documents/:documentId/content`, async ({ params, request }) => {
    const document = documents.find((item) => item.id === params.documentId) ?? documents[0];
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
    if (body.version !== undefined && body.version !== document.version) {
      return problem(
        409,
        'version_conflict',
        'Document was changed',
        'Reload the document and try again.',
      );
    }
    document.canonical = body.canonical;
    document.wordCount = countWords(body.canonical);
    document.version += 1;
    document.updatedAt = new Date().toISOString();
    document.snapshotAt = document.updatedAt;
    return HttpResponse.json(document);
  }),

  http.get(`${api}/projects/:projectId/characters`, ({ params }) => {
    const items = characters.filter((character) => character.projectId === params.projectId);
    return HttpResponse.json({ items, nextCursor: null });
  }),

  http.post(`${api}/projects/:projectId/characters`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Character>;
    const character: Character = {
      id: crypto.randomUUID(),
      projectId: String(params.projectId),
      name: body.name || 'Новый персонаж',
      fullName: body.fullName ?? '',
      aliases: [],
      role: body.role ?? 'supporting',
      age: null,
      birthDate: null,
      appearance: '',
      personality: '',
      motivation: '',
      goal: '',
      conflict: '',
      arc: '',
      backstory: '',
      voice: '',
      secrets: '',
      notes: '',
      status: 'alive',
      tags: [],
      color: '#8a5a2b',
      avatarUrl: null,
      customFields: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    characters = [character, ...characters];
    return HttpResponse.json(character, { status: 201 });
  }),

  http.get(`${api}/characters/:characterId`, ({ params }) => {
    const character = characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    return HttpResponse.json(character);
  }),

  http.patch(`${api}/characters/:characterId`, async ({ params, request }) => {
    const character = characters.find((item) => item.id === params.characterId);
    if (!character) {
      return problem(404, 'not_found', 'Character not found');
    }
    const body = (await request.json()) as Partial<Character>;
    Object.assign(character, body, {
      version: character.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return HttpResponse.json(character);
  }),

  http.get(`${api}/characters/:characterId/relations`, ({ params }) => {
    const items = relations.filter(
      (relation) =>
        relation.fromCharacterId === params.characterId ||
        relation.toCharacterId === params.characterId,
    );
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/characters/:characterId/relations`, async ({ params, request }) => {
    const body = (await request.json()) as {
      toCharacterId?: string;
      type?: CharacterRelation['type'];
      label?: string;
      strength?: number;
      isMutual?: boolean;
      notes?: string;
    };
    if (!body.toCharacterId) {
      return problem(422, 'validation_failed', 'toCharacterId is required');
    }
    const character = characters.find((item) => item.id === params.characterId);
    const relation: CharacterRelation = {
      id: crypto.randomUUID(),
      projectId: character?.projectId ?? mockProject.id,
      fromCharacterId: String(params.characterId),
      toCharacterId: body.toCharacterId,
      type: body.type ?? 'other',
      label: body.label ?? '',
      strength: body.strength ?? 0,
      isMutual: body.isMutual ?? false,
      notes: body.notes ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    relations = [...relations, relation];
    return HttpResponse.json(relation, { status: 201 });
  }),

  http.patch(`${api}/character-relations/:relationId`, async ({ params, request }) => {
    const relation = relations.find((item) => item.id === params.relationId);
    if (!relation) {
      return problem(404, 'not_found', 'Relation not found');
    }
    const body = (await request.json()) as Partial<CharacterRelation>;
    Object.assign(relation, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(relation);
  }),

  http.delete(`${api}/character-relations/:relationId`, ({ params }) => {
    relations = relations.filter((item) => item.id !== params.relationId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/characters/:characterId/attachments`, ({ params }) => {
    const items = attachments.filter((attachment) => attachment.targetId === params.characterId);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/characters/:characterId/attachments`, async ({ params, request }) => {
    const body = (await request.json()) as {
      assetId?: string;
      role?: Attachment['role'];
      caption?: string;
      sortOrder?: number;
    };
    if (!body.assetId || !body.role) {
      return problem(422, 'validation_failed', 'assetId and role are required');
    }
    const character = characters.find((item) => item.id === params.characterId);
    const attachment: Attachment = {
      id: crypto.randomUUID(),
      assetId: body.assetId,
      targetType: 'character',
      targetId: String(params.characterId),
      role: body.role,
      caption: body.caption ?? '',
      sortOrder: body.sortOrder ?? attachments.length,
      url: mockAsset.url,
      thumbUrl: mockAsset.thumbUrl,
      createdAt: new Date().toISOString(),
    };
    attachments = [...attachments, attachment];
    if (character) {
      if (body.role === 'avatar') {
        character.avatarUrl = mockAsset.url;
      }
      character.updatedAt = new Date().toISOString();
      character.version += 1;
    }
    return HttpResponse.json(attachment, { status: 201 });
  }),

  http.patch(`${api}/attachments/:attachmentId`, async ({ params, request }) => {
    const attachment = attachments.find((item) => item.id === params.attachmentId);
    if (!attachment) {
      return problem(404, 'not_found', 'Attachment not found');
    }
    const body = (await request.json()) as Partial<Attachment>;
    Object.assign(attachment, body);
    return HttpResponse.json(attachment);
  }),

  http.delete(`${api}/attachments/:attachmentId`, ({ params }) => {
    attachments = attachments.filter((item) => item.id !== params.attachmentId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/projects/:projectId/assets/uploads`, async () =>
    HttpResponse.json(
      {
        assetId: crypto.randomUUID(),
        uploadUrl: 'https://example.com/mock-upload',
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      { status: 201 },
    ),
  ),

  http.post(`${api}/assets/:assetId/complete`, () =>
    HttpResponse.json({ ...mockAsset, id: crypto.randomUUID() }, { status: 202 }),
  ),

  http.get(`${api}/assets/:assetId`, () => HttpResponse.json(mockAsset)),

  http.get(`${api}/projects/:projectId/exports`, ({ params }) =>
    HttpResponse.json({
      items: exports.filter((job) => job.projectId === params.projectId),
      nextCursor: null,
    }),
  ),

  http.post(`${api}/projects/:projectId/exports`, async ({ params, request }) => {
    const body = (await request.json()) as { format?: 'docx' | 'fb2' };
    const job: ExportJob = {
      id: crypto.randomUUID(),
      projectId: String(params.projectId),
      format: body.format ?? 'docx',
      status: 'succeeded',
      progress: 100,
      error: null,
      warnings: [],
      downloadUrl: `https://example.com/exports/mock.${body.format ?? 'docx'}`,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
    exports = [job, ...exports];
    await delay(200);
    return HttpResponse.json(job, { status: 202 });
  }),

  http.get(`${api}/exports/:exportId`, ({ params }) => {
    const job = exports.find((item) => item.id === params.exportId);
    if (!job) {
      return problem(404, 'not_found', 'Export not found');
    }
    return HttpResponse.json(job);
  }),

  http.delete(`${api}/exports/:exportId`, ({ params }) => {
    exports = exports.filter((job) => job.id !== params.exportId);
    return new HttpResponse(null, { status: 204 });
  }),
];
