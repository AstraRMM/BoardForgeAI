# BoardForge Alpha Demo Script

## Opening

BoardForge is a local-first AI PCB engineering platform for KiCad. It creates, validates, repairs, reports, and packages PCB projects without modifying protected originals.

## Demo

1. Open the BoardForge web dashboard and show project cards.
2. Open readiness dashboard and show 90+ evidence-backed status.
3. Import a synthetic existing KiCad project into a sandbox.
4. Show source hash before/after is unchanged.
5. Run validation and show DRC/ERC status.
6. Run dirty-to-clean repair and show repair transactions.
7. Export manufacturing ZIP when gates pass.
8. Open KiCad plugin status/report surface.
9. Show CLI replay command for the same run.
10. Run `npm run boardforge:poe-rev-d-sourcing`.
11. Explain that REV_D is `PCB_FAB_READY`, while `ASSEMBLY_READY_VERIFIED` requires supplier/JLCPCB API evidence.

## Close

BoardForge does not claim PoE certification or fake stock. It turns vague blockers into exact next actions.
