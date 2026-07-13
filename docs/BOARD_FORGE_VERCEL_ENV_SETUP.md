# BoardForge Vercel Environment Setup

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `BOARDFORGE_AUTH_ORIGIN` in Vercel. Use `https://www.boardforge-ai.com` for both URLs in production. Redeploy after saving them.

Supplier variables are optional and remain local/server-only: `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET`, and `MOUSER_API_KEY`. Never expose them through a `NEXT_PUBLIC_` variable.

Run `npm run boardforge:auth-doctor` from a trusted environment after deployment. It reports configuration and reachability without printing secret values.
