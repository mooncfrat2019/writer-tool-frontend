# Current state

This repository is the Writer Tool frontend. The authoritative project state
lives in the backend repository:

- [`docs/PLAN-STATE.md`](../../GolandProjects/writer-tool-backend/docs/PLAN-STATE.md)
  — roadmap status, resume checklist, verification summary.
- [`docs/STATUS.md`](../../GolandProjects/writer-tool-backend/docs/STATUS.md)
  — implementation details and known gaps.

Current point: **Phase 4 is complete, including polish** (calendars and the
shared Go/TS converter, timeline world/narrative modes with drag and filters,
plot threads, links to characters/locations/factions/lore, editable calendars,
React Flow diagrams with live Yjs collaboration, delete/multi-link, thumbnails,
layered auto-layout and presence cursors). The remaining Phase 5 export work is
next.

Branches:

- backend: `feat/phase-1-api` (Phase 4 included; status docs track the polish)
- frontend: `feat/real-api-integration` — the current branch tip includes the
  Phase 4 baseline and its polish.

Start the backend on `:8080` and the frontend with `pnpm dev:real` on `:5174`;
demo account: `demo@writer.local` / `password123`.

Phase 4 touchpoints:
- timeline: `src/features/timeline/` (calendar converter, canvas, dialogs,
  `useTimelineLinkOptions.ts` for entity links)
- diagrams: `src/features/diagrams/` (React Flow canvas, Yjs session,
  `thumbnail.ts` for canvas thumbnails, presence cursors in `DiagramCanvas`)
- mock handlers: `src/shared/mocks/handlers.ts`, seed data in `data.ts`
- `pnpm contract:sync` also copies the shared calendar test vectors into
  `src/features/timeline/fixtures/`.
