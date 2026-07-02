# BoardForge Localhost Security Model

BoardForge local alpha uses a localhost-only engine service.

Security rules:

- bind to `127.0.0.1` by default
- reject non-local requests
- never expose supplier API keys in logs
- never upload board files to a cloud service by default
- refuse protected ESC/FC paths
- require sandbox copies for imported project mutation
- require license/dev entitlement for premium actions
- require explicit publish confirmation before dashboard visibility

Logs are local artifacts:

- `BoardForge_Localhost_Service_Request_Log.jsonl`
- `BoardForge_Localhost_Service_Audit_Log.jsonl`

These logs record route, action, project, result, artifact paths, blocked reason, license/dev mode state, and protected-path result. They must not contain secrets.
