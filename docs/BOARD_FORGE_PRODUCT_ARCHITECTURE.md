# BoardForge Product Architecture

BoardForge is a PCB engineering platform, not only a KiCad helper script.

## Core Surfaces

- Web dashboard: project intake, board status, routeability reports, DRC/ERC summaries, manufacturing readiness, and artifact downloads.
- KiCad plugin: local board actions, validation commands, guarded routing/repair runs, and progress reports inside KiCad.
- CLI/local engine: deterministic project generation, routing, validation, manufacturing export, and regression fixture execution.
- AI control layer: constrained command execution with protected-path guards, stateful run logs, and solution-library learning.

## Engine Pipeline

1. Create or import project safely.
2. Generate or validate schematic intent.
3. Assign verified symbols and footprints.
4. Generate board outline, stackup, net classes, and placement constraints.
5. Score placement routeability before routing.
6. Use router ensemble/backends for bulk routing.
7. Import and score routed results.
8. Repair DRC/ERC and finish exact ratsnest items.
9. Fall back to verified routeable topology when a prettier outline/placement is not manufacturable.
10. Export manufacturing package only after honest validation.

## Safety Model

BoardForge refuses protected user projects unless explicitly authorized. It does not fake DRC/ERC, source availability, routing success, or manufacturing readiness.
