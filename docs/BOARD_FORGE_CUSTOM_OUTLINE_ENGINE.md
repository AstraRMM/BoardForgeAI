# BoardForge Custom Outline Engine

The outline engine is the geometry contract shared by the browser editor, Codex plugin, and local KiCad helper. It operates only on board-space coordinates and must not read or mutate viewport zoom, pan, SVG transforms, or screen coordinates.

## Geometry model

Outline vertices and holes use deterministic identities rather than array positions as persistent identity. Edits preserve contour order and winding unless a preview explicitly describes a proposed reorder. The engine supports rectangles, rounded and chamfered outlines, L- and U-shapes, notches, mounting ears, concave polygons, organic/freehand outlines, open paths, multiple gaps, and invalid/self-intersecting input.

Canonical editor helpers convert between screen and board space, apply snap, and convert screen-pixel hit tolerances into the appropriate board-space tolerance. Point insertion targets the exact edge. Draw processing uses minimum sample spacing, duplicate removal, and polygon simplification so one stroke does not create hundreds of vertices.

## Safe operations

Every geometry mutation is evaluated for duplicate vertices, zero-length or short edges, self-intersection, winding, closure, area, neck width, hole containment, hole-edge clearance, connector intent, and Edge.Cuts compatibility.

Fill Whole Board prefers minimal gap closure and shape preservation. It may simplify or use a safe outer hull only as an explicit alternate; a convex hull is not the default because it destroys concavity. Fill Section receives a selected local chain or endpoints and may replace only that region. Both operations return proposals containing added, removed, or reordered edges, resulting metrics, warnings, and blockers.

Auto-Fix follows the same proposal/accept contract. Accepted Fill and Auto-Fix operations are atomic history entries, so undo restores the exact prior geometry and redo restores the accepted result.

## Artifacts and truth boundary

The engine seed and reports preserve exact millimeter coordinates, holes, constraints, metrics, validation state, and version metadata. A valid local run may create a real outline-only `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb`; blocked geometry is limited to seed, preview, and diagnostic reports. The engine does not claim ERC, DRC, routing, Gerber, or manufacturing readiness without the corresponding local KiCad evidence.
