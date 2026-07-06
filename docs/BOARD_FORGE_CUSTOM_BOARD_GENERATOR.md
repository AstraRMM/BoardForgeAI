# BoardForge Custom Board Generator

The custom board generator is a visual outline studio for creating manufacturable PCB shapes before the full Codex plugin workflow places parts and routes copper.

The website handles:

- shape preset selection
- point editing and drawing-mode seed creation
- live dimensions, mounting holes, and connector-edge intent
- routeability and manufacturing-risk preview
- Codex prompt generation with exact outline points
- local-engine calls for validation and KiCad Edge.Cuts generation

The local BoardForge engine handles:

- `POST /outline/seed`
- `POST /outline/validate`
- `POST /outline/generate-kicad`
- `POST /outline/generate-board`
- `GET /outline/presets`
- `GET /outline/:id/status`
- `GET /outline/:id/reports`

Blocked outlines do not produce normal KiCad projects unless a developer override is explicit.
