# BoardForge Alpha Readiness

BoardForge is an evidence-backed alpha / early MVP candidate.

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

Current external blockers:

- Supplier API keys are required for live stock and assembly verification.
- PoE compliance requires engineering safety review.
- BoardForge may mark a board `PCB_FAB_READY` without claiming `ASSEMBLY_READY_VERIFIED`.

