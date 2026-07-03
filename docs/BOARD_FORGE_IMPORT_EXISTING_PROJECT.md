# BoardForge Import Existing Project

BoardForge imports existing KiCad projects by copying them into a sandbox.

Flow:

1. User selects existing KiCad project path.
2. BoardForge hashes source files.
3. BoardForge creates a sandbox copy.
4. BoardForge validates the sandbox.
5. BoardForge writes a source-protection report.
6. Make Manufacturable may run only on the sandbox copy.

Original project was not modified. BoardForge works on a sandbox copy.
