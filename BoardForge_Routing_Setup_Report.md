# BoardForge Routing Setup Report

- Status: ROUTING_JAR_OPTIONAL_MISSING_WITH_SETUP_STEPS
- Java: missing
- FreeRouting JAR: missing
- Smoke test: not attempted

## Setup Steps
- Install Java 21+ or the Java runtime required by the selected FreeRouting JAR.
- Place FreeRouting at tools/freerouting/freerouting.jar or set BOARDFORGE_FREEROUTING_JAR.
- Run npm run boardforge:setup-routing again.

This workflow is optional for public alpha unless the user chooses the FreeRouting JAR path.
