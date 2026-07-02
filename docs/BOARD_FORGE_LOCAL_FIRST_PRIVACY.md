# BoardForge Local-First Privacy

BoardForge runs PCB generation, validation, repair, and manufacturing packaging against local files first.

Default behavior:
- generated projects are `local_draft`,
- failed experiments remain local,
- dashboard publishing requires explicit approval,
- sync does not upload board artifacts without user approval,
- protected user projects are refused unless explicitly approved through the proper guard.

This keeps customer engineering work out of cloud dashboards until the user decides it belongs there.
