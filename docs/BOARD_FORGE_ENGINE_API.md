# BoardForge Engine API

BoardForge engine APIs are stable internal boundaries. AI assistants, web UI, CLI commands, and the KiCad plugin should call these workflows instead of duplicating logic.

## Core Workflow Functions

```js
createProjectFromPrompt(input, options)
generateSchematic(project, options)
assignSymbolsAndFootprints(project, options)
generateBoardOutline(project, options)
placeComponents(project, options)
generateRoutingRules(project, options)
runPreflight(project, options)
exportDsn(project, options)
runFreeRouting(project, options)
importSes(project, options)
runDrc(project, options)
runErc(project, options)
repairPostRoute(project, options)
generateManufacturingPackage(project, options)
writeProjectManifest(project, options)
writeDashboardData(project, options)
writeReports(project, options)
saveLessons(project, options)
```

## Required Gates

- Pre-route board must have zero shorts before DSN export.
- Router results are promoted by routeability/manufacturing score, not visual appeal alone.
- Manufacturing export requires zero shorts, zero forbidden vias, zero unconnected, DRC 0, ERC 0, valid outline, valid holes, BOM, and CPL.
- Protected ESC/FC/user projects are refused by default.

## Control Surfaces

- Web dashboard reads project manifests and requests engine actions.
- KiCad plugin calls the engine/CLI and displays reports.
- CLI executes deterministic local workflows.
- AI adapters call the same command schema and cannot bypass guards.
