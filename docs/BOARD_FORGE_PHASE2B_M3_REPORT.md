# BoardForge Phase 2B M3 report

## Delivered foundation

- New `boardforge-kicad` Rust crate with loss-preserving raw S-expression parsing, project JSON modeling, typed schematic and PCB views, preserve/canonical writers, and structural-diff scaffolding.
- Synthetic eight-project, 24-file fixture generator and Node/Rust parity runner.
- Additive v2 KiCad capability manifest; frozen v1 response envelopes and routes remain unchanged.
- Browser PCB editor architecture exists separately. Browser schematic editing remains architecture-only.

## Verification truth

Module tests exercise parse, type extraction, unknown preservation, byte-exact preserve writes, canonical reparse, coordinate lexemes, UUIDs, and invalid roots. The parity runner is designed to report missing Rust or KiCad CLI as unavailable, not passed. Consult the generated parity report for the current machine’s actual counts; this document does not substitute for a run.

## Alpha exit gaps

Semantic diffs remain coarse, mutation patching is incomplete, nested unsupported inventory is partial, and KiCad ERC/DRC is external. No local-engine route has switched from Node to Rust. Browser schematic editing and safe save approval are not implemented. M3 establishes a non-destructive model and evidence harness; it does not establish full KiCad feature parity.
