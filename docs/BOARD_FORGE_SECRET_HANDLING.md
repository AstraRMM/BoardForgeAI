# BoardForge Secret Handling

BoardForge uses local environment variables for supplier and AI-provider credentials.

Rules:

- Never hardcode secrets in source files.
- Never commit `.env` or `.env.local`.
- Commit only `.env.example` and `.env.local.example`.
- Reports may show whether a key exists, but never the key value.
- Missing supplier keys must produce `NOT_CHECKED`, `UNKNOWN`, and exact setup instructions.
- API keys are external blockers, not BoardForge engine failures.

The protected user project rule still applies: supplier verification must not modify ESC, FC, or any protected user board folder.

