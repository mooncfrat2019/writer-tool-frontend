# Frontend Brief — Phase 1

## 1. Mission

Build the Phase 1 web UI for Writer Tool: a calm, literary workspace where an author can sign in, create a book project, design its structure chapter by chapter, write in a rich-text editor, keep character cards, and export the manuscript to DOCX/FB2.

The backend is being built in parallel by another agent. **Work mock-first.** The API contract is frozen for this phase.

## 2. Current baseline

The repository already contains a working scaffold:

- Vite 8 + React 19 + TypeScript 5.9
- Tailwind CSS 4 + design tokens in `src/styles/globals.css`
- TanStack Router (code-based routes) and TanStack Query
- React Hook Form + Zod
- TipTap 3 editor shell
- MSW 3 browser mocks
- Vitest + Testing Library + Playwright
- Generated API types in `src/shared/api/schema.d.ts`
- Basic pages: login, register, projects, structure, editor, characters, exports
- A passing Playwright smoke test

Baseline commands:

```bash
pnpm install
pnpm dev          # http://localhost:5173, MSW mock mode by default
pnpm build
pnpm test
pnpm lint
pnpm e2e
```

Important baseline facts:

- `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm e2e` currently pass. Keep them passing.
- MSW 3 uses `onUnhandledFrame`, not `onUnhandledRequest`.
- TypeScript is pinned to 5.9 because `openapi-typescript` is not compatible with TS 7 yet.
- The editor currently loads canonical content but does not save it. Implement save via `PUT /documents/{documentId}/content`.
- The API base URL is `/api/v1`. MSW handlers live in `src/shared/mocks/handlers.ts`; mock data in `src/shared/mocks/data.ts`.
- `contracts/openapi.phase1.yaml` is a synced copy of the backend contract. **Do not edit it manually.** The backend agent owns it. If a contract change is required, stop that part and report the needed change.
- `src/shared/api/schema.d.ts` is generated. Do not hand-edit it. Regenerate with `pnpm api:types` only after the main agent confirms a contract update.

## 3. Non-negotiable rules

1. Work only in `C:\Users\zix\PhpstormProjects\writer-tool-frontend`.
2. Do not modify the backend repository or the shared contract.
3. Do not implement Phase 2 features: no Yjs, Hocuspocus, WebSocket collaboration, worlds, timeline, diagrams, or server search.
4. Use the existing stack. Do not add Next.js, Redux, MUI, Ant Design, Chakra, or another router/state library.
5. Use `pnpm` for dependencies. Prefer small, well-maintained libraries. New runtime dependencies are allowed only if they clearly reduce complexity; list them in the report.
6. Use `api` from `src/shared/api/client.ts` and `unwrap` from `src/shared/api/request.ts` for all HTTP calls. Do not call `fetch` directly.
7. Keep TypeScript strict. No `any` unless unavoidable and localized. No `@ts-ignore` without a comment.
8. All user-facing strings are Russian. Code identifiers, comments, and commit messages are English.
9. Keep the existing visual direction: warm paper, ink, muted accent, serif for literary content. Avoid generic dashboard gradients, glassmorphism, and emoji.
10. Accessibility: keyboard navigation, visible focus, labels on inputs, dialogs with focus trap. Target WCAG 2.1 AA basics.
11. Do not push to the remote. Commit locally on your branch. Do not commit to `main`.
12. Do not add telemetry, analytics, or external tracking.

## 4. Phase 1 scope

### 4.1. Authentication and session

- Login and registration screens, validated with RHF + Zod.
- Store access token in memory (`src/shared/api/token.ts`).
- On app start, attempt `POST /auth/refresh`; if successful, restore the session.
- Add an auth gate for `/projects/*` routes: unauthenticated users go to `/login`.
- Logout calls `POST /auth/logout`, clears the token, and navigates to `/login`.
- Handle 401 by clearing the session and redirecting to login.
- Mock mode: persist a session marker in `localStorage` so reloads keep the user signed in. `POST /auth/refresh` in MSW should fail when the marker is absent.
- Do not store access tokens in `localStorage` or `sessionStorage`.

### 4.2. App shell

- Project layout with a persistent sidebar on desktop and a compact top bar on tablet/mobile.
- Sidebar: project title, role badge, navigation (Structure, Characters, Export), link back to projects, user menu with logout.
- Project switcher or breadcrumb to return to the project list.
- Clear loading, error, and empty states.
- A global `<Toaster />` from `sonner`.

### 4.3. Projects

