# BoardForge Alpha Readiness

BoardForge is an evidence-backed local alpha / early MVP candidate.

Current readiness label:

`MVP_READINESS_90_EVIDENCE_BACKED_WITH_EXACT_SOURCING_SECRET_BLOCKER`

Current proof:

- Prompt-to-KiCad synthetic board generation.
- Real schematic graph and pin-map checks.
- Custom outlines and outline-aware placement.
- FreeRouting/SES assisted routing.
- DRC/ERC validation.
- Manufacturing ZIP gating.
- Dirty-to-clean physical repair proofs.
- Sandboxed imported-board repair proofs with source hash protection.
- Web, KiCad plugin, and CLI alpha surfaces.
- PoE REV_D selected candidate parts and isolation/creepage precheck.
- Premium intake flow: prompt, conditional questions, board brief, revision, approval gate, local candidate, and explicit publish gate.
- Approved-only dashboard sync with local candidates hidden from the main dashboard until publish is confirmed.

Current external blockers:

- Supplier API keys are required for live stock and assembly verification.
- PoE compliance requires engineering safety review.
- BoardForge may mark a board `PCB_FAB_READY` without claiming `ASSEMBLY_READY_VERIFIED`.

Current alpha-only limitations:

- The web dashboard and KiCad plugin are local-engine/artifact backed, not hosted cloud execution.
- The KiCad plugin is a guarded control surface around the CLI/engine, not a polished native CAD assistant yet.
- Real arbitrary dense customer boards still require sandboxing, exact blocker reports, and supervised review.
