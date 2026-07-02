# BoardForge KiCad Plugin Demo

## Install Helper

```powershell
.\tools\boardforge-launcher\BoardForge_Install_KiCad_Plugin.ps1
```

Use `--demo` only after the helper detects the intended KiCad plugin folder.

## Demo Flow

1. Open a safe synthetic or sandboxed KiCad project.
2. Run the BoardForge action plugin.
3. Confirm it shows license status, sandbox status, manifest path, latest report path, manufacturing folder, and local CLI commands.
4. Confirm route/repair/cleanup/export are disabled on non-sandbox projects.
5. Confirm approval actions are shown: approve brief, reject brief, request revision.
6. Confirm publish requires explicit confirmation and remains a local artifact-backed action.

The plugin is a control surface. The local BoardForge engine remains the source of truth for routing, repair, DRC/ERC, sourcing, and manufacturing readiness.

The KiCad plugin is an alpha control surface. It calls the local BoardForge CLI/engine and reads local artifacts.

Demo actions:

- import current project into sandbox
- validate sandbox
- run repair on sandbox
- run route on sandbox
- export manufacturing from sandbox
- open latest report
- open manufacturing folder
- show local dashboard/status artifacts

Mutation actions are refused on non-sandbox projects.
