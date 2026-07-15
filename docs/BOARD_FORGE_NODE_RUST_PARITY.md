# Node and Rust KiCad parity

M3 uses Node as the comparison implementation while the Rust crate becomes the shared durable model. Parity requires successful reparse and structural equivalence; matching formatting is not required. The parity runner covers 24 generated files: eight each of `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb`.

The runner reports Node reparse, Rust build/reparse, normalized parity, unsupported counts, KiCad CLI availability, and duration per fixture. `REQUIRE_RUST=1` makes missing Rust or a Rust parity failure fatal. Without it, unavailable toolchains are reported as skipped rather than passed.

No runtime route has been migrated merely because the crate exists. A Node route may be replaced only after frozen v1 envelope, security, protected-path, artifact, and fixture behavior remains equivalent.
