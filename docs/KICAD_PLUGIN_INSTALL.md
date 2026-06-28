# KiCad Plugin Install

This is the current BoardForge action-plugin scaffold.

1. Copy `kicad-plugin/boardforge_action_plugin.py` into the KiCad scripting plugins directory.
2. Restart KiCad or refresh action plugins.
3. Open a non-protected project.
4. Run `BoardForge Route/Validate`.

The plugin currently refuses protected ESC/FC paths and logs the local command handoff. Board mutation remains in the guarded local engine.
