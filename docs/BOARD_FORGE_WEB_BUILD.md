# BoardForge Web Build

BoardForge uses the root `package.json` as the web build entrypoint.

## Package Manager
- npm

## Web App Path
- Product pages live under `apps/web/src/app`.
- Root Next routes in `app/` bridge those pages so `next build` compiles the real dashboard/product routes.

## Commands

```bash
npm install
npm run build:web
npm run dev:web
```

Top-level `npm run build` is also supported and currently maps to the same Next build.

## Notes
- The previous build failure was caused by missing `node_modules`.
- The build now compiles dashboard, projects, upload, downloads, readiness, reports, pricing, docs, settings, billing, and devices routes.
- Product actions are local-engine-backed. The web app does not fake cloud execution.