- Project list with cards: title, genre, description, role, member count, book count, word count, updated date.
- Create project dialog: title, genre, description, language. No `window.prompt`.
- After creation, navigate to the new project's structure.
- Project overview is optional; the structure page is the default project landing.
- Empty state with a clear create action.
- Client-side search/filter by title.

### 4.4. Book structure

This is the core Phase 1 screen.

- Fetch books for the project; if there is no book, offer to create one.
- Render a nested tree: part → chapter → scene. A chapter can contain scenes or directly own a document.
- Tree row shows type, title, status, word count, and a link/action to write if a document exists.
- Add actions:
  - Create part, chapter, or scene at the correct parent.
  - Rename inline or in an inspector panel.
  - Edit synopsis, notes, status, target word count, and POV character.
  - Delete with confirmation. Use a safe strategy; do not silently delete children.
  - Duplicate a node (optional but useful).
- Drag & drop reordering with `@dnd-kit` (already installed). Support moving within a parent and between compatible parents. Call `POST /nodes/{nodeId}/move`; optimistic update; rollback on error.
- Show aggregate word count and node count.
- Add a chapter-planning panel: synopsis, POV, status, target word count.
- Keyboard support for tree actions where practical.

### 4.5. Editor

- TipTap 3 with StarterKit.
- Header: back to structure, chapter title, status, word count, save state ("Сохранено", "Сохранение…", "Ошибка").
- Toolbar: bold, italic, heading 1/2, bullet list, ordered list, blockquote, scene break (horizontal rule), undo/redo.
- Autosave: debounce 800–1200 ms, call `PUT /documents/{documentId}/content` with `{ canonical, version }`. Use the document `version` for optimistic concurrency. On `409`, show a clear message and refetch.
- Save the ProseMirror JSON from `editor.getJSON()`.
- Load canonical content from `GET /documents/{documentId}`.
- Word count from editor text; display formatted with `Intl.NumberFormat('ru-RU')`.
- Read-only mode for viewers: no toolbar, no editing, no save. (Role is available on the project.)
- Focus mode: hide side panels; keep it simple.
- Do not implement collaboration, comments, or version history in Phase 1.

### 4.6. Characters

- List of character cards: avatar/initial, name, role, tags, short goal/personality.
- Create character dialog with at least name and role.
- Character detail route: `/projects/$projectId/characters/$characterId`.
- Detail tabs or sections:
  - Profile: name, full name, aliases, role, age, birth date, appearance, personality, motivation, goal, conflict, arc, backstory, voice, secrets, notes, status, tags, color.
  - Relations: list of relations with type, label, strength, notes; create and delete.
  - Illustrations: grid of attachments; upload via the presigned flow (mock), set caption, delete. Show avatar separately.
  - Timeline is a Phase 2 stub; do not implement it.
- Edit with RHF + Zod; PATCH with `version`; handle 409.
- Use the character color for the avatar fallback.
- Add client-side search/filter by name, role, tag.

### 4.7. Export

- Format choice: DOCX / FB2 with a short explanation.
- Create export via `POST /projects/{projectId}/exports`; show queued/running/succeeded/failed states.
- Poll while queued/running; stop when terminal.
- Show progress, timestamps, warnings, and error.
- Download via `downloadUrl` (mock URL is fine).
- Export history list with empty state.
- Options panel: title page, TOC, synopsis, notes, chapter page break, font, size, line spacing. Keep it collapsed by default.

### 4.8. Cross-cutting

- Loading skeletons or clear loading text; no layout jumps.
- Error states with a retry action.
- Empty states with a primary action.
- Toasts for mutations and errors.
- Confirmation dialogs for destructive actions.
- Format dates and numbers with `Intl` in `ru-RU`.
- Responsive layout down to ~768 px; the editor should remain usable on a tablet.
- Code splitting for the editor at minimum if bundle size grows.
- Add a small "mock mode" indicator in development only, with a way to reset mock data.

## 5. API contract and mocks

- Contract: `contracts/openapi.phase1.yaml`.
- Generated types: `src/shared/api/schema.d.ts`.
- Client: `src/shared/api/client.ts` (`openapi-fetch`).
- Error format: RFC 9457 `application/problem+json`; `unwrap` throws `ApiError`.
- Auth: Bearer access token in memory; refresh cookie is handled by the browser.
- Mock handlers must cover every endpoint the UI calls. Extend `src/shared/mocks/handlers.ts` and `data.ts`.
- Persist mock state in `localStorage` with a versioned key (e.g. `writer-tool.mock.v1`) so a page reload keeps projects, chapters, edits, characters, relations, attachments, and exports. Provide a "reset mock data" action in development.
- Mock upload flow: `POST /projects/{projectId}/assets/uploads` returns a fake presigned URL; `POST /assets/{assetId}/complete` returns a ready asset. Do not actually upload to S3.
- Mock export flow: create a job, set it to `running` briefly, then `succeeded` with a fake `downloadUrl`. Or return `succeeded` immediately if simpler; polling UI must still work.
- Do not invent endpoints. If the UI needs a new endpoint, report it to the main agent.

