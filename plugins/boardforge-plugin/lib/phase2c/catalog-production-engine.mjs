import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { REAL_BOARD_PROOF_BOARDS, runRealBoardProof } from '../real-board-proof.mjs'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from './manufacturing-pipeline.mjs'

const execFile=promisify(execFileCallback)
const repo=path.resolve(import.meta.dirname,'../../../..')
const topologyIds=['stm32-controller','rp2040-instrument','usb-c-pd-sink','usb-c-esp32-sensor']

export function catalogDefinition(board,index=0) {
  if(!board || typeof board!=='object') throw new TypeError('Catalog board specification is required')
  const topologyId=topologyFor(board,index)
  const base=REAL_BOARD_PROOF_BOARDS.find(row=>row.id===topologyId)
  if(!base) throw new Error(`Catalog topology is unavailable: ${topologyId}`)
  if(!Array.isArray(base.bom) || base.bom.length===0) throw new Error(`Catalog topology has no production BOM: ${topologyId}`)
  if(!base.bom.every(row=>row && typeof row==='object' && typeof row.ref==='string')) throw new Error(`Catalog topology has an invalid production BOM: ${topologyId}`)
  const gateway=/dual-bus CAN/i.test(`${board.purpose||''} ${(board.distinguishingFeatures||[]).join(' ')}`)
  const productionBase=gateway?dualCanGatewayBase(base):base
  const width=productionBase.widthMm,height=productionBase.heightMm,family=board.outline?.family||'asymmetric-instrument'
  return {
    ...structuredClone(productionBase), id:board.slug, topologyId:gateway?'can-gateway':topologyId,
    name:`${board.id} ${title(board.slug)}`,
    prompt:`Build ${board.purpose}. Architecture: ${board.architectureClass}. Required distinguishing behavior: ${(board.distinguishingFeatures||[]).join('; ')}. Preserve the ${family} mechanical intent.`,
    intent:[board.purpose,board.architectureClass,...(board.distinguishingFeatures||[]),`${family} custom mechanical envelope`],
    preset:'blank-custom', outlinePoints:outlineFor(family,width,height,index), holes:[],
    catalog:{boardId:board.id,minimumFunctionalBlocks:board.minimumFunctionalBlocks,maximumAreaMm2:board.maximumAreaMm2,outlineFamily:family},
  }
}

function dualCanGatewayBase(base){
  const copy=structuredClone(base)
  copy.widthMm=68;copy.heightMm=44;copy.layers=6
  copy.bom.push(
    {...structuredClone(copy.bom.find(row=>row.ref==='U2')),ref:'U4',role:'second CAN physical layer'},
    {...structuredClone(copy.bom.find(row=>row.ref==='J2')),ref:'J3',role:'second CAN field connector'},
    {...structuredClone(copy.bom.find(row=>row.ref==='R1')),ref:'R2',role:'CAN2 termination'},
    {...structuredClone(copy.bom.find(row=>row.ref==='D1')),ref:'D2',role:'CAN2 surge protection'},
  )
  return copy
}

