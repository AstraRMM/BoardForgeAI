# BoardForge KiCad Plugin Local Service

The KiCad plugin should treat BoardForge as a local engine service.

Default service:

```text
http://127.0.0.1:38991
```

The plugin should:

- check `GET /health`
- show engine online/offline state
- show project state, brief approval, DRC/ERC, unconnected count, and manufacturing readiness from local artifacts
- call validate/route/repair/export only for sandbox or generated fixture projects
- refuse mutation on protected or unsandboxed source projects
- expose report/download/manufacturing folder paths
- require explicit publish confirmation

If the service is offline, the plugin should tell the user to run:

```bash
npm run boardforge:local-server
```
