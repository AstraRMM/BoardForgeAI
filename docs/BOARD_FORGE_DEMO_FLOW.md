# BoardForge Demo Flow

1. Open the BoardForge dashboard and show manufacturing-ready proof boards.
2. Start a new synthetic board from a prompt.
3. Show generated schematic, PCB, outline, and placement reports.
4. Run routeability scoring before routing.
5. Run FreeRouting bulk route and SES import.
6. Run DRC/ERC validation.
7. Demonstrate dense-control physical repair reducing DRC 10 to 0.
8. Open downloads and show manufacturing ZIP gating.
9. Use the KiCad plugin scaffold to show local CLI-backed actions.
10. Replay a completed fixture from the CLI.

BoardForge should never claim manufacturing readiness unless shorts, unconnected, forbidden vias, DRC, and ERC are all zero and the required manufacturing files exist.
