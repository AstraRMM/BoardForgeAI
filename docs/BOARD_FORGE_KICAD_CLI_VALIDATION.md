# KiCad CLI validation

BoardForge detects the installed CLI and version, then uses `kicad-cli sch erc --exit-code-violations --output …` or `kicad-cli pcb drc --exit-code-violations --output …`. Each process has a bounded deadline, capped output, explicit command evidence, and descendant-tree cleanup (`taskkill /t /f` on Windows) on timeout.

KiCad 10.0.3 completed all 20 synthetic M3 schematic/PCB commands at the 15-second deadline. Sixteen completed with rule violations and four with syntax/load errors; none was CLI-valid. Total serial CLI duration was 134,662.67 ms and the slowest command took 14,167.455 ms. A three-second diagnostic deadline produced false-positive timeouts because normal isolated commands took roughly five to seven seconds. No internal KiCad deadlock was reproduced.

Project JSON is not presented as ERC/DRC validated. Rust reparse, CLI execution, and clean ERC/DRC status are separate gates.
