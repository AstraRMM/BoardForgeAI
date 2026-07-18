import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { REAL_BOARD_PROOF_BOARDS, runRealBoardProof } from '../plugins/boardforge-plugin/lib/real-board-proof.mjs'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from '../plugins/boardforge-plugin/lib/phase2c/manufacturing-pipeline.mjs'
import { stm32ControllerTemplate, validateStm32ControllerTemplate } from '../plugins/boardforge-plugin/lib/phase2c/templates/stm32-controller.mjs'
import { rp2040InstrumentTemplate, validateRp2040InstrumentTemplate } from '../plugins/boardforge-plugin/lib/phase2c/templates/rp2040-instrument.mjs'
import { usbCPdSinkTemplate, validateUsbCPdSinkTemplate } from '../plugins/boardforge-plugin/lib/phase2c/templates/usb-c-pd-sink.mjs'
import { usbCPdSourceTemplate, validateUsbCPdSourceConfigurationEvidence, validateUsbCPdSourceTemplate } from '../plugins/boardforge-plugin/lib/phase2c/templates/usb-c-pd-source.mjs'
import { industrialIoTemplate, validateIndustrialIoTemplate } from '../plugins/boardforge-plugin/lib/phase2c/templates/industrial-io.mjs'
import { generateIndustrialIoProductionBoard } from '../plugins/boardforge-plugin/lib/phase2c/industrial-io-production-engine.mjs'
import { generateCatalogProductionBoard } from '../plugins/boardforge-plugin/lib/phase2c/catalog-production-engine.mjs'
import { analyzeRequirements } from '../plugins/boardforge-plugin/lib/phase2c/requirements-intelligence.mjs'
import { createTrainingDesignIntent } from '../plugins/boardforge-plugin/lib/phase2c/training-design-intent.mjs'

