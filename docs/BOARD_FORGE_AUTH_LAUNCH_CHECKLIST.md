# BoardForge Auth Launch Checklist

- [ ] Vercel has `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_API_KEY`, `BOARDFORGE_AUTH_ORIGIN`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_BOARDFORGE_APP_URL`.
- [ ] Better Auth migration completed.
- [ ] `npm run boardforge:auth-doctor` reports database and tables ready.
- [ ] Private-window visit to `/dashboard` redirects to `/login`.
- [ ] Tester can sign up, sign in, and sign out.
- [ ] Tester can create a one-time pairing code.
- [ ] Local engine pairs and survives a heartbeat.
- [ ] Device revocation invalidates the local engine token.
- [ ] `npm run boardforge:auth-smoke-test` passes against production.
- [ ] No secrets, `.env.local`, `.boardforge`, or screenshots are staged.

Status before Vercel configuration: **auth code ready, production activation blocked by environment variables and migration**.