export async function generateCatalogProductionBoard({root,board,context={}}) {
  const definition=catalogDefinition(board,context.index||0)
  const semanticGate=validateCatalogSemanticTopology(definition)
  if(!semanticGate.ok){const error=new Error(`Catalog semantic topology is incomplete: ${semanticGate.errors.join('; ')}`);error.code='CATALOG_SEMANTIC_TOPOLOGY_INCOMPLETE';error.gate=semanticGate;throw error}
  const boardRoot=path.join(root,board.id)
  const summary=await runRealBoardProof({outputRoot:boardRoot,fresh:true,board:definition.id,boardDefinitions:[definition],liveBindings:true})
  const generated=summary.boards[0],projectDir=generated.outputFolder,files=await readdir(projectDir)
  const schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||'missing.kicad_sch')
  const pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'missing.kicad_pcb')
  const authoritativeGate=await verifyCatalogAuthoritativePcbSelection({pcbFile,routing:generated.categoryPcbEvidence?.authoritativeRouting})
  if(!authoritativeGate.ok){const error=new Error(`Catalog manufacturing refused non-authoritative PCB: ${authoritativeGate.errors.join('; ')}`);error.code='CATALOG_AUTHORITATIVE_PCB_NOT_PROMOTED';error.gate=authoritativeGate;throw error}
  const sourcing=JSON.parse(await readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8'))
  const sourceBytes=(await readFile(pcbFile)).length
  const rustCli=path.join(repo,'rust','target','debug','boardforge-kicad.exe')
  const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024})
  const area=polygonArea(definition.outlinePoints)
  const proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
  const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(generated.assetBinding),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
  const report={schema:'boardforge.phase2c.catalog-board-report.v1',boardId:board.id,purpose:board.purpose,architectureClass:board.architectureClass,topologyId:definition.topologyId,outline:{kind:'custom',family:definition.catalog.outlineFamily,points:definition.outlinePoints,areaMm2:area},usefulSpecification:{minimumFunctionalBlocks:board.minimumFunctionalBlocks,distinguishingFeatures:board.distinguishingFeatures},pipelineStatus:manufacturing.status,acceptance:manufacturing.acceptance,generatedAt:new Date().toISOString()}
  const history={schema:'boardforge.phase2c.failure-fix-history.v1',boardId:board.id,entries:manufacturing.acceptance?.accepted?[]:[{attempt:1,stage:'strict-manufacturing',failure:manufacturing.status,fix:'No silent workaround; retain exact evidence and require engine or design correction before retry.',evidence:manufacturing.manifestPath||null}]}
  await mkdir(path.join(projectDir,'Reports'),{recursive:true})
  await writeFile(path.join(projectDir,'Reports','BoardForge_Campaign_Report.json'),JSON.stringify(report,null,2)+'\n')
  await writeFile(path.join(projectDir,'Reports','BoardForge_Failure_Fix_History.json'),JSON.stringify(history,null,2)+'\n')
  return {acceptance:manufacturing.acceptance,manufacturingEvidence:manufacturing,production:{generator:'catalog-production-engine',projectDir,definitionDigest:createHash('sha256').update(JSON.stringify(definition)).digest('hex')},catalogReport:report}
}

