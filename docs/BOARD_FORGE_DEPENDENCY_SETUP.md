# BoardForge Dependency Setup

BoardForge local alpha is honest about missing dependencies. Missing tools reduce available workflows; they do not become fake passes.

## Required For Local Alpha UI

- Node.js LTS
- npm
- Git

## Required For KiCad Automation

- KiCad 8+
- `kicad-cli` on PATH

## Required For FreeRouting Bulk Routing

- Java 17+
- FreeRouting jar configured or discoverable

## Optional Supplier Verification

Set only real provider credentials:

- `DIGIKEY_CLIENT_ID`
- `DIGIKEY_CLIENT_SECRET`
- `MOUSER_API_KEY`
- `LCSC_API_KEY`
- `JLCPCB_API_KEY`

If these are missing, BoardForge reports sourcing as `NOT_CHECKED`, stock as `UNKNOWN`, and assembly availability as `UNKNOWN`.

## Check

```powershell
.\tools\boardforge-launcher\BoardForge_Check_Environment.ps1
```

This writes `BoardForge_Local_Alpha_Environment_Report.md`.
