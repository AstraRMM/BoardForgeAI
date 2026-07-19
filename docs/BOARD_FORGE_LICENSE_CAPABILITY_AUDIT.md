# BoardForge licensing and device capability audit

Audit date: 2026-07-19  
Scope: authenticated website licensing, device activation, revocation, and plugin-key management.

## Decision

Do **not** expose a Licensing, Billing, Devices, Activation History, or Plugin Keys workspace surface yet. The repository has useful building blocks, but it does not currently have a safe, deployed, authenticated account contract that can truthfully power those screens.

The compatibility routes `/settings/devices` and `/settings/billing` intentionally redirect to `/settings`. They remain out of navigation and must not be reintroduced as empty account-management pages.

## Evidence found

| Capability | Current implementation | Why it is not a workspace capability yet |
| --- | --- | --- |
| Browser identity | `apps/web/src/lib/auth.ts` configures Better Auth with Postgres when `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` exist. | This only supplies identity/session infrastructure. It is not an entitlement or billing system. |
| Device persistence primitives | `apps/web/src/lib/boardforge-access.ts` can create tables, list devices, revoke a device, and verify a hashed device token. | No Next route exposes these operations after `requireBoardForgeUser`; there is therefore no authenticated browser contract to list or revoke a user's devices. |
| Pairing-code primitives | `createPairingCode` and `claimPairingCode` create a short-lived code and a hashed opaque device token. | No `app/api` route exposes code creation, claim, verification, or heartbeat. The local-browser pairing screen is a separate localhost-helper session flow, not an account device activation flow. |
| Local premium gate | `plugins/boardforge-plugin/lib/billing/subscription-status.mjs` reads `BOARDFORGE_DEV_LICENSE`, `BOARDFORGE_LICENSE_KEY`, and `BOARDFORGE_PLAN`; `license-checker.mjs` uses that local process environment. | Environment variables are not an account-owned, remotely verifiable, rotatable, or revocable license record. No browser should display them as such. |
| License table | `ensureAccessSchema()` creates `boardforge_licenses`. | There is no repository code that issues, updates, revokes, assigns, or reads those rows. A table alone cannot support license management. |
| Audit log table | `boardforge_audit_logs` is written for pairing and device revocation helpers. | There is no authenticated, paginated, redacted history endpoint and no retention/access policy. |

## Explicit non-capabilities

The following are not implemented and must not be represented as product functionality:

- License generation, plan assignment, rotation, revocation, or account transfer.
- Payment, subscription, checkout, invoices, tax, or billing-provider synchronization.
- Device listing/revocation from the browser.
- Activation-code creation or activation history in the website.
- Plugin API-key issuance, display, rotation, or revocation.
- Server-side entitlement verification for the local plugin against an account record.

## Required contract before reintroducing a surface

1. Deploy Better Auth and the schema migration with the required production environment variables.
2. Add authenticated route handlers guarded by `requireBoardForgeUser` for device listing and revocation, with owner checks and no token/hash disclosure.
3. Add a transaction-safe pairing claim flow and a bearer-token verification/heartbeat contract. The claim must atomically consume one unexpired code and create its device record.
4. Define an authoritative entitlement provider and lifecycle (issued, active, expired, revoked), then make plugin verification consult that authority rather than only local environment variables.
5. Define the account/plan source of truth and webhook/reconciliation model before adding billing language.
6. Add audit-history pagination, metadata redaction, retention policy, and authorization tests before exposing activation history.
7. Add integration tests for cross-account device access, revoked-token rejection, expired/reused codes, and concurrent claims.

## Current user-facing boundary

`/settings` may truthfully show that authentication environment configuration is present or absent and may link to browser-to-local-helper pairing. It must continue to state that billing and device records are unavailable until the contracts above exist. This prevents a settings page from claiming account control that the deployment cannot perform.
