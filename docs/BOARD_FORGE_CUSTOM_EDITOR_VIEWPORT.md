# BoardForge Custom Editor Viewport

The editor viewport is independent from board geometry:

```ts
type Viewport = {
  zoom: number
  panX: number
  panY: number
  minZoom: number
  maxZoom: number
}
```

The normal view starts at 100%, with bounded zoom (nominally 25% to 800%). Geometry edits do not recompute an SVG viewBox from point bounds and do not reset the canvas transform.

## Explicit view actions

- **Zoom In / Zoom Out** change zoom and keep the pointer location anchored when possible.
- **Fit Board** computes geometry bounds once, adds padding, and changes only the viewport. It runs only when the user invokes it.
- **Reset View** restores default zoom and pan without altering geometry.
- **Pan** changes `panX` and `panY` through the Pan tool, middle-mouse drag, or Space+left-drag.
- Wheel/trackpad and supported touch gestures zoom or pan the viewport without changing board coordinates.

The zoom percentage and controls remain visible near the canvas. Adding, drawing, dragging, selecting, changing preset, closing, validating, filling, accepting Auto-Fix, undoing, or redoing geometry preserves the current viewport.

## Coordinate contract

Pointer handling uses one pipeline: screen coordinates to canvas coordinates to board coordinates. `screenToBoardPoint()` and `boardToScreenPoint()` account for canvas bounds, responsive scale, device pixel ratio, zoom, pan, and the rendering transform. `applySnap()` runs after conversion to board space. `getScreenSpaceHitTolerance()` keeps hit targets usable at every zoom level rather than relying on a fixed world-space radius.

Point, hole, and edge hit testing therefore remains screen-pixel based, while export and metrics remain millimeter based. A point placed under the cursor should render under that cursor at 25%, 50%, 100%, 200%, and 400% zoom, with nonzero pan, a resized canvas, and high-DPI rendering.

Viewport changes are not stored in geometry undo/redo history. Seed export either omits viewport data or stores it as separate non-manufacturing UI metadata.
