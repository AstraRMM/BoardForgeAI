# BoardForge Question Engine Architecture

BoardForge should ask only the questions needed to turn a prompt into an engineering brief, then stop asking and build.

## Flow

1. Classify board type.
2. Apply smart defaults.
3. Ask only missing critical questions.
4. Use conditional follow-ups.
5. Generate a board brief.
6. Request approval before build.
7. Execute locally and report exact assumptions.

## Examples

- Robotics controller: ask power input, motor/servo count, CAN/UART/I2C needs, approximate size.
- CAN selected: ask connector style, termination, isolation requirement.
- USB-C selected: ask power-only vs USB data.
- Custom shape selected: ask approximate size, mounting holes, connector edges.
- PoE selected: ask whether this is an electrical fixture or compliance-targeted design.

The question engine should avoid babysitting. Once essential unknowns are resolved, BoardForge proceeds with explicit assumptions.

