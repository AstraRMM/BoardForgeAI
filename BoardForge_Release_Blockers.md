# BoardForge Release Blockers

## External Blockers

- Supplier API keys: `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET`, `MOUSER_API_KEY`, `LCSC_API_KEY`, `JLCPCB_API_KEY`
- Real PoE compliance and safety review
- Public installer code-signing certificate

## Internal Alpha Blockers

- Web actions need richer interactive forms and optimistic/polling state UX
- KiCad plugin needs a real panel instead of mostly status/log commands
- Local service needs long-running job streaming for heavy route/repair tasks
- Arbitrary real-board routing is not production-autonomous yet

## Non-Blockers For Local Alpha

- Local PCB fab-ready exports are evidence-backed for proven fixtures
- Sourcing remains honestly marked `NOT_CHECKED` without keys
- Generated projects remain local until explicit publish confirmation
