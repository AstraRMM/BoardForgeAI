# BoardForge Custom Outline Engine

The outline engine is the shared geometry layer for the website, Codex plugin, and local KiCad helper.

Supported shape families:

- rounded rectangle
- mounting ears
- octagonal / chamfered
- L-shape
- U-shape
- notched board
- drone stack
- wearable puck
- robotics controller
- crazy polygon / custom sketch
- decorative manufacturable shield

The engine writes:

- `BoardForge_Custom_Outline_Project_Seed.json`
- `BoardForge_Mechanical_Constraints.json`
- `BoardForge_Outline_Validation_Report.md/json`
- `BoardForge_Routeability_Explanation.md/json`
- `BoardForge_Manufacturing_Risk_Report.md/json`
- `BoardForge_Board_Preview.svg/json`
- `BoardForge_Project_Manifest.json`
- `BoardForge_User_Facing_Report.md`
- `BoardForge_CLI_Replay_Command.txt`
- real `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb` files when validation allows it

It does not claim ERC, DRC, routing, Gerbers, or manufacturing readiness without the local KiCad workflow proving those states.
