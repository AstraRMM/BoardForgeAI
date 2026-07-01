# BoardForge KiCad Plugin Demo

The KiCad plugin is an alpha control surface. It calls the local BoardForge CLI/engine and reads local artifacts.

Demo actions:

- import current project into sandbox
- validate sandbox
- run repair on sandbox
- run route on sandbox
- export manufacturing from sandbox
- open latest report
- open manufacturing folder
- show local dashboard/status artifacts

Mutation actions are refused on non-sandbox projects.
