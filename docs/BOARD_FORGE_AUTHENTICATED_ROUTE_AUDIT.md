# BoardForge Authenticated Application Audit

Audit date: 2026-07-19  
Baseline branch: `boardforge-platform-productization`  
Scope: route purpose, current UI architecture, auth boundary, functional evidence, and V3 migration priority.

## Executive findings

- The application has **one new shell** (`AppShell`) on `/dashboard`; every other authenticated-route candidate uses a legacy page, a raw component surface, or a text-only page.
- `proxy.ts` protects only `/dashboard`, `/projects`, `/reports`, `/downloads`, `/settings`, and `/plugin/connect`. Design/editor, import, evidence, readiness, and generator routes are currently reachable without the authenticated-app boundary. This must be resolved before the V3 shell becomes the source of truth.
- The canonical page source is `apps/web/src/app/*`; root `app/*` mostly re-exports it. The legacy visual systems are split between Tailwind utility markup, `bf-*` global CSS, and editor-specific component styling.
- Several pages have real engineering functionality that must be retained (browser PCB editor, browser schematic editor, outline editor, import sandbox, pairing APIs, evidence panels). The V3 work is a shell-and-experience replacement, **not** a feature rewrite.
- Text-only routes (`/reports`, `/settings`, `/settings/billing`, `/settings/devices`) cannot ship as authenticated application views.

## Route inventory

| Route | Purpose / retained capability | Current state | Legacy or structural issue | Score | V3 destination |
| --- | --- | --- | --- | ---: | --- |
| `/dashboard` | Workspace overview, actions, health | New `AppShell` command-center first pass | Data still mostly local/empty; global command palette and loading model missing | 78 | Keep and polish |
| `/projects` | Project manager using local/published manifest data | Legacy `bf-app-page` cards | No shared shell; no project-manager search/filter/empty-state model | 34 | Rebuild as project index |
| `/projects/[id]` | Project status, actions, engine/jobs/reports | Richest legacy project surface | Dense legacy composition; no workspace tabs or common layout | 48 | Rebuild as Project Workspace |
| `/new-board` | Requirements intake and board-brief approval | Real intake/approval components | Legacy premium page; not a persistent engineering conversation | 51 | AI PCB Chat / project creation |
| `/pcb-workspace` | Browser PCB editor | Real `BrowserPcbEditor` surface | No app shell, project context, or consistent inspector dock | 55 | Preserve editor; wrap V3 workspace chrome |
| `/schematic-workspace` | Browser schematic editor | Real `BrowserSchematicEditor` surface | No app shell, project context, or consistent inspector dock | 55 | Preserve editor; wrap V3 workspace chrome |
| `/custom-board-generator` | Outline editor, preset picker, validation | Real geometry/editor components | Legacy hero/page system; no V3 canvas workspace | 57 | Preserve tools; rebuild canvas shell |
| `/upload-kicad` | Safe local sandbox import proof | Real import safety explanation | Tailwind document layout; no project workflow framing | 43 | Import workflow inside Projects |
| `/import` | Import KiCad wizard | Real `ImportKiCadWizard` | Tailwind document layout; duplicates `/upload-kicad` concept | 42 | Consolidate with import workflow |
| `/downloads` | Manufacturing package readiness | Manifest-backed status information | Legacy page; package actions and empty state not unified | 44 | Manufacturing workspace |
| `/reports` | Validation/report inspection | Raw JSON `<pre>` output | Text-only; no filters, readable report model, or actions | 8 | Rebuild from scratch |
| `/evidence` | Engineering evidence dashboard | Real `EvidenceDashboard` | Legacy `bf-*` shell and presentation | 46 | Evidence / Reports tab |
| `/readiness` | Readiness evidence and local engine state | Manifest-backed status | Public-looking Tailwind page; duplicate health information | 39 | System Health view |
| `/plugin/connect` | Pair local plugin/engine | Auth-gated pairing explanation and APIs | Raw/legacy page; missing status, device list, repair flow UI | 28 | Plugin Pairing workspace |
| `/settings/plugin` | Plugin settings entry point | Legacy one-card redirect page | Redundant with pairing; no unified settings navigation | 18 | Settings > Plugins |
| `/settings` | Settings root | Text-only paragraph | No controls or navigation | 5 | Rebuild from scratch |
| `/settings/billing` | License/billing | Text-only paragraph | No license data, issuance, revocation, history, or device view | 4 | Settings > License Keys |
| `/settings/devices` | Trusted device management | Text-only paragraph | No devices, actions, loading, or error state | 5 | Settings > Devices |
| `/alpha-readiness` | Alpha release readiness | Static category list | Internal/release document, not application task surface | 25 | Move behind Admin / Reports |
| `/demo` | Guided local demo workflow | Real demo gallery/button | Legacy marketing/workflow presentation | 45 | Reference project / onboarding |
| `/docs` | Product documentation | Legacy documentation page | Should remain public documentation, not authenticated app UI | 52 | Keep public, restyle separately |
| `/docs/installer-return-codes` | Installer reference | Static documentation | Correctly documentation, not a dashboard route | 61 | Keep public |
| `/pricing` | Public pricing | Legacy marketing page | Not authenticated application scope | 50 | Keep public |
| `/setup` | Deployment setup diagnostics | Environment setup page | Useful admin diagnostic; not an engineering workspace surface | 43 | Keep restricted admin setup |

