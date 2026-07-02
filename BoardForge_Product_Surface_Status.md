# BoardForge Product Surface Status

## Web

Dashboard, projects, project detail, readiness, downloads, new-board, and upload-import pages exist. They are local artifact-backed and must not imply fake cloud execution.

## KiCad Plugin

The KiCad plugin exposes safe local CLI commands, sandbox enforcement, approval status, report paths, and manufacturing folder paths. It does not duplicate the engine.

## CLI

The CLI exposes help, intake, approval, import, validation, repair, routing, export, status, replay, publish, archive, sync, license, and demo commands.

## Launcher

`tools/boardforge-launcher` contains local alpha startup, environment check, dashboard open, demo run, and KiCad plugin install helper scripts.