export function validateCatalogSemanticTopology(definition={}){
  const errors=[],bom=Array.isArray(definition.bom)?definition.bom:[],topology=definition.topologyId||definition.id,roles=bom.map(row=>String(row.role||'').toLowerCase()),semanticText=`${definition.name||''} ${definition.prompt||''} ${(definition.intent||[]).join(' ')}`.toLowerCase()
  const hasRole=pattern=>roles.some(role=>pattern.test(role))
  const outlineArea=Array.isArray(definition.outlinePoints)&&definition.outlinePoints.length>=3?polygonArea(definition.outlinePoints):null,maximumAreaMm2=definition.catalog?.maximumAreaMm2
  if(Number.isFinite(maximumAreaMm2)&&(!Number.isFinite(outlineArea)||outlineArea>maximumAreaMm2))errors.push('custom-outline-exceeds-maximum-area')
  if(topology==='stm32-controller'||topology==='can-gateway'){
    if(!hasRole(/boot.*(bias|strap)|(?:bias|strap).*boot/))errors.push('mcu-boot-bias-network-missing')
    if(!hasRole(/reset.*(bias|rc)|(?:bias|rc).*reset/))errors.push('mcu-reset-network-missing')
    if(!hasRole(/swd|debug.*header|programming.*header/))errors.push('mcu-debug-connector-missing')
    if(!hasRole(/input.*(fuse|protection)|reverse.*polarity|power.*protection/))errors.push('power-entry-protection-missing')
  }
  if(topology==='can-gateway'){
    const transceivers=bom.filter(row=>row.mpn==='SN65HVD230DR')
    const controller=bom.find(row=>/^U1$/i.test(row.ref)||/controller/.test(String(row.role||'').toLowerCase()))
    const externalCanControllers=bom.filter(row=>/external.*can.*controller|spi.*can.*controller/.test(String(row.role||'').toLowerCase()))
    if(controller?.mpn==='STM32F103C8T6'&&externalCanControllers.length===0)errors.push('dual-can-controller-capability-missing')
    if(transceivers.length<2)errors.push('dual-can-transceivers-missing')
    if(bom.filter(row=>/^J[23]$/i.test(row.ref)&&/can/i.test(String(row.role||''))).length<2)errors.push('dual-can-field-connectors-missing')
    if(bom.filter(row=>/^R[12]$/i.test(row.ref)&&/termination/i.test(String(row.role||''))).length<2)errors.push('dual-can-termination-missing')
    if(bom.filter(row=>/^D[12]$/i.test(row.ref)&&/surge|tvs/i.test(String(row.role||''))).length<2)errors.push('dual-can-tvs-missing')
    if(!hasRole(/selectable.*termination|termination.*(jumper|switch|selectable)/))errors.push('dual-can-termination-not-selectable')
    if(!hasRole(/transceiver.*mode|rs.*(bias|strap)|slope.*control/))errors.push('dual-can-phy-mode-bias-missing')
    if(bom.filter(row=>/decoupling/i.test(String(row.role||''))).length<6)errors.push('gateway-per-rail-decoupling-insufficient')
    if(!hasRole(/surge.*(input|power)|input.*surge/))errors.push('power-entry-surge-suppression-missing')
    if(!hasRole(/bulk.*(input|power|decoupl)/))errors.push('power-entry-bulk-decoupling-missing')
    if(bom.some(row=>row.mpn==='SN65HVD230DR'&&/isolated/i.test(String(row.role||''))))errors.push('non-isolated-transceiver-labeled-isolated')
  }
  if(/ethernet|wired embedded control|wired protocol gateway/.test(semanticText)){
    if(!hasRole(/ethernet.*(mac|controller)|(?:mac|controller).*ethernet/))errors.push('ethernet-mac-controller-missing')
    if(!hasRole(/ethernet.*phy|phy.*ethernet/))errors.push('ethernet-phy-missing')
    if(!hasRole(/rj45|ethernet.*connector/))errors.push('ethernet-rj45-connector-missing')
    if(!hasRole(/magnetics|transformer/))errors.push('ethernet-magnetics-missing')
    if(!hasRole(/phy.*clock|ethernet.*clock|crystal.*phy/))errors.push('ethernet-reference-clock-missing')
    if(!hasRole(/phy.*reset|ethernet.*reset/))errors.push('ethernet-phy-reset-network-missing')
    if(!hasRole(/phy.*strap|ethernet.*strap/))errors.push('ethernet-phy-strap-network-missing')
    if(!hasRole(/ethernet.*(tvs|esd)|(?:tvs|esd).*ethernet/))errors.push('ethernet-line-protection-missing')
    if(!hasRole(/ethernet.*termination|phy.*termination/))errors.push('ethernet-line-termination-missing')
    if(!hasRole(/phy.*decoupling|ethernet.*decoupling/))errors.push('ethernet-phy-decoupling-missing')
    if(!hasRole(/phy.*(regulator|supply)|ethernet.*power/))errors.push('ethernet-phy-power-missing')
  }
  if(definition.id==='usb-hub'||/four-port usb expansion/i.test(String(definition.prompt||''))){
    const hubControllers=bom.filter(row=>/usb.*hub.*controller|hub.*controller/.test(String(row.role||'').toLowerCase()))
    const upstream=bom.filter(row=>/upstream.*usb|usb.*upstream/.test(String(row.role||'').toLowerCase()))
    const downstream=bom.filter(row=>/downstream.*usb|usb.*downstream/.test(String(row.role||'').toLowerCase()))
    if(hubControllers.length!==1)errors.push('usb-hub-controller-missing')
    if(upstream.length!==1)errors.push('usb-hub-upstream-port-missing')
    if(downstream.length<4)errors.push('usb-hub-four-downstream-ports-missing')
    if(!hasRole(/port.*power.*(switch|limit)|power.*switch.*port/))errors.push('usb-hub-port-power-control-missing')
    if(!hasRole(/overcurrent|over-current/))errors.push('usb-hub-overcurrent-evidence-missing')
    if(!hasRole(/hub.*clock|crystal.*hub|hub.*crystal/))errors.push('usb-hub-clock-evidence-missing')
    if(topology==='rp2040-instrument')errors.push('usb-hub-category-mapped-to-mcu-instrument')
  }
  if(definition.id==='usb-isolator'||/galvanically isolated usb/i.test(semanticText)){
    const upstream=bom.filter(row=>/upstream.*usb.*connector|upstream.*connector.*usb|usb.*upstream.*connector/.test(String(row.role||'').toLowerCase()))
    const downstream=bom.filter(row=>/downstream.*usb.*connector|downstream.*connector.*usb|usb.*downstream.*connector/.test(String(row.role||'').toLowerCase()))
    const isolation=evidenceUsbIsolation(definition)
    if(!hasRole(/usb.*isolator|isolator.*usb/))errors.push('usb-isolator-device-missing')
    if(!hasRole(/isolated.*(power|dc)|(?:power|dc).*isolated/))errors.push('usb-isolator-isolated-power-missing')
    if(upstream.length!==1)errors.push('usb-isolator-upstream-connector-missing')
    if(downstream.length!==1)errors.push('usb-isolator-downstream-connector-missing')
    if(!hasRole(/upstream.*(esd|tvs)|(?:esd|tvs).*upstream/))errors.push('usb-isolator-upstream-esd-missing')
    if(!hasRole(/downstream.*(esd|tvs)|(?:esd|tvs).*downstream/))errors.push('usb-isolator-downstream-esd-missing')
    if(!hasRole(/upstream.*decoupling|decoupling.*upstream/))errors.push('usb-isolator-upstream-decoupling-missing')
    if(!hasRole(/downstream.*decoupling|decoupling.*downstream/))errors.push('usb-isolator-downstream-decoupling-missing')
    if(!isolation.isolatorPrimarySourceVerified||!(isolation.isolationVrms>0))errors.push('usb-isolator-rating-primary-source-unverified')
    if(!isolation.isolatedPowerPrimarySourceVerified||!(isolation.powerIsolationVrms>0))errors.push('usb-isolator-power-rating-primary-source-unverified')
    if(!isolation.keepoutVerified||!(isolation.creepageMm>0)||!(isolation.clearanceMm>0))errors.push('usb-isolator-creepage-clearance-unverified')
    if(topology==='usb-c-esp32-sensor')errors.push('usb-isolator-category-mapped-to-esp32-sensor')
  }
  const requireCapabilities=requirements=>{for(const [code,pattern,minimum=1]of requirements)if(roles.filter(role=>pattern.test(role)).length<minimum)errors.push(code)}
  if(/protected relay actuation/.test(semanticText))requireCapabilities([
    ['relay-output-devices-missing',/\brelay\b.*(output|device|coil)|(?:output|device|coil).*\brelay\b/],
    ['relay-coil-drivers-missing',/relay.*(driver|transistor|mosfet)|(?:driver|transistor|mosfet).*relay/],
    ['relay-flyback-protection-missing',/flyback|freewheel|coil.*clamp/],
    ['relay-contact-connectors-missing',/relay.*(contact|terminal)|(?:contact|terminal).*relay/],
    ['relay-output-protection-missing',/contact.*(snubber|tvs|protection)|relay.*output.*protection/],
    ['relay-input-isolation-or-protection-missing',/input.*(isolation|opto|protection)|isolated.*control/],
  ])
  if(/brushed dc motor drive/.test(semanticText))requireCapabilities([
    ['brushed-motor-h-bridge-missing',/h.bridge|full.bridge/],
    ['brushed-motor-power-switches-missing',/motor.*mosfet|bridge.*mosfet|integrated.*motor.*driver/],
    ['brushed-motor-connector-missing',/motor.*(connector|terminal)|(?:connector|terminal).*motor/],
    ['brushed-motor-current-sense-missing',/motor.*current.*sense|current.*shunt/],
    ['brushed-motor-power-entry-protection-missing',/motor.*(fuse|reverse|surge|tvs)|power.*entry.*protection/],
    ['brushed-motor-transient-clamp-missing',/motor.*(flyback|freewheel|clamp|tvs)|bridge.*transient/],
    ['brushed-motor-gate-control-missing',/gate.*driver|motor.*control.*input|pwm.*direction/],
    ['brushed-motor-bulk-decoupling-missing',/motor.*bulk|dc.link.*decoupling/],
  ])
  if(/multi-channel servo control/.test(semanticText))requireCapabilities([
    ['servo-channel-connectors-missing',/servo.*(channel|connector)|(?:channel|connector).*servo/,4],
    ['servo-pwm-controller-missing',/servo.*(pwm|timer|controller)|(?:pwm|timer).*servo/],
    ['servo-power-entry-protection-missing',/servo.*(fuse|reverse|surge|tvs)|power.*entry.*protection/],
    ['servo-rail-bulk-decoupling-missing',/servo.*(bulk|rail.*decoupling)|bulk.*servo/],
    ['servo-rail-current-capability-missing',/servo.*(current|power.*distribution)|high.current.*servo/],
    ['servo-signal-protection-missing',/servo.*(series|esd|signal.*protection)/],
    ['servo-failsafe-output-state-missing',/servo.*(failsafe|default.off|output.*disable)/],
    ['servo-supply-monitoring-missing',/servo.*(voltage|current).*monitor|rail.*telemetry/],
  ])
  if(/four protected switching channels/.test(semanticText))requireCapabilities([
    ['quad-switch-power-devices-missing',/(mosfet|smart.*switch).*(channel|output)|(?:channel|output).*(mosfet|smart.*switch)/,4],
    ['quad-switch-gate-networks-missing',/(gate|input).*(resistor|pull|bias).*(channel|switch)|(?:channel|switch).*(gate|input).*(resistor|pull|bias)/,4],
    ['quad-switch-output-terminals-missing',/(output|load).*(terminal|connector).*(channel|switch)|(?:channel|switch).*(output|load).*(terminal|connector)/,4],
    ['quad-switch-inductive-clamps-missing',/(flyback|freewheel|clamp|tvs).*(channel|output)|(?:channel|output).*(flyback|freewheel|clamp|tvs)/,4],
    ['quad-switch-power-entry-protection-missing',/(input|power).*(fuse|reverse|surge|tvs)|power.*entry.*protection/],
    ['quad-switch-current-rating-evidence-missing',/(channel|switch).*(current|soa).*rating|current.*rating.*channel/],
    ['quad-switch-default-off-evidence-missing',/(channel|gate).*(default.off|failsafe|pulldown)|reset.*safe.*switch/],
    ['quad-switch-thermal-path-evidence-missing',/(mosfet|switch).*(thermal|copper|via)|thermal.*channel/],
  ])
  if(/four protected switching channels/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('quad-switch-category-mapped-to-pd-sink')
  if(/fused multi-rail distribution/.test(semanticText))requireCapabilities([
    ['power-distribution-branch-fuses-missing',/(branch|rail|output).*(fuse|ptc)|(?:fuse|ptc).*(branch|rail|output)/,3],
    ['power-distribution-output-terminals-missing',/(branch|rail|output).*(terminal|connector)|(?:terminal|connector).*(branch|rail|output)/,3],
    ['power-distribution-input-protection-missing',/(input|main).*(fuse|reverse|surge|tvs)|power.*entry.*protection/],
    ['power-distribution-bus-capacity-evidence-missing',/(bus|distribution).*(current|ampacity|capacity)|aggregate.*current/],
    ['power-distribution-branch-rating-evidence-missing',/(branch|rail).*(current|voltage).*rating|output.*rating.*branch/],
    ['power-distribution-bulk-decoupling-missing',/(input|bus).*(bulk|decoupling)|bulk.*distribution/],
    ['power-distribution-test-or-indication-missing',/(rail|branch).*(test.*point|indicator|led)|output.*monitor/],
  ])
  if(/fused multi-rail distribution/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('power-distribution-category-mapped-to-pd-sink')
  if(/cell protection and balancing/.test(semanticText))requireCapabilities([
    ['bms-cell-monitor-missing',/(battery|cell).*(monitor|protector)|bms.*controller/],
    ['bms-cell-tap-connector-missing',/(cell|balance).*(tap|connector)|pack.*sense.*connector/],
    ['bms-balance-channels-missing',/(cell|passive).*(balance|bleed)|balance.*(resistor|switch)/,2],
    ['bms-charge-discharge-switches-missing',/(charge|discharge).*(mosfet|switch)|back.to.back.*mosfet/],
    ['bms-pack-current-sense-missing',/(pack|battery).*(current.*sense|shunt)|coulomb.*counter/],
    ['bms-temperature-sense-missing',/(battery|cell|pack).*(temperature|thermistor)|ntc.*pack/],
    ['bms-pack-protection-missing',/(pack|battery).*(fuse|tvs|reverse)|secondary.*protection/],
    ['bms-threshold-evidence-missing',/(overvoltage|undervoltage|overcurrent).*(threshold|protection)/],
  ])
  if(/cell protection and balancing/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('bms-category-mapped-to-pd-sink')
  if(/safe rechargeable pack charging/.test(semanticText))requireCapabilities([
    ['battery-charger-controller-missing',/(battery|pack).*(charger|charging.*controller)|charge.*controller/],
    ['battery-charger-pack-connector-missing',/(battery|pack).*(connector|terminal)|charge.*output.*connector/],
    ['battery-charger-current-programming-missing',/charge.*(current|sense|program)|current.*program.*charger/],
    ['battery-charger-voltage-chemistry-evidence-missing',/(chemistry|cell.*count|charge.*voltage).*(verified|configuration|selection)/],
    ['battery-charger-temperature-qualification-missing',/(battery|pack).*(temperature|thermistor|jeita)|ntc.*charg/],
    ['battery-charger-termination-status-missing',/charge.*(termination|status|done)|power.good.*charger/],
    ['battery-charger-reverse-or-power-path-missing',/(battery|charger).*(reverse|power.*path|ideal.*diode)|ship.*mode/],
    ['battery-charger-safety-timer-missing',/charge.*safety.*timer|watchdog.*charger/],
  ])
  if(/safe rechargeable pack charging/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('battery-charger-category-mapped-to-pd-sink')
  if(/three-phase motor control/.test(semanticText))requireCapabilities([['bldc-controller-missing',/bldc|motor.*controller|commutation.*controller/],['bldc-three-phase-gate-drive-missing',/three.phase.*gate|gate.*driver/],['bldc-power-switches-missing',/phase.*mosfet|power.*mosfet|half.bridge/,3],['bldc-current-sense-missing',/phase.*current.*sense|current.*shunt/],['bldc-motor-connector-missing',/motor.*connector|phase.*connector/],['bldc-dc-link-decoupling-missing',/dc.link|bulk.*motor/],['bldc-power-entry-protection-missing',/motor.*(fuse|reverse|surge|tvs)|power.*entry.*protection/],['bldc-rotor-position-interface-missing',/hall.*sensor|encoder.*motor|sensorless.*bemf|back.emf/],['bldc-safe-gate-disable-missing',/gate.*(disable|shutdown)|motor.*failsafe|default.off/],['bldc-regeneration-handling-missing',/regen|regenerat.*(clamp|brak|handling)|brake.*resistor/]])
  if(/navigation and inertial sensing/.test(semanticText))requireCapabilities([['gnss-receiver-missing',/gnss|gps.*receiver/],['imu-sensor-missing',/imu|inertial.*sensor/],['gnss-antenna-path-missing',/gnss.*antenna|gps.*antenna/]])
  if(/long-duration environmental logging/.test(semanticText))requireCapabilities([['environmental-sensors-missing',/environmental.*sensor|temperature.*humidity|pressure.*sensor/],['logger-storage-missing',/storage|sd.*card|flash.*log/],['logger-rtc-missing',/rtc|real.time.clock/],['logger-backup-power-missing',/backup.*battery|battery.*backup/]])
  if(/long-range low-power telemetry/.test(semanticText))requireCapabilities([['lora-radio-missing',/lora|sub.?ghz.*radio/],['lora-antenna-network-missing',/lora.*antenna|sub.?ghz.*antenna|antenna.*match/],['low-power-supply-control-missing',/low.power.*(regulator|load.switch)|sleep.*power/]])
  if(/multi-channel removable logging/.test(semanticText))requireCapabilities([['data-acquisition-front-end-missing',/adc|data.*acquisition|analog.*front.end/],['multi-channel-input-missing',/multi.channel.*input|channel.*connector/],['removable-storage-missing',/sd.*card|removable.*storage/],['logger-storage-protection-missing',/storage.*esd|card.*esd/]])
  if(/remote soil and climate monitoring/.test(semanticText))requireCapabilities([['soil-sensor-interface-missing',/soil.*sensor|moisture.*interface/],['climate-sensor-missing',/climate.*sensor|temperature.*humidity/],['agriculture-radio-missing',/lora|cellular|wireless.*radio/],['field-interface-protection-missing',/field.*protection|sensor.*esd|surge.*sensor/]])
  if(/compact compute-module carrier/.test(semanticText))requireCapabilities([['compute-module-connector-missing',/compute.*module.*connector|module.*socket/],['carrier-power-tree-missing',/carrier.*power|module.*regulator|power.*sequenc/],['carrier-storage-interface-missing',/emmc|sd.*card|storage.*connector/],['carrier-high-speed-io-missing',/pcie|ethernet|usb.*host|csi|dsi/]])
  if(/high-speed fpga expansion/.test(semanticText))requireCapabilities([['fpga-device-missing',/fpga/],['fpga-configuration-memory-missing',/configuration.*flash|fpga.*flash/],['fpga-high-speed-connector-missing',/high.speed.*connector|mezzanine/],['fpga-bank-decoupling-missing',/fpga.*decoupling|bank.*decoupling/],['fpga-clock-missing',/fpga.*clock|oscillator/]])
  if(/position feedback sensing/.test(semanticText))requireCapabilities([['encoder-sensor-interface-missing',/encoder|quadrature|position.*sensor/],['encoder-connector-missing',/encoder.*connector|sensor.*connector/],['encoder-input-protection-missing',/encoder.*(esd|protection)|input.*protection/]])
  if(/isolated current measurement/.test(semanticText))requireCapabilities([['isolated-current-sensor-missing',/isolated.*current.*sensor|current.*isolation/],['current-conductor-or-shunt-missing',/busbar|current.*shunt|primary.*conductor/],['current-isolation-barrier-missing',/isolation.*(barrier|creepage|clearance)/],['current-measurement-output-missing',/measurement.*output|isolated.*adc/]])
  if(/protected high-voltage telemetry/.test(semanticText))requireCapabilities([['high-voltage-divider-missing',/high.voltage.*divider|divider.*high.voltage/],['high-voltage-input-protection-missing',/high.voltage.*protection|input.*surge|voltage.*clamp/],['voltage-measurement-adc-missing',/measurement.*adc|adc.*front.end/],['high-voltage-spacing-evidence-missing',/high.voltage.*(creepage|clearance)|isolation.*barrier/]])
  if(/high-density connector adaptation/.test(semanticText))requireCapabilities([['high-density-connectors-missing',/high.density.*connector|mezzanine/,2],['breakout-pin-map-evidence-missing',/pin.map|signal.*mapping|breakout.*mapping/],['breakout-protection-missing',/connector.*esd|signal.*protection/]])
  return{schema:'boardforge.phase2c.catalog-semantic-topology-gate.v1',ok:errors.length===0,errors,topologyId:topology,refs:bom.map(row=>row.ref),outlineAreaMm2:outlineArea,maximumAreaMm2:maximumAreaMm2??null}
}

function evidenceUsbIsolation(definition){return definition.semanticEvidence?.usbIsolation||{}}

export async function verifyCatalogAuthoritativePcbSelection({pcbFile,routing}={}){
  const errors=[]
  if(!pcbFile)errors.push('manufacturing-pcb-missing')
  if(routing?.status!=='CANDIDATE_PROMOTED')errors.push(`authoritative-routing-status:${routing?.status||'missing'}`)
  if(!routing?.sourcePcb||!pcbFile||path.resolve(routing.sourcePcb)!==path.resolve(pcbFile))errors.push('authoritative-source-path-mismatch')
  if(!routing?.candidatePcb)errors.push('authoritative-candidate-path-missing')
  let sourceSha256=null,candidateSha256=null
  if(errors.length===0){
    try{sourceSha256=createHash('sha256').update(await readFile(pcbFile)).digest('hex');candidateSha256=createHash('sha256').update(await readFile(routing.candidatePcb)).digest('hex')}
    catch{errors.push('authoritative-pcb-evidence-unreadable')}
    if(sourceSha256&&candidateSha256&&sourceSha256!==candidateSha256)errors.push('promoted-source-does-not-match-authoritative-candidate')
  }
  return{schema:'boardforge.phase2c.catalog-authoritative-pcb-gate.v1',ok:errors.length===0,errors,pcbFile,routingStatus:routing?.status||null,sourceSha256,candidateSha256}
}

function topologyFor(board,index){const a=String(board.architectureClass||'').toLowerCase();if(/fieldbus|can|industrial|control/.test(a))return'stm32-controller';if(/usb-c-power|battery|power/.test(a))return'usb-c-pd-sink';if(/usb|test|digital/.test(a))return'rp2040-instrument';if(/wireless|radio|sensor/.test(a))return'usb-c-esp32-sensor';return topologyIds[index%topologyIds.length]}
// Custom mechanics decorate an expanded envelope. Cutting into the base
// topology envelope can put otherwise-valid connector copper on Edge.Cuts.
function outlineFor(family,w,h,index){const d=2+(index%3),c=.75,x0=-c,y0=-c,x1=w+c,y1=h+c,key=String(family);if(/circular|encoder|capsule|organic|curved/.test(key))return[[x0,y0-d],[x1,y0-d],[x1+d,y0],[x1+d,y1],[x1,y1+d],[x0,y1+d],[x0-d,y1],[x0-d,y0]];if(/notch|window|tongue|neck|waist/.test(key))return[[x0,y0],[x1,y0],[x1+d,y0+d],[x1+d,y1-d],[x1,y1],[w*.62,y1],[w*.62,y1+d],[w*.38,y1+d],[w*.38,y1],[x0,y1]];if(/wing|ear|thermal|heatsink/.test(key))return[[x0-d,y0],[x0,y0-d],[x1,y0-d],[x1+d,y0],[x1+d,y1],[x1,y1+d],[x0,y1+d],[x0-d,y1]];if(/comb|scallop|probe|port/.test(key))return[[x0,y0],[x1,y0],[x1+d,h*.25],[x1,h*.34],[x1+d,h*.43],[x1,h*.52],[x1+d,h*.61],[x1,h*.70],[x1+d,h*.79],[x1,y1],[x0,y1]];return[[x0-d,y0],[x0,y0-d],[w*.58,y0-d],[w*.64,y0],[x1+d,y0],[x1+d,y1],[x1,y1+d],[w*.35,y1+d],[w*.29,y1],[x0-d,y1]]}
function polygonArea(points){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1]}return Math.abs(sum)/2}
function title(slug){return String(slug).split('-').map(x=>x[0]?.toUpperCase()+x.slice(1)).join(' ')}