## 6. Design direction

- Literary, quiet, editorial. Think a writer's desk, not a project-management SaaS.
- Palette: paper (#faf9f6 / #f3f0e9), ink (#1f1d1a), muted brown accent (#8a5a2b). Use the existing tokens.
- Typography: serif for the editor, chapter titles, and large headings; sans for UI controls and metadata.
- Borders over shadows; generous whitespace; compact but readable data density.
- Use color sparingly: accent for primary actions, status colors for workflow states.
- Sidebar: calm, no heavy icon-only navigation; labels are visible.
- Editor: centered manuscript column, comfortable line height, minimal chrome.
- Empty states should feel intentional, with a short literary tone, not generic "No data".
- Ensure contrast; do not use low-contrast gray-on-paper for body text.

## 7. Suggested file organization

```text
src/
  app/                 # App, router, providers, auth gate, project layout
  features/
    auth/
    projects/
    structure/
    editor/
    characters/
    exports/
  shared/
    api/               # client, request, token, generated schema
    mocks/             # MSW handlers, data, persistence
    ui/                # design-system primitives
    lib/               # utils, formatting, tree helpers
  routes/              # thin route components
  styles/
  test/
e2e/
```

Move feature-specific components out of `src/routes/` into `src/features/*` as the code grows. Keep route files thin.

Suggested shared UI primitives to add (shadcn-style, using existing Radix dependencies):
`Dialog`, `AlertDialog` (can use Dialog), `Select`, `Tabs`, `Tooltip`, `DropdownMenu`, `Label`, `Textarea`, `Skeleton`, `Separator`, `Progress`.

## 8. Testing requirements

- Unit tests:
  - tree flattening/find/parent validation;
  - word count;
  - Zod schemas for project/character/chapter forms;
  - any non-trivial formatting helper.
- Component tests:
  - at least the structure tree and editor toolbar or save state;
  - character form validation.
- Playwright E2E, running against MSW:
  1. Login and see projects.
  2. Create a project and open its structure.
  3. Create a chapter, open the editor, type text, wait for save, reload, verify the text is still there.
  4. Create a character, edit a field, add a relation, upload a mock illustration.
  5. Create an export and see it reach a terminal state with a download link.
- Keep the existing smoke test working.
- Run before reporting:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm e2e`

If a test is flaky, fix the cause; do not skip it. If Playwright cannot run in the environment, report the exact error and still run unit/component tests.

## 9. Git workflow

- Branch: create `feat/phase-1-shell` from `main`.
- Commit in logical chunks. Conventional commit prefixes: `feat(web):`, `fix(web):`, `test(web):`, `refactor(web):`.
- End every commit message with:

```
Co-Authored-By: Claude Code <noreply@anthropic.com>
```

- Do not push.
- Do not amend or rewrite history.
- Do not commit `dist/`, `node_modules/`, playwright reports, or screenshots unless they are intentional fixtures.
- If you need to change the contract, do not edit it. Report the exact change and continue with the rest of the work.

## 10. Definition of done

- All Phase 1 screens above are implemented and navigable.
- The app runs in mock mode with `pnpm dev` and persists data across reloads.
- `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm e2e` pass.
- No TypeScript errors, no ESLint errors.
- The UI is responsive at 768 px and 1440 px.
- Loading/error/empty states exist for every data screen.
- The editor autosaves and survives reload.
- Character illustrations display through the mock upload flow.
- Export flow shows progress and a download link.
- No Phase 2 features or contract changes are included.

## 11. Reporting format

When finished, report:

1. Summary of what was built.
2. Files/directories added or changed.
3. New dependencies and why.
4. Commands run and their results.
5. Screenshots of key screens (save under `artifacts/` and list paths).
6. Known limitations, flaky tests, or unfinished items.
7. Contract change requests, if any.
8. Recommended next slice.

If blocked by a missing contract endpoint or an unavailable tool, stop that part, finish what is possible, and report the blocker explicitly. Do not invent API behavior.
