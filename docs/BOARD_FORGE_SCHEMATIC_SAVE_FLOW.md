# Browser schematic save flow

The browser builds a versioned transaction from the immutable base document and current editor state. It sends only approved operations to the local v2 candidate route; it does not write `.kicad_sch` directly. The local service checks the base hash, uses the Rust transaction writer, creates an isolated candidate, reparses it, invokes KiCad CLI, and exposes status and reports.

The user may discard a candidate or explicitly promote a validated one into BoardForge local output. Promotion is not an in-place overwrite. Source hash drift, unsupported operations, unpreserved constructs, timeout, load error, or ERC/DRC violations block the flow.

Alpha limitation: browser transaction coverage and error presentation are incomplete. The current synthetic corpus produced no CLI-valid candidate, so this flow is implemented and testable but not release-cleared.
