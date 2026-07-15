# KiCad source protection report

- Status: `PASSED_WITH_ALPHA_LIMITATIONS`
- Direct imported-source writes: blocked
- Candidate root: `.boardforge/candidates/<id>`
- Promotion root: `.boardforge/local/<id>`
- Guards: canonical paths, sandbox containment, protected aliases, base SHA-256, post-write source check, pre-promotion hash check

Focused source-protection and candidate lifecycle tests exercise allowed candidate paths, direct-source refusal, sandbox escapes, protected aliases, stale hashes, isolated writes, promotion, and discard. This is candidate-service protection, not broad filesystem authorization.
