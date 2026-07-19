# BoardForge Authenticated Route Audit

Audit date: 2026-07-19
Scope: the authenticated engineering workspace, its local-engine ownership boundary, and route-level product acceptance. Public marketing, documentation, login, signup, and setup are excluded unless they leak into the workspace.

## Current application map

The actual Next entrypoints are in root `app/`; most delegate to `apps/web/src/app/`. `AppShell` is the one authenticated application shell. `proxy.ts` currently protects the routes listed below when production authentication environment variables are configured; it intentionally permits local setup development when they are absent.

| Route | Engineering purpose and principal data source | Current functional state | Product score | Gap / required disposition |
| --- | --- | --- | ---: | --- |
| `/dashboard` | Workspace overview; browser-saved project registry with local-helper health fallback | Browser projects, loading/empty state, and direct workflow links | 72 | Keep as overview only. Pairing checklist confuses configured auth with an actual paired browser session; live jobs/candidate queue are not yet represented. |
| `/projects` | Browser project library with optional paired KiCad context | Browser-saved drafts and truthful empty state | 70 | Keep. Needs search/filter/sort only once project volume warrants it. Persist browser projects to an authenticated backend before multi-device sync is promised. |
| `/projects/[id]` | Project workspace; `GET /project/:id/dashboard` | Real project card, validation/release summary, report labels | 63 | Make this the sole project-detail owner. Add project-scoped Overview, Evidence, Manufacturing, and Controls tabs; present report/download artifacts from their dedicated endpoints rather than only card fields. |
| `/new-board` | Requirements intake, brief approval, local candidate creation; paired local POSTs | Real staged workflow with no sample board fallback | 76 | Keep. After creation, provide a clear handoff to the created project; do not turn it into a generic chat page. |
| `/custom-board-generator` | Exact outline editing, local routeability checks, Edge.Cuts candidate handoff | Real editor wrapped in `AppShell` | 78 | Keep and preserve editor behavior. Candidate/export progress needs a project-bound return path after the engine writes it. |
| `/pcb-workspace` | Browser PCB geometry sandbox | Honest sandbox editor, explicitly not project-bound | 52 | It is not a project workspace. Either retain as a clearly named sandbox/tool route or replace with project-bound PCB editing when such an engine path exists. Do not imply KiCad editing. |
| `/schematic-workspace` | Legacy editor URL | Redirects to `/projects` | 100 (alias) | Retain only as a redirect while external links exist; remove from product map/navigation. |
| `/import` | KiCad sandbox-import entry point | Honest unavailable state; no browser import API exists | 47 | Keep one import route only. Add a real desktop import launch/status contract before presenting workflow completion. |
| `/upload-kicad` | Legacy import URL | Redirects to `/import` | 100 (alias) | Retain one-hop redirect only; no separate UI or links. |
| `/evidence` | Cross-project validation/evidence registry; `GET /projects/dashboard` | Real aggregate project signals and truthful empty state | 60 | Must become an artifact registry, not another project-summary card grid. Link each row to a project Evidence tab and report source/status. |
| `/downloads` (navigation label: Manufacturing) | Cross-project manufacturing release queue | Honest release/blocked summary; browser transfer explicitly unavailable | 56 | Must read per-project downloads manifests. Rename path only through a compatibility plan; keep it as global release queue, not project detail. Remove static readiness glossary from the application surface. |
| `/reports` | Legacy reports URL | Redirects to `/evidence` | 100 (alias) | Keep redirect or remove after external-link migration. Delete unused report-list component; reports belong to Project > Evidence. |
| `/readiness` | Legacy readiness URL | Redirects to `/evidence` | 100 (alias) | Keep redirect only. Do not restore a separate score view without a generated readiness artifact. |
| `/settings` | Workspace configuration hub | AppShell page linking pairing/setup/evidence | 55 | Needs a real settings information architecture. Do not fabricate provider/account configuration state. |
| `/settings/plugin` | Browser-local-engine pairing and diagnostics | Real session pairing UI; pairing token remains session-only | 78 | Keep as sole pairing surface. Correct its account-pairing link so it does not point through the legacy `/plugin/connect` redirect. |
| `/plugin/connect` | Legacy pairing URL | Redirects to `/settings/plugin` | 100 (alias) | Retain one-hop redirect only. |
| `/settings/devices` | Legacy device-settings URL | One-hop redirect to `/settings` | 100 (alias) | Keep only for bookmark compatibility. No device registry screen is exposed because there is no authenticated device API. See `BOARD_FORGE_LICENSE_CAPABILITY_AUDIT.md`. |
| `/settings/billing` | Legacy billing-settings URL | One-hop redirect to `/settings` | 100 (alias) | Keep only for bookmark compatibility. No billing or license-management screen is exposed because there is no account entitlement authority. See `BOARD_FORGE_LICENSE_CAPABILITY_AUDIT.md`. |
| `/demo` | Internal guided workflow/reference project | Static guided content and demo controls; protected | 35 | Not an authenticated application task surface. Move to public/onboarding documentation or an explicit internal reference route. |
| `/alpha-readiness` | Release readiness reference | Static release checklist; protected | 25 | Release documentation, not workspace UI. Move to internal docs/admin, then remove from authenticated route policy. |

