# BoardForge Fill Tool

Fill repairs incomplete outline intent through a reviewable geometry proposal. Activating Fill does not add points, select unrelated objects, or change the viewport.

## Fill Whole Board

Fill Whole Board inspects open paths, endpoints, gaps, holes, and the likely outer contour. The default **Preserve Shape** strategy connects compatible endpoints with the simplest safe closure while retaining intentional concavity and existing segments. Advanced alternates may include Minimal Gap Closure, Simplify Boundary, and Safe Outer Hull. Convex-hull replacement is a fallback, not the normal result.

The preview distinguishes current geometry from proposed added, removed, or reordered edges and reports resulting dimensions, area, routeability, manufacturing-risk change, and warnings. The user may Accept Fill, Reject, Try Alternate, or adjust sensitivity. Accepting creates one undoable transaction; rejecting leaves geometry untouched.

## Fill Section

Fill Section operates only on selected endpoints, edges, or a connected open chain. It can connect two endpoints, close a local chain, repair a missing corner or notch, or replace a jagged local segment. Connection choices may include Straight, Rounded, Smooth, Minimum-Distance, Preserve Tangency, and Add Intermediate Point.

Unselected geometry must remain byte-for-byte equivalent in board coordinates. If the selection does not identify a local region, the editor reports: “Select two endpoints or a connected open section to fill.”

## Safety gate

Before a fill can be accepted, its proposal is checked for closure, self-intersection, duplicates, zero-length and minimum-length edges, winding, area, minimum neck width, hole containment, hole-edge clearance, connector intent, and KiCad Edge.Cuts compatibility. A blocked proposal names the exact blocker and may offer Auto-Fix Geometry. Normal mode does not apply blocked fill; any override must be explicit advanced/developer behavior.

Fill previews and accepted fills preserve zoom, pan, visible area, and active Fill mode. Metrics are recomputed only from the proposed or accepted board geometry. An incomplete outline continues to show area as unavailable until a valid closure is accepted.
