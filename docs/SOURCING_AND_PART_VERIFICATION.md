# Sourcing And Part Verification

BoardForge must never invent stock, pricing, lifecycle, pin maps, or assembly availability.

## Status Values

- `API_VERIFIED`
- `MANUAL_CANDIDATE`
- `PLACEHOLDER`
- `NOT_CHECKED`
- `OUT_OF_STOCK`
- `OBSOLETE`

## Required BOM Fields

- MPN
- manufacturer
- symbol
- footprint
- pin-map status
- sourcing status
- stock status
- assembly availability
- risk

## Missing API Keys

If Digi-Key, Mouser, LCSC, or JLCPCB API access is unavailable, BoardForge must report `NOT_CHECKED` or `MANUAL_CANDIDATE`. It must not fake availability.
