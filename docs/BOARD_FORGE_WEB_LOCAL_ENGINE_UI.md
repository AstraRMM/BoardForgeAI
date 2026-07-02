# BoardForge Web Local Engine UI

The BoardForge web app is a local-first control surface.

It should show:

- local engine status from `http://127.0.0.1:38991`
- offline start command: `npm run boardforge:local-server`
- prompt intake and conditional questions
- board brief approval gate
- custom outline presets and validation
- project actions mapped to localhost routes
- manufacturing readiness and sourcing status
- previews, reports, downloads, and CLI replay
- publish confirmation state

The web app must not fake cloud execution. If the engine is offline, it should say so and tell the user how to start the local engine service.
