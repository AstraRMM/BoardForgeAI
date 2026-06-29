# AI Control Layer

The BoardForge AI control layer is the command gate between natural-language intent and local engineering actions.

## Current Contract

- Commands are normalized by `ai-command-schema.mjs`.
- Commands are guarded by `protected-path-guard.mjs`.
- Commands are planned by `ai-command-runner.mjs`.
- Commands map to canonical `boardforge:*` CLI verbs so Codex, web agents, KiCad plugin actions, and future assistants call the same local engine path.

## Canonical Commands

- `create_project`
- `validate_project`
- `generate_outline`
- `run_routing`
- `repair_drc`
- `export_manufacturing`
- `summarize_status`
- `continue_from_checkpoint`
- `write_solution_record`

Compatibility aliases are accepted for older adapters:

```text
route_project -> run_routing
finish_route -> run_routing
run_drc_erc -> validate_project
repair_postroute -> repair_drc
report_status -> summarize_status
resume -> continue_from_checkpoint
```

## CLI Mapping

```text
create_project -> boardforge:create
validate_project -> boardforge:validate
generate_outline -> boardforge:create
run_routing -> boardforge:route
repair_drc -> boardforge:cleanup
export_manufacturing -> boardforge:export
summarize_status -> boardforge:report
continue_from_checkpoint -> boardforge:replay
```

## Required Behavior

The AI layer must reject protected user projects by default, keep deterministic run reports, and write solution-library records for every reusable fix.

The AI layer should default to dry-run planning unless an adapter explicitly asks for execution. Planned output must include the normalized command, CLI command line, and engine job preview.
