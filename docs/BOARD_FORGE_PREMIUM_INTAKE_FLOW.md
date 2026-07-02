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
