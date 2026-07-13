# BoardForge Vercel Environment Setup

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_API_KEY`, `BOARDFORGE_AUTH_ORIGIN`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_BOARDFORGE_APP_URL` in Vercel. Use `https://www.boardforge-ai.com` for the URL values in production. Redeploy after saving them.

Supplier variables are optional and remain local/server-only: `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET`, and `MOUSER_API_KEY`. Never expose them through a `NEXT_PUBLIC_` variable.

Run `npm run boardforge:vercel-auth-env-check` before deployment and `npm run boardforge:auth-doctor` from a trusted environment after deployment. Both report configuration and reachability without printing secret values.
