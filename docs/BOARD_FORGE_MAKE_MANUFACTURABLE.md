# BoardForge Make Manufacturable

The Make Manufacturable workflow runs:

1. Validate.
2. Classify blockers.
3. Try safe repair.
4. Re-run DRC/ERC.
5. Generate review, risk, and routeability reports.
6. Export manufacturing if clean.
7. Generate before/after diff.
8. Generate final ready-or-blocked summary.

It only runs on local candidates or sandbox copies. Protected/source projects are never mutated.
