# BoardForge Alpha Demo

BoardForge is a local-first AI PCB engineering platform for KiCad. This demo package is generated from real BoardForge manifests, not hand-written marketing claims.

## Completed Manufacturing Candidates

| Project | Readiness | DRC | ERC | Unconnected | ZIP |
|---|---:|---:|---:|---:|---|
| Dense Control DRC Repair Proof | ready | 0 | 0 | 0 | C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-DENSE-CONTROL-01_REV_A\manufacturing\BF-DENSE-CONTROL-01_REV_A_JLCPCB.zip |
| Odd Shape Robot Fixture | ready | 0 | 0 | 0 | C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ODD-SHAPE-ROBOT-01_REV_A\manufacturing\BF-ODD-SHAPE-ROBOT-01_REV_A_JLCPCB.zip |
| Sensor Hub REV_D Verified Parts Proof | ready | 0 | 0 | 0 | C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-SENSOR-HUB-01_REV_D\manufacturing\BF-SENSOR-HUB-01_REV_D_JLCPCB.zip |

## Blocked Or Learning Fixtures

| Project | Readiness | DRC | ERC | Unconnected | ZIP |
|---|---:|---:|---:|---:|---|
| Sensor Hub REV_F Outline-Aware Proof | blocked | 0 | 182 | 18 | not exported |

## Product Surfaces

- Web dashboard data: `project-dashboard.json`
- Fixture gallery data: `fixture-gallery.json`
- CLI replay commands: `CLI_Replay_Commands.md`
- KiCad plugin action surface: `KiCad_Plugin_Action_Log_Summary.md`
- Demo script: `Product_Demo_Script.md`
- Limitations: `Current_Limitations.md`

## Dense-Control Proof

The dense-control fixture proves BoardForge can repair a dirty synthetic dense board by physically mutating KiCad board geometry and exporting a manufacturing ZIP only after clean validation.

- Starting DRC: 10
- Final DRC: 0
- ERC: 0
- Unconnected: 0
- Forbidden vias: 0
- Repair transactions: 6 attempted, 6 committed, 0 rolled back
