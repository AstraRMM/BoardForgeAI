# KiCad round-trip contract

Round-trip correctness is structural, not textual. Preserve mode is expected to be byte-identical for an untouched import. Canonical mode may change whitespace while parse-write-reparse must retain the same normalized AST, unknown nodes, ordering, coordinate atom strings, and UUIDs.

The M3 fixture generator creates project, schematic, and PCB inputs across eight synthetic projects. `scripts/run-phase2b-m3-parity.mjs` compares Node parsing with the Rust normalizer and records Rust/KiCad availability rather than inventing success. Coordinate or UUID drift is a blocking regression. KiCad CLI ERC/DRC evidence is separate from parser parity and is skipped honestly when the CLI is unavailable.

Alpha limitation: the current structural diff reports normalized AST changes and preservation counts, but semantic addition/removal classification is still shallow. Mutation-specific patch tests are required before imported projects can be saved from the browser.
