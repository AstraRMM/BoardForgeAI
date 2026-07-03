# BoardForge Limitations

BoardForge is not a universal autonomous PCB engineer yet.

Known limits:

- Real ESC/FC-class dense boards still need supervised or manual finishing.
- Supplier API verification requires user-provided credentials.
- PoE compliance, isolation safety, hipot, and certification require engineering review.
- Local shove/rip-up repair is proven on controlled fixtures and imported synthetic boards, not arbitrary customer boards.
- Web and KiCad plugin surfaces are alpha.

BoardForge must not fake readiness, sourcing, stock, compliance, or DRC/ERC results.

## Public Alpha External Blockers

- Supplier API keys are not configured, so live stock and assembly availability stay `NOT_CHECKED` / `UNKNOWN`.
- PoE compliance and safety require real engineering review.
- Public installer signing requires a code-signing certificate.
- Browser E2E execution is blocked until `@playwright/test` is installed and browsers are provisioned.
