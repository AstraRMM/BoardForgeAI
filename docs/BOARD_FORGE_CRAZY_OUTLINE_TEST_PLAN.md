# BoardForge Crazy Outline Test Plan

This plan starts after the alpha foundation and prompt/conversation layer are stable.

## Shape Modes

| Shape | Edge.Cuts | Mounting holes | Connector placement | Routeability | Manufacturing |
| --- | --- | --- | --- | --- | --- |
| rounded rectangle | closed contour | corner clearance | USB/CAN/GPS on edges | score before build | export if clean |
| mounting ears | arcs and ears valid | holes centered in ears | connectors away from ears | score before build | export if clean |
| octagonal board | polygon closed | diagonal clearance | edge connectors selected | score before build | export if clean |
| L-shaped board | no self intersections | holes on stable lobes | connectors on outer edges | score before build | export if clean |
| tabbed connector board | tabs valid | holes away from tabs | connector-first placement | score before build | export if clean |
| circular board | circular/poly approximation | radial hole clearance | edge access checked | score before build | export if clean |
| wearable puck | circular compact board | optional NPTH holes | low-profile connectors | score before build | export if clean |
| drone stack pattern | standard stack holes | 30.5/20 mm pattern options | edge connector access | score before build | export if clean |
| notched board | notch clearance valid | holes outside notch | cable notch access | score before build | export if clean |
| internal cutout | separate Edge.Cuts loop valid | keepout around cutout | connectors avoid cutout | score before build | export if clean |
| imported SVG/DXF outline | parser validation required | inferred or user-defined | connector edge matching | score before build | export if clean |
| custom polygon | closed polygon valid | generated holes valid | edge candidates ranked | score before build | export if clean |

## Required Evidence Per Shape

- Edge.Cuts validity
- mounting hole validity
- connector edge placement
- component fit
- routeability score
- DRC/ERC result
- manufacturing export result
- exact failure reason if failed

## Placeholder Fixtures

- `BF-CRAZY-OUTLINE-ROUND-01`
- `BF-CRAZY-OUTLINE-MOUNTING-EARS-01`
- `BF-CRAZY-OUTLINE-L-SHAPE-01`
- `BF-CRAZY-OUTLINE-CUTOUT-01`
- `BF-CRAZY-OUTLINE-DRONE-STACK-01`
