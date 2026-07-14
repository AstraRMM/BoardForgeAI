# BoardForge Outline Validation

Validation distinguishes editable/incomplete geometry, browser screening, and authoritative local KiCad evidence. Running validation never changes the viewport or geometry.

## Checks

- finite, ordered outline points and deterministic identities
- a closed contour with at least three distinct vertices
- no duplicate vertices, zero-length edges, or edges below the configured minimum
- no self-intersections and a consistent winding order
- positive area and acceptable minimum neck width
- mounting holes contained by the outline with sufficient edge clearance
- connector-edge intent and component-region fit where supplied
- routeability and manufacturing-risk screening
- KiCad Edge.Cuts compatibility

Open geometry may report bounds, point count, hole count, and open-path length. It must report `Area unavailable — close or fill the outline` and must not present manufacturing readiness as valid. Self-intersections and other blockers are identified in the proposal or validation display rather than silently repaired.

Representative statuses include `VALID`, `VALID_WITH_WARNINGS`, `BLOCKED_SELF_INTERSECTION`, `BLOCKED_TOO_NARROW`, `BLOCKED_HOLE_EDGE_CLEARANCE`, `BLOCKED_CONNECTOR_ACCESS`, `BLOCKED_COMPONENT_FIT`, `BLOCKED_KICAD_EDGE_CUTS`, and `BLOCKED_MANUFACTURING_RISK`. Incomplete/open geometry is a blocked state even if width and height are available.

Fill and Auto-Fix run these checks against a proposal before acceptance. A blocked proposal states the exact reason, remains rejectable, and can offer another strategy or Auto-Fix. Acceptance is a single undoable geometry transaction and triggers metric recomputation without altering zoom or pan.

Browser checks are guidance for editing and seed handoff. The local engine validates exact millimeter geometry and KiCad compatibility. Blocked geometry may still produce seeds, previews, and diagnostic reports, but it must not be labeled as a successfully generated or manufacturing-ready board.
