# BoardForge Untracked File Audit

Date: 2026-06-30

Protected project files modified: none.

## KEEP_AND_COMMIT

- `apps/web/**` - product dashboard, project pages, downloads, pricing/docs pages.
- `docs/**` - product architecture, CLI, demo, limitations, pricing, sourcing, and readiness docs.
- `kicad-plugin/**` - KiCad action-plugin control surface and install docs.
- `plugins/boardforge-plugin/bin/*.mjs` - local engine/CLI/test/fixture entrypoints.
- `plugins/boardforge-plugin/lib/**` - BoardForge local engine modules.
- `plugins/boardforge-plugin/tests/**` - regression and focused engine tests.
- `plugins/boardforge-plugin/data/solution-library/*.json` - reusable lessons and repair recipes.
- `fixtures/boards/**` - synthetic regression fixture definitions.
- root `README.md`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.js` - product/web workspace metadata.

## KEEP_BUT_IGNORE

- `.next/`
- `dist/`
- `tmp/`
- `plugins/boardforge-plugin/tmp/`
- `*.tsbuildinfo`
- logs and generated cache files.

## GENERATED_OUTPUT

- `C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\**`
- generated Gerbers, drill, KiCad run products, DSN/SES files, and manufacturing ZIPs.

## LOCAL_ONLY

- `.env`, `.env.local`, `.mcp.json`, user-specific plugin config, API keys, and secrets.

## NEEDS_REVIEW

- `.agents/`
- legacy `app/`, `public/`, and `src/` folders if they duplicate `apps/web`.
- old generated demo folder `boardforge-verified-demo-usb-sensor/`.
- existing broad scaffold files not touched in this sprint.

## DELETE_IF_SAFE

No files were deleted in this audit. Deletion should be a separate cleanup pass after confirming which older scaffold paths are still referenced.

## Policy

Do not blindly add all untracked files. Promote files in small product chunks: engine, web, KiCad plugin, docs, fixtures, and solution-library records.
