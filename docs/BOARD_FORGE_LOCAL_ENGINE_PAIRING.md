# BoardForge Local Engine Pairing

The live BoardForge website connects to the installed local BoardForge engine through a private localhost bridge.

Pairing rules:

- The local engine generates a one-time pairing code.
- The live website asks the user to enter the code.
- Browser-origin POST actions require a local session token.
- Allowed origins are explicit.
- Random websites cannot call local engine actions.
- Failed pairing attempts are logged without secrets.
- Pairing can be revoked.

The pairing layer protects local KiCad files while keeping BoardForge local-first.
