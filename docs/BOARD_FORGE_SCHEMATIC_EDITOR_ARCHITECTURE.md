# Browser schematic editor architecture

## Intended boundary

The schematic workspace will render and edit a browser projection of the shared Rust/WASM KiCad model. The durable source remains `.kicad_sch`; the browser must not invent a second authoritative schema. Stable KiCad UUIDs identify symbols, pins, wires, labels, buses, junctions, sheets, text, and graphics. Camera and selection state remain outside document history.

Each edit becomes an explicit transaction against a parsed revision. Before save, BoardForge reparses the candidate, computes a structural diff, displays semantic changes plus UUID/coordinate drift, and requires approval. Imported documents default to preserve mode. A changed-on-disk hash causes conflict handling rather than overwrite.

## Status

This is architecture, not a shipped editor. The repository currently has an alpha browser PCB workspace and Rust schematic parsing views; shared Rust/WASM schematic mutation, rendering, connectivity, undo/redo, conflict handling, and save approval remain to be implemented.
