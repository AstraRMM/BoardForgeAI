# BoardForge CLI Sourcing

Local sourcing commands are backed by the installed BoardForge local engine:

```bash
npm run boardforge:sourcing-status
npm run boardforge:sourcing-lookup -- --mpn RC0603FR-0710KL
npm run boardforge:sourcing-verify -- --project-id BF-DIGIKEY-SOURCING-DEMO-01_REV_A
npm run boardforge:quote-readiness -- --project-id BF-DIGIKEY-SOURCING-DEMO-01_REV_A
npm run boardforge:make-sourcable -- --project-id BF-DIGIKEY-SOURCING-DEMO-01_REV_A
npm run boardforge:alternatives -- --project-id BF-DIGIKEY-SOURCING-DEMO-01_REV_A
```

BoardForge does not auto-buy parts. Quote readiness only checks whether the BOM looks ready for a quote.

If DigiKey OAuth is not complete, live lookup returns a redacted `DIGIKEY_AUTH_REQUIRED` blocker. Mocked tests still verify normalization and report generation.
