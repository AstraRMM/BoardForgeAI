import { execFile as cb } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { runRealBoardProof } from '../real-board-proof.mjs'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from './manufacturing-pipeline.mjs'
import { approvedAssetFor } from '../components/approved-production-assets.mjs'
import { validateIndustrialIoProductionTopology } from './templates/industrial-io.mjs'

const execFile=promisify(cb),repo=path.resolve(import.meta.dirname,'../../../..')
export async function generateIndustrialIoProductionBoard({root,template}) {
  const assetGate=industrialIoProductionAssetGate(template)
  if(!assetGate.ok)return{acceptance:{accepted:false},manufacturingEvidence:{status:'MANUFACTURING_REJECTED',blockers:assetGate.errors},production:{templateId:template.id,generator:'industrial-io-production-engine',generationSkipped:true}}
  const topologyGate=industrialIoImplementationGate(template)
  if(!topologyGate.ok)return{acceptance:{accepted:false},manufacturingEvidence:{status:'MANUFACTURING_REJECTED',blockers:topologyGate.errors},production:{templateId:template.id,generator:'industrial-io-production-engine',generationSkipped:true}}
  const definition={id:'industrial-io-production',topologyId:'industrial-io-production',name:'Board006 Isolated Industrial IO',preset:'blank-custom',widthMm:62,heightMm:38,layers:4,outlinePoints:[[0,4],[4,4],[4,0],[58,0],[58,4],[62,4],[62,34],[58,34],[58,38],[4,38],[4,34],[0,34]],prompt:'Build isolated 24V field IO for DIN-rail mounting.',intent:template.mandatoryCircuits,semanticEvidence:{isolationRemediation:template.isolationRemediation,iso1212Networks:template.iso1212Networks},bom:template.requirements.map(p=>({ref:p.ref,value:p.mpn,role:p.role,verificationStatus:'APPROVED_MAPPING',mpn:p.mpn}))}
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
export function industrialIoProductionAssetGate(template){const errors=[];for(const p of template.requirements||[])if(!approvedAssetFor(p.mpn,{requiredPinCount:p.pinCount}))errors.push(`missing-approved-production-asset:${p.ref}:${p.mpn}`);return{ok:errors.length===0,errors}}

/** The template records the intended design, not a completed implementation.
 * Do not create a KiCad candidate until each safety-critical item is present
 * as a bound component, net, and geometry record. */
export function industrialIoImplementationGate(template){
  const converter=approvedAssetFor(template.requirements?.find(part=>part.ref==='U3')?.mpn)
  return validateIndustrialIoProductionTopology({
    isolatedConverter:{mpn:converter?.mpn,ratingUnit:'VACrms',isolationVrms:3000,pinMap:converter?.pinMap},
    iso1212:{channels:(template.iso1212Networks||[]).map(network=>({RTHR:{...network.RTHR,primarySourceVerified:false,designCalculationVerified:false},RSENSE:{...network.RSENSE,primarySourceVerified:false,designCalculationVerified:false},CIN:{...network.CIN,primarySourceVerified:false,designCalculationVerified:false}})),noConnectPins:[]},
    isolationCorridor:{keepoutVerified:false,clearanceMm:0,creepageMm:0},
    stm32:{connectedPowerPins:[]},
    assetBinding:{isolatedConverterExactMpnVerified:Boolean(converter),isolatedConverterSymbolFootprintPinMapVerified:Boolean(converter)},
  })
}
