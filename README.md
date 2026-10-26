# Writer Tool — Frontend

React + TypeScript SPA for Writer Tool, a book-planning and writing SaaS.

Phase 1 implements authentication, the project library, book structure
(parts / chapters / scenes), the chapter editor, character cards with
relations and illustrations, and the export workflow. Phase 2 adds real-time
collaboration through Yjs/Hocuspocus, presence avatars, local IndexedDB
persistence, server-side canonical projection, project/chapter share links,
and version history with restore. Worlds, timeline and diagrams are later
phases.

The product plan lives in the backend repository at
`writer-tool-backend/docs/PLAN.md`. The frontend-specific specification is in
[`docs/FRONTEND_BRIEF.md`](docs/FRONTEND_BRIEF.md).

## Stack

- React 19, TypeScript, Vite, Tailwind CSS 4
- TanStack Router + TanStack Query
- React Hook Form + Zod
- TipTap 3
- MSW 3 for mock-first development
- Vitest + Testing Library + Playwright

## Run

```bash
pnpm install
pnpm dev            # mock mode, http://localhost:5173
```

Mock mode uses MSW and persists demo state in `localStorage`. Use the
development "Демо-данные" indicator to reset it.

### Against the real Go backend

Start the backend (see the backend README), then:

```bash
pnpm dev:real       # http://localhost:5174
```

`.env.real` enables the Vite proxy from `/api` and `/collab` to
`http://localhost:8080`, and turns on `VITE_COLLAB_ENABLED`. The backend must be
running on `:8080`. Real mode uses port **5174** so it can run alongside the mock
dev server on 5173. Open two browser tabs on the same chapter to see live
collaboration and presence.

Sharing is available in real mode:

- project: Structure → «Поделиться»;
- chapter: select a node → «Поделиться главой» in the inspector.

The recipient opens the link, signs in or registers, accepts, and lands in the
project or the shared chapter editor. The editor header also exposes «История
версий»: snapshots can be created manually and restored; restore disconnects
other peers and reloads clients with a new document generation.

## API contract

`contracts/openapi.phase1.yaml` is a synced copy of the backend contract.
Do not edit it manually. To refresh it from the backend checkout:

```bash
pnpm contract:sync   # copies the spec and regenerates src/shared/api/schema.d.ts
```

Generated types live in `src/shared/api/schema.d.ts` and must not be
hand-edited.

## Tests

```bash
pnpm test           # unit/component tests
pnpm lint
pnpm build
pnpm e2e            # Playwright against MSW
pnpm e2e:real       # Playwright against the real API on :8080
```

`e2e:real` registers a fresh user, restores the session through the refresh
cookie, creates a project/book/chapter, autosaves the editor and creates a
character. It requires the Go backend to be running.

## Layout

```
src/app/             router, app shell, providers
src/features/        auth, projects, structure, editor, characters, exports
src/shared/          API client, mocks, UI primitives, utilities
e2e/                 mocked Playwright suite
e2e-real/            real-API Playwright smoke test
contracts/           synced OpenAPI contract
```
