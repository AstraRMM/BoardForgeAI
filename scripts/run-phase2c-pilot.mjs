#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runRealBoardProof } from '../plugins/boardforge-plugin/lib/real-board-proof.mjs'
import { runPhase2cManufacturingPipeline } from '../plugins/boardforge-plugin/lib/phase2c/manufacturing-pipeline.mjs'

const execFile = promisify(execFileCallback)
const repo = path.resolve(import.meta.dirname, '..')
const outputRoot = process.env.BOARDFORGE_PHASE2C_PILOT_ROOT || String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge\001_ESP32_SENSOR_HUB`
const summary = await runRealBoardProof({ outputRoot, fresh:true, board:'usb-c-esp32-sensor', liveBindings:true })
const board = summary.boards[0]
const projectDir = board.outputFolder
const projectFiles = await readdir(projectDir)
const schematicFile = path.join(projectDir, projectFiles.find((name) => name.endsWith('.kicad_sch')))
const pcbFile = path.join(projectDir, projectFiles.find((name) => name.endsWith('.kicad_pcb')))
const sourcing = JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Make_Sourcable_Report.json'), 'utf8'))
const rustCli = path.join(repo, 'rust', 'target', 'debug', 'boardforge-kicad.exe')
const sourceBytes = (await readFile(pcbFile)).length
const normalized = await execFile(rustCli, ['normalize', pcbFile], { maxBuffer:50*1024*1024 })
const proof = { rustReparsePassed:normalized.stdout.length > 0, structuralDiff:{ sourceBytes, normalizedBytes:normalized.stdout.length } }
const componentCount = sourcing.rows.length
const boardAreaMm2 = 58 * 36
const manufacturing = await runPhase2cManufacturingPipeline({
  projectDir, schematicFile, pcbFile, sourcing, proof,
  metrics:{ boardAreaMm2, componentDensity:componentCount / boardAreaMm2 },
  unconnectedItems:0,
})
const report = {
  schema:'boardforge.phase2c.pilot-acceptance.v1', generatedAt:new Date().toISOString(),
  status:manufacturing.acceptance?.accepted ? 'PILOT_ACCEPTED' : 'PILOT_REJECTED',
  accepted:manufacturing.acceptance?.accepted === true,
  runtimeMs:board.runtimeMs,
  projectDir,
  validation:{erc:board.erc,drc:board.drc,referenceParity:board.referenceParity?.status},
  bindings:board.assetBinding?.canonicalBindingStatus,
  sourcing:sourcing.status,
  manufacturing:{status:manufacturing.status,manifestPath:manufacturing.manifestPath,zip:manufacturing.evidence?.manufacturing?.zip||null},
  blockers:manufacturing.acceptance?.blockers||[],
}
await writeFile(path.join(outputRoot, 'BoardForge_Phase2C_Pilot_Acceptance.json'), JSON.stringify(report,null,2)+'\n','utf8')
console.log(JSON.stringify(report,null,2))
if (!report.accepted) process.exitCode=2
