# Browser Schematic Workspace: Current Delivery Gap

## Decision

`/schematic-workspace` remains a compatibility redirect to `/projects`. It must not be presented as a browser schematic editor yet.

## Evidence inspected on 2026-07-19

- `apps/web/src/app/schematic-workspace/page.tsx` deliberately redirects because no project-bound browser editor is available.
- `apps/web/src/lib/schematic-editor/model.ts` is an isolated intermediate fixture model. Its only document is `sampleSchematic`; it is not populated from a saved project.
- `apps/web/src/lib/schematic-editor/save-client.ts` can construct a reviewed **candidate transaction**, but requires `sourcePath`, `sandboxPath`, and a source hash supplied by its caller.
- The local helper's public dashboard response deliberately redacts `boardPath` and `schematicPath` in `plugins/boardforge-plugin/lib/platform/local-server/routes.mjs` (`publicProjectDashboard`). This is the correct project-path protection boundary.
- The local helper exposes candidate write/validate/promote routes, but does not expose a project-scoped schematic parse/projection route. The only current project read APIs expose status, reports, downloads, manifest, and dashboard data.
- `docs/BOARD_FORGE_SCHEMATIC_EDITOR_LIMITATIONS.md` and `docs/BOARD_FORGE_SCHEMATIC_EDITOR_ARCHITECTURE.md` record that connectivity, rendering, history, structural diffs, conflict handling, and safe project writes are not release-cleared.

## Why the former editor cannot be restored safely

The removed UI would have rendered a sample document and sent transactions using file locations the browser cannot legitimately obtain. That would either be a fixture masquerading as an active project or would weaken protected local-path handling. Neither meets the product's browser-first, project-safe workflow standard.

## Minimum implementation needed before an active workspace can ship

1. A paired-helper `GET /project/:id/schematic-projection` endpoint that resolves a validated project ID server-side, reads the local `.kicad_sch`, and returns only a safe Rust/WASM-derived projection plus revision hash—never a filesystem path.
2. A shared projection contract that retains stable KiCad UUIDs and reports unsupported constructs without dropping them.
3. A project-ID-only candidate creation route. It must derive the source/sandbox paths server-side, reject source-hash drift, and create an isolated candidate.
4. Candidate parse, KiCad CLI validation, structural diff, review, discard, and explicit promotion states surfaced in the project workspace.
5. Browser rendering, hit testing, keyboard access, undo/redo, and conflict treatment verified against real KiCad projects rather than the synthetic fixture.

Until those five pieces exist and are verified, the correct workflow is project evidence and desktop KiCad—not a fake browser schematic canvas.
