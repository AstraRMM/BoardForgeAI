# BoardForge Supplier API Setup

BoardForge never invents stock, price, lifecycle, or assembly availability. Supplier verification is live only when the matching provider credentials are configured locally.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill only the providers you want to use:

```bash
DIGIKEY_CLIENT_ID=
DIGIKEY_CLIENT_SECRET=
MOUSER_API_KEY=
LCSC_API_KEY=
JLCPCB_API_KEY=
```

`.env` and `.env.local` are ignored by git. Do not commit secrets.

## Status Meaning

- `API_VERIFIED`: provider data was returned and normalized.
- `NOT_CHECKED`: credentials are missing or live query was not run.
- `OUT_OF_STOCK`: provider evidence says stock is zero.
- `OBSOLETE`: provider evidence says the part is obsolete or not recommended.
- `ERROR`: provider request failed and must be reviewed.

PCB fabrication readiness can be true while assembly readiness remains unverified.

