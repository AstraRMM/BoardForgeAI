# BoardForge Rust KiCad model

## M3 alpha boundary

`rust/crates/boardforge-kicad` provides a shared Rust model for `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb`. S-expression atoms retain their original strings, so decimal precision and UUID text are not regenerated from floating-point values. The project JSON model types common settings and retains unknown properties through flattened maps.

PCB typed views cover version, generator, layers, nets, footprints, pads, segments, arcs, vias, zones, keepouts, graphics, dimensions, text, Edge.Cuts, 3D models, and groups. Schematic views cover symbols, properties, pins, wires, buses, labels, sheets, text, and graphics. The complete raw tree remains authoritative and ordered.

This is an alpha parser/writer foundation, not full KiCad semantic validation. It does not yet resolve libraries, evaluate connectivity, run ERC/DRC, or provide mutation-safe patching for every typed construct.

## Write modes

- `PRESERVE_MODE` returns an untouched imported source byte-for-byte and is the default policy for imports.
- `CANONICAL_MODE` emits deterministic normalized syntax and is appropriate for BoardForge-generated files.
- A write with an unpreserved `LOSS_RISK` or `BLOCKED` construct must fail.

The additive capability manifest is `contracts/local-engine/v2/kicad-capabilities.json`. Frozen local-engine v1 routes and envelopes are unchanged.
