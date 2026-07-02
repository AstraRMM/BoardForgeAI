# BoardForge Custom Outline To KiCad Flow

Custom outlines produce concrete local-engine seed artifacts:

- `BoardForge_Custom_Outline_Project_Seed.json`
- `BoardForge_Mechanical_Constraints.json`
- `BoardForge_Outline_Validation_Report.md`
- `outline_seed.kicad_pcb`

The seed is then used to create a KiCad project with Edge.Cuts, placement intent, preview artifacts, validation data, and manufacturing/download outputs when the board is clean.
