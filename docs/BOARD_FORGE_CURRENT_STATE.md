# BoardForge Current State

BoardForge is an evidence-backed local alpha PCB engineering platform for KiCad.

Current label:

`MVP_READINESS_90_EVIDENCE_BACKED_WITH_EXACT_SOURCING_SECRET_BLOCKER`

## What Works

- Prompt intake with a conditional question engine.
- Board brief generation, revision history, and approval gate.
- Build blocked until the brief is approved.
- Local candidate project state that stays hidden from the main dashboard.
- Explicit publish confirmation before dashboard sync.
- Synthetic board generation, routeability scoring, FreeRouting/SES workflow, DRC/ERC validation, and manufacturing ZIP gating.
- Dirty-to-clean and imported-board repair proofs.
- Web, KiCad plugin, CLI, manifest, dashboard-data, and replay surfaces.
- Local launcher, package, install, environment, and demo scripts.

## Current Alpha Demo

`C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ALPHA-DEMO-ROBOTICS-CONTROLLER-01`

This demo proves prompt intake, CAN/USB-C conditional followups, brief v1, revision to brief v2, approval, local candidate creation, publish blocked without `--confirm`, and publish success on a temp copy with explicit confirmation.

## External Blockers

- Supplier verification needs real supplier API keys.
- PoE compliance and isolation safety need real engineering review.

## Product Blockers

- KiCad plugin UX is still a guarded CLI/status surface.
- Web dashboard uses local artifacts rather than a hosted live engine.
- Hard arbitrary customer boards still need broader repair/routing evidence.

## Next Sequence

1. Finish and keep alpha foundation stable.
2. Build the full prompt/conversation layer on top of the existing question engine and brief approval gate.
3. Stress custom/crazy outline generation after the conversation flow can produce approved board briefs reliably.
