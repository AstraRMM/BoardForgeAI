# BoardForge Web Build Fix Report

- Package manager: npm
- Web app path: `apps/web/src/app`, bridged through root `app/` routes for Next build coverage
- Build command: `npm run build:web`
- Dev command: `npm run dev:web`
- Dependencies added: no new package names; existing `package.json` dependencies were installed with `npm install`
- Build result: `npm run build:web` passed
- Top-level build result: `npm run build` passed
- Routes built: `/`, `/dashboard`, `/docs`, `/downloads`, `/new-board`, `/pricing`, `/projects`, `/projects/[id]`, `/readiness`, `/reports`, `/settings`, `/settings/billing`, `/settings/devices`, `/upload-kicad`
- Remaining warnings: npm audit reports 2 moderate vulnerabilities; not auto-fixed because `npm audit fix --force` may introduce breaking changes
