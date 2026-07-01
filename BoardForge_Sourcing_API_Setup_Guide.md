# BoardForge Sourcing API Setup Guide

BoardForge never fakes stock or assembly availability.

## Environment Variables

- `DIGIKEY_CLIENT_ID`
- `DIGIKEY_CLIENT_SECRET`
- `MOUSER_API_KEY`
- `LCSC_API_KEY`
- `JLCPCB_API_KEY`

## Missing Keys

When keys are missing:

- `sourcingStatus = NOT_CHECKED`
- `stockStatus = UNKNOWN`
- `assemblyAvailability = UNKNOWN`

## Readiness Separation

- `PCB_FAB_READY`: Gerber/drill/BOM/CPL package exists and DRC/ERC/connectivity gates pass.
- `ASSEMBLY_READY_NOT_VERIFIED`: fabrication package is clean, but sourcing/assembly stock has not been API-verified.
- `ASSEMBLY_READY_VERIFIED`: supplier APIs confirm stock and assembly availability.

Live API calls must provide evidence before any row can become `API_VERIFIED`.

