# BoardForge Real Board Proof Lessons

## real_board_embedded_category_schematic_parse_fix_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_category_pcb_evidence_writer_001

- What happened: The USB-C ESP32 proof had a valid outline but no category refs, named nets, routed copper, or via evidence in the PCB.
- Detection: Category proof compares BOM refs against placed non-hole footprints and counts named nets, tracks, and vias.
- Fix strategy: Emit review-required category PCB evidence for the first board family: U1/J1/U2/J2, USB/VBUS/3V3/I2C/UART/GND nets, and routed copper segments, while keeping manufacturing blocked until schematic symbols and verified footprints exist.
- Auto-apply rule: Category proofs may add PCB evidence only with explicit no-manufacturing claims and must continue blocking on missing schematic symbol graph.
- Regression: `npm run test:real-board-proof` verifies the USB-C ESP32 board is no longer outline-only but still honest about missing schematic proof.

## real_board_usb_header_mounting_clearance_fix_001

- What happened: The USB-C ESP32 category proof initially placed the debug/header connector too close to a mounting hole, causing KiCad DRC clearance, courtyard, and solder-mask bridge errors.
- Detection: KiCad DRC is parsed after proof PCB evidence is written, and any connector/header conflict with NPTH mounting-hole keepouts remains a real blocker.
- Fix strategy: Preserve the category refs/nets/tracks, but nudge the header inward before writing the board so the footprint and pads clear the mounting hole.
- Auto-apply rule: Reserve mounting-hole keepout space before committing generated category placement; if a header conflicts, move it inward rather than suppressing DRC.
- Regression: `npm run test:real-board-proof` verifies the USB-C ESP32 board keeps category PCB evidence and has zero DRC errors.

## real_board_can_sensor_node_category_pcb_evidence_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_poe_category_pcb_evidence_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_robotics_category_pcb_evidence_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_wearable_hole_keepout_routing_fix_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_industrial_io_category_pcb_evidence_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_full_category_generation_gap_001

- What happened: BoardForge generated real KiCad outline projects but correctly refused to claim full category schematic/placement/routing completion without evidence.
- Detection: Proof output has valid Edge.Cuts but lacks complete schematic symbol graph, placement, routed nets, and clean export evidence.
- Fix strategy: Keep the honest blocker and drive the next engine upgrade toward category schematic synthesis, footprint binding, placement, and routing.
- Auto-apply rule: Never generate manufacturing-ready status or ZIP from outline-only evidence.
- Regression: `npm run test:real-board-proof`.

## real_board_drone_stack_category_pcb_evidence_001

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: `npm run test:real-board-proof`.

## real_board_drone_stack_single_mounting_pattern_fix_001

- What happened: The drone-stack board originally emitted 20x20, 25.5x25.5, and 30.5x30.5 mounting patterns at the same time, creating overlapping NPTH keepouts and solder-mask bridge DRC errors.
- Detection: Drone-stack proof output must contain exactly one four-hole stack pattern, and the selected pattern must match the prompt or the largest pattern that fits the board.
- Fix strategy: Select one mounting standard per drone board; default to 30.5x30.5 when it fits and fall back only when the mechanical envelope requires it.
- Auto-apply rule: Never emit alternate drone stack standards as additional holes unless the user explicitly asks for multi-pattern adapter hardware and DRC spacing can prove it is valid.
- Regression: `npm run test:real-board-proof` verifies the drone proof uses one four-hole pattern and carries no mixed-pattern DRC errors.

