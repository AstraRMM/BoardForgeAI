# BoardForge Production Authentication Setup

## Vercel environment variables

Add these variables to **Production**, **Preview**, and the environment used for test users:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/boardforge
BETTER_AUTH_SECRET=long-random-secret
BETTER_AUTH_URL=https://www.boardforge-ai.com
BETTER_AUTH_API_KEY=<Better Auth Dash server key>
BOARDFORGE_AUTH_ORIGIN=https://www.boardforge-ai.com
NEXT_PUBLIC_APP_URL=https://www.boardforge-ai.com
NEXT_PUBLIC_BOARDFORGE_APP_URL=https://www.boardforge-ai.com
```

Generate a secret in PowerShell:

```powershell
[System.Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

Do not commit any of these values. Add the same values to your local `.env.local` only when running the migration or a local production-like test.

## Migration

1. Deploy the auth commit with the environment variables configured.
2. From a shell with the same variables available, run:

```powershell
npm run boardforge:auth-migrate -- --apply
```

3. Confirm core Better Auth tables and BoardForge pairing tables:

```powershell
npm run boardforge:auth-doctor
```

## Verify production

1. Open `/signup`, create a throwaway tester account, then sign in at `/login`.
2. Confirm `/dashboard` loads after sign-in and redirects to `/login` in a private browser session.
3. Open `/settings/plugin`, generate a pairing code, then use `boardforge auth pair --code BF-XXXX-XXXX-XXXX` on the tester machine.
4. Revoke the device from settings and verify the next local heartbeat reports `revoked_or_invalid`.
5. Run `BOARDFORGE_AUTH_SMOKE_URL=https://www.boardforge-ai.com npm run boardforge:auth-smoke-test`.
6. Retry Better Auth Dash after the deployment. The Dash key stays server-only.

## Rollback

1. Redeploy the prior application build in Vercel.
2. Leave database tables in place; they are additive and contain account/session records.
3. Revoke exposed or suspicious devices in the pairing settings after redeploying.
4. Rotate `BETTER_AUTH_SECRET` only with an intentional session invalidation plan.