## Authentication boundary audit

Current protected prefixes in `proxy.ts`:

`/dashboard`, `/projects`, `/reports`, `/downloads`, `/settings`, `/plugin/connect`

Routes that behave like authenticated workspace routes but are outside that boundary:

- `/new-board`
- `/pcb-workspace`
- `/schematic-workspace`
- `/custom-board-generator`
- `/upload-kicad`
- `/import`
- `/evidence`
- `/readiness`
- `/demo`

V3 decision required before implementation: the V3 shell will protect all engineering-workspace routes and leave only marketing, login/signup, public documentation, and installer references public. This is a route-policy change and will be implemented with an explicit allowlist; it will not alter APIs or local engine access semantics.

## Legacy UI inventory

| Legacy system | Where it appears | V3 action |
| --- | --- | --- |
| Tailwind one-off pages (`min-h-screen`, `bg-slate-*`) | Import, downloads, reports, settings, readiness, plugin pages | Replace page wrappers with V3 application primitives |
| `bf-premium-site`, `bf-app-page`, `bf-*` global CSS | Projects, project detail, board creation, custom generator, evidence, demo | Retain functional child components only; retire page-level legacy wrappers |
| Raw editor components without app chrome | PCB and schematic workspace | Add V3 project/editor shell without rewriting editor engines |
| Static/sample manifest presentation | Projects, downloads, reports, readiness | Keep real local-evidence adapter; use truthful empty/loading states rather than sample production data |

## Functional and UX gaps to close

1. **One shell:** sidebar, topbar, command palette, status strip, keyboard shortcuts, panels, forms, and empty/loading/error states must be provided by a V3 workspace component library.
2. **Projects first:** introduce an actual project manager and an explicit Project Workspace route/tab model; avoid opening a PCB surface as the first project view.
3. **No duplicated import workflow:** `/import` and `/upload-kicad` need consolidation behind one well-defined sandbox-import action.
4. **Editor preservation:** do not replace `BrowserPcbEditor`, `BrowserSchematicEditor`, or outline geometry operations with mock canvases. Adapt their containers, controls, and state presentation.
5. **Reports/settings/licenses:** rebuild rather than restyle; the current pages have no usable application experience.
6. **Data honesty:** local engine/project data must render as loading, disconnected, or empty when unavailable. Sample manifests cannot be presented as a signed-in user's live work.
7. **Route protection:** align protected prefixes with the V3 authenticated workspace before visual QA.

## V3 implementation order

1. Lock V3 route boundary and add a route inventory test.
2. Expand `AppShell` into shared primitives: page header, panel, toolbar, empty state, skeleton, error callout, command palette, and workspace tabs.
3. Rebuild Projects and Project Workspace (Overview, Requirements, Candidates, PCB, Schematic, Manufacturing, Evidence, History, Settings).
4. Wrap the three existing editor engines in V3 workspaces.
5. Replace Manufacturing, Reports, Evidence, Plugin Pairing, Settings, Devices, and License surfaces.
6. Consolidate import/onboarding and relocate release/demo pages to appropriate non-workspace areas.
7. Run protected-route, interaction, responsive, and visual QA across every V3 route before retiring legacy page CSS.

## Audit acceptance criteria

This audit is complete only as a baseline. No route may be marked V3-complete until it:

- uses the shared authenticated `AppShell` and V3 primitives;
- has a defined engineering task and working action path;
- renders truthful loading, empty, error, and disconnected states;
- has keyboard-accessible controls and a responsive layout;
- does not import a legacy page wrapper or raw text-only content; and
- passes visual QA at desktop and mobile breakpoints.
