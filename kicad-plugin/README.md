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
- prints local CLI commands for validate, route, cleanup, export, report, and replay,
- leaves all core engineering work inside the BoardForge local engine.

The plugin is a KiCad control surface, not a second engine. It should never duplicate routing or DRC repair logic inside Python.
