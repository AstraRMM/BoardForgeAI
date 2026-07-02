# BoardForge Custom Outline Generator Plan

The custom outline generator must prefer manufacturable and routable outlines over visually interesting failures.

## Inputs

- board purpose
- approximate size
- connector requirements
- mounting pattern
- keepouts
- desired shape mode
- manufacturing target

## Flow

1. Generate candidate outlines.
2. Validate closed Edge.Cuts.
3. Place mounting holes.
4. Rank connector edge access.
5. Estimate component fit.
6. Score routeability corridors.
7. Reject shapes with likely routing collapse.
8. Build only after board brief approval.
9. Run DRC/ERC and manufacturing gates.

## Future Import

SVG/DXF import should remain future-scaffolded until parser validation can prove:

- closed contours
- units
- scale
- no self intersections
- manufacturable internal cutouts
- connector/mounting alignment
