# BoardForge Authentication Architecture

BoardForge uses Better Auth with a PostgreSQL-compatible database for browser accounts and sessions. The website is the identity authority; the local engine never receives database credentials or a browser session cookie.

## Required deployment configuration

- `DATABASE_URL`: Postgres/Neon connection string.
- `BETTER_AUTH_SECRET`: random secret with at least 32 bytes of entropy.
- `BETTER_AUTH_URL`: the deployed website origin.
- `BOARDFORGE_AUTH_ORIGIN`: same public origin used by the local engine during pairing.

Run `npx auth@latest migrate` after configuring the database to create Better Auth's core tables. BoardForge creates its device, pairing, and audit tables on the first authenticated pairing request.

## Pairing flow

1. An authenticated user starts a pairing session in the website.
2. The server creates a one-time `BF-XXXX-XXXX-XXXX` code, stores only its SHA-256 hash, and expires it after ten minutes.
3. The local engine submits the code to `/api/auth/plugin/pairing/claim`.
4. A single opaque device token is returned to the local engine. The website stores only a hash.
5. The engine sends the token as a bearer token to verify/heartbeat endpoints. A user can revoke a device from settings.

Pairing codes, browser cookies, supplier credentials, and device tokens must never appear in reports, console output, screenshots, or commits.

## Current honest status

The repository contains the Better Auth integration, API contracts, database schema bootstrap, and pairing implementation. A hosted database and production environment variables are still required before public users can sign in or pair a device.