## Ownership boundary

```text
Dashboard     → cross-project overview and next task
Projects      → project library
Project       → all project-scoped state and controls
Evidence      → cross-project evidence registry
Manufacturing → cross-project release queue
New board     → requirement intake and candidate handoff
Outlines      → mechanical tool and candidate handoff
Pairing       → browser ↔ desktop-helper session
```

This removes the present overlap where Evidence, Manufacturing, and project detail all restate the same manifest-card fields without exposing their distinct artifacts.

## Confirmed data and action gaps

1. The local service exposes `GET /project/:id/reports` and `GET /project/:id/downloads`, but visible pages never call either. Evidence and Manufacturing currently re-project `GET /projects/dashboard` instead of showing evidence or package-manifest data.
2. Project detail lists `project.reports` labels from the dashboard card, not report contents or metadata; its Manufacturing call-to-action opens the global queue and loses project context.
3. `POST /project/:id/validate`, `route`, `repair`, and `export` only record local-alpha intent and read existing artifacts. They must not be promoted to browser action buttons as if they execute engineering work.
4. `publish`, `archive`, and `keep-local` exist server-side but have no visible, confirm-gated project control surface. Add one only after defining approval, pairing, and refresh behavior; otherwise do not advertise them as browser functionality.
5. `boardforge-project-dashboard-client.ts` is unused and accepts a browser-supplied `projectDir`; the live page uses the safer project-id-only path. Remove the unused alternate access model.
6. `ReportsLocalContent` is unused because `/reports` redirects. Delete it rather than revive a second report page.
7. The dashboard’s pairing checklist currently derives “Account and device pairing configured” from auth environment configuration, not pairing state. It must say “account services configured” or consume the pairing-session status.
8. The local `/evidence` API writes an index on a `GET`. Discovery endpoints must be read-only; index generation belongs to an explicit, paired write action before the route can underpin the Evidence UI.

## Prioritized fix order

1. **Lock ownership:** retain aliases as redirects, remove dead report client/component, and amend all alias links to canonical destinations.
2. **Project workspace:** create tabs/loaders for real per-project dashboard, reports, and downloads data. Keep inactive local-alpha operations unavailable, not button-shaped promises.
3. **Global operations:** remodel Evidence as registry and Manufacturing as package queue using the project-tab destinations. Eliminate static glossary/documentation panels from app routes.
4. **State integrity:** remove the unused `projectDir` dashboard client; fix pairing wording and make engine/pairing state consistently observable in shell and dashboard.
5. **Settings and internal pages:** retain Devices/Billing only as redirect aliases until the contracts in `BOARD_FORGE_LICENSE_CAPABILITY_AUDIT.md` exist; relocate `/demo` and `/alpha-readiness` outside the authenticated workstation.
6. **Acceptance QA:** for every retained non-alias route, verify desktop and mobile shell, keyboard navigation, local-engine offline/loading/empty/error states, and that every visible action resolves to a real endpoint or an explicit unavailable state.

## Acceptance rule

A route is complete only if it has a distinct task in the map above, uses `AppShell`, exposes honest local data or a clear unavailable state, and has no duplicate summary/action owned by another route. Redirect aliases are compatibility routes, not completed product surfaces.
