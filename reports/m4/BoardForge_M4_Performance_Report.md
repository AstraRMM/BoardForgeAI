# BoardForge M4 Performance Report

- Benchmark: headless Chromium synthetic SVG primitive benchmark
- 60 FPS claimed: no

- 1,000 primitives: INTERACTIVE_TARGET_MET; load 4.7 ms; mean transform frame 16.1 ms; selection 0.400 ms; hit test 0.800 ms
- 10,000 primitives: INTERACTIVE_TARGET_MET; load 37.5 ms; mean transform frame 17.5 ms; selection 0.100 ms; hit test 1.500 ms
- 50,000 primitives: PERFORMANCE_DEGRADED; load 174.2 ms; mean transform frame 52.6 ms; selection 1.300 ms; hit test 11.100 ms
- 100,000 primitives: PERFORMANCE_DEGRADED; load 443.6 ms; mean transform frame 101.9 ms; selection 6.900 ms; hit test 48.400 ms

Not yet measured in-browser: live Rust DRC recalculation, transaction application, Rust serialization.
