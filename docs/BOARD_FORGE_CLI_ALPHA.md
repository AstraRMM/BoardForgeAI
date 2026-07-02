# BoardForge CLI Alpha

BoardForge CLI is the local control surface for the engine. It is intentionally local-first: project files stay on the machine, and mutation is guarded by sandbox/import rules.

## Alpha Flow

```powershell
npm run boardforge:import -- --source "C:\path\to\KiCadProject" --output "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox"
npm run boardforge:validate -- --project "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox"
npm run boardforge:repair -- --project "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox"
npm run boardforge:route -- --project "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox"
npm run boardforge:export -- --project "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox"
npm run boardforge:status -- --project "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox"
npm run boardforge:replay -- --manifest "C:\Users\luifi\Desktop\BoardForge_Sandboxes\Project_import_sandbox\BoardForge_Project_Manifest.json"
```

## Localhost Service Commands

```powershell
npm run boardforge:local-server
npm run boardforge:local-health
npm run boardforge:local-status
npm run boardforge:local-readiness
npm run boardforge:local-fixtures
npm run boardforge:local-sourcing
npm run boardforge:localhost-service-demo
```

These commands exercise the same localhost service used by the web app and KiCad plugin.

## Safety Rules

- Protected ESC/FC/flight project paths are refused.
- Import copies a source project into a sandbox before repair.
- Source hashes must match before and after import/repair.
- Route, repair, cleanup, and export are intended for sandbox paths.

## Status

The alpha CLI supports local artifact status. It does not claim cloud execution. If KiCad CLI or sourcing API keys are missing, BoardForge reports the exact missing capability.
