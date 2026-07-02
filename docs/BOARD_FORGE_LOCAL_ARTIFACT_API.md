# BoardForge Local Artifact API

BoardForge uses a local artifact API before production cloud sync.

Supported logical endpoints:

- `GET /status`
- `POST /intake/start`
- `POST /intake/answer`
- `GET /intake/session/:id`
- `POST /brief/generate`
- `POST /brief/approve`
- `POST /project/create`
- `GET /project/:id/status`
- `POST /project/:id/publish`
- `POST /project/:id/archive`
- `POST /project/:id/keep-local`
- `GET /project/:id/downloads`
- `GET /project/:id/reports`

The first implementation is file-backed and reads/writes BoardForge manifests, conversation sessions, board briefs, preview files, and manufacturing artifacts.
