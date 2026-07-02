# BoardForge Local Install

BoardForge runs as a local-first PCB engineering engine.

```bash
cd C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai
npm install
npm run report:90:quick -- --fresh
```

Useful commands:

```bash
npm run boardforge:brief -- --prompt "Make a compact robotics controller with CAN and USB-C." --output ./boardforge-workspace/demo
npm run boardforge:approve-brief -- --project ./boardforge-workspace/demo
npm run boardforge:create -- --prompt "Make a compact robotics controller with CAN and USB-C." --output ./boardforge-workspace/demo --approve-brief --dev
npm run boardforge:publish -- --project ./boardforge-workspace/demo --manifest ./boardforge-workspace/demo/BoardForge_Project_Manifest.json --confirm
npm run boardforge:poe-rev-d-proof
npm run boardforge:poe-rev-d-sourcing
npm run fixtures:run
npm run test:plugin
```

Supplier verification is optional. Without keys, sourcing reports remain honest and return `NOT_CHECKED`.

Development license mode:

```bash
set BOARDFORGE_DEV_LICENSE=true
```

Use dev license mode only for local development and demos. Production billing/license checks must not be bypassed.
