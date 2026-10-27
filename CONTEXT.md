# Current state

This repository is the Writer Tool frontend. The authoritative project state
lives in the backend repository:

- [`docs/PLAN-STATE.md`](../../GolandProjects/writer-tool-backend/docs/PLAN-STATE.md)
  — roadmap status, resume checklist, verification summary.
- [`docs/STATUS.md`](../../GolandProjects/writer-tool-backend/docs/STATUS.md)
  — implementation details and known gaps.

Current point: **Phases 4 and 5 are complete for the MVP**. Phase 5 (export)
includes FB2/DOCX images, warnings, idempotency, cancellation, retries, quotas,
book covers, XSD validation, the cover upload dialog and S3 storage. The browser
never talks to S3: uploads and downloads are proxied through the API, upload
links use short-lived scoped tokens, and file reads use an HttpOnly cookie with
project access checks. The backend database layer runs on GORM: the
connection, versioned migrations and every store module are converted,
including exports, sharing and search. Remaining backlog: footnote nodes in
the editor (and their export), and PDF/EPUB outside the MVP.

Branches:

- backend: `feat/phase-1-api` @ `3811ce9` (Phase 1–5, S3, proxied file access, GORM migration complete)
- frontend: `feat/real-api-integration` — the current branch tip includes the
  Phase 4 polish, contract sync and the book cover UI

Start the backend on `:8080` and the frontend with `pnpm dev:real` on `:5174`;
demo account: `demo@writer.local` / `password123`.

Phase 4 touchpoints:
- timeline: `src/features/timeline/` (calendar converter, canvas, dialogs,
  `useTimelineLinkOptions.ts` for entity links)
- diagrams: `src/features/diagrams/` (React Flow canvas, Yjs session,
  `thumbnail.ts` for canvas thumbnails, presence cursors in `DiagramCanvas`)

Phase 5 touchpoints:
- book cover: `src/features/structure/BookCoverDialog.tsx` and the «Обложка»
  button/thumbnail in `StructurePage.tsx`
- shared asset upload: `src/shared/api/assets.ts` (used by character
  illustrations and book covers)
- mock handlers: `src/shared/mocks/handlers.ts`, seed data in `data.ts`
- `pnpm contract:sync` copies the backend OpenAPI and calendar test vectors.
