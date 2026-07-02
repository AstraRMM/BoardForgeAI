# BoardForge Local Engine Service

BoardForge runs a local-first engine service at `http://127.0.0.1:38991`.

Start it with:

```bash
npm run boardforge:local-server
```

The service exposes structured JSON routes for health, status, prompt intake, brief approval, project creation, project status, reports, downloads, publish/archive/keep-local, and guarded validate/route/repair/export actions.

Every response uses:

```json
{
  "ok": true,
  "status": "",
  "data": {},
  "errors": [],
  "warnings": [],
  "artifactPaths": []
}
```

The service binds to localhost by default. It does not provide public network access, does not upload board files to cloud, and does not publish projects to a dashboard without explicit confirmation.
