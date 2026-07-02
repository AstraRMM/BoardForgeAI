# BoardForge Premium Intake Flow

BoardForge should feel like a senior PCB engineer taking a compact design brief, not a form that babysits the user.

The intake engine:
- infers board type from prompt,
- asks only essential questions,
- applies explicit assumptions,
- records skipped questions,
- identifies routing, sourcing, compliance, and manufacturing risks,
- produces a board brief for approval before build.

No KiCad project generation should begin until:
- `briefApproved = true`, or
- a development/test run uses an explicit bypass.

The implemented CLI path is:

```bash
npm run boardforge:intake -- --prompt "Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM." --output ./demo
npm run boardforge:answer -- --session ./demo/BoardForge_Intake_Session.json --answers "{\"manufacturing_target\":\"JLCPCB\"}"
npm run boardforge:create -- --prompt "Make a compact robotics controller with CAN and USB-C."
npm run boardforge:create -- --prompt "Make a compact robotics controller with CAN and USB-C." --approve-brief --dev
```

The first command writes the brief and blocks. The second creates a local candidate without dashboard publishing.

The publish/sync layer remains approved-only:
- new prompt starts as `brief_pending_approval`,
- approved build becomes `local_candidate`,
- `local_candidate` remains `dashboardVisible = false`,
- dashboard publishing requires explicit publish approval and confirmation.
