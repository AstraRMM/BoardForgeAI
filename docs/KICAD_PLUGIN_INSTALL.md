# KiCad Plugin Install

This is the current BoardForge action-plugin scaffold. It is a control surface for the local BoardForge CLI/engine, not the engine itself.

1. Copy `kicad-plugin/boardforge_action_plugin.py` into the KiCad scripting plugins directory.
2. Restart KiCad or refresh action plugins.
3. Open a non-protected project.
4. Run `BoardForge Route/Validate`.

The plugin currently refuses protected ESC/FC paths and logs the local command handoff. Board mutation remains in the guarded local engine.

## Commands Shown In KiCad

```bash
npm run boardforge:validate -- --project "<active-board>"
npm run boardforge:route -- --project "<active-board>"
npm run boardforge:cleanup -- --project "<active-board>"
npm run boardforge:export -- --project "<active-board>"
npm run boardforge:report -- --manifest "<project>/BoardForge_Project_Manifest.json"
npm run boardforge:replay -- --manifest "<project>/BoardForge_Project_Manifest.json"
```

The plugin must not claim routing, DRC/ERC, sourcing, or manufacturing readiness unless the local engine writes evidence into the project manifest.
