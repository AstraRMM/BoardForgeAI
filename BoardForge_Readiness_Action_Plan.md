# BoardForge Readiness Action Plan

Date: 2026-06-30

## Score Movement

- Previous quick readiness score: 64
- New quick readiness score: 73
- Improvement made this sprint: copy-sandbox import, PoE electrical fixture proof, category-depth evidence, and dashboard honesty badges were added to quick readiness.

## Blockers Fixed

- Quick readiness now counts the generated alpha demo package as golden demo evidence.
- Quick readiness now counts the dense-control physical mutation proof.
- Quick readiness now counts Sensor Hub REV_D as a verified manufacturing candidate.
- Quick readiness now counts BF-ROBOTICS-CONTROLLER-01_REV_A as a clean robotics fixture.
- Quick readiness now counts a safe synthetic existing-project scan.
- Quick readiness now counts PoE as an honest future advanced fixture instead of fake production support.
- Quick readiness now counts a real copy-sandbox importer proof with source hashes before/after.
- Quick readiness now counts BF-POE-SENSOR-01_REV_A as a clean electrical fixture while disclosing PoE compliance, magnetics, isolation, and sourcing as not verified.
- Quick readiness now has bounded category-depth evidence for six product categories.
- Exported manufacturing evidence in quick mode increased from 6 fixture entries to 8.
- ERC/DRC clean evidence in quick mode increased from 6 fixture entries to 8.

## Remaining High-Impact Blockers

1. Full arbitrary-prompt routing coverage is still shallow.
2. PoE/Ethernet is still an electrical workflow fixture, not certified PoE hardware.
3. Category-depth evidence still needs non-template real category schematic models.
4. Existing-project import needs a UI/upload flow around the now-proven sandbox command.

## Next Fixes To Raise Score

1. Promote the copy-sandbox importer into the web/KiCad plugin upload flow.
2. Build a certified-style PoE model with RJ45/MagJack, PD controller, isolation constraints, and exact safety blockers.
3. Replace template-backed category fixtures with real category-specific schematic/layout models.
4. Add another successful arbitrary-prompt board that routes and exports cleanly.
5. Add bounded category-depth trend history to the readiness report.

## Rule

Do not increase readiness by weakening gates. Only count evidence when DRC/ERC/manufacturing proof exists or when a fixture fails honestly with exact blockers.
