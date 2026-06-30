# BoardForge PoE Fixture Status

Date: 2026-06-30

## Decision

PoE remains a future advanced fixture. BoardForge must not claim production PoE support until it proves:

- RJ45/magnetics model
- isolation/creepage constraints
- transformer/PD controller schematic rules
- ERC/DRC clean routing
- manufacturing package export

## Current Status

Status: `future_advanced_fixture_not_claimed`

## Why

PoE is a specialized power/isolation domain. Counting it as production-ready without magnetics/isolation proof would be fake readiness.

## Next Action

Create a minimal honest PoE fixture later with explicit RJ45, transformer, PD front-end, isolation zone, and exact blocker reporting.
