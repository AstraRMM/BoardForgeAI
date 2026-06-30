# BoardForge CLI

BoardForge CLI is the local-first control surface for the BoardForge engine. Web and KiCad surfaces should call this engine instead of duplicating PCB logic.

## Commands

```bash
npm run boardforge:create -- --project "<safe-project-folder>" --name "MyBoard"
npm run boardforge:validate -- --project "<safe-project-or-board>"
npm run boardforge:route -- --project "<safe-project-or-board>"
npm run boardforge:cleanup -- --project "<safe-project-or-board>"
npm run boardforge:export -- --project "<safe-project-or-board>"
npm run boardforge:report -- --manifest "<project>/BoardForge_Project_Manifest.json"
npm run boardforge:replay -- --manifest "<project>/BoardForge_Project_Manifest.json"
npm run fixtures:run
```

## Dense-Control Proof Command

```bash
npm run boardforge:dense-control-repair -- --fixture "C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-DENSE-CONTROL-01_REV_A"
```

This command:

1. copies the dense-control board into a repair candidate,
2. parses KiCad DRC JSON into repair tasks,
3. applies transactional local copper/silkscreen mutations,
4. runs KiCad DRC/ERC,
5. exports Gerbers, drill, BOM, CPL, and JLCPCB ZIP only when clean,
6. updates BoardForge project manifest/dashboard/action-log/replay artifacts.

## Safety

The CLI refuses protected ESC/FC paths by default. User projects should be copied into a BoardForge workspace before automated mutation.
