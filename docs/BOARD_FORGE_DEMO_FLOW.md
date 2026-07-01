# BoardForge Demo Flow

1. Import an existing KiCad project into a sandbox.
2. Verify source hash before and after import.
3. Validate the sandbox copy.
4. Run dirty-to-clean repair on the sandbox.
5. Confirm DRC 0, ERC 0, shorts 0, unconnected 0.
6. Export Gerbers, drill, BOM, CPL, and JLCPCB ZIP.
7. Open the web dashboard status.
8. Open KiCad plugin status and confirm repair is sandbox-only.
9. Replay the CLI command from the generated manifest.

This flow is proven by the `BF-IMPORTED-USER-BOARD-REPAIR-*` suite.
