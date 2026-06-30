# CLI Replay Commands

## Dense Control DRC Repair Proof

```powershell
npm run boardforge:dense-control-repair -- --fixture "C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-DENSE-CONTROL-01_REV_A"
```

## Odd Shape Robot Fixture

```powershell
npm run fixtures:run -- --fixture odd-shape-robot
```

## Sensor Hub REV_D Verified Parts Proof

```powershell
npm run boardforge:validate -- --project "C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-SENSOR-HUB-01_REV_D"
```

## Sensor Hub REV_F Outline-Aware Proof

```powershell
npm run boardforge:route-finish -- --fixture BF-SENSOR-HUB-01_REV_F --mode clearance-aware-exact-finish
```
