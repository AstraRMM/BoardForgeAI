# BoardForge KiCad Outline Workflow

Workflow:

1. User creates or selects a shape on the website.
2. Website creates a BoardForge outline seed.
3. Local engine validates geometry.
4. If blocked, BoardForge writes reports and stops before KiCad.
5. If valid, BoardForge writes a real KiCad project with Edge.Cuts and mounting holes.
6. Codex plugin can then continue with schematic, footprint, placement, routing, ERC, DRC, sourcing, and export workflows.

Generated KiCad files:

- `.kicad_pro`
- `.kicad_sch` for outline-only project context
- `.kicad_pcb` with real `Edge.Cuts` `gr_line` segments

The outline project is not considered manufacturing-ready until KiCad DRC/ERC and export validation run.
