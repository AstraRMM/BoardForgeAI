# Schematic editor alpha limitations

There is no release-ready browser schematic editor in M3. Current Rust support parses common symbols, properties, pins, wires, buses, labels, sheets, text, graphics, version, generator, and UUID data while preserving the full raw document.

Not yet proven:

- library and rescue-symbol resolution;
- electrical connectivity, net naming, ERC, and hierarchy semantics;
- mutation-aware loss analysis for all nested constructs;
- browser rendering, hit testing, accessibility, clipboard, and history;
- concurrent external-edit conflict resolution;
- reviewed structural diffs and safe project writes;
- KiCad-version compatibility beyond the synthetic M3 corpus.

Until these gates exist, schematic operations are parse/inspect/normalize capabilities only. BoardForge must not claim that a browser edit is electrically valid or safe to overwrite.
