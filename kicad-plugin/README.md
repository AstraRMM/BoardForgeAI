# BoardForge KiCad Plugin Scaffold

This scaffold defines the KiCad-side product surface for BoardForge.

The plugin should:

- open the active KiCad project,
- refuse protected user paths unless explicitly allowed,
- call the local BoardForge CLI/engine,
- show routeability, DRC/ERC, and manufacturing readiness status,
- write reports beside the active project,
- never claim routing or manufacturing success without validation artifacts.

The current implementation is intentionally a safe action-plugin stub. It records the expected command handoff but does not mutate boards by itself.
