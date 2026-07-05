# BoardForge Evidence Dashboard

The evidence dashboard shows proof cards for:

- generated clean boards
- dirty repair
- import sandbox repair
- custom outline generation
- public demo product flow
- variant ranking
- Make Manufacturable
- source protection
- manufacturing export
- approved-only publish
- job polling
- review/risk/health reports

Each card includes artifact path, test name, pass/fail, date, proof, and limitation.
## Sourcing Evidence Cards

The evidence dashboard includes DigiKey secret redaction, provider health, ProductInformation V4 normalization, Mouser Search API live lookup, dual-supplier sourcing disclosure, BOM sourcing verification, quote readiness, Make Sourcable, alternative parts, supply-chain-aware variant ranking, browser E2E supplier disclosure, and secret redaction.

Each sourcing card must show artifact path, pass/fail, date, what it proves, and limitations.

## Browser E2E Evidence Cards

The dashboard includes Playwright proof cards for:

- first-run setup and local engine pairing
- one-click demo flow
- Make Manufacturable and Make Sourcable project panels
- live supplier sourcing disclosure
- variant ranking
- import sandbox source protection
- approved-only publish gates
- new-board brief flow

Browser evidence must never expose DigiKey, Mouser, OpenRouter, Gemini, OAuth, or token-store secrets.
