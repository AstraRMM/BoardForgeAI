# BoardForge Local Shove/Rip-Up Improvement Report

BoardForge now tracks the hardcase proof requirements for local shove/rip-up instead of treating a DRC task as a delete-only cleanup.

## Required Transaction Behaviors

- identify local congestion region
- move via away from hole/edge
- reroute affected segment on alternate layer
- repair crossing without creating new DRC
- repair short by rerouting one net, not deleting connectivity
- rollback if unconnected increases
- commit only if DRC decreases and connectivity is preserved

## Current Proof

The imported-board repair suite and dirty repair proof 02 exercise local reroute and via-movement seeded tasks while preserving shorts = 0 and unconnected = 0 after repair. The next gap is a truly geometry-derived congestion-region executor on arbitrary imported boards.

