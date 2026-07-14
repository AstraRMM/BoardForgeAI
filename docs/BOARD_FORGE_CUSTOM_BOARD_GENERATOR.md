# BoardForge Custom Board Generator

The Custom Board Generator is a CAD-lite editor for defining a PCB's mechanical boundary and mounting holes before local KiCad generation. Geometry and viewport state are separate: editing, selecting, validating, filling, changing presets, or accepting Auto-Fix must not move or scale the view.

## Editor tools

One explicit primary tool is active at a time: `select`, `add-point`, `draw`, `pan`, or `fill`. Snap is an independent toggle.

- **Select** hit-tests points, holes, edges, and the outline. Blank-canvas click or Escape clears selection; Shift+click changes a multi-selection. Selection never creates geometry.
- **Add Point** inserts a vertex into the clicked edge or appends to an open path. It rejects duplicate points, zero-length edges, and unsafe intersections rather than silently corrupting order.
- **Draw** samples a pointer stroke, removes redundant samples, simplifies it, and presents an accept/cancel preview. Drawing does not also invoke click-to-add behavior.
- **Pan** moves only the viewport. Middle-drag and Space+left-drag are viewport gestures even when another editing tool is selected.
- **Snap** previews and applies the board grid in board coordinates.
- **Fill** offers Fill Whole Board and Fill Section; both require a proposal preview before changing geometry.
- **Auto-Fix Geometry** proposes explained repairs. Accepting the proposal is one undoable geometry transaction; rejecting it changes nothing.

The toolbar also exposes Undo, Redo, Reset Shape, Zoom In, Zoom Out, Fit Board, and Reset View. Reset Shape restores the selected preset or blank geometry after confirmation. Reset View affects only zoom and pan.

## Metrics and readiness

Width, height, point count, and hole count can be reported for incomplete geometry. Area is unavailable until the outline is closed and valid; an open outline reports open-path length instead of a closed perimeter. Routeability, manufacturing risk, minimum neck width, and minimum hole-edge clearance update from board coordinates, never screen coordinates.

Geometry history includes point, hole, edge, preset, fill, Auto-Fix, reset, and property edits. Viewport changes are excluded, so undoing an edit preserves the user's current view where possible.

## Save and handoff

The downloadable seed/package records millimeter units, ordered outline points, holes, constraints, dimensions, validation status, preset metadata, and generation version. Viewport state is excluded or stored separately and is never interpreted as board geometry.

The browser may perform fast geometry checks and package exact intent. The local BoardForge engine remains responsible for authoritative validation and real KiCad output through the outline endpoints, including `POST /outline/validate` and `POST /outline/generate-kicad`. Blocked outlines produce diagnostic artifacts, not normal KiCad projects, unless an explicit advanced/developer override is supported.
