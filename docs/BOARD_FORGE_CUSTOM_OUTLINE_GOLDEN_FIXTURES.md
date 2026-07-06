# BoardForge Custom Outline Golden Fixtures

Golden fixture root:

`C:\Users\luifi\Desktop\BoardForge_Custom_Outline_Golden_Fixtures`

Fixtures:

- `BF-OUTLINE-ROUNDED-RECT-01`
- `BF-OUTLINE-MOUNTING-EARS-01`
- `BF-OUTLINE-OCTAGON-01`
- `BF-OUTLINE-L-SHAPE-01`
- `BF-OUTLINE-U-SHAPE-01`
- `BF-OUTLINE-NOTCHED-01`
- `BF-OUTLINE-DRONE-STACK-01`
- `BF-OUTLINE-WEARABLE-PUCK-01`
- `BF-OUTLINE-ROBOTICS-CONTROLLER-01`
- `BF-OUTLINE-CRAZY-POLYGON-VALID-01`
- `BF-OUTLINE-CRAZY-POLYGON-BLOCKED-SELF-INTERSECTION-01`
- `BF-OUTLINE-TOO-NARROW-BLOCKED-01`
- `BF-OUTLINE-HOLE-EDGE-CLEARANCE-BLOCKED-01`

Run:

```powershell
npm run test:custom-outline-golden-fixtures
```

Valid fixtures must generate KiCad Edge.Cuts projects. Blocked fixtures must generate blocker reports without fake KiCad outputs.
