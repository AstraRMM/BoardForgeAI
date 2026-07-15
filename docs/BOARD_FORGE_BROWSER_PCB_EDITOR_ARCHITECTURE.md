# Browser PCB editor architecture

## Alpha slice

`/pcb-workspace` is a real client-side SVG editor, not a rendered preview. It provides pointer-centred wheel zoom, pan, explicit fit, layer visibility, grid, selection and shift multi-selection, drag moves, rotation/property editing, deletion, measurement, issue markers, and geometry-only undo/redo. The SVG keeps millimetres as world units and applies a separate camera transform.

## Intermediate model

`apps/web/src/lib/pcb-editor/model.ts` defines the versioned `boardforge.kicad-intermediate` document. It carries KiCad concepts directly: `Edge.Cuts`, footprints, local-coordinate pads, copper tracks, vias, mechanical holes, nets and layers. `preservedKiCad` is the explicit round-trip escape hatch for syntax the current editor does not understand. This model is an editing and interchange boundary; `.kicad_pcb` remains the durable project source of truth.

Stable IDs are required for every editable object. Transactions replace immutable documents, allowing deterministic history and eventually validated diffs from the assistant or local engine. Camera and layer visibility are UI state and never enter geometry history.

## Next integration boundary

The KiCad adapter should parse supported constructs into this model, retain unsupported S-expressions in `preservedKiCad`, and patch changed constructs during export. Rust/WASM geometry will subsequently own spatial indexing, hit testing, clearance checks and polygon operations behind pure typed functions. The browser remains responsible for interaction, accessibility, rendering and approval of proposed changes.

Before enabling project writes, add fixture-backed import/export structural comparisons, engine validation on every transaction, conflict detection for external KiCad edits, and Playwright pointer/keyboard/accessibility coverage.
