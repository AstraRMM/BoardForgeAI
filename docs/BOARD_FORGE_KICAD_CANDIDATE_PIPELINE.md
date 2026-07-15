# KiCad candidate pipeline

The additive v2 pipeline is write candidate, validate, inspect reports, explicitly promote locally, or discard. Candidate writes go below `<sandbox>/.boardforge/candidates/<id>` and never target the imported source. Creation checks the caller-supplied SHA-256 and rechecks the source after Rust transaction application.

Validation reparses through the Rust writer and invokes bounded KiCad CLI ERC/DRC. It records hashes, transaction, audit, diff, unsupported inventory, stdout, stderr, status, timeout, and process-cleanup evidence. Promotion rechecks the source hash and copies only into `.boardforge/local`; a timeout, syntax/load error, or ERC/DRC violation blocks promotion.

M3 evidence has zero CLI-valid synthetic candidates: all 20 commands completed, 16 reported ERC/DRC violations, and four failed to load. Therefore the closure gate is blocked even though the lifecycle and isolation tests pass.
