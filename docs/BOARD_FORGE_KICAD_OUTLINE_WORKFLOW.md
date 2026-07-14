# BoardForge KiCad Outline Workflow

1. Create or load an outline preset in the Custom Board Generator.
2. Edit in board space with Select, Add Point, Draw, Pan, Snap, Fill, and Auto-Fix. Viewport zoom and pan remain independent.
3. Review Fill or Auto-Fix proposals and accept only the intended geometry. Undo/redo applies to geometry transactions, not view changes.
4. Review dimensions and validation. Open or invalid geometry shows blockers and no exact area/readiness claim.
5. Save or download the seed/package containing units, ordered points, holes, constraints, preset metadata, metrics, validation state, and generation version.
6. Send exact board coordinates—not canvas, screen, zoom, or pan values—to the local outline validator.
7. If local validation is blocked, write diagnostic reports and stop normal generation. Repair with editing, Fill, or Auto-Fix and validate again.
8. If local validation allows generation, create a real outline-only KiCad project and verify its Edge.Cuts representation and dimensions.
9. Continue through schematic, footprint, placement, routing, ERC, DRC, sourcing, and manufacturing-export workflows as separate evidenced stages.

The generated `.kicad_pcb` uses the seed's millimeter coordinates for `Edge.Cuts` segments and preserves mounting holes and mechanical constraints. `.kicad_pro` and outline-context `.kicad_sch` files may accompany it. Viewport state is never converted to KiCad geometry.

Browser validation is not KiCad verification. Likewise, creating an Edge.Cuts project does not establish ERC, DRC, routing completion, Gerber correctness, or manufacturing readiness. Those claims require the relevant local KiCad and export evidence.
