# BoardForge Product Demo Script

## Demo Flow

1. Open BoardForge web dashboard.
2. Start a new robotics/sensor board from a prompt.
3. Show generated architecture and real KiCad schematic status.
4. Generate a custom outline with mounting holes and edge connectors.
5. Run preflight: zero pre-route shorts, valid outline, valid footprints.
6. Export DSN and run FreeRouting.
7. Import SES and show DRC/ERC/connectivity evidence.
8. Show routeability fallback if a prettier outline cannot route cleanly.
9. Export Gerbers, drill, BOM, CPL, JLCPCB ZIP, and manifest.
10. Open KiCad plugin panel and show the same project manifest.
11. Replay the CLI command from the manifest.

## Key Message

BoardForge is the AI PCB engineering platform. Codex is one control surface; BoardForge is the product.
