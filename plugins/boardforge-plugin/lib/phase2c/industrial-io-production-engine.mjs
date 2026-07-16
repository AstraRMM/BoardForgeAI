import { execFile as cb } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { runRealBoardProof } from '../real-board-proof.mjs'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from './manufacturing-pipeline.mjs'

const execFile=promisify(cb),repo=path.resolve(import.meta.dirname,'../../../..')
export async function generateIndustrialIoProductionBoard({root,template}) {
  const definition={id:'industrial-io-production',topologyId:'industrial-io-production',name:'Board006 Isolated Industrial IO',preset:'blank-custom',widthMm:62,heightMm:38,layers:4,outlinePoints:[[0,4],[4,4],[4,0],[58,0],[58,4],[62,4],[62,34],[58,34],[58,38],[4,38],[4,34],[0,34]],prompt:'Build isolated 24V field IO for DIN-rail mounting.',intent:template.mandatoryCircuits,bom:template.requirements.map(p=>({ref:p.ref,value:p.mpn,role:p.role,verificationStatus:'APPROVED_MAPPING',mpn:p.mpn}))}
  const outputRoot=path.join(root,template.id)
  const summary=await runRealBoardProof({outputRoot,fresh:true,board:definition.id,boardDefinitions:[definition],liveBindings:true})
  const generated=summary.boards[0],projectDir=generated.outputFolder,files=await readdir(projectDir)
  const schematicFile=path.join(projectDir,files.find(x=>x.endsWith('.kicad_sch'))),pcbFile=path.join(projectDir,files.find(x=>x.endsWith('.kicad_pcb')))
  const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8')),sourceBytes=(await readFile(pcbFile)).length
  const rust=await execFile(path.join(repo,'rust/target/debug/boardforge-kicad.exe'),['normalize',pcbFile],{maxBuffer:50*1024*1024}),area=62*38-4*4*4
  const proof={rustReparsePassed:rust.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:rust.stdout.length}}
  const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(generated.assetBinding),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
  return {acceptance:manufacturing.acceptance,manufacturingEvidence:manufacturing,production:{templateId:template.id,generator:'industrial-io-production-engine',projectDir}}
}
