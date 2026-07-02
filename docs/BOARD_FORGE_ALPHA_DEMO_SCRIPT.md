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
## Premium Intake Proof

Use the persistent proof folder:

`C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ALPHA-DEMO-ROBOTICS-CONTROLLER-01`

1. Run `npm run boardforge:brief -- --prompt "Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM." --output "<demo-folder>"`.
2. Confirm BoardForge writes `BoardForge_Board_Brief.md/json`, `BoardForge_Board_Brief_v1.md`, and blocks generation until approval.
3. Run `npm run boardforge:request-revision -- --project "<demo-folder>" --note "Add PWM/servo current assumption and edge connector labeling before build."`.
4. Confirm `BoardForge_Board_Brief_v2.md` and `BoardForge_Brief_Revision_History.json` exist.
5. Run `npm run boardforge:approve-brief -- --project "<demo-folder>"`.
6. Run `npm run boardforge:create -- --prompt "Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM." --output "<demo-folder>" --approve-brief --dev`.
7. Confirm the project is `local_candidate`, `dashboardVisible = false`, and manufacturing is blocked until validation runs.
8. Run `npm run boardforge:publish -- --project "<demo-folder>" --manifest "<demo-folder>\BoardForge_Project_Manifest.json"` with `BOARDFORGE_DEV_LICENSE=true`.
9. Confirm publish is blocked without `--confirm`.
10. Run the same publish command with `--confirm` on a temp copy to prove explicit publish works without cluttering the real local candidate.

This proves Codex/AI can drive intake, but BoardForge owns the question tree, brief approval gate, project state, and publish gate.

## Live Conversation and Odd-Shape Follow-On

1. Run `npm run boardforge:intake -- --prompt "Make a compact robotics controller with CAN and USB-C" --output "<demo-folder>"`.
2. Confirm `BoardForge_Conversation_Session.json` exists.
3. Run `npm run boardforge:answer -- --session "<demo-folder>\BoardForge_Conversation_Session.json" --answers "{\"interfaces_needed\":\"CAN USB PWM\"}"`.
4. Confirm conditional follow-ups update and the brief regenerates.
5. Run `npm run boardforge:approved-sync-validation -- --output "<demo-folder>"`.
6. Confirm drafts/candidates stay hidden and publish requires confirmation.
7. Run `npm run boardforge:crazy-outline-stress`.
8. Confirm weak shapes are blocked by routeability score instead of being routed blindly.
