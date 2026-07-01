# BoardForge Local Install

## Requirements

- Node.js
- KiCad CLI available on PATH or discoverable locally
- FreeRouting/Java for routing workflows that need external routing
- Optional sourcing API keys for supplier verification

## Run

```powershell
cd "C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai"
npm install
npm run fixtures:run
npm run report:90:quick -- --fresh
```

## Optional API Keys

- `DIGIKEY_CLIENT_ID`
- `DIGIKEY_CLIENT_SECRET`
- `MOUSER_API_KEY`
- `LCSC_API_KEY`
- `JLCPCB_API_KEY`

Without keys, BoardForge reports sourcing as `NOT_CHECKED`, stock as `UNKNOWN`, and assembly availability as `UNKNOWN`.
