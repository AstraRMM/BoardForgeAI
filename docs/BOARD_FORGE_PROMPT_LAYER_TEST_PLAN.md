# BoardForge Prompt Layer Test Plan

The prompt layer must prove that BoardForge can understand varied board requests without becoming a long, annoying form.

## Prompt Matrix
- Compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM.
- Tiny 2-layer temperature sensor board.
- PoE environmental sensor.
- Industrial 24V input/output board.
- Wearable circular sensor puck.
- Odd-shaped board with mounting ears.
- Connector-heavy robot board.
- Import and repair an existing KiCad project.
- USB-C STM32 development board.
- CAN sensor node with screw terminal power.

For each prompt, verify:
- correct board type is inferred,
- relevant questions are asked,
- irrelevant questions are skipped,
- assumptions are recorded,
- board brief is generated,
- build is blocked before approval,
- revision creates a new brief version,
- approved-only sync rules are preserved.

Manufacturing completion is not required for every prompt-layer proof. This sprint proves the conversation and approval contract before build.