const execFile=promisify(execFileCallback)
const defaultRoot=process.env.BOARDFORGE_50_BOARD_ROOT||String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge`
const repo=path.resolve(import.meta.dirname,'..')

export function createPhase2cChallengeDriver({root=defaultRoot,generateStm32=generateStm32ProductionBoard,generateRp2040=generateRp2040ProductionBoard,generateUsbCPdSink=generateUsbCPdSinkProductionBoard,generateUsbCPdSource=generateUsbCPdSourceProductionBoard,generateIndustrialIo=generateIndustrialIoProductionBoard,generateCatalog=generateCatalogProductionBoard}={}) {
  const loadPilot=()=>loadAcceptedEvidence(path.join(root,'001_ESP32_SENSOR_HUB','usb-c-esp32-sensor'))
  return {
    executePilot:loadPilot,
    async executeBoard(board,context={}) {
      // Index zero is owned exclusively by executePilot and must never be replayed.
      if(context.index===0 || board?.slug==='esp32-sensor-hub') return rejected('PILOT_INDEX_REPLAY_FORBIDDEN',board)
      const designIntent=context.trainingMode===true?createTrainingDesignIntent({board}):null
      const complete=result=>designIntent?{...result,designIntent}:result
      if(context.index===1 && board?.slug==='stm32-controller') {
        const contract=validateStm32ControllerTemplate(stm32ControllerTemplate)
        if(!contract.ok) return complete(rejected('STM32_PRODUCTION_TEMPLATE_INVALID',board,{errors:contract.errors}))
        const acceptedProject=path.join(root,board.id||stm32ControllerTemplate.id,board.slug)
        try { return complete(strictResult(await loadAcceptedEvidence(acceptedProject),board)) }
        catch(error) { if(error?.code!=='ENOENT') throw error }
        const result=await generateStm32({root,board,template:stm32ControllerTemplate,context})
        return complete(strictResult(result,board))
      }
      if(context.index===2 && board?.slug==='rp2040-instrument') {
        const contract=validateRp2040InstrumentTemplate(rp2040InstrumentTemplate)
        if(!contract.ok) return complete(rejected('RP2040_PRODUCTION_TEMPLATE_INVALID',board,{errors:contract.errors}))
        const result=await generateRp2040({root,board,template:rp2040InstrumentTemplate,context})
        return complete(strictResult(result,board))
      }
      if(context.index===3 && board?.slug==='usb-c-pd-sink') {
        const contract=validateUsbCPdSinkTemplate(usbCPdSinkTemplate)
        if(!contract.ok) return complete(rejected('USB_C_PD_SINK_PRODUCTION_TEMPLATE_INVALID',board,{errors:contract.errors}))
        const result=await generateUsbCPdSink({root,board,template:usbCPdSinkTemplate,context})
        return complete(strictResult(result,board))
      }
      if(context.index===4 && board?.slug==='usb-c-pd-source') {
        const contract=validateUsbCPdSourceTemplate(usbCPdSourceTemplate)
        if(!contract.ok) return complete(rejected('USB_C_PD_SOURCE_PRODUCTION_TEMPLATE_INVALID',board,{errors:contract.errors}))
        return complete(strictPdSourceResult(await generateUsbCPdSource({root,board,template:usbCPdSourceTemplate,context}),board,context.requirementsAnswers,{trainingMode:context.trainingMode,trainingIntent:designIntent}))
      }
      if(context.index===5 && board?.slug==='industrial-io') {
        const contract=validateIndustrialIoTemplate(industrialIoTemplate)
        if(!contract.ok)return complete(rejected('INDUSTRIAL_IO_PRODUCTION_TEMPLATE_INVALID',board,{errors:contract.errors}))
        return complete(strictResult(await generateIndustrialIo({root,board,template:industrialIoTemplate,context}),board))
      }
      if(context.index>=6 && Number.parseInt(board?.id,10)>=7) return complete(strictResult(await generateCatalog({root,board,context:{...context,trainingIntent:designIntent}}),board))
      return complete(rejected('BOARD_CLASS_ENGINE_NOT_IMPLEMENTED',board,{architectureClass:board?.architectureClass}))
    },
  }
}

export async function generateUsbCPdSourceProductionBoard({root,template}) {
  const outputRoot=path.join(root,template.id)
  const summary=await runRealBoardProof({outputRoot,fresh:true,board:'usb-c-pd-source',liveBindings:true})
  const generated=summary.boards[0],projectDir=generated.outputFolder,files=await readdir(projectDir)
  const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||'missing.kicad_sch')
  const pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'missing.kicad_pcb')
  const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8'))
  const definition=REAL_BOARD_PROOF_BOARDS.find(row=>row.id==='usb-c-pd-source')
  const contract=verifyUsbCPdSourceProductionContract({template,actualLayers:definition?.layers,sourcing})
  if(!contract.ok) return rejected('USB_C_PD_SOURCE_GENERATED_OUTPUT_CONTRACT_MISMATCH',{id:template.id},{errors:contract.errors,projectDir})

  const configurationDir=path.join(projectDir,'Configuration'),evidenceFile=path.join(configurationDir,'BoardForge_PD_Source_Configuration_Evidence.json')
  let configurationEvidence
  try{configurationEvidence=JSON.parse(await readFile(evidenceFile,'utf8'))}catch(error){return rejected('PD_SOURCE_EXTERNAL_CONFIGURATION_EVIDENCE_MISSING',{id:template.id},{projectDir,evidenceFile,detail:String(error.message||error)})}
  const evidenceValidation=validateUsbCPdSourceConfigurationEvidence(configurationEvidence)
  if(!evidenceValidation.valid)return rejected('PD_SOURCE_EXTERNAL_CONFIGURATION_EVIDENCE_INVALID',{id:template.id},{projectDir,evidenceFile,errors:evidenceValidation.errors})
  const contained=file=>{const resolved=path.resolve(file),root=path.resolve(projectDir)+path.sep;if(!resolved.startsWith(root))throw new Error(`Configuration artifact escapes project root: ${resolved}`);return resolved}
  let imageFile,readbackFile,image,readback
  try{imageFile=contained(configurationEvidence.binaryPath);readbackFile=contained(configurationEvidence.readbackPath);[image,readback]=await Promise.all([readFile(imageFile),readFile(readbackFile)])}catch(error){return rejected('PD_SOURCE_CONFIGURATION_ARTIFACT_UNREADABLE',{id:template.id},{projectDir,evidenceFile,detail:String(error.message||error)})}
  const immutableSha256=createHash('sha256').update(image).digest('hex'),readbackSha256=createHash('sha256').update(readback).digest('hex')
  if(immutableSha256!==configurationEvidence.sha256||readbackSha256!==configurationEvidence.readbackSha256)return rejected('PD_SOURCE_CONFIGURATION_ARTIFACT_DIGEST_MISMATCH',{id:template.id},{projectDir,evidenceFile})
  const productionConfig={eepromImageVerified:true,readbackVerified:true,noUnadvertisedPdo:true,immutableSha256,readbackSha256,imageFile,readbackFile,configuration:configurationEvidence}

  const sourceBytes=(await readFile(pcbFile)).length,rustCli=path.join(repo,'rust','target','debug','boardforge-kicad.exe')
  const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024})
  const proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
  const area=(definition?.widthMm||0)*(definition?.heightMm||0)
  const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(generated.assetBinding),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
  return {acceptance:manufacturing.acceptance,manufacturingEvidence:manufacturing,productionConfig,production:{templateId:template.id,generator:'runRealBoardProof/usb-c-pd-source',projectDir}}
}

export async function generateUsbCPdSinkProductionBoard({root,template}) {
  const outputRoot=path.join(root,template.id)
  const summary=await runRealBoardProof({outputRoot,fresh:true,board:'usb-c-pd-sink',liveBindings:true})
  const board=summary.boards[0],projectDir=board.outputFolder,files=await readdir(projectDir)
  const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||'missing.kicad_sch')
  const pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'missing.kicad_pcb')
  const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8'))
  const definition=REAL_BOARD_PROOF_BOARDS.find(row=>row.id==='usb-c-pd-sink')
  const contract=verifyUsbCPdSinkProductionContract({template,actualLayers:definition?.layers,sourcing})
  if(!contract.ok) return rejected('USB_C_PD_SINK_GENERATED_OUTPUT_CONTRACT_MISMATCH',{id:template.id},{errors:contract.errors,projectDir})
  const sourceBytes=(await readFile(pcbFile)).length,rustCli=path.join(repo,'rust','target','debug','boardforge-kicad.exe')
  const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024})
  const proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
  const area=(definition?.widthMm||0)*(definition?.heightMm||0)
  const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(board.assetBinding),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
  return {acceptance:manufacturing.acceptance,manufacturingEvidence:manufacturing,production:{templateId:template.id,generator:'runRealBoardProof/usb-c-pd-sink',projectDir}}
}

export async function generateRp2040ProductionBoard({root,template}) {
  const outputRoot=path.join(root,template.id)
  const summary=await runRealBoardProof({outputRoot,fresh:true,board:'rp2040-instrument',liveBindings:true})
  const board=summary.boards[0],projectDir=board.outputFolder,files=await readdir(projectDir)
  const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||'missing.kicad_sch')
  const pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'missing.kicad_pcb')
  const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8'))
  const definition=REAL_BOARD_PROOF_BOARDS.find(row=>row.id==='rp2040-instrument')
  const contract=verifyRp2040ProductionContract({template,actualLayers:definition?.layers,sourcing})
  if(!contract.ok) return rejected('RP2040_GENERATED_OUTPUT_CONTRACT_MISMATCH',{id:template.id},{errors:contract.errors,projectDir})
  const sourceBytes=(await readFile(pcbFile)).length,rustCli=path.join(repo,'rust','target','debug','boardforge-kicad.exe')
  const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024})
  const proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
  const area=(definition?.widthMm||0)*(definition?.heightMm||0)
  const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(board.assetBinding),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
  return {acceptance:manufacturing.acceptance,manufacturingEvidence:manufacturing,production:{templateId:template.id,generator:'runRealBoardProof/rp2040-instrument',projectDir}}
}

export async function generateStm32ProductionBoard({root,template}) {
  const outputRoot=path.join(root,template.id)
  const summary=await runRealBoardProof({outputRoot,fresh:true,board:'stm32-controller',liveBindings:true})
  const board=summary.boards[0],projectDir=board.outputFolder,files=await readdir(projectDir)
  const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||'missing.kicad_sch')
  const pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'missing.kicad_pcb')
  const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8'))
  const definition=REAL_BOARD_PROOF_BOARDS.find(row=>row.id==='stm32-controller')
  const contract=verifyStm32ProductionContract({template,definition,sourcing})
  if(!contract.ok) return rejected('STM32_GENERATED_OUTPUT_CONTRACT_MISMATCH',{id:template.id},{errors:contract.errors,projectDir})
  const sourceBytes=(await readFile(pcbFile)).length
  const rustCli=path.join(repo,'rust','target','debug','boardforge-kicad.exe')
  const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024})
  const proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
  const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(board.assetBinding),proof,metrics:{boardAreaMm2:62*38,componentDensity:sourcing.rows.length/(62*38)},unconnectedItems:0})
  return {acceptance:manufacturing.acceptance,manufacturingEvidence:manufacturing,production:{templateId:template.id,generator:'runRealBoardProof/stm32-controller',projectDir}}
}

export function verifyStm32ProductionContract({template,definition,sourcing}) {
  return verifyProductionContract({template,actualLayers:definition?.layers,sourcing})
}

export function verifyRp2040ProductionContract({template,actualLayers,sourcing}) {
  return verifyProductionContract({template,actualLayers,sourcing})
}

export function verifyUsbCPdSinkProductionContract({template,actualLayers,sourcing}) { return verifyProductionContract({template,actualLayers,sourcing}) }
export function verifyUsbCPdSourceProductionContract({template,actualLayers,sourcing}) { return verifyProductionContract({template,actualLayers,sourcing}) }

function verifyProductionContract({template,actualLayers,sourcing}) {
  const errors=[]
  if(actualLayers!==template?.electrical?.layers) errors.push(`layer-count:${actualLayers??'missing'}!=${template?.electrical?.layers??'missing'}`)
  const rows=Array.isArray(sourcing?.rows)?sourcing.rows:[]
  const mpns=new Set(rows.map(row=>String(row.mpn||row.MPN||'').toUpperCase()))
  for(const requirement of template?.requirements||[]) if(!mpns.has(requirement.mpn.toUpperCase())) errors.push(`missing-exact-mpn:${requirement.mpn}`)
  return {ok:errors.length===0,errors}
}

export async function loadAcceptedEvidence(projectDir){
  const root=path.resolve(projectDir), evidenceFile=path.join(root,'Evidence','BoardForge_Manufacturing_Evidence.json')
  const evidence=JSON.parse(await readFile(evidenceFile,'utf8'))
  if(evidence?.schema!=='boardforge.phase2c.manufacturing-evidence.v1')throw invalidEvidence('EXISTING_ACCEPTANCE_SCHEMA_INVALID')
  const owned=[...(evidence.artifacts||[]).map(row=>row.path),evidence.packaging?.zip].filter(Boolean)
  if(!owned.length||owned.some(file=>!inside(root,file)))throw invalidEvidence('EXISTING_ACCEPTANCE_PATH_ESCAPES_PROJECT')
  return {acceptance:evidence.acceptance,manufacturingEvidence:evidence,production:{generator:'existing-hardened-manufacturing-evidence',projectDir:root,evidenceFile}}
}
function inside(root,file){const relative=path.relative(root,path.resolve(file));return relative!==''&&!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative)}
function invalidEvidence(code){const error=new Error(code);error.code=code;return error}
function strictResult(result,board){if(result?.acceptance?.accepted===true&&result?.manufacturingEvidence?.status==='MANUFACTURING_ACCEPTED')return result;return {...result,acceptance:result?.acceptance||{status:'BOARD_REJECTED',accepted:false,blockers:[{code:'STRICT_MANUFACTURING_ACCEPTANCE_MISSING'}]},failure:{code:result?.failure?.code||'STRICT_MANUFACTURING_ACCEPTANCE_FAILED',boardId:board?.id}}}
function strictPdSourceResult(result,board,answers={},mode={}){const config=result?.productionConfig,configValid=config?.eepromImageVerified===true&&config?.readbackVerified===true&&config?.noUnadvertisedPdo===true&&/^[a-f0-9]{64}$/i.test(config?.immutableSha256||'');if(!configValid){const code='PD_SOURCE_EEPROM_CONFIGURATION_PROOF_MISSING';return rejected(code,board,{requirements:analyzeRequirements({boardId:board?.id,validation:{errors:[code]},answers,trainingMode:mode.trainingMode===true,trainingIntent:mode.trainingIntent})})}return strictResult(result,board)}
function rejected(code,board,extra={}){return {acceptance:{status:'BOARD_REJECTED',accepted:false,blockers:[{code,message:`${code}: ${board?.id||board?.slug||'unknown board'}`}]},requirements:extra.requirements,failure:{code,boardId:board?.id,...extra}}}

const driver=createPhase2cChallengeDriver()
export const executePilot=driver.executePilot
export const executeBoard=driver.executeBoard
