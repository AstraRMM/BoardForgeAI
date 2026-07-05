# BoardForge Public Alpha Launch Gate

Launch gate categories:

- engine readiness
- web UX readiness
- local engine pairing/security
- installer/launcher readiness
- KiCad plugin readiness
- CLI readiness
- demo readiness
- manufacturing export readiness
- source protection readiness
- documentation readiness
- known external blockers

Current external blockers:

- supplier API keys, kept local per operator
- real PoE compliance/safety review
- public installer signing certificate

Do not mark production-ready until those are resolved.
## Sourcing Gate

The public alpha launch gate now includes DigiKey configuration, provider health, Mouser Search API live lookup, dual-supplier sourcing verification, quote readiness, demo artifact authenticity, source protection, approved publish, local engine pairing/security, browser secret-leak checks, and E2E status.

Do not mark full public alpha ready if live browser E2E or required external compliance/signing evidence is missing.

Live supplier lookups must run through the local engine/CLI with local credentials. The website may show redacted evidence and supplier status, but it must not receive or print raw supplier credentials.
