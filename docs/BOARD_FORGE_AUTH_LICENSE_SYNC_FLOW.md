# BoardForge Auth, License, And Sync Flow

License/auth and project publishing are separate systems.

## License
Premium actions require entitlement:
- create project
- generate schematic
- generate outline
- place components
- route board
- repair DRC
- sourcing verification
- manufacturing export
- AI command execution
- dashboard sync

Local development can use:

```powershell
$env:BOARDFORGE_DEV_LICENSE="true"
```

This is an explicit development license mode, not a hidden production bypass.

## Sync
Project sync requires:
- a project approved for dashboard,
- explicit publish confirmation,
- a valid entitlement for `sync_project_to_dashboard`.

The current alpha implementation is local artifact sync, not fake hosted cloud execution.
