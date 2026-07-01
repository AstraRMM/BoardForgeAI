# BoardForge Readiness Rubric

BoardForge readiness is evidence-backed. Scores must not increase from claims, placeholder files, fake DRC/ERC results, fake sourcing, or fake manufacturing packages.

## Levels

- 50: demo prototype. Basic scripts exist, but end-to-end proof is sparse.
- 60: repeatable synthetic generation. BoardForge can create synthetic projects and reports repeatedly.
- 70: manufacturing-clean synthetic pipeline. Multiple synthetic boards reach DRC 0, ERC 0, unconnected 0, and manufacturing ZIP export.
- 75: early alpha platform. Category coverage, safe import, manufacturing gates, and at least one dirty-to-clean physical repair proof exist.
- 80: product alpha. Dirty repair evidence repeats, local engine status is visible through web/KiCad surfaces, import/upload workflow is sandboxed, and non-template category depth is clear.
- 85: product alpha plus. Multiple sandboxed imported-board repair proofs pass, source hash guards prove originals untouched, web/KiCad/CLI alpha workflow is documented and tested, sourcing gates separate PCB fabrication from assembly verification, and fixture regression remains green.
- 90: credible MVP. Repeated arbitrary-board sandbox proofs, production installer/docs, reliable regression fixtures, and strong manufacturing/export validation exist.

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
