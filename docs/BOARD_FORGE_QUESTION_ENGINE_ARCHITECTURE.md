# BoardForge Question Engine Architecture

The question engine is the premium intake layer. It asks only questions that change the design, applies safe defaults, and generates a board brief for approval before KiCad files are created. Its product goal is to avoid babysitting while still collecting the decisions that actually affect electrical, mechanical, sourcing, or manufacturing outcomes.

## Flow
1. User gives a board prompt.
2. BoardForge infers a board type.
3. Required questions are selected.
4. Conditional follow-ups are added only when answers trigger them.
5. Safe defaults and assumptions are recorded.
6. BoardForge generates `BoardForge_Board_Brief.md` and `.json`.
7. Build is blocked until the brief is approved or an explicit dev/test bypass is used.

## Supported Board Types
- `robotics_controller`
- `usb_c_mcu_board`
- `can_sensor_node`
- `poe_environment_sensor`
- `industrial_io_board`
- `custom_outline_board`
- `tiny_2layer_sensor`
- `wearable_sensor_puck`
- `connector_heavy_robot_board`

## Example
Prompt: “Make me a compact robotics controller.”

BoardForge asks:
- controller preference
- power input
- interfaces
- board shape
- manufacturing target

If CAN is selected, CAN questions appear. If CAN is not selected, they do not. If custom outline is selected, mechanical follow-ups appear.

## Implementation
- `lib/intake/question-engine.mjs`
- `lib/intake/board-type-question-trees.mjs`
- `lib/intake/conditional-followups.mjs`
- `lib/intake/default-assumption-engine.mjs`
- `lib/intake/board-brief-generator.mjs`
- `lib/intake/board-brief-approval-gate.mjs`
