# BoardForge Phase 2B competitive capability matrix

This matrix is an internal product-direction tool. It distinguishes shipped BoardForge behavior from Phase 2B work and avoids claims about competitors that are not verified in this repository.

| Capability | Flux-type target | Quilter-type target | Circuit-Mind-type target | BoardForge baseline | Phase 2B direction |
|---|---|---|---|---|---|
| Browser engineering | Editable schematic, PCB, BOM, project-aware AI | Floorplan and constraint control | Requirements-to-architecture visibility | Custom outline, sourcing, evidence and project pages | Unified board, schematic, BOM, validation, manufacturing and report workspace |
| Native output | Browser-managed design | Autonomous physical design output | Generated architecture/schematic/BOM | KiCad-native projects and local user ownership | KiCad remains the interchange/source boundary; unsupported constructs are preserved |
| Autonomous iteration | Contextual AI edits | Multi-candidate placement/routing | Requirement-change redesign | Variant ranking, repair workflows and blocker reports | Previewed, validated, explainable variants with separate engineering dimensions |
| Physical design | Interactive editing | Placement/routing optimization | Architecture-led layout inputs | FreeRouting integration, routeability and repair evidence | Constraint-driven placement plus multi-seed routing; native routing only after benchmarks |
| Components and sourcing | Integrated library/BOM | Constraints informed by parts | Automated selection and BOM optimization | DigiKey/Mouser, alternatives, no-fake-stock gates | Sourcing becomes a first-class scoring and redesign constraint |
| Manufacturability | Editor feedback | Physics-aware constraints | Validated output | Make Manufacturable, DRC evidence and package validation | Repair proposals with diffs, approval and structural KiCad validation |
| Trust and inspectability | Collaborative project context | Candidate inspection | Requirements traceability | Local-first files, evidence dashboard, blocker reports | Every AI mutation has preview, explanation, validation, approval and undo |
| Collaboration | Browser-native collaboration | Review of generated candidates | Architecture review | Local-first product and approved publishing | Metadata/snapshot/comment sharing without implicit source upload |
| Engine architecture | Web/cloud services | Autonomous optimization stack | Synthesis pipeline | Node local engine and Codex control surface | Strangler migration to Rust core/server/WASM with dual-engine parity gates |

## Differentiated product position

BoardForge should not imitate a single competitor. Its defensible combination is editable browser engineering, a local native engine, KiCad round trips, autonomous iteration, live sourcing, manufacturability repair, evidence-backed truth, and user-owned project files.

## Migration gates

- Browser UI remains Next.js/TypeScript; Rust owns native engineering computation.
- Node routes remain production-authoritative until normalized Rust parity passes.
- No native-router claim is allowed before fixture and benchmark evidence exists.
- No AI edit is final without preview, structural diff, validation, approval and undo.
- Unsupported KiCad constructs are retained as preserved source fragments rather than silently discarded.
