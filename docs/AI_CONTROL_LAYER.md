# AI Control Layer

The BoardForge AI control layer is the command gate between natural-language intent and local engineering actions.

## Current Contract

- Commands are normalized by `ai-command-schema.mjs`.
- Commands are guarded by `protected-path-guard.mjs`.
- Commands are planned by `ai-command-runner.mjs`.

## Initial Commands

- `create_project`
- `route_project`
- `finish_route`
- `run_drc_erc`
- `export_manufacturing`
- `write_solution_record`

## Required Behavior

The AI layer must reject protected user projects by default, keep deterministic run reports, and write solution-library records for every reusable fix.
