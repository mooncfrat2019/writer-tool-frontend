# Current state

This repository is the Writer Tool frontend. The authoritative project state
lives in the backend repository:

- [`docs/PLAN-STATE.md`](../../GolandProjects/writer-tool-backend/docs/PLAN-STATE.md)
  — roadmap status, resume checklist, verification summary.
- [`docs/STATUS.md`](../../GolandProjects/writer-tool-backend/docs/STATUS.md)
  — implementation details and known gaps.

Current point: **Phase 3 is complete** (worlds, custom fields, FTS search,
location moves/map, field ordering). The next roadmap stage is **Phase 4 —
timeline and diagrams**.

Branches:

- backend: `feat/phase-1-api` @ `8b06636` plus the state-snapshot docs commit
- frontend: `feat/real-api-integration` @ `b0605c9`

Both branches are pushed and the working trees are clean. Start the backend on
`:8080` and the frontend with `pnpm dev:real` on `:5174`; demo account:
`demo@writer.local` / `password123`.
