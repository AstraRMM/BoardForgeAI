# BoardForge Readiness Scorer Audit

## Current Scoring Inputs

`npm run report:90:quick -- --fresh` uses `plugins/boardforge-plugin/bin/boardforge-regression.mjs`, which calls `scoreMvpReadiness90()` in `plugins/boardforge-plugin/lib/mvp-reporting.mjs`.

The scorer averages category scores. Before this audit, the model counted fixture volume, clean DRC/ERC evidence, manufacturing exports, honest failures, PoE/robotics status, existing-project scan, and report quality.

## Score Caps Found

The previous score stayed at 75 because the rubric had no first-class category for dirty-to-clean physical repair, no category for a local engine status bridge, and no category for web/KiCad product surfaces exposing that status.

Adding the dirty repair fixture increased acceptance counts to:

- fixtures: 18
- exported fixtures: 13
- ERC/DRC clean fixtures: 13
- honest failures: 4
- dirty-to-clean repair proof: 1

But the average stayed flat because the new proof landed inside already-saturated generic DRC/manufacturing categories.

## Ignored Or Underweighted Evidence

- Dirty-to-clean repair was underweighted as generic DRC-clean evidence.
- Live local engine status was not scored.
- Web/KiCad product visibility of engine proof was not scored.
- Non-template category depth was mixed with template-backed fixture count.

## Evidence Required For 80

- Two dirty-to-clean repair proofs or one dirty proof plus live local engine bridge and product-surface status.
- At least 13 clean/exported manufacturing fixtures.
- Existing-project safe copy/import evidence.
- Web/KiCad status surfaces that read local artifacts honestly.

## Evidence Required For 90

- Repeated arbitrary imported-board sandbox repair proofs.
- Real supplier API verification, not placeholder sourcing.
- More category-specific, non-template schematics.
- Stronger local shove/rip-up on harder boards.
- Production installer/docs and reliable KiCad plugin UX.
