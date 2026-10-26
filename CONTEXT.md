# Current state

This repository is the Writer Tool frontend. The authoritative project state
lives in the backend repository:

- [`docs/PLAN-STATE.md`](../../GolandProjects/writer-tool-backend/docs/PLAN-STATE.md)
  — roadmap status, resume checklist, verification summary.
- [`docs/STATUS.md`](../../GolandProjects/writer-tool-backend/docs/STATUS.md)
  — implementation details and known gaps.

Current point: **Phase 4 is implemented as a baseline slice** (calendars and
the shared Go/TS converter, timeline world/narrative modes with drag and
filters, plot threads, event links, React Flow diagrams with live Yjs
collaboration). Phase 4 polish and the remaining Phase 5 export work are next.

Branches:

- backend: `feat/phase-1-api` @ `bf27319` (Phase 4 included)
- frontend: `feat/real-api-integration` @ `834dfa6` (Phase 4 included)

Both branches are pushed and the working trees are clean. Start the backend on
`:8080` and the frontend with `pnpm dev:real` on `:5174`; demo account:
`demo@writer.local` / `password123`.

Phase 4 touchpoints:
- timeline: `src/features/timeline/` (calendar converter, canvas, dialogs)
- diagrams: `src/features/diagrams/` (React Flow canvas, Yjs session)
- mock handlers: `src/shared/mocks/handlers.ts`, seed data in `data.ts`
- `pnpm contract:sync` also copies the shared calendar test vectors into
  `src/features/timeline/fixtures/`.
