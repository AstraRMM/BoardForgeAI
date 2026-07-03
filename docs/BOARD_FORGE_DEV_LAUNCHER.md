# BoardForge Dev Launcher

Run:

```powershell
node scripts/boardforge-check-environment.mjs
node scripts/boardforge-dev-launcher.mjs
npm run boardforge:local-server
```

The live BoardForge website connects to the installed local BoardForge engine bridge on the user's machine. The bridge controls KiCad, FreeRouting, reports, downloads, and manufacturing exports locally.

Projects remain local unless the user explicitly approves publishing/sync.
