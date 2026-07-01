# BoardForge Readiness Rubric

BoardForge readiness is evidence-backed. Scores must not increase from claims, placeholder files, fake DRC/ERC results, fake sourcing, or fake manufacturing packages.

## Levels

- 50: demo prototype. Basic scripts exist, but end-to-end proof is sparse.
- 60: repeatable synthetic generation. BoardForge can create synthetic projects and reports repeatedly.
- 70: manufacturing-clean synthetic pipeline. Multiple synthetic boards reach DRC 0, ERC 0, unconnected 0, and manufacturing ZIP export.
- 75: early alpha platform. Category coverage, safe import, manufacturing gates, and at least one dirty-to-clean physical repair proof exist.
- 80: product alpha. Dirty repair evidence repeats, local engine status is visible through web/KiCad surfaces, import/upload workflow is sandboxed, and non-template category depth is clear.
- 85: product alpha plus. Multiple sandboxed imported-board repair proofs pass, source hash guards prove originals untouched, web/KiCad/CLI alpha workflow is documented and tested, sourcing gates separate PCB fabrication from assembly verification, and fixture regression remains green.
- 90: credible MVP. Arbitrary prompt breadth, industrial I/O category depth, PoE honesty/isolation depth, harder imported-board sandbox repair, sourcing API key path, local shove/rip-up evidence, production installer/docs, reliable regression fixtures, and strong manufacturing/export validation exist.

## Evidence Categories

- schematic generation
- pin-map verification
- routing rule parity
- FreeRouting/SES pipeline
- post-route cleanup
- dirty-to-clean repair
- category-specific fixtures
- non-template fixture depth
- upload/sandbox importer
- protected path safety
- web dashboard
- KiCad plugin
- CLI replay
- manufacturing ZIP validation
- BOM/CPL validation
- sourcing verification
- solution-library auto-apply
- hard-board repair capability
- multiple sandboxed imported-board proofs
- source untouched hash guard
- web/KiCad/CLI shared manifest workflow
- PCB fabrication readiness vs assembly sourcing readiness
- arbitrary prompt breadth
- industrial I/O fixture evidence
- PoE compliance honesty depth
- harder imported-board repair
- local shove/rip-up hardcase evidence
- approved-only sync architecture
- question engine architecture

## 85 Evidence Gate

Readiness 85 requires:

- at least three imported KiCad project sandbox repair proofs
- source hash before/after unchanged for every imported source
- dirty-to-clean repair on imported sandbox copies
- web upload/import status card
- KiCad plugin sandbox-only mutation gate
- CLI alpha workflow for import, validate, repair, route, export, status, and replay
- manufacturing ZIP evidence for clean repaired sandboxes
- BOM/CPL validator coverage
- sourcing provider env detection with no fake stock
- readiness dashboard and fixture regression passing

## Non-Negotiable Gates

Manufacturing readiness requires DRC 0, ERC errors 0, shorts 0, unconnected 0, forbidden vias 0, valid outline, valid mounting holes, Gerbers, drill, BOM, CPL, and ZIP evidence.

Supplier stock may only be `API_VERIFIED` when a configured provider validates it. Otherwise it must remain `NOT_CHECKED`, `MANUAL_CANDIDATE`, or `PLACEHOLDER`.

## 90 Evidence Gate

Readiness 90 requires real evidence, not docs alone:

- arbitrary prompt breadth suite handles varied prompts and returns exact blockers instead of crashing
- industrial I/O synthetic fixture reaches DRC 0 / ERC 0 / unconnected 0 or produces exact compliance blockers
- PoE fixture carries explicit compliance, magnetics, isolation, creepage, and sourcing honesty badges
- at least one harder imported-board sandbox repair includes local reroute and via-movement capability tasks
- sourcing API key path detects configured/missing keys and never fakes stock
- local shove/rip-up hardcase evidence proves rollback/commit gates
- product docs cover approved-only sync and question-engine intake without claiming full implementation
