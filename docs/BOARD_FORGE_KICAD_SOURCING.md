# BoardForge KiCad Sourcing

The KiCad plugin exposes sourcing status through the same local engine bridge as the live website and CLI.

KiCad-visible sourcing actions:

- Show sourcing status.
- Run DigiKey BOM verification.
- Run quote readiness.
- Run Make Sourcable.
- Open alternative parts report.
- Open BOM sourcing report.

The plugin must not expose API secrets. It reports only configured/authenticated/missing status and local report paths.

BoardForge continues to refuse mutation on non-sandbox or protected projects. Make Sourcable creates a proposed substitution plan and never changes the schematic or PCB without approval.
