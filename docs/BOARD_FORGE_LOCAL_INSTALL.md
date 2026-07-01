# BoardForge Local Install

BoardForge runs as a local-first PCB engineering engine.

```bash
cd C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai
npm install
npm run report:90:quick -- --fresh
```

Useful commands:

```bash
npm run boardforge:poe-rev-d-proof
npm run boardforge:poe-rev-d-sourcing
npm run fixtures:run
npm run test:plugin
```

Supplier verification is optional. Without keys, sourcing reports remain honest and return `NOT_CHECKED`.

