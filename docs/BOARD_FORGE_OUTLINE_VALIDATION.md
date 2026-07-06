# BoardForge Outline Validation

Allowed statuses:

- `VALID`
- `VALID_WITH_WARNINGS`
- `BLOCKED_SELF_INTERSECTION`
- `BLOCKED_TOO_NARROW`
- `BLOCKED_HOLE_EDGE_CLEARANCE`
- `BLOCKED_CONNECTOR_ACCESS`
- `BLOCKED_COMPONENT_FIT`
- `BLOCKED_KICAD_EDGE_CUTS`
- `BLOCKED_MANUFACTURING_RISK`

Validation checks:

- closed Edge.Cuts loop
- at least three finite points
- no duplicate or zero-length outline edges
- no self-intersections
- minimum width / neck screening
- mounting holes inside the outline
- mounting hole edge clearance
- connector-edge access
- component-region fit
- routeability score
- manufacturing-risk score

Blocked geometry writes reports and preview artifacts only. Valid or warning-valid geometry may write an outline-only KiCad project.
