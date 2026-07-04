# BoardForge Secrets and API Keys

BoardForge keeps supplier credentials in local environment files only. Do not commit `.env`, `.env.local`, or token cache files.

Required DigiKey settings:

```text
DIGIKEY_CLIENT_ID=
DIGIKEY_CLIENT_SECRET=
DIGIKEY_CALLBACK_URL=https://www.boardforge-ai.com/api/integrations/digikey/callback
DIGIKEY_ENABLED_APIS=ProductInformationV4,Quote,SupplyChainAPI
```

Rules:

- DigiKey secrets are used only by the installed local BoardForge engine.
- The live website sees configured/missing/authenticated status, not raw credentials.
- Errors, reports, logs, evidence records, and solution-library lessons must redact secrets.
- Mouser remains `NOT_CONFIGURED` until a real product/search API is available.
- Missing supplier credentials produce `NOT_CONFIGURED`, `NOT_CHECKED`, or `UNKNOWN`, never guessed stock.

Live ProductInformation V4 lookups may require completing DigiKey OAuth locally before the local engine can call production endpoints.
