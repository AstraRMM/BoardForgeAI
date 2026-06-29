# BoardForge Golden Demo

## Current Golden Proofs

- REV_D: completed manufacturing candidate.
- REV_E: completed manufacturing candidate with compact shrink-wrap outline.
- REV_F: outline-aware placement proof; true product-shape board still needs clearance-aware exact finishing. The compact-route fallback remains a separate clean manufacturing candidate and must not be presented as the true outline-aware board.
- BF-ODD-SHAPE-ROBOT-01_REV_A: non-rectangular outline fixture with real schematic graph, routed PCB, DRC 0, ERC 0, unconnected 0, and JLCPCB package exported.

## Primary Demo Fixture

Use:

```text
C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ODD-SHAPE-ROBOT-01_REV_A
```

Evidence files:

```text
boardforge-project-manifest.json
BoardForge_Odd_Shape_Routeability_Report.json
BoardForge_Odd_Shape_Final_Status.md
manufacturing\BF-ODD-SHAPE-ROBOT-01_REV_A_JLCPCB.zip
```

Verified state:

```text
status: routed_fixture_validated
schematic graph: real_symbol_graph_generated
shorts: 0
unconnected: 0
forbidden vias: 0
DRC: 0
ERC: 0
manufacturing ready: true
```

## Demo Story

1. Start from a new robotics/sensor hub prompt.
2. Generate real KiCad project files.
3. Generate a real KiCad schematic graph, not a report shell.
4. Create a non-rectangular product outline with mounting features.
5. Place connectors intentionally on product edges.
6. Run preflight and routeability checks.
7. Route and validate with KiCad evidence.
8. Export manufacturing package only when shorts, forbidden vias, unconnected, DRC, and ERC are clean.
9. Generate dashboard data from the same manifest evidence.

## Replay Commands

Regenerate the odd-shape golden fixture:

```bash
npm run fixtures:run -- --fixture odd-shape-robot
```

Generate dashboard data from validated manifests:

```bash
npm run boardforge:dashboard-data -- --manifest ".\apps\web\src\sample-manifests\rev-f.json" --manifest "C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ODD-SHAPE-ROBOT-01_REV_A\boardforge-project-manifest.json" --output ".\apps\web\src\sample-manifests\project-dashboard.json"
```

The REV_F dashboard card is intentionally blocked until the true outline-aware board reaches zero unconnected and clean DRC/ERC. Use BF-ODD-SHAPE-ROBOT-01_REV_A as the clean odd-shape golden proof.

Run the bounded product health check:

```bash
npm run report:90:quick -- --fresh
```

## Non-Negotiable Claims

BoardForge may say "manufacturing candidate" only when validation artifacts support it.

BoardForge may say "real schematic" only when the KiCad schematic contains symbols, refs, footprint fields, global labels, wires, and schematic-to-PCB consistency evidence.

BoardForge may show "ready" in the dashboard only when the normalized manifest card has no blockers and manufacturing evidence is present.
