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
type World = components['schemas']['World'];
type WorldRule = components['schemas']['WorldRule'];
type Location = components['schemas']['Location'];
type Faction = components['schemas']['Faction'];
type LoreEntry = components['schemas']['LoreEntry'];
type CustomFieldDef = components['schemas']['CustomFieldDef'];
type SearchResult = components['schemas']['SearchResult'];
type SearchResultType = components['schemas']['SearchResultType'];
type Calendar = components['schemas']['Calendar'];
type PlotThread = components['schemas']['PlotThread'];
type TimelineEvent = components['schemas']['TimelineEvent'];
type TimelineEventLink = components['schemas']['TimelineEventLink'];
type Diagram = components['schemas']['Diagram'];

const api = '/api/v1';
const EXPORT_DURATION_MS = 2_600;

// The mock API has no mailbox. Remember the registration so the demo
// confirmation button can start a session for the same identity.
let pendingRegistration: { email: string; displayName: string } | null = null;
let mockTwoFactorMethod: 'email' | 'totp' = 'email';

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
      inviteCode?: string;
    };
    if (!body.email || !body.password || !body.displayName) {
      return problem(422, 'validation_failed', 'Validation failed', 'All fields are required');
    }
    if (body.password.length < 8) {
      return problem(422, 'validation_failed', 'Validation failed', 'Password is too short');
    }
    pendingRegistration = { email: body.email, displayName: body.displayName };
    await delay(160);
    if (body.inviteCode?.trim()) {
      startMockSession();
      return HttpResponse.json(
        {
          user: {
            ...mockUser,
            email: body.email,
            displayName: body.displayName,
            emailVerified: true,
          },
          accessToken: `mock.${Date.now()}`,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        { status: 201 },
      );
    }
    return HttpResponse.json(
      { status: 'verification_sent', email: body.email, verification: 'email' },
      { status: 202 },
    );
  }),

  http.post(`${api}/auth/verify-email`, async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (!body.token) {
      return problem(
        400,
        'invalid_verification_token',
        'Invalid verification link',
        'The link is invalid or expired.',
      );
    }
    startMockSession();
    await delay(160);
    return HttpResponse.json({
      ...authResponse(),
      user: {
        ...mockUser,
        email: pendingRegistration?.email ?? mockUser.email,
        displayName: pendingRegistration?.displayName ?? mockUser.displayName,
      },
    });
  }),

  http.post(`${api}/auth/resend-verification`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (!body.email) {
      return problem(422, 'validation_failed', 'Validation failed', 'Email is required');
    }
    await delay(120);
    return HttpResponse.json(
      { status: 'verification_sent', email: body.email },
      { status: 202 },
    );
  }),

  http.post(`${api}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password || body.password.length < 8) {
      return problem(401, 'invalid_credentials', 'Invalid email or password');
    }
    if (body.email === 'unverified@example.com') {
      return problem(
        403,
        'email_not_verified',
        'Email not confirmed',
        'Confirm your email address before signing in.',
      );
    }
    if (body.email === '2fa@example.com') {
      return HttpResponse.json(
        {
          challengeToken: 'mock-login-challenge',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          method: 'email',
        },
        { status: 202 },
      );
    }
    if (body.email === 'totp@example.com') {
      return HttpResponse.json(
        {
          challengeToken: 'mock-login-totp',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          method: 'totp',
        },
        { status: 202 },
      );
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

  http.post(`${api}/auth/change-password`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!body.currentPassword || body.currentPassword.length < 8) {
      return problem(
        422,
        'invalid_current_password',
        'Invalid current password',
        'The current password is incorrect.',
      );
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      return problem(
        422,
        'validation_failed',
        'Validation failed',
        'Password must contain at least 8 characters',
      );
    }
    if (body.currentPassword === body.newPassword) {
      return problem(
        422,
        'password_unchanged',
        'Password unchanged',
        'The new password must be different from the current password.',
      );
    }
    await delay(120);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/auth/forgot-password`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (!body.email) {
      return problem(422, 'validation_failed', 'Validation failed', 'Email is required');
    }
    await delay(120);
    return HttpResponse.json({ status: 'reset_sent' }, { status: 202 });
  }),

  http.post(`${api}/auth/reset-password`, async ({ request }) => {
    const body = (await request.json()) as {
      token?: string;
      newPassword?: string;
    };
    if (body.token !== 'mock-reset' || !body.newPassword || body.newPassword.length < 8) {
      return problem(
        400,
        'invalid_reset_token',
        'Invalid reset link',
        'The link is invalid, expired or already used.',
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/auth/change-email`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as {
      newEmail?: string;
      currentPassword?: string;
      challengeToken?: string;
      code?: string;
    };
    if (!body.currentPassword || body.currentPassword.length < 8) {
      return problem(
        422,
        'invalid_current_password',
        'Invalid current password',
        'The current password is incorrect.',
      );
    }
    if (!body.newEmail) {
      return problem(422, 'validation_failed', 'Validation failed', 'Email is required');
    }
    if (body.newEmail === mockUser.email) {
      return problem(422, 'validation_failed', 'Validation failed', 'Enter a different email address');
    }
    if (body.challengeToken && body.code !== '123456') {
      return problem(401, 'invalid_two_factor_code', 'Invalid code', 'The code is incorrect.');
    }
    return HttpResponse.json(
      { status: 'verification_sent', email: body.newEmail },
      { status: 202 },
    );
  }),

  http.post(`${api}/auth/confirm-email-change`, async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token !== 'mock-email-change') {
      return problem(
        400,
        'invalid_email_change_token',
        'Invalid email-change link',
        'The link is invalid or expired.',
      );
    }
    endMockSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/auth/2fa/enable`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as {
      currentPassword?: string;
      method?: 'email' | 'totp';
    };
    if (!body.currentPassword || body.currentPassword.length < 8) {
      return problem(422, 'invalid_current_password', 'Invalid current password', 'Wrong password.');
    }
    if (body.method === 'totp') {
      return HttpResponse.json(
        {
          challengeToken: 'mock-totp-challenge',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          method: 'totp',
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUrl:
            'otpauth://totp/Writer%20Tool:author@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Writer+Tool',
        },
        { status: 202 },
      );
    }
    return HttpResponse.json(
      {
        challengeToken: 'mock-enable-challenge',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        method: 'email',
      },
      { status: 202 },
    );
  }),

  http.post(`${api}/auth/2fa/enable/confirm`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as { challengeToken?: string; code?: string };
    if (
      (body.challengeToken !== 'mock-enable-challenge' &&
        body.challengeToken !== 'mock-totp-challenge') ||
      body.code !== '123456'
    ) {
      return problem(401, 'invalid_two_factor_code', 'Invalid code', 'The code is incorrect.');
    }
    mockTwoFactorMethod =
      body.challengeToken === 'mock-totp-challenge' ? 'totp' : 'email';
    return HttpResponse.json({
      ...mockUser,
      twoFactorEnabled: true,
      twoFactorMethod: mockTwoFactorMethod,
    });
  }),

  http.post(`${api}/auth/2fa/disable`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as { currentPassword?: string };
    if (!body.currentPassword || body.currentPassword.length < 8) {
      return problem(422, 'invalid_current_password', 'Invalid current password', 'Wrong password.');
    }
    return HttpResponse.json(
      {
        challengeToken:
          mockTwoFactorMethod === 'totp'
            ? 'mock-disable-totp'
            : 'mock-disable-challenge',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        method: mockTwoFactorMethod,
      },
      { status: 202 },
    );
  }),

  http.post(`${api}/auth/2fa/disable/confirm`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as { challengeToken?: string; code?: string };
    if (
      (body.challengeToken !== 'mock-disable-challenge' &&
        body.challengeToken !== 'mock-disable-totp') ||
      body.code !== '123456'
    ) {
      return problem(401, 'invalid_two_factor_code', 'Invalid code', 'The code is incorrect.');
    }
    mockTwoFactorMethod = 'email';
    return HttpResponse.json({
      ...mockUser,
      twoFactorEnabled: false,
      twoFactorMethod: 'email',
    });
  }),

  http.post(`${api}/auth/2fa/challenge`, async ({ request }) => {
    if (!hasMockSession()) {
      return problem(401, 'unauthorized', 'Authentication required');
    }
    const body = (await request.json()) as {
      currentPassword?: string;
      purpose?: string;
    };
    if (body.purpose !== 'change_email') {
      return problem(422, 'validation_failed', 'Validation failed', 'Unknown purpose');
    }
    if (!body.currentPassword || body.currentPassword.length < 8) {
      return problem(422, 'invalid_current_password', 'Invalid current password', 'Wrong password.');
    }
    return HttpResponse.json(
      {
        challengeToken:
          mockTwoFactorMethod === 'totp'
            ? 'mock-email-totp'
            : 'mock-email-challenge',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        method: mockTwoFactorMethod,
      },
      { status: 202 },
    );
  }),

  http.post(`${api}/auth/2fa/verify`, async ({ request }) => {
    const body = (await request.json()) as {
      challengeToken?: string;
      code?: string;
    };
    if (
      (body.challengeToken !== 'mock-login-challenge' &&
        body.challengeToken !== 'mock-login-totp') ||
      body.code !== '123456'
    ) {
      return problem(401, 'invalid_two_factor_code', 'Invalid code', 'The code is incorrect.');
    }
    startMockSession();
    return HttpResponse.json(authResponse());
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
      worldId?: string;
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
      worldId: body.worldId ?? null,
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
    if (body.worldId !== undefined) {
      book.worldId =
        body.worldId === '00000000-0000-0000-0000-000000000000'
          ? null
          : body.worldId;
    }
    book.version += 1;
    book.updatedAt = new Date().toISOString();
    touchProject(book.projectId);
    saveMockState();
    return HttpResponse.json(book);
  }),

  http.put(`${api}/books/:bookId/cover`, async ({ params, request }) => {
    const state = getMockState();
    const book = state.books.find((item) => item.id === params.bookId);
    if (!book) {
      return problem(404, 'not_found', 'Book not found');
    }
    const body = (await request.json()) as { assetId?: string };
    if (!body.assetId) {
      return problem(422, 'validation_failed', 'Validation failed', 'assetId is required');
    }
    const asset = state.assets.find((item) => item.id === body.assetId);
    if (!asset || asset.projectId !== book.projectId) {
      return problem(
        422,
        'validation_failed',
        'Validation failed',
        'Asset belongs to another project',
      );
    }
    if (asset.status !== 'ready' || !asset.mime.startsWith('image/')) {
      return problem(
        422,
        'validation_failed',
        'Validation failed',
        'Asset must be a ready image',
      );
    }
    book.coverUrl = asset.url ?? asset.thumbUrl ?? `/api/v1/dev/files/${asset.id}`;
    book.version += 1;
    book.updatedAt = new Date().toISOString();
    saveMockState();
    await delay(80);
    return HttpResponse.json(book);
  }),

  http.delete(`${api}/books/:bookId/cover`, async ({ params }) => {
    const state = getMockState();
    const book = state.books.find((item) => item.id === params.bookId);
    if (!book) {
      return problem(404, 'not_found', 'Book not found');
    }
    book.coverUrl = null;
    book.version += 1;
    book.updatedAt = new Date().toISOString();
    saveMockState();
    await delay(80);
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
      worldId: body.worldId ?? null,
      locationId: null,
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
    if (body.worldId !== undefined) {
      character.worldId =
        body.worldId === '00000000-0000-0000-0000-000000000000'
          ? null
          : body.worldId;
    }
    if (body.locationId !== undefined) {
      character.locationId =
        body.locationId === '00000000-0000-0000-0000-000000000000'
          ? null
          : body.locationId;
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

  http.get(`${api}/projects/:projectId/attachments`, async ({ params, request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const state = getMockState();
    const items = state.attachments
      .filter((attachment) => {
        if (role && attachment.role !== role) {
          return false;
        }
        if (attachment.targetType === 'character') {
          return state.characters.some(
            (character) =>
              character.id === attachment.targetId &&
              character.projectId === params.projectId,
          );
        }
        return false;
      })
      .map((attachment) => ({
        ...attachment,
        targetName:
          state.characters.find(
            (character) => character.id === attachment.targetId,
          )?.name ?? '',
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    await delay(70);
    return HttpResponse.json({ items, nextCursor: null });
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

  http.get(`${api}/projects/:projectId/worlds`, async ({ params, request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('ru');
    const items = getMockState()
      .worlds.filter((world) => world.projectId === params.projectId)
      .filter((world) =>
        query
          ? [world.name, world.type, world.summary, world.description]
              .join(' ')
              .toLocaleLowerCase('ru')
              .includes(query)
          : true,
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    await delay(70);
    return HttpResponse.json({ items, nextCursor: null });
  }),

  http.post(`${api}/projects/:projectId/worlds`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<World>;
    if (!body.name?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const timestamp = new Date().toISOString();
    const world: World = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: body.name.trim(),
      type: body.type ?? '',
      summary: body.summary ?? '',
      description: body.description ?? '',
      rulesSummary: body.rulesSummary ?? '',
      history: body.history ?? '',
      geography: body.geography ?? '',
      mapUrl: null,
      customFields: body.customFields ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.worlds = [world, ...state.worlds];
    touchProject(project.id);
    saveMockState();
    await delay(110);
    return HttpResponse.json(world, { status: 201 });
  }),

  http.get(`${api}/worlds/:worldId`, async ({ params }) => {
    const world = getMockState().worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    await delay(60);
    return HttpResponse.json(world);
  }),

  http.patch(`${api}/worlds/:worldId`, async ({ params, request }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const body = (await request.json()) as Partial<World>;
    if (!validateVersion(world.version, body.version)) {
      return conflictVersion();
    }
    if (body.name !== undefined && !body.name.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const fields: (keyof World)[] = [
      'name',
      'type',
      'summary',
      'description',
      'rulesSummary',
      'history',
      'geography',
      'customFields',
    ];
    for (const field of fields) {
      const value = body[field];
      if (value !== undefined) {
        Object.assign(world, { [field]: value });
      }
    }
    world.version += 1;
    world.updatedAt = new Date().toISOString();
    touchProject(world.projectId);
    saveMockState();
    return HttpResponse.json(world);
  }),

  http.put(`${api}/worlds/:worldId/map`, async ({ params, request }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const body = (await request.json()) as { assetId?: string };
    const asset = state.assets.find((item) => item.id === body.assetId);
    if (!asset) {
      return problem(422, 'validation_failed', 'Validation failed', 'Asset not found');
    }
    world.mapUrl = asset.url ?? null;
    world.version += 1;
    world.updatedAt = new Date().toISOString();
    touchProject(world.projectId);
    saveMockState();
    return HttpResponse.json(world);
  }),

  http.delete(`${api}/worlds/:worldId/map`, ({ params }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    world.mapUrl = null;
    world.version += 1;
    world.updatedAt = new Date().toISOString();
    touchProject(world.projectId);
    saveMockState();
    return HttpResponse.json(world);
  }),

  http.delete(`${api}/worlds/:worldId`, ({ params }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    state.worlds = state.worlds.filter((item) => item.id !== params.worldId);
    state.worldRules = state.worldRules.filter((item) => item.worldId !== params.worldId);
    state.locations = state.locations.filter((item) => item.worldId !== params.worldId);
    state.factions = state.factions.filter((item) => item.worldId !== params.worldId);
    state.loreEntries = state.loreEntries.filter((item) => item.worldId !== params.worldId);
    touchProject(world.projectId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/worlds/:worldId/rules`, async ({ params }) => {
    const world = getMockState().worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const items = getMockState()
      .worldRules.filter((rule) => rule.worldId === params.worldId)
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/worlds/:worldId/rules`, async ({ params, request }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const body = (await request.json()) as Partial<WorldRule>;
    if (!body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    if (body.importance !== undefined && (body.importance < 0 || body.importance > 5)) {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid importance');
    }
    const timestamp = new Date().toISOString();
    const existing = state.worldRules.filter((rule) => rule.worldId === world.id);
    const rule: WorldRule = {
      id: crypto.randomUUID(),
      worldId: world.id,
      category: body.category ?? '',
      title: body.title.trim(),
      description: body.description ?? '',
      consequences: body.consequences ?? '',
      exceptions: body.exceptions ?? '',
      importance: body.importance ?? 3,
      sortKey: String((existing.length + 1) * 10).padStart(10, '0'),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.worldRules = [...state.worldRules, rule];
    touchProject(world.projectId);
    saveMockState();
    await delay(90);
    return HttpResponse.json(rule, { status: 201 });
  }),

  http.patch(`${api}/world-rules/:ruleId`, async ({ params, request }) => {
    const state = getMockState();
    const rule = state.worldRules.find((item) => item.id === params.ruleId);
    if (!rule) {
      return problem(404, 'not_found', 'Rule not found');
    }
    const body = (await request.json()) as Partial<WorldRule>;
    if (!validateVersion(rule.version, body.version)) {
      return conflictVersion();
    }
    if (body.title !== undefined && !body.title.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    if (body.importance !== undefined && (body.importance < 0 || body.importance > 5)) {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid importance');
    }
    for (const field of [
      'category',
      'title',
      'description',
      'consequences',
      'exceptions',
      'importance',
    ] as const) {
      if (body[field] !== undefined) {
        Object.assign(rule, { [field]: body[field] });
      }
    }
    rule.version += 1;
    rule.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(rule);
  }),

  http.delete(`${api}/world-rules/:ruleId`, ({ params }) => {
    const state = getMockState();
    const rule = state.worldRules.find((item) => item.id === params.ruleId);
    if (!rule) {
      return problem(404, 'not_found', 'Rule not found');
    }
    state.worldRules = state.worldRules.filter((item) => item.id !== params.ruleId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/worlds/:worldId/locations`, async ({ params }) => {
    const world = getMockState().worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const items = getMockState()
      .locations.filter((location) => location.worldId === params.worldId)
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/worlds/:worldId/locations`, async ({ params, request }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const body = (await request.json()) as Partial<Location>;
    if (!body.name?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    if (body.parentId) {
      const parent = state.locations.find((item) => item.id === body.parentId);
      if (!parent || parent.worldId !== world.id) {
        return problem(422, 'validation_failed', 'Validation failed', 'Invalid parent');
      }
    }
    const timestamp = new Date().toISOString();
    const siblings = state.locations.filter(
      (location) =>
        location.worldId === world.id &&
        (location.parentId ?? null) === (body.parentId ?? null),
    );
    const location: Location = {
      id: crypto.randomUUID(),
      worldId: world.id,
      parentId: body.parentId ?? null,
      name: body.name.trim(),
      type: body.type ?? '',
      description: body.description ?? '',
      sortKey: String((siblings.length + 1) * 10).padStart(10, '0'),
      mapX: body.mapX ?? null,
      mapY: body.mapY ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.locations = [...state.locations, location];
    touchProject(world.projectId);
    saveMockState();
    await delay(90);
    return HttpResponse.json(location, { status: 201 });
  }),

  http.patch(`${api}/locations/:locationId`, async ({ params, request }) => {
    const state = getMockState();
    const location = state.locations.find((item) => item.id === params.locationId);
    if (!location) {
      return problem(404, 'not_found', 'Location not found');
    }
    const body = (await request.json()) as Partial<Location>;
    if (!validateVersion(location.version, body.version)) {
      return conflictVersion();
    }
    if (body.name !== undefined && !body.name.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    for (const field of [
      'name',
      'type',
      'description',
      'mapX',
      'mapY',
    ] as const) {
      if (body[field] !== undefined) {
        Object.assign(location, { [field]: body[field] });
      }
    }
    location.version += 1;
    location.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(location);
  }),

  http.post(`${api}/locations/:locationId/move`, async ({ params, request }) => {
    const state = getMockState();
    const location = state.locations.find((item) => item.id === params.locationId);
    if (!location) {
      return problem(404, 'not_found', 'Location not found');
    }
    const body = (await request.json()) as {
      parentId?: string | null;
      beforeId?: string;
      afterId?: string;
    };
    const parentId = body.parentId ?? null;
    if (parentId === location.id) {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid parent');
    }
    if (parentId) {
      const parent = state.locations.find((item) => item.id === parentId);
      if (!parent || parent.worldId !== location.worldId) {
        return problem(422, 'validation_failed', 'Validation failed', 'Invalid parent');
      }
      let current: Location | undefined = parent;
      const seen = new Set<string>();
      while (current?.parentId) {
        if (seen.has(current.id)) {
          break;
        }
        seen.add(current.id);
        if (current.parentId === location.id) {
          return problem(
            422,
            'validation_failed',
            'Validation failed',
            'Cannot move a location into its own subtree',
          );
        }
        current = state.locations.find((item) => item.id === current!.parentId);
      }
    }
    const siblings = state.locations
      .filter(
        (item) =>
          item.worldId === location.worldId &&
          (item.parentId ?? null) === parentId &&
          item.id !== location.id,
      )
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    let index = siblings.length;
    if (body.beforeId) {
      const position = siblings.findIndex((item) => item.id === body.beforeId);
      if (position < 0) {
        return problem(422, 'validation_failed', 'Validation failed', 'Invalid beforeId');
      }
      index = position;
    } else if (body.afterId) {
      const position = siblings.findIndex((item) => item.id === body.afterId);
      if (position < 0) {
        return problem(422, 'validation_failed', 'Validation failed', 'Invalid afterId');
      }
      index = position + 1;
    }
    siblings.splice(index, 0, location);
    location.parentId = parentId;
    siblings.forEach((item, position) => {
      item.sortKey = String((position + 1) * 10).padStart(10, '0');
    });
    location.version += 1;
    location.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(location);
  }),

  http.delete(`${api}/locations/:locationId`, ({ params }) => {
    const state = getMockState();
    const location = state.locations.find((item) => item.id === params.locationId);
    if (!location) {
      return problem(404, 'not_found', 'Location not found');
    }
    const removed = new Set<string>([location.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of state.locations) {
        if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) {
          removed.add(item.id);
          changed = true;
        }
      }
    }
    state.locations = state.locations.filter((item) => !removed.has(item.id));
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/worlds/:worldId/factions`, async ({ params }) => {
    const world = getMockState().worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const items = getMockState()
      .factions.filter((faction) => faction.worldId === params.worldId)
      .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/worlds/:worldId/factions`, async ({ params, request }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const body = (await request.json()) as Partial<Faction>;
    if (!body.name?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const timestamp = new Date().toISOString();
    const faction: Faction = {
      id: crypto.randomUUID(),
      worldId: world.id,
      name: body.name.trim(),
      type: body.type ?? '',
      goals: body.goals ?? '',
      resources: body.resources ?? '',
      allies: body.allies ?? '',
      enemies: body.enemies ?? '',
      description: body.description ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.factions = [...state.factions, faction];
    touchProject(world.projectId);
    saveMockState();
    await delay(90);
    return HttpResponse.json(faction, { status: 201 });
  }),

  http.patch(`${api}/factions/:factionId`, async ({ params, request }) => {
    const state = getMockState();
    const faction = state.factions.find((item) => item.id === params.factionId);
    if (!faction) {
      return problem(404, 'not_found', 'Faction not found');
    }
    const body = (await request.json()) as Partial<Faction>;
    if (!validateVersion(faction.version, body.version)) {
      return conflictVersion();
    }
    if (body.name !== undefined && !body.name.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    for (const field of [
      'name',
      'type',
      'goals',
      'resources',
      'allies',
      'enemies',
      'description',
    ] as const) {
      if (body[field] !== undefined) {
        Object.assign(faction, { [field]: body[field] });
      }
    }
    faction.version += 1;
    faction.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(faction);
  }),

  http.delete(`${api}/factions/:factionId`, ({ params }) => {
    const state = getMockState();
    const faction = state.factions.find((item) => item.id === params.factionId);
    if (!faction) {
      return problem(404, 'not_found', 'Faction not found');
    }
    state.factions = state.factions.filter((item) => item.id !== params.factionId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/worlds/:worldId/lore`, async ({ params }) => {
    const world = getMockState().worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const items = getMockState()
      .loreEntries.filter((entry) => entry.worldId === params.worldId)
      .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/worlds/:worldId/lore`, async ({ params, request }) => {
    const state = getMockState();
    const world = state.worlds.find((item) => item.id === params.worldId);
    if (!world) {
      return problem(404, 'not_found', 'World not found');
    }
    const body = (await request.json()) as Partial<LoreEntry>;
    if (!body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    const timestamp = new Date().toISOString();
    const entry: LoreEntry = {
      id: crypto.randomUUID(),
      worldId: world.id,
      type: body.type ?? '',
      title: body.title.trim(),
      content: body.content ?? '',
      tags: body.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.loreEntries = [...state.loreEntries, entry];
    touchProject(world.projectId);
    saveMockState();
    await delay(90);
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.patch(`${api}/lore/:loreId`, async ({ params, request }) => {
    const state = getMockState();
    const entry = state.loreEntries.find((item) => item.id === params.loreId);
    if (!entry) {
      return problem(404, 'not_found', 'Lore entry not found');
    }
    const body = (await request.json()) as Partial<LoreEntry>;
    if (!validateVersion(entry.version, body.version)) {
      return conflictVersion();
    }
    if (body.title !== undefined && !body.title.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    for (const field of ['type', 'title', 'content', 'tags'] as const) {
      if (body[field] !== undefined) {
        Object.assign(entry, { [field]: body[field] });
      }
    }
    entry.version += 1;
    entry.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(entry);
  }),

  http.delete(`${api}/lore/:loreId`, ({ params }) => {
    const state = getMockState();
    const entry = state.loreEntries.find((item) => item.id === params.loreId);
    if (!entry) {
      return problem(404, 'not_found', 'Lore entry not found');
    }
    state.loreEntries = state.loreEntries.filter((item) => item.id !== params.loreId);
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/projects/:projectId/custom-fields/reorder`, async ({ params, request }) => {
    const state = getMockState();
    const body = (await request.json()) as {
      entityType?: string;
      ids?: string[];
    };
    if (body.entityType !== 'character' && body.entityType !== 'world') {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid entity type');
    }
    const ids = body.ids ?? [];
    const definitions = state.customFields.filter(
      (field) =>
        field.projectId === params.projectId &&
        field.entityType === body.entityType,
    );
    if (
      ids.length !== definitions.length ||
      new Set(ids).size !== ids.length ||
      definitions.some((field) => !ids.includes(field.id))
    ) {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid ids');
    }
    ids.forEach((id, index) => {
      const definition = state.customFields.find((field) => field.id === id);
      if (definition) {
        definition.sortKey = String((index + 1) * 10).padStart(10, '0');
      }
    });
    saveMockState();
    const items = state.customFields
      .filter(
        (field) =>
          field.projectId === params.projectId &&
          field.entityType === body.entityType,
      )
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    return HttpResponse.json({ items });
  }),

  http.get(`${api}/projects/:projectId/custom-fields`, async ({ params, request }) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get('entityType');
    if (entityType !== 'character' && entityType !== 'world') {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid entity type');
    }
    const items = getMockState()
      .customFields.filter(
        (field) =>
          field.projectId === params.projectId && field.entityType === entityType,
      )
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/projects/:projectId/custom-fields`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<CustomFieldDef>;
    if (body.entityType !== 'character' && body.entityType !== 'world') {
      return problem(422, 'validation_failed', 'Validation failed', 'Invalid entity type');
    }
    if (!body.label?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Label is required');
    }
    if (!body.type) {
      return problem(422, 'validation_failed', 'Validation failed', 'Type is required');
    }
    const options = body.options ?? [];
    if ((body.type === 'select' || body.type === 'multiselect') && options.length === 0) {
      return problem(422, 'validation_failed', 'Validation failed', 'Options are required');
    }
    const key =
      body.key ??
      `field_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
    if (
      state.customFields.some(
        (field) =>
          field.projectId === project.id &&
          field.entityType === body.entityType &&
          field.key === key,
      )
    ) {
      return problem(409, 'conflict', 'Conflict', 'Key is already used');
    }
    const timestamp = new Date().toISOString();
    const siblings = state.customFields.filter(
      (field) =>
        field.projectId === project.id && field.entityType === body.entityType,
    );
    const definition: CustomFieldDef = {
      id: crypto.randomUUID(),
      projectId: project.id,
      entityType: body.entityType,
      key,
      label: body.label.trim(),
      type: body.type,
      options,
      required: body.required ?? false,
      sortKey: String((siblings.length + 1) * 10).padStart(10, '0'),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.customFields = [...state.customFields, definition];
    saveMockState();
    return HttpResponse.json(definition, { status: 201 });
  }),

  http.patch(`${api}/custom-fields/:fieldId`, async ({ params, request }) => {
    const state = getMockState();
    const definition = state.customFields.find((item) => item.id === params.fieldId);
    if (!definition) {
      return problem(404, 'not_found', 'Custom field not found');
    }
    const body = (await request.json()) as Partial<CustomFieldDef>;
    if (!validateVersion(definition.version, body.version)) {
      return conflictVersion();
    }
    if (body.label !== undefined && !body.label.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Label is required');
    }
    for (const field of ['label', 'type', 'options', 'required'] as const) {
      if (body[field] !== undefined) {
        Object.assign(definition, { [field]: body[field] });
      }
    }
    if (
      (definition.type === 'select' || definition.type === 'multiselect') &&
      definition.options.length === 0
    ) {
      return problem(422, 'validation_failed', 'Validation failed', 'Options are required');
    }
    definition.version += 1;
    definition.updatedAt = new Date().toISOString();
    saveMockState();
    return HttpResponse.json(definition);
  }),

  http.delete(`${api}/custom-fields/:fieldId`, ({ params }) => {
    const state = getMockState();
    if (!state.customFields.some((item) => item.id === params.fieldId)) {
      return problem(404, 'not_found', 'Custom field not found');
    }
    state.customFields = state.customFields.filter(
      (item) => item.id !== params.fieldId,
    );
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/projects/:projectId/search`, async ({ params, request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('ru');
    if (!query) {
      return problem(422, 'validation_failed', 'Validation failed', 'Query is required');
    }
    const requested = (url.searchParams.get('types') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean) as SearchResultType[];
    const allowed = (type: SearchResultType) =>
      requested.length === 0 || requested.includes(type);
    const matches = (...values: unknown[]) =>
      values.join(' ').toLocaleLowerCase('ru').includes(query);
    const state = getMockState();
    const results: SearchResult[] = [];

    if (allowed('document')) {
      for (const document of state.documents.filter(
        (item) => item.projectId === params.projectId && item.kind === 'text',
      )) {
        const text = proseText(document.canonical);
        if (!matches(document.title, text)) {
          continue;
        }
        const node = state.nodes.find((item) => item.documentId === document.id);
        results.push({
          type: 'document',
          id: document.id,
          projectId: document.projectId,
          title: document.title,
          snippet: text.slice(0, 180),
          nodeId: node?.id ?? null,
          worldId: null,
          updatedAt: document.updatedAt,
        });
      }
    }

    if (allowed('book')) {
      for (const book of state.books.filter(
        (item) => item.projectId === params.projectId,
      )) {
        if (!matches(book.title, book.subtitle, book.synopsis)) {
          continue;
        }
        results.push({
          type: 'book',
          id: book.id,
          projectId: book.projectId,
          title: book.title,
          snippet: book.synopsis ?? '',
          nodeId: null,
          worldId: null,
          updatedAt: book.updatedAt,
        });
      }
    }

    if (allowed('node')) {
      const projectBookIds = new Set(
        state.books
          .filter((item) => item.projectId === params.projectId)
          .map((item) => item.id),
      );
      for (const node of state.nodes.filter((item) =>
        projectBookIds.has(item.bookId),
      )) {
        if (!matches(node.title, node.synopsis, node.notes)) {
          continue;
        }
        results.push({
          type: 'node',
          id: node.id,
          projectId: String(params.projectId),
          title: node.title,
          snippet: node.synopsis || node.notes || '',
          nodeId: node.id,
          worldId: null,
          updatedAt: node.updatedAt,
        });
      }
    }

    if (allowed('character')) {
      for (const character of state.characters.filter(
        (item) => item.projectId === params.projectId,
      )) {
        if (
          !matches(
            character.name,
            character.fullName,
            character.goal,
            character.motivation,
            character.personality,
          )
        ) {
          continue;
        }
        results.push({
          type: 'character',
          id: character.id,
          projectId: character.projectId,
          title: character.name,
          snippet:
            character.goal ||
            character.motivation ||
            character.personality ||
            '',
          nodeId: null,
          worldId: null,
          updatedAt: character.updatedAt,
        });
      }
    }

    if (allowed('world')) {
      for (const world of state.worlds.filter(
        (item) => item.projectId === params.projectId,
      )) {
        if (
          !matches(
            world.name,
            world.summary,
            world.description,
            world.history,
            world.geography,
            world.rulesSummary,
          )
        ) {
          continue;
        }
        results.push({
          type: 'world',
          id: world.id,
          projectId: world.projectId,
          title: world.name,
          snippet: world.summary || world.description,
          nodeId: null,
          worldId: null,
          updatedAt: world.updatedAt,
        });
      }
    }

    const worldById = (worldId: string) =>
      state.worlds.find((item) => item.id === worldId);

    if (allowed('location')) {
      for (const location of state.locations) {
        const world = worldById(location.worldId);
        if (
          !world ||
          world.projectId !== params.projectId ||
          !matches(location.name, location.description)
        ) {
          continue;
        }
        results.push({
          type: 'location',
          id: location.id,
          projectId: world.projectId,
          title: location.name,
          snippet: location.description,
          nodeId: null,
          worldId: world.id,
          updatedAt: location.updatedAt,
        });
      }
    }

    if (allowed('faction')) {
      for (const faction of state.factions) {
        const world = worldById(faction.worldId);
        if (
          !world ||
          world.projectId !== params.projectId ||
          !matches(
            faction.name,
            faction.goals,
            faction.resources,
            faction.allies,
            faction.enemies,
            faction.description,
          )
        ) {
          continue;
        }
        results.push({
          type: 'faction',
          id: faction.id,
          projectId: world.projectId,
          title: faction.name,
          snippet: faction.goals || faction.description,
          nodeId: null,
          worldId: world.id,
          updatedAt: faction.updatedAt,
        });
      }
    }

    if (allowed('lore')) {
      for (const entry of state.loreEntries) {
        const world = worldById(entry.worldId);
        if (
          !world ||
          world.projectId !== params.projectId ||
          !matches(entry.title, entry.content, entry.tags.join(' '))
        ) {
          continue;
        }
        results.push({
          type: 'lore',
          id: entry.id,
          projectId: world.projectId,
          title: entry.title,
          snippet: entry.content,
          nodeId: null,
          worldId: world.id,
          updatedAt: entry.updatedAt,
        });
      }
    }

    if (allowed('event')) {
      for (const event of state.timelineEvents.filter(
        (item) => item.projectId === params.projectId,
      )) {
        if (!matches(event.title, event.description, event.tags.join(' '))) {
          continue;
        }
        results.push({
          type: 'event',
          id: event.id,
          projectId: event.projectId,
          title: event.title,
          snippet: event.description.slice(0, 180),
          nodeId: null,
          worldId: null,
          updatedAt: event.updatedAt,
        });
      }
    }

    if (allowed('diagram')) {
      for (const diagram of state.diagrams.filter(
        (item) => item.projectId === params.projectId,
      )) {
        if (!matches(diagram.title)) {
          continue;
        }
        results.push({
          type: 'diagram',
          id: diagram.id,
          projectId: diagram.projectId,
          title: diagram.title,
          snippet: '',
          nodeId: null,
          worldId: null,
          updatedAt: diagram.updatedAt,
        });
      }
    }

    results.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
    await delay(80);
    return HttpResponse.json({ items: results.slice(0, 50) });
  }),

  /* ── Phase 4: calendars, timeline, plot threads and diagrams ─────────── */

  http.get(`${api}/projects/:projectId/calendars`, async ({ params }) => {
    const items = getMockState()
      .calendars.filter((item) => item.projectId === params.projectId)
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }
        return left.name.localeCompare(right.name, 'ru');
      });
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/projects/:projectId/calendars`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<Calendar>;
    if (!body.name?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const months = (body.config as { months?: unknown } | undefined)?.months;
    if (!Array.isArray(months) || months.length === 0) {
      return problem(422, 'validation_failed', 'Validation failed', 'Calendar months are required');
    }
    if (body.isDefault) {
      state.calendars = state.calendars.map((item) =>
        item.projectId === params.projectId ? { ...item, isDefault: false } : item,
      );
    }
    const timestamp = new Date().toISOString();
    const calendar: Calendar = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: body.name.trim(),
      config: body.config ?? {},
      isDefault: Boolean(body.isDefault),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.calendars = [calendar, ...state.calendars];
    saveMockState();
    await delay(90);
    return HttpResponse.json(calendar, { status: 201 });
  }),

  http.patch(`${api}/calendars/:calendarId`, async ({ params, request }) => {
    const state = getMockState();
    const calendar = state.calendars.find((item) => item.id === params.calendarId);
    if (!calendar) {
      return problem(404, 'not_found', 'Calendar not found');
    }
    const body = (await request.json()) as Partial<Calendar>;
    if (body.version !== undefined && body.version !== calendar.version) {
      return problem(409, 'conflict', 'Conflict', 'Calendar was changed');
    }
    if (body.name !== undefined && !body.name.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name cannot be empty');
    }
    if (body.config) {
      const months = (body.config as { months?: unknown }).months;
      if (!Array.isArray(months) || months.length === 0) {
        return problem(422, 'validation_failed', 'Validation failed', 'Calendar months are required');
      }
    }
    if (body.isDefault) {
      state.calendars = state.calendars.map((item) =>
        item.projectId === calendar.projectId && item.id !== calendar.id
          ? { ...item, isDefault: false, version: item.version + 1 }
          : item,
      );
    }
    const updated: Calendar = {
      ...calendar,
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.config !== undefined ? { config: body.config } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      updatedAt: new Date().toISOString(),
      version: calendar.version + 1,
    };
    state.calendars = state.calendars.map((item) =>
      item.id === calendar.id ? updated : item,
    );
    saveMockState();
    await delay(80);
    return HttpResponse.json(updated);
  }),

  http.delete(`${api}/calendars/:calendarId`, ({ params }) => {
    const state = getMockState();
    if (!state.calendars.some((item) => item.id === params.calendarId)) {
      return problem(404, 'not_found', 'Calendar not found');
    }
    state.calendars = state.calendars.filter((item) => item.id !== params.calendarId);
    state.timelineEvents = state.timelineEvents.map((event) =>
      event.calendarId === params.calendarId
        ? { ...event, calendarId: null, version: event.version + 1 }
        : event,
    );
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/projects/:projectId/plot-threads`, async ({ params }) => {
    const items = getMockState()
      .plotThreads.filter((item) => item.projectId === params.projectId)
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    await delay(60);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/projects/:projectId/plot-threads`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<PlotThread>;
    if (!body.name?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name is required');
    }
    const timestamp = new Date().toISOString();
    const thread: PlotThread = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: body.name.trim(),
      color: body.color ?? '',
      description: body.description ?? '',
      sortKey: String(state.plotThreads.length + 1).padStart(10, '0') + '0',
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.plotThreads = [...state.plotThreads, thread];
    saveMockState();
    await delay(90);
    return HttpResponse.json(thread, { status: 201 });
  }),

  http.patch(`${api}/plot-threads/:threadId`, async ({ params, request }) => {
    const state = getMockState();
    const thread = state.plotThreads.find((item) => item.id === params.threadId);
    if (!thread) {
      return problem(404, 'not_found', 'Plot thread not found');
    }
    const body = (await request.json()) as Partial<PlotThread>;
    if (body.version !== undefined && body.version !== thread.version) {
      return problem(409, 'conflict', 'Conflict', 'Plot thread was changed');
    }
    if (body.name !== undefined && !body.name.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Name cannot be empty');
    }
    const updated: PlotThread = {
      ...thread,
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      updatedAt: new Date().toISOString(),
      version: thread.version + 1,
    };
    state.plotThreads = state.plotThreads.map((item) =>
      item.id === thread.id ? updated : item,
    );
    saveMockState();
    await delay(80);
    return HttpResponse.json(updated);
  }),

  http.delete(`${api}/plot-threads/:threadId`, ({ params }) => {
    const state = getMockState();
    if (!state.plotThreads.some((item) => item.id === params.threadId)) {
      return problem(404, 'not_found', 'Plot thread not found');
    }
    state.plotThreads = state.plotThreads.filter(
      (item) => item.id !== params.threadId,
    );
    state.timelineEvents = state.timelineEvents.map((event) =>
      event.plotThreadId === params.threadId
        ? { ...event, plotThreadId: null, version: event.version + 1 }
        : event,
    );
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/projects/:projectId/timeline`, async ({ params, request }) => {
    const url = new URL(request.url);
    const state = getMockState();
    const mode = url.searchParams.get('mode') ?? 'world';
    const threadId = url.searchParams.get('plotThreadId');
    const characterId = url.searchParams.get('characterId');
    const locationId = url.searchParams.get('locationId');
    const factionId = url.searchParams.get('factionId');
    const bookId = url.searchParams.get('bookId');
    const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('ru');
    const rawFrom = url.searchParams.get('fromValue');
    const rawTo = url.searchParams.get('toValue');
    const rawImportance = url.searchParams.get('importanceMin');
    const fromValue = rawFrom === null ? null : Number(rawFrom);
    const toValue = rawTo === null ? null : Number(rawTo);
    const importanceMin = rawImportance === null ? null : Number(rawImportance);
    const nodes = new Map(state.nodes.map((node) => [node.id, node]));
    const links = state.timelineEventLinks;

    const items = state.timelineEvents
      .filter((event) => event.projectId === params.projectId)
      .filter((event) => (threadId ? event.plotThreadId === threadId : true))
      .filter((event) =>
        characterId
          ? links.some(
              (link) =>
                link.eventId === event.id &&
                link.entityType === 'character' &&
                link.entityId === characterId,
            )
          : true,
      )
      .filter((event) =>
        locationId
          ? links.some(
              (link) =>
                link.eventId === event.id &&
                link.entityType === 'location' &&
                link.entityId === locationId,
            )
          : true,
      )
      .filter((event) =>
        factionId
          ? links.some(
              (link) =>
                link.eventId === event.id &&
                link.entityType === 'faction' &&
                link.entityId === factionId,
            )
          : true,
      )
      .filter((event) =>
        bookId
          ? event.narrativeNodeId
            ? nodes.get(event.narrativeNodeId)?.bookId === bookId
            : false
          : true,
      )
      .filter((event) =>
        query
          ? [event.title, event.description, event.tags.join(' ')]
              .join(' ')
              .toLocaleLowerCase('ru')
              .includes(query)
          : true,
      )
      .filter((event) =>
        fromValue !== null && Number.isFinite(fromValue)
          ? event.startValue != null && event.startValue >= fromValue
          : true,
      )
      .filter((event) =>
        toValue !== null && Number.isFinite(toValue)
          ? event.startValue != null && event.startValue <= toValue
          : true,
      )
      .filter((event) =>
        importanceMin !== null && Number.isFinite(importanceMin)
          ? event.importance >= importanceMin
          : true,
      )
      .map((event) => {
        const node = event.narrativeNodeId ? nodes.get(event.narrativeNodeId) : null;
        return {
          ...event,
          narrativeNodeTitle: node?.title ?? null,
          narrativeBookId: node?.bookId ?? null,
          links: links.filter((link) => link.eventId === event.id),
        };
      });

    items.sort((left, right) => {
      if (mode === 'narrative') {
        const leftKey = left.narrativeSortKey || '~';
        const rightKey = right.narrativeSortKey || '~';
        if (leftKey !== rightKey) {
          return leftKey.localeCompare(rightKey);
        }
        return left.title.localeCompare(right.title, 'ru');
      }
      if (left.startValue == null && right.startValue == null) {
        return left.title.localeCompare(right.title, 'ru');
      }
      if (left.startValue == null) {
        return 1;
      }
      if (right.startValue == null) {
        return -1;
      }
      return left.startValue - right.startValue;
    });

    await delay(90);
    return HttpResponse.json({
      items,
      plotThreads: state.plotThreads
        .filter((item) => item.projectId === params.projectId)
        .sort((left, right) => left.sortKey.localeCompare(right.sortKey)),
      calendars: state.calendars.filter(
        (item) => item.projectId === params.projectId,
      ),
    });
  }),

  http.post(`${api}/projects/:projectId/timeline-events`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<TimelineEvent> & {
      tags?: string[];
    };
    if (!body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    if (
      body.startValue != null &&
      body.endValue != null &&
      body.endValue < body.startValue
    ) {
      return problem(422, 'validation_failed', 'Validation failed', 'End date is before the start date');
    }
    const node = body.narrativeNodeId
      ? state.nodes.find((item) => item.id === body.narrativeNodeId)
      : null;
    const timestamp = new Date().toISOString();
    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      projectId: project.id,
      calendarId: body.calendarId ?? null,
      plotThreadId: body.plotThreadId ?? null,
      title: body.title.trim(),
      description: body.description ?? '',
      startValue: body.startValue ?? null,
      endValue: body.endValue ?? null,
      displayStart: body.displayStart ?? '',
      displayEnd: body.displayEnd ?? '',
      precision: body.precision ?? 'day',
      dateMode: body.dateMode ?? 'exact',
      importance: body.importance ?? 3,
      color: body.color ?? '',
      tags: body.tags ?? [],
      narrativeNodeId: body.narrativeNodeId ?? null,
      narrativeNodeTitle: node?.title ?? null,
      narrativeBookId: node?.bookId ?? null,
      narrativeSortKey: node?.sortKey ?? '',
      links: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.timelineEvents = [...state.timelineEvents, event];
    saveMockState();
    await delay(100);
    return HttpResponse.json(event, { status: 201 });
  }),

  http.get(`${api}/timeline-events/:eventId`, async ({ params }) => {
    const state = getMockState();
    const event = state.timelineEvents.find((item) => item.id === params.eventId);
    if (!event) {
      return problem(404, 'not_found', 'Event not found');
    }
    await delay(60);
    return HttpResponse.json({
      ...event,
      links: state.timelineEventLinks.filter((link) => link.eventId === event.id),
    });
  }),

  http.patch(`${api}/timeline-events/:eventId`, async ({ params, request }) => {
    const state = getMockState();
    const event = state.timelineEvents.find((item) => item.id === params.eventId);
    if (!event) {
      return problem(404, 'not_found', 'Event not found');
    }
    const body = (await request.json()) as Partial<TimelineEvent> & {
      clearEnd?: boolean;
      version?: number;
    };
    if (body.version !== undefined && body.version !== event.version) {
      return problem(409, 'conflict', 'Conflict', 'Event was changed');
    }
    if (body.title !== undefined && !body.title.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title cannot be empty');
    }
    const clear = (value: string | null | undefined) =>
      value === '00000000-0000-0000-0000-000000000000' ? null : value;
    const dateMode = body.dateMode ?? event.dateMode;
    const startValue =
      dateMode === 'unknown'
        ? null
        : body.startValue !== undefined
          ? body.startValue
          : event.startValue;
    const endValue =
      dateMode === 'unknown' || body.clearEnd
        ? null
        : body.endValue !== undefined
          ? body.endValue
          : event.endValue;
    if (startValue != null && endValue != null && endValue < startValue) {
      return problem(422, 'validation_failed', 'Validation failed', 'End date is before the start date');
    }
    const nodeId =
      body.narrativeNodeId !== undefined
        ? clear(body.narrativeNodeId)
        : event.narrativeNodeId;
    const node = nodeId ? state.nodes.find((item) => item.id === nodeId) : null;
    const updated: TimelineEvent = {
      ...event,
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.plotThreadId !== undefined
        ? { plotThreadId: clear(body.plotThreadId) }
        : {}),
      ...(body.calendarId !== undefined
        ? { calendarId: clear(body.calendarId) }
        : {}),
      ...(body.precision !== undefined ? { precision: body.precision } : {}),
      dateMode,
      ...(body.importance !== undefined ? { importance: body.importance } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      startValue,
      endValue,
      displayStart:
        dateMode === 'unknown'
          ? body.displayStart ?? event.displayStart
          : body.displayStart ?? event.displayStart,
      displayEnd: dateMode === 'unknown' || body.clearEnd
        ? ''
        : body.displayEnd ?? event.displayEnd,
      narrativeNodeId: nodeId,
      narrativeNodeTitle: node?.title ?? null,
      narrativeBookId: node?.bookId ?? null,
      narrativeSortKey: node?.sortKey ?? '',
      updatedAt: new Date().toISOString(),
      version: event.version + 1,
    };
    state.timelineEvents = state.timelineEvents.map((item) =>
      item.id === event.id ? updated : item,
    );
    saveMockState();
    await delay(90);
    return HttpResponse.json({
      ...updated,
      links: state.timelineEventLinks.filter((link) => link.eventId === event.id),
    });
  }),

  http.delete(`${api}/timeline-events/:eventId`, ({ params }) => {
    const state = getMockState();
    if (!state.timelineEvents.some((item) => item.id === params.eventId)) {
      return problem(404, 'not_found', 'Event not found');
    }
    state.timelineEvents = state.timelineEvents.filter(
      (item) => item.id !== params.eventId,
    );
    state.timelineEventLinks = state.timelineEventLinks.filter(
      (link) => link.eventId !== params.eventId,
    );
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/timeline-events/:eventId/links`, async ({ params, request }) => {
    const state = getMockState();
    const event = state.timelineEvents.find((item) => item.id === params.eventId);
    if (!event) {
      return problem(404, 'not_found', 'Event not found');
    }
    const body = (await request.json()) as Partial<TimelineEventLink>;
    if (!body.entityType || !body.entityId) {
      return problem(422, 'validation_failed', 'Validation failed', 'Entity is required');
    }
    if (
      state.timelineEventLinks.some(
        (link) =>
          link.eventId === event.id &&
          link.entityType === body.entityType &&
          link.entityId === body.entityId,
      )
    ) {
      return problem(409, 'conflict', 'Conflict', 'Link already exists');
    }
    const exists =
      body.entityType === 'character'
        ? state.characters.some(
            (item) => item.id === body.entityId && item.projectId === event.projectId,
          )
        : body.entityType === 'location'
          ? state.locations.some((item) => item.id === body.entityId)
          : body.entityType === 'faction'
            ? state.factions.some((item) => item.id === body.entityId)
            : state.loreEntries.some((item) => item.id === body.entityId);
    if (!exists) {
      return problem(422, 'validation_failed', 'Validation failed', 'Linked entity does not belong to the project');
    }
    const link: TimelineEventLink = {
      id: crypto.randomUUID(),
      eventId: event.id,
      entityType: body.entityType,
      entityId: body.entityId,
      role: body.role ?? '',
    };
    state.timelineEventLinks = [...state.timelineEventLinks, link];
    saveMockState();
    await delay(70);
    return HttpResponse.json(link, { status: 201 });
  }),

  http.delete(`${api}/timeline-events/:eventId/links/:linkId`, ({ params }) => {
    const state = getMockState();
    const link = state.timelineEventLinks.find(
      (item) => item.id === params.linkId && item.eventId === params.eventId,
    );
    if (!link) {
      return problem(404, 'not_found', 'Link not found');
    }
    state.timelineEventLinks = state.timelineEventLinks.filter(
      (item) => item.id !== params.linkId,
    );
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${api}/projects/:projectId/diagrams`, async ({ params, request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('ru');
    const items = getMockState()
      .diagrams.filter((item) => item.projectId === params.projectId)
      .filter((item) =>
        query ? item.title.toLocaleLowerCase('ru').includes(query) : true,
      )
      .map((item) => ({ ...item, canonical: undefined }));
    await delay(70);
    return HttpResponse.json({ items });
  }),

  http.post(`${api}/projects/:projectId/diagrams`, async ({ params, request }) => {
    const state = getMockState();
    const project = state.projects.find((item) => item.id === params.projectId);
    if (!project) {
      return problem(404, 'not_found', 'Project not found');
    }
    const body = (await request.json()) as Partial<Diagram>;
    if (!body.title?.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title is required');
    }
    const timestamp = new Date().toISOString();
    const diagram: Diagram = {
      id: crypto.randomUUID(),
      projectId: project.id,
      title: body.title.trim(),
      type: body.type ?? 'freeform',
      canonical: body.canonical ?? {
        schemaVersion: 1,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      thumbnailUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    state.diagrams = [diagram, ...state.diagrams];
    saveMockState();
    await delay(100);
    return HttpResponse.json(diagram, { status: 201 });
  }),

  http.get(`${api}/diagrams/:diagramId`, async ({ params }) => {
    const diagram = getMockState().diagrams.find(
      (item) => item.id === params.diagramId,
    );
    if (!diagram) {
      return problem(404, 'not_found', 'Diagram not found');
    }
    await delay(60);
    return HttpResponse.json(diagram);
  }),

  http.patch(`${api}/diagrams/:diagramId`, async ({ params, request }) => {
    const state = getMockState();
    const diagram = state.diagrams.find((item) => item.id === params.diagramId);
    if (!diagram) {
      return problem(404, 'not_found', 'Diagram not found');
    }
    const body = (await request.json()) as Partial<Diagram>;
    if (body.version !== undefined && body.version !== diagram.version) {
      return problem(409, 'conflict', 'Conflict', 'Diagram was changed');
    }
    if (body.title !== undefined && !body.title.trim()) {
      return problem(422, 'validation_failed', 'Validation failed', 'Title cannot be empty');
    }
    if (body.canonical) {
      const canonical = body.canonical as {
        nodes?: unknown;
        edges?: unknown;
      };
      if (!Array.isArray(canonical.nodes) || !Array.isArray(canonical.edges)) {
        return problem(422, 'validation_failed', 'Validation failed', 'Invalid React Flow data');
      }
      const ids = new Set(
        canonical.nodes
          .filter((node) => node && typeof node === 'object' && 'id' in node)
          .map((node) => String((node as { id: unknown }).id)),
      );
      const dangling = canonical.edges.some((edge) => {
        if (!edge || typeof edge !== 'object') {
          return true;
        }
        const value = edge as { source?: unknown; target?: unknown };
        return !ids.has(String(value.source)) || !ids.has(String(value.target));
      });
      if (dangling) {
        return problem(422, 'validation_failed', 'Validation failed', 'Edge references an unknown node');
      }
    }
    const updated: Diagram = {
      ...diagram,
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.canonical !== undefined ? { canonical: body.canonical } : {}),
      updatedAt: new Date().toISOString(),
      version: diagram.version + 1,
    };
    state.diagrams = state.diagrams.map((item) =>
      item.id === diagram.id ? updated : item,
    );
    saveMockState();
    await delay(80);
    return HttpResponse.json(updated);
  }),

  http.delete(`${api}/diagrams/:diagramId`, ({ params }) => {
    const state = getMockState();
    if (!state.diagrams.some((item) => item.id === params.diagramId)) {
      return problem(404, 'not_found', 'Diagram not found');
    }
    state.diagrams = state.diagrams.filter(
      (item) => item.id !== params.diagramId,
    );
    saveMockState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${api}/diagrams/:diagramId/collab-token`, async ({ params }) => {
    const diagram = getMockState().diagrams.find(
      (item) => item.id === params.diagramId,
    );
    if (!diagram) {
      return problem(404, 'not_found', 'Diagram not found');
    }
    await delay(50);
    return HttpResponse.json({
      token: `mock.${Date.now()}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      websocketPath: `/collab/${diagram.id}`,
      collabAvailable: true,
      generation: 1,
    });
  }),

  http.post(`${api}/diagrams/:diagramId/thumbnail`, async ({ params, request }) => {
    const state = getMockState();
    const diagram = state.diagrams.find((item) => item.id === params.diagramId);
    if (!diagram) {
      return problem(404, 'not_found', 'Diagram not found');
    }
    const body = (await request.json()) as { assetId?: string };
    if (!body.assetId) {
      return problem(422, 'validation_failed', 'Validation failed', 'assetId is required');
    }
    const asset = state.assets.find((item) => item.id === body.assetId);
    const updated: Diagram = {
      ...diagram,
      thumbnailUrl:
        asset?.thumbUrl ??
        asset?.url ??
        `/api/v1/dev/files/${body.assetId}`,
      updatedAt: new Date().toISOString(),
      version: diagram.version + 1,
    };
    state.diagrams = state.diagrams.map((item) =>
      item.id === diagram.id ? updated : item,
    );
    saveMockState();
    await delay(70);
    return HttpResponse.json(updated);
  }),
];

function proseText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  const node = value as { text?: string; content?: unknown[] };
  return [
    node.text ?? '',
    ...(node.content ?? []).map((child) => proseText(child)),
  ]
    .filter(Boolean)
    .join(' ');
}
