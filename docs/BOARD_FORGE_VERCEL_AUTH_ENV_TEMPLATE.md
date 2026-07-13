# BoardForge Vercel Auth Environment Template

Add these names in Vercel. Values shown below are templates, not credentials.

```env
DATABASE_URL=<your Neon/Postgres pooled connection string>
BETTER_AUTH_SECRET=<generated long random secret>
BETTER_AUTH_URL=https://www.boardforge-ai.com
BETTER_AUTH_API_KEY=<your Better Auth Dash API key>
BOARDFORGE_AUTH_ORIGIN=https://www.boardforge-ai.com
NEXT_PUBLIC_APP_URL=https://www.boardforge-ai.com
NEXT_PUBLIC_BOARDFORGE_APP_URL=https://www.boardforge-ai.com
```

Use `npm run boardforge:auth-secret` to generate a new secret. Do not put API keys or database URLs in source files, prompts, screenshots, or `NEXT_PUBLIC_` variables.
