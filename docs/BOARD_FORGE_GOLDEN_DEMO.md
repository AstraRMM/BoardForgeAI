# BoardForge Golden Demo

## Current Golden Proofs

- REV_D: completed manufacturing candidate.
- REV_E: completed manufacturing candidate with compact shrink-wrap outline.
- REV_F: outline-aware placement proof plus completed manufacturing candidate through verified clean compact-route fallback.

## Demo Story

1. Start from a new robotics/sensor hub prompt.
2. Generate real KiCad project files.
3. Place connectors on intentional product edges.
4. Route and validate.
5. If the attractive outline is not routeable, fall back to the best verified manufacturable topology.
6. Export manufacturing package only when shorts, forbidden vias, unconnected, DRC, and ERC are clean.

## Non-Negotiable Claims

BoardForge may say "manufacturing candidate" only when validation artifacts support it.
