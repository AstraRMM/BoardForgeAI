# BoardForge Web To Local Engine Flow

The web app is a product surface around the local engine, not a fake cloud runner.

Flow:

1. User opens the web app.
2. Web checks `GET http://127.0.0.1:38991/health`.
3. If offline, web shows `npm run boardforge:local-server`.
4. Intake uses `/intake/start` and `/intake/answer`.
5. Brief generation and approval use `/brief/generate` and `/brief/approve`.
6. Project creation uses `/project/create`.
7. Project status, reports, and downloads are read from local artifacts through `/project/:id/*`.
8. Publish requires `POST /project/:id/publish` with `confirm: true`.

Local drafts and local candidates remain hidden from the main dashboard until the user explicitly approves publication.
