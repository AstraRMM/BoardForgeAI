import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runRealBoardProof, REAL_BOARD_PROOF_BOARDS } from '../plugins/boardforge-plugin/lib/real-board-proof.mjs'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from '../plugins/boardforge-plugin/lib/phase2c/manufacturing-pipeline.mjs'

const execFile=promisify(execFileCallback)
const root=process.env.BOARDFORGE_50_BOARD_ROOT||String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge`
const outputId=process.env.BOARDFORGE_HARDENED_OUTPUT_ID||'007_HARDENED_CANONICAL_CANARY'
const outputRoot=path.join(root,outputId)
const summary=await runRealBoardProof({outputRoot,fresh:true,board:'usb-c-esp32-sensor',liveBindings:true})
const board=summary.boards[0],projectDir=board.outputFolder,files=await readdir(projectDir)
const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||'missing.kicad_sch')
const pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'missing.kicad_pcb')
const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8'))
const definition=REAL_BOARD_PROOF_BOARDS.find(row=>row.id==='usb-c-esp32-sensor')
const rustCli=path.resolve(import.meta.dirname,'..','rust','target','debug','boardforge-kicad.exe')
const sourceBytes=(await readFile(pcbFile)).length,normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024})
const proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
const area=(definition?.widthMm||0)*(definition?.heightMm||0)
const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(board.assetBinding),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
const result={schema:'boardforge.hardened-board007-canary.v1',outputId,generatedAt:new Date().toISOString(),projectDir,proofSummary:{erc:board.erc,drc:board.drc,authoritativeRouting:board.categoryPcbEvidence?.authoritativeRouting},sourcing,manufacturing}
await writeFile(path.join(projectDir,'BoardForge_Hardened_Canary_Result.json'),JSON.stringify(result,null,2)+'\n','utf8')
console.log(JSON.stringify({projectDir,erc:board.erc,drc:board.drc,routing:board.categoryPcbEvidence?.authoritativeRouting?.status,sourcing:sourcing.status,manufacturingStatus:manufacturing.status,accepted:manufacturing.acceptance?.accepted,blockers:manufacturing.acceptance?.blockers||[]},null,2))
if(manufacturing.acceptance?.accepted!==true)process.exitCode=2
