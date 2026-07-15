# KiCad CLI stall investigation

- KiCad: 10.0.3
- Commands completed at 15 seconds: 20/20
- Timeouts: 0
- ERC/DRC violation exits: 16
- Syntax/load errors: 4
- CLI-valid candidates: 0
- Serial duration: 134,662.67 ms
- Slowest command: 14,167.455 ms

A three-second diagnostic deadline timed out and cleaned 16 process trees, but isolated commands completed normally in roughly five to seven seconds. The low deadline produced false positives. The apparent suite stall was silent serial startup/validation latency; no internal KiCad deadlock was reproduced. The bounded runner now prints progress and kills descendants on a real timeout.
