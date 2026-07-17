import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { approvedAssetFor } from '../components/approved-production-assets.mjs'
import {TPS25750_SOURCE_VBUS_EQUIVALENCE} from '../components/production-asset-pin-schema.mjs'
import { detectKiCadCli, exportBom, exportCpl, exportDrill, exportGerbers, packageJlcpcb, runDrc, runErc } from '../kicad-cli.mjs'
import { evaluateBoardAcceptance } from '../challenge/board-acceptance-gate.mjs'

const defaults={detectKiCadCli,exportBom,exportCpl,exportDrill,exportGerbers,packageJlcpcb,runDrc,runErc}

export async function runPhase2cManufacturingPipeline(input, adapters=defaults) {
  const {projectDir,schematicFile,pcbFile,sourcing,proof,metrics,assetBindings}=input
  const outputDir=path.join(projectDir,'Manufacturing')
  const reportsDir=path.join(projectDir,'Evidence')
  await mkdir(outputDir,{recursive:true}); await mkdir(reportsDir,{recursive:true})
  const sourceBefore=await sha256File(pcbFile)
  const cli=input.kicadCliPath ? {available:true,path:input.kicadCliPath,version:input.kicadCliVersion||'provided'} : await adapters.detectKiCadCli()
  if (!cli.available) return blocked('KICAD_CLI_UNAVAILABLE',{sourceBefore,sourceAfter:await sha256File(pcbFile)})
  const ercFile=path.join(reportsDir,'erc.json'),drcFile=path.join(reportsDir,'drc.json')
  const [erc,drc]=await Promise.all([
    adapters.runErc({schFile:schematicFile,outputFile:ercFile,kicadCliPath:cli.path}),
    adapters.runDrc({pcbFile,outputFile:drcFile,kicadCliPath:cli.path,saveBoard:false}),
  ])
  const sourceAfterValidation=await sha256File(pcbFile)
  const clean=erc.exitCode===0 && drc.exitCode===0 && issueTotal(erc)===0 && issueTotal(drc)===0
  if (!clean || sourceBefore!==sourceAfterValidation) return blocked(sourceBefore!==sourceAfterValidation?'SOURCE_MUTATED_DURING_VALIDATION':'ERC_DRC_NOT_CLEAN',{sourceBefore,sourceAfter:sourceAfterValidation,erc,drc})

  const gerberDir=path.join(outputDir,'Gerbers'),drillDir=path.join(outputDir,'Drill')
  const bomFile=path.join(outputDir,'BOM','bom.csv'),cplFile=path.join(outputDir,'CPL','cpl.csv')
  const [gerbers,drill,bom,cpl]=await Promise.all([
    adapters.exportGerbers({pcbFile,outputDir:gerberDir,kicadCliPath:cli.path}),
    adapters.exportDrill({pcbFile,outputDir:drillDir,kicadCliPath:cli.path}),
    adapters.exportBom({schFile:schematicFile,outputFile:bomFile,kicadCliPath:cli.path}),
    adapters.exportCpl({pcbFile,outputFile:cplFile,kicadCliPath:cli.path}),
  ])
  const exports=[gerbers,drill,bom,cpl]
  if (exports.some(row=>row.exitCode!==0 || !row.files?.length)) return blocked('MANUFACTURING_EXPORT_FAILED',{sourceBefore,sourceAfter:await sha256File(pcbFile),erc,drc,exports})
  const required=[...gerbers.files,...drill.files,...bom.files,...cpl.files,ercFile,drcFile]
  const zipFile=path.join(outputDir,`${path.basename(projectDir)}_Manufacturing.zip`)
  const packaging=await adapters.packageJlcpcb({projectDir,outputFile:zipFile,requiredFiles:required})
  const sourceAfter=await sha256File(pcbFile)
  const artifactEvidence=await Promise.all([...required,zipFile].map(fileEvidence))
  const executedAt=new Date().toISOString()
  const evidence={
    project:{schematic:schematicFile,pcb:pcbFile},
    erc:acceptanceRun(erc,ercFile,executedAt),drc:{...acceptanceRun(drc,drcFile,executedAt),unconnectedItems:input.unconnectedItems},
    manufacturing:{gerbers:gerbers.files,drill:drill.files,bom:bom.files[0],cpl:cpl.files[0],zip:zipFile},
    sourcing,proof,metrics,assetBindings,sourceProtection:{unchanged:sourceBefore===sourceAfter,beforeSha256:sourceBefore,afterSha256:sourceAfter},
  }
  const acceptance=packaging.status==='MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW'
    ? await evaluateBoardAcceptance(evidence,input.acceptanceOptions)
    : {status:'BOARD_REJECTED',accepted:false,blockers:[{code:'MANUFACTURING_PACKAGE_FAILED',message:packaging.status}]}
  const manifest={schema:'boardforge.phase2c.manufacturing-evidence.v1',generatedAt:executedAt,status:acceptance.accepted?'MANUFACTURING_ACCEPTED':'MANUFACTURING_REJECTED',cli:{version:cli.version},sourceProtection:evidence.sourceProtection,artifacts:artifactEvidence,packaging:{status:packaging.status,zip:zipFile},acceptance,resume:challengeResumeAfterAcceptance(acceptance)}
  const manifestPath=path.join(reportsDir,'BoardForge_Manufacturing_Evidence.json')
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n','utf8')
  return {...manifest,manifestPath,evidence}
}
export function productionAssetBindings(report) {
  return {status:report?.status,manufacturingAllowed:report?.manufacturingAllowed===true,components:(report?.components||[]).map(row=>{const mpn=row.canonicalBinding?.binding?.manufacturerPartNumber||row.exactMpnRequirement,pinMap=row.canonicalBinding?.binding?.pinMap||row.pinMap,asset=approvedAssetFor(mpn),aliases=asset?.pinAliases||{},hasGroupedPads=Object.keys(asset?.footprintPadAliases||{}).length>0,padMap=hasGroupedPads?{...pinMap}:Object.fromEntries(Object.entries(pinMap||{}).map(([pin,net])=>[aliases[pin]||pin,net]));const tpsSourceShort=mpn==='TPS25750DRJKR'&&row.ref==='U2'&&['23','24','25','32','33'].every(pin=>pinMap?.[pin]==='VBUS');if(tpsSourceShort)padMap['23']='VBUS_IN';return{ref:row.ref,mpn,exactMpnVerified:row.canonicalBinding?.status==='BOUND',symbol:row.canonicalBinding?.projections?.schematic?.symbol?.libId||row.symbol,footprint:row.canonicalBinding?.projections?.schematic?.footprint||row.footprint,pinMapVerified:row.canonicalBinding?.status==='BOUND',pinMap,symbolPinMap:pinMap,footprintPadMap:padMap,pinAliases:aliases,physicalFootprintPadMap:asset?.footprintPadMap||null,physicalPadAliases:asset?.footprintPadAliases||null,physicalNetEquivalencePolicy:tpsSourceShort?TPS25750_SOURCE_VBUS_EQUIVALENCE:null,bindingId:row.canonicalBinding?.binding?.bindingId||null}})}
}
export function challengeResumeAfterAcceptance(acceptance) {
  return acceptance?.accepted===true
    ? {allowed:true,command:'npm run boardforge:phase2c-autonomous-challenge -- --resume-from next-board'}
    : {allowed:false,command:null,reason:'Current pilot board has not passed the strict acceptance gate.'}
}

const issueTotal=(run)=>(run.issueCounts?.errors||0)+(run.issueCounts?.warnings||0)
const acceptanceRun=(run,reportPath,executedAt)=>({tool:'kicad-cli',exitCode:run.exitCode,errors:run.issueCounts?.errors||0,violations:issueTotal(run),reportPath,executedAt})
async function sha256File(file){return createHash('sha256').update(await readFile(file)).digest('hex')}
async function fileEvidence(file){const data=await readFile(file),info=await stat(file);return {path:file,bytes:info.size,sha256:createHash('sha256').update(data).digest('hex')}}
function blocked(status,detail){return {schema:'boardforge.phase2c.manufacturing-evidence.v1',status,accepted:false,...detail,resume:challengeResumeAfterAcceptance({accepted:false})}}
