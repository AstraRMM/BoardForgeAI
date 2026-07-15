# BoardForge PCB Performance Report

Status: **PASS_BOUNDED**

Generated: 2026-07-15T00:00:00.000Z

## Implemented evidence

- Uniform-grid broad-phase indexing avoids a global O(n²) copper scan.
- A deterministic 100,000-segment test is part of the Rust test suite.
- The complete 13-test geometry suite, including the scale gate, measured 1.83 seconds in an unoptimized Windows test build.

## Measured verification

- 13/13 focused geometry tests passed.
- The complete geometry suite measured 1.83 seconds.
- The 100,000-primitive spatial-index gate passed its 10-second bound.
- Strict Rust clippy passed with warnings denied.

## Honest limitations

- The harness asserts only that the 100k validation case completes under 10 seconds.
- The recorded 1.83 seconds is total suite time, not isolated DRC latency.
- No 60 FPS, memory ceiling, mobile-device or WASM-browser performance claim is established.
