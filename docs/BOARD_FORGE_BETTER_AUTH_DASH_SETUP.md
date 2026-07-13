# BoardForge Better Auth Dash Setup

1. Add `BETTER_AUTH_API_KEY` to Vercel and local `.env.local` only when you need local verification.
2. Confirm the `@better-auth/infra` package and `dash({ apiKey: process.env.BETTER_AUTH_API_KEY })` plugin are present with `npm run boardforge:auth-doctor`.
3. Add the other required production values from `BOARD_FORGE_VERCEL_AUTH_ENV_TEMPLATE.md`.
4. Redeploy the Vercel project.
5. Run `npm run boardforge:auth-migrate -- --apply`, then `npm run boardforge:auth-doctor`.
6. Retry the Better Auth Dash connection at `https://www.boardforge-ai.com/api/auth`.

The Dash API key is server-only. It must never be prefixed with `NEXT_PUBLIC_` or placed in the Codex plugin.
