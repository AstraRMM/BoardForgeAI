# BoardForge Alpha Readiness

BoardForge is in early alpha. It is no longer just a Codex-controlled script: the local engine, CLI, KiCad plugin scaffold, web dashboard data, fixture runner, manufacturing gate, and solution library are now separate product surfaces.

Current readiness score: **73**.

## Proven

- Synthetic board generation from project briefs.
- Real KiCad schematic and PCB artifacts for clean fixtures.
- Custom outline and outline-aware placement proof paths.
- FreeRouting bulk-route workflow and SES import.
- Strict DRC/ERC/manufacturing gating.
- Dirty dense-control repair from DRC 10 to DRC 0.
- Safe copy-sandbox import proof for existing projects.
- Honest sourcing/PoE limitations rather than fake stock or compliance claims.

## Still Alpha

- Arbitrary real-world dense boards are not guaranteed.
- Supplier API verification requires user keys.
- KiCad plugin UI is a scaffold around the local CLI.
- Web dashboard is manifest-driven but not a hosted cloud product.
- Advanced local shove/rip-up needs broader fixture coverage.

## Next Readiness Push

1. Run the new USB-C MCU, CAN node, tiny 2-layer, and compact 4-layer fixture families.
2. Add live local-engine status to the web dashboard.
3. Expand physical mutation repair proofs beyond dense-control.
4. Wire real supplier providers behind configured keys.
5. Improve KiCad plugin UX around sandbox import, validation, route, repair, and export.
