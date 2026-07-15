# KiCad CLI stall investigation

M3 validation now runs through `scripts/run-phase2b-m3-kicad-cli-validation.mjs`. It detects the executable and version, records exact ERC/DRC syntax, caps output, applies a strict per-file deadline, and kills the entire spawned process tree on timeout. JSON retains command, PID, exit code, signal, duration, stdout, stderr, and cleanup evidence.

KiCad project JSON has no direct ERC/DRC command and is not presented as CLI-validated. Schematics use `kicad-cli sch erc --exit-code-violations --output …`; boards use `kicad-cli pcb drc --exit-code-violations --output …`.

## Root-cause standard

An exceeded deadline proves a bounded CLI stall, not its internal cause. A syntax/load error, ERC/DRC violation, and timeout are separate statuses. On the July 14 KiCad 10.0.3 probe, a deliberately low three-second deadline timed out 16 files, but isolated commands completed normally in roughly five to seven seconds. The final 15-second run validated all 20 files without a timeout; its serial CLI processes took about 135 seconds overall. The apparent stall was therefore process startup/validation latency combined with silent serial execution. An internal KiCad deadlock was not reproduced. The new runner adds progress-safe evidence, deadlines, and descendant cleanup so a future real stall cannot hold the suite indefinitely.

The synthetic fixtures may be structurally useful to BoardForge while still failing real ERC/DRC because they intentionally exercise partial or unknown syntax and are not all electrically/manufacturing complete. Reports must retain those failures honestly.

Run:

```powershell
node scripts/run-phase2b-m3-kicad-cli-validation.mjs
node --test scripts/kicad-cli-validation.test.mjs
```

Set `KICAD_CLI_TIMEOUT_MS` to change the default 15-second deadline or `REQUIRE_KICAD_CLI=1` to make missing CLI, timeout, or validation failure fatal.
