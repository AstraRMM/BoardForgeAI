# BoardForge Product Demo Script

## Setup

Use the safe dev workspace:

```text
C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai
```

Do not open or mutate protected ESC/FC projects during the demo.

## Demo Flow

1. Open BoardForge web dashboard.
2. Start a new robotics/sensor board from a prompt.
3. Show generated architecture and real KiCad schematic status.
4. Generate a custom outline with mounting holes and edge connectors.
5. Run preflight: zero pre-route shorts, valid outline, valid footprints.
6. Export DSN and run FreeRouting.
7. Import SES and show DRC/ERC/connectivity evidence.
8. Show routeability fallback if a prettier outline cannot route cleanly, and call out that fallback boards are separate candidates.
9. Export Gerbers, drill, BOM, CPL, JLCPCB ZIP, and manifest.
10. Open KiCad plugin panel and show the same project manifest.
11. Replay the CLI command from the manifest.
12. Generate dashboard data and show the normalized project cards.

## Commands To Show

```bash
npm run fixtures:run -- --fixture odd-shape-robot
npm run boardforge:dashboard-data -- --manifest ".\apps\web\src\sample-manifests\rev-f.json" --manifest "C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ODD-SHAPE-ROBOT-01_REV_A\boardforge-project-manifest.json" --output ".\apps\web\src\sample-manifests\project-dashboard.json"
npm run report:90:quick -- --fresh
```

## Proof Points

- Real KiCad schematic graph exists.
- Clean golden fixture PCB has zero unconnected items.
- REV_F outline-aware status remains blocked until its own exact finisher clears remaining unconnected/ERC/DRC issues.
- KiCad DRC and ERC are honestly clean.
- Manufacturing ZIP is gated by validation evidence.
- Dashboard status is generated from the same manifest evidence.
- Quick regression is honest when it does not reach 90%.

## Key Message

BoardForge is the AI PCB engineering platform. Codex is one control surface; BoardForge is the product.
