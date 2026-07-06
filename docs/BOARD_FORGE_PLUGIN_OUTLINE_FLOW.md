# BoardForge Plugin Outline Flow

Codex should call BoardForge tools with structured JSON:

```json
{
  "type": "custom_outline_generate_kicad",
  "preset": "mounting-ears",
  "points": [{ "x": 8, "y": 0 }],
  "holes": [{ "ref": "H1", "x": 6, "y": 6, "diameterMm": 2.4 }]
}
```

Codex should not freestyle edit KiCad files. The local helper writes the project and reports.

Recommended prompt handoff:

```text
Use BoardForge custom_outline_generate_kicad with this exact outline. Preserve every Edge.Cuts point in millimeters, mounting holes, connector-edge intent, keepouts, and mechanical constraints. Validate geometry before writing KiCad files.
```

Plugin-visible status should include outline status, routeability score, manufacturing risk, generated project folder, and report links.
