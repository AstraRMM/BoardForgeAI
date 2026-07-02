# BoardForge Crazy Outline Test Results

The crazy-outline stress suite exercises non-rectangular mechanical shapes before BoardForge moves deeper into generated odd-shape boards.

Shapes in the first stress run:

- rounded board
- mounting ears
- L-shape
- cutout/notch
- drone stack
- octagonal
- tabbed connector
- custom polygon

Each result records:

- Edge.Cuts validity
- self-intersection status
- mounting-hole score
- connector-edge score
- component-fit score
- routing-corridor score
- estimated routeability
- risk
- recommended/not recommended
- manufacturing export if clean enough
- exact blocker if not recommended

Bad shapes are filtered instead of being routed blindly.
