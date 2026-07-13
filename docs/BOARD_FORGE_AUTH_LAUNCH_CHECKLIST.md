# BoardForge Auth Launch Checklist

- [ ] Vercel has the four required auth variables.
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
