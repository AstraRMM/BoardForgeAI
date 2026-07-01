# BoardForge KiCad Plugin Scaffold

This scaffold defines the KiCad-side product surface for BoardForge.

The plugin should:

- open the active KiCad project,
- refuse protected user paths unless explicitly allowed,
- call the local BoardForge CLI/engine,
- show routeability, DRC/ERC, and manufacturing readiness status,
- write reports beside the active project,
- never claim routing or manufacturing success without validation artifacts.

Current behavior:

- refuses protected ESC/FC paths,
- locates the active board's `BoardForge_Project_Manifest.json`,
- prints local CLI commands for sandbox import, validate, route, repair, cleanup, export, report, and replay,
- shows sandbox status and disables mutating actions on non-sandbox projects,
- shows the expected user-facing report and manufacturing folder paths,
- reads status from local BoardForge artifacts rather than pretending to run a cloud job,
- leaves all core engineering work inside the BoardForge local engine.

The plugin is a KiCad control surface, not a second engine. It should never duplicate routing or DRC repair logic inside Python.

## Safety Model

The plugin only allows route, repair, cleanup, and export commands when the active board is inside a BoardForge sandbox or synthetic fixture folder. For ordinary projects it shows the import command first. This keeps uploaded/user boards read-only until BoardForge has copied them into an isolated workspace.

## Dirty Repair Proof Status

The alpha status panel is wired for the dirty-to-clean proof fixture:

- `BF-DIRTY-REPAIR-PROOF-01_REV_A`
- DRC `10 -> 0`
- shorts `1 -> 0`
- unconnected `0 -> 0`
- repair transactions `8 attempted / 8 committed / 0 rolled back`
- manufacturing ZIP exported after validation
