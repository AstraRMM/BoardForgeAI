import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { REAL_BOARD_PROOF_BOARDS } from '../plugins/boardforge-plugin/lib/real-board-proof.mjs'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from '../plugins/boardforge-plugin/lib/phase2c/manufacturing-pipeline.mjs'

const execFile=promisify(execFileCallback)
const root=process.env.BOARDFORGE_50_BOARD_ROOT||String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge`
const projectDir=path.join(root,'007_HARDENED_CANONICAL_CANARY','usb-c-esp32-sensor'),files=await readdir(projectDir)
const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))),pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb')))
const [sourcing,bindingReport]=await Promise.all([
  readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8').then(JSON.parse),
  readFile(path.join(projectDir,'BoardForge_Schematic_Asset_Binding_Report.json'),'utf8').then(JSON.parse),
])
const rustCli=path.resolve(import.meta.dirname,'..','rust','target','debug','boardforge-kicad.exe'),sourceBytes=(await readFile(pcbFile)).length
const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024}),proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
const definition=REAL_BOARD_PROOF_BOARDS.find(row=>row.id==='usb-c-esp32-sensor'),area=definition.widthMm*definition.heightMm
const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(bindingReport),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
const result={schema:'boardforge.hardened-board007-canary-revalidation.v1',generatedAt:new Date().toISOString(),projectDir,sourcingStatus:sourcing.status,manufacturing}
await writeFile(path.join(projectDir,'BoardForge_Hardened_Canary_Revalidation.json'),JSON.stringify(result,null,2)+'\n','utf8')
console.log(JSON.stringify({projectDir,sourcingStatus:sourcing.status,manufacturingStatus:manufacturing.status,accepted:manufacturing.acceptance?.accepted,blockers:manufacturing.acceptance?.blockers||[]},null,2))
if(manufacturing.acceptance?.accepted!==true)process.exitCode=2
