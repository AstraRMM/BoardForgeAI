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
  const requireCapabilities=requirements=>{for(const [code,pattern,minimum=1]of requirements)if(roles.filter(role=>pattern.test(role)).length<minimum)errors.push(code)}
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
  if(/wired protocol gateway/.test(semanticText))requireCapabilities([
    ['ethernet-gateway-second-protocol-missing',/(can|rs.?485|uart|modbus|second.*ethernet).*(controller|transceiver|interface)|protocol.*bridge.*interface/],
    ['ethernet-gateway-second-port-missing',/(second|field).*(port|connector)|dual.*port.*connector/],
    ['ethernet-gateway-second-port-protection-missing',/(second|field).*(esd|tvs|isolation|protection)|dual.*port.*protection/],
    ['ethernet-gateway-throughput-evidence-missing',/(throughput|latency|packet.*rate).*(verified|budget|evidence)/],
    ['ethernet-gateway-buffering-backpressure-missing',/(buffer|backpressure|flow.*control).*(gateway|bridge)/],
    ['ethernet-gateway-security-storage-missing',/(secure.*element|credential.*storage|hardware.*key)|gateway.*secure.*storage/],
    ['ethernet-gateway-recovery-update-missing',/(gateway|ethernet).*(recovery|secure.*update|watchdog)/],
  ])
  if(/wired protocol gateway/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('ethernet-gateway-category-mapped-to-pd-sink')
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
  if(/flight-stack peripheral aggregation/.test(semanticText))requireCapabilities([
    ['drone-stack-connectors-missing',/(flight|drone).*stack.*connector|stack.*mezzanine/,2],
    ['drone-peripheral-ports-missing',/(uart|i2c|can|gps|telemetry).*(port|connector)|peripheral.*connector/,3],
    ['drone-port-protection-missing',/(peripheral|port).*(esd|tvs|protection)|connector.*protection/],
    ['drone-power-rail-distribution-missing',/(flight|peripheral).*(power.*rail|regulated.*supply)|power.*distribution.*port/],
    ['drone-power-monitoring-missing',/(voltage|current).*monitor.*(flight|rail|peripheral)|power.*telemetry/],
    ['drone-level-translation-missing',/(level.*translator|level.*shift).*(port|peripheral)|mixed.voltage.*interface/],
    ['drone-port-ground-return-evidence-missing',/(port|peripheral).*(ground.*return|ground.*pin)|connector.*ground.*mapping/],
    ['drone-stack-pin-map-evidence-missing',/(flight|drone).*stack.*pin.*map|mezzanine.*mapping/],
  ])
  if(/flight-stack peripheral aggregation/.test(semanticText)&&topology==='stm32-controller')errors.push('drone-peripheral-category-mapped-to-can-controller')
  if(/three-phase motor control/.test(semanticText))requireCapabilities([['bldc-controller-missing',/bldc|motor.*controller|commutation.*controller/],['bldc-three-phase-gate-drive-missing',/three.phase.*gate|gate.*driver/],['bldc-power-switches-missing',/phase.*mosfet|power.*mosfet|half.bridge/,3],['bldc-current-sense-missing',/phase.*current.*sense|current.*shunt/],['bldc-motor-connector-missing',/motor.*connector|phase.*connector/],['bldc-dc-link-decoupling-missing',/dc.link|bulk.*motor/],['bldc-power-entry-protection-missing',/motor.*(fuse|reverse|surge|tvs)|power.*entry.*protection/],['bldc-rotor-position-interface-missing',/hall.*sensor|encoder.*motor|sensorless.*bemf|back.emf/],['bldc-safe-gate-disable-missing',/gate.*(disable|shutdown)|motor.*failsafe|default.off/],['bldc-regeneration-handling-missing',/regen|regenerat.*(clamp|brak|handling)|brake.*resistor/]])
  if(/navigation and inertial sensing/.test(semanticText))requireCapabilities([['gnss-receiver-missing',/gnss|gps.*receiver/],['imu-sensor-missing',/imu|inertial.*sensor/],['gnss-antenna-path-missing',/gnss.*antenna|gps.*antenna/],['gnss-rf-protection-filter-missing',/gnss.*(saw|filter|esd|protection)|rf.*filter.*gps/],['gnss-antenna-bias-evidence-missing',/(active.*antenna|antenna.*bias|bias.tee).*gnss/],['gnss-backup-supply-missing',/gnss.*(backup|v_bckp|rtc.*supply)|battery.*backup.*gnss/],['gnss-pps-interface-missing',/gnss.*pps|timepulse|pulse.per.second/],['imu-low-noise-supply-missing',/imu.*(low.noise|filtered.*supply|decoupling)/],['imu-interrupt-interface-missing',/imu.*interrupt|data.ready.*imu/],['imu-orientation-evidence-missing',/imu.*(orientation|axis|coordinate.*frame)|sensor.*axis.*mark/]])
  if(/navigation and inertial sensing/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('gps-imu-category-mapped-to-esp32-shell')
  if(/long-duration environmental logging/.test(semanticText))requireCapabilities([['environmental-sensors-missing',/environmental.*sensor|temperature.*humidity|pressure.*sensor/],['logger-storage-missing',/storage|sd.*card|flash.*log/],['logger-rtc-missing',/rtc|real.time.clock/],['logger-backup-power-missing',/backup.*battery|battery.*backup/],['logger-controller-missing',/logger.*controller|low.power.*mcu|data.*logging.*mcu/],['logger-storage-protection-missing',/(storage|sd.*card).*(esd|protection)|card.*detect/],['logger-sensor-power-control-missing',/sensor.*(power.*switch|load.*switch)|switched.*sensor.*rail/],['logger-low-power-evidence-missing',/(sleep|quiescent|power.*budget).*(logger|system)|long.duration.*power/],['logger-watchdog-brownout-missing',/(watchdog|brownout).*(logger|controller)|supervisor.*logger/],['logger-sensor-self-heating-evidence-missing',/(sensor|humidity).*(self.heat|thermal.*isolation)|vent.*sensor.*separation/],['logger-condensation-protection-missing',/(condensation|conformal|hydrophobic|moisture).*(protection|vent|barrier)/]])
  if(/long-duration environmental logging/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('environmental-logger-category-mapped-to-pd-sink')
  if(/long-range low-power telemetry/.test(semanticText))requireCapabilities([['lora-radio-missing',/lora|sub.?ghz.*radio/],['lora-antenna-network-missing',/lora.*antenna|sub.?ghz.*antenna|antenna.*match/],['low-power-supply-control-missing',/low.power.*(regulator|load.switch)|sleep.*power/],['lora-region-frequency-evidence-missing',/(region|frequency|band).*(lora|sub.?ghz).*(verified|selected|compliance)/],['lora-rf-filter-match-missing',/(lora|sub.?ghz).*(matching|filter|balun)|rf.*match.*radio/],['lora-rf-esd-missing',/(antenna|rf).*(esd|protection).*lora|lora.*antenna.*protection/],['lora-reference-clock-missing',/(lora|radio).*(tcxo|crystal|reference.*clock)|tcxo.*sub.?ghz/],['lora-host-control-interface-missing',/(lora|radio).*(spi|dio|reset|busy).*interface|host.*radio.*control/],['lora-tx-current-decoupling-missing',/(lora|radio).*(tx.*current|bulk.*decoupling)|transmit.*supply.*decoupling/],['lora-link-budget-evidence-missing',/(link.*budget|eirp|antenna.*gain).*(verified|calculated|evidence)/]])
  if(/long-range low-power telemetry/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('lora-category-mapped-to-esp32-shell')
  if(/compact proximity beacon/.test(semanticText))requireCapabilities([
    ['ble-beacon-radio-missing',/(ble|bluetooth.*low.*energy).*(radio|soc|module)|beacon.*radio/],
    ['ble-beacon-antenna-missing',/(ble|2\.4.*ghz).*(antenna|matching)|antenna.*beacon/],
    ['ble-beacon-battery-source-missing',/(coin.*cell|battery).*(holder|source|connector)|wearable.*battery/],
    ['ble-beacon-low-iq-power-missing',/(ble|beacon).*(low.*iq|sleep.*power|power.*management)|nanoamp.*regulator/],
    ['ble-beacon-programming-interface-missing',/(swd|programming|debug).*(beacon|ble)|ble.*test.*pads/],
    ['ble-beacon-identity-provisioning-missing',/(beacon|ble).*(identity|key|address|provision)/],
    ['ble-beacon-energy-budget-missing',/(advertising.*interval|battery.*life|energy.*budget).*(verified|calculated|evidence)/],
    ['ble-beacon-rf-compliance-missing',/(ble|2\.4.*ghz).*(regulatory|compliance|certification)/],
  ])
  if(/compact proximity beacon/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('ble-beacon-category-mapped-to-usb-sensor-shell')
  if(/wifi protocol gateway/.test(semanticText))requireCapabilities([
    ['wifi-gateway-radio-missing',/wifi.*(radio|module|soc)|802\.11.*(radio|module)/],
    ['wifi-gateway-antenna-network-missing',/wifi.*antenna|2\.4.*ghz.*(antenna|matching)/],
    ['wifi-gateway-secondary-protocol-missing',/(ethernet|can|rs.?485|ble|sub.?ghz).*(controller|transceiver|interface)|protocol.*bridge.*interface/],
    ['wifi-gateway-field-connector-missing',/(ethernet|can|rs.?485|field).*(connector|port)|gateway.*wired.*connector/],
    ['wifi-gateway-interface-protection-missing',/(field|ethernet|can|rs.?485).*(esd|tvs|protection|isolation)/],
    ['wifi-gateway-security-storage-missing',/(secure.*element|credential.*storage|hardware.*key)|gateway.*secure.*storage/],
    ['wifi-gateway-provisioning-recovery-missing',/(wifi|gateway).*(provision|recovery|factory.*reset)/],
    ['wifi-gateway-throughput-evidence-missing',/(throughput|latency|packet.*rate).*(verified|budget|evidence)/],
    ['wifi-gateway-burst-power-evidence-missing',/(wifi|radio).*(burst.*current|power.*transient|bulk.*decoupling)/],
  ])
  if(/wifi protocol gateway/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('wifi-gateway-category-mapped-to-sensor-shell')
  if(/multi-channel removable logging/.test(semanticText))requireCapabilities([['data-acquisition-front-end-missing',/adc|data.*acquisition|analog.*front.end/],['multi-channel-input-missing',/multi.channel.*input|channel.*connector/],['removable-storage-missing',/sd.*card|removable.*storage/],['logger-storage-protection-missing',/storage.*esd|card.*esd/],['data-logger-input-protection-missing',/(channel|input).*(esd|tvs|overvoltage|protection)/],['data-logger-antialias-filter-missing',/(channel|adc).*(antialias|low.pass|input.*filter)/],['data-logger-voltage-reference-missing',/(adc|acquisition).*(voltage.*reference|precision.*reference)/],['data-logger-controller-buffering-missing',/(logger|acquisition).*(controller|mcu|dma|buffer)/],['data-logger-timebase-missing',/(rtc|timestamp|sample.*clock).*(logger|acquisition)|precision.*timebase/],['data-logger-card-power-control-missing',/(sd|card|storage).*(power.*switch|load.*switch|supply.*control)/],['data-logger-power-fail-integrity-missing',/(power.*fail|brownout|hold.up).*(write|storage|logger)|atomic.*log.*write/],['data-logger-calibration-evidence-missing',/(channel|adc).*(calibration|gain.*error|offset.*error).*evidence/]])
  if(/multi-channel removable logging/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('data-logger-category-mapped-to-sensor-shell')
  if(/isolated synchronized triggering/.test(semanticText))requireCapabilities([
    ['camera-trigger-timing-source-missing',/(trigger|timing).*(timer|clock|fpga|hardware.*compare)|synchronized.*timebase/],
    ['camera-trigger-isolation-missing',/(camera|trigger).*(digital.*isolator|opto|galvanic.*isolation)/],
    ['camera-trigger-output-drivers-missing',/(camera|trigger).*(output.*driver|open.*drain|dry.*contact)/,2],
    ['camera-trigger-output-connectors-missing',/(camera|trigger).*(output.*connector|port)/,2],
    ['camera-trigger-output-protection-missing',/(camera|trigger).*(esd|tvs|clamp|protection)/],
    ['camera-trigger-sync-input-missing',/(sync|timecode|pps|external.*trigger).*(input|connector)/],
    ['camera-trigger-jitter-skew-evidence-missing',/(jitter|skew|trigger.*latency).*(verified|budget|evidence)/],
    ['camera-trigger-voltage-interface-evidence-missing',/(camera|trigger).*(voltage|current|polarity).*interface.*evidence/],
    ['camera-trigger-default-inactive-missing',/(camera|trigger).*(default.*inactive|failsafe|reset.*safe)/],
  ])
  if(/isolated synchronized triggering/.test(semanticText)&&topology==='stm32-controller')errors.push('camera-trigger-category-mapped-to-can-controller')
  if(/high-current matrix control/.test(semanticText))requireCapabilities([
    ['led-matrix-panel-interface-missing',/(led|matrix|hub75).*(panel.*connector|output.*connector|interface)/],
    ['led-matrix-row-column-drive-missing',/(row|column|matrix).*(driver|buffer|level.*translator)|constant.current.*led/],
    ['led-matrix-timing-controller-missing',/(led|matrix).*(timing|pwm|refresh|dma).*controller|display.*engine/],
    ['led-matrix-power-input-protection-missing',/(led|panel).*(fuse|efuse|reverse|tvs|inrush)|power.*entry.*protection/],
    ['led-matrix-bulk-decoupling-missing',/(led|panel).*(bulk|low.esr|power.*injection)/],
    ['led-matrix-current-capacity-evidence-missing',/(led|panel).*(current|ampacity|power.*budget).*evidence/],
    ['led-matrix-safe-blanking-missing',/(led|matrix).*(blank|output.*enable|default.off|failsafe)/],
    ['led-matrix-thermal-monitoring-missing',/(led|panel).*(temperature|thermal.*monitor|overtemperature)/],
    ['led-matrix-signal-integrity-evidence-missing',/(clock|latch|data).*(termination|signal.*integrity|timing.*budget)/],
  ])
  if(/high-current matrix control/.test(semanticText)&&topology==='stm32-controller')errors.push('led-matrix-category-mapped-to-can-controller')
  if(/rugged analog field sensing/.test(semanticText))requireCapabilities([
    ['industrial-sensor-probe-interface-missing',/(probe|sensor).*(connector|terminal|interface)/],
    ['industrial-sensor-input-protection-missing',/(probe|analog|sensor).*(surge|esd|tvs|overvoltage|protection)/],
    ['industrial-sensor-excitation-missing',/(sensor|bridge|probe).*(excitation|bias|constant.*current)/],
    ['industrial-sensor-analog-front-end-missing',/(instrumentation.*amplifier|analog.*front.end|sensor.*amplifier)/],
    ['industrial-sensor-filter-missing',/(sensor|analog).*(low.pass|emc.*filter|antialias)/],
    ['industrial-sensor-adc-reference-missing',/(adc|converter).*(precision.*reference|voltage.*reference)/],
    ['industrial-sensor-field-power-protection-missing',/(field|industrial).*(reverse|surge|tvs|fuse).*power|power.*entry.*protection/],
    ['industrial-sensor-calibration-evidence-missing',/(sensor|channel).*(calibration|accuracy|error.*budget).*evidence/],
    ['industrial-sensor-emc-evidence-missing',/(industrial|sensor).*(emc|eft|esd|surge).*evidence/],
    ['industrial-sensor-temperature-evidence-missing',/(sensor|analog).*(temperature.*range|drift|thermal.*error).*evidence/],
  ])
  if(/rugged analog field sensing/.test(semanticText)&&topology==='stm32-controller')errors.push('industrial-sensor-category-mapped-to-can-controller')
  if(/robot platform coordination/.test(semanticText))requireCapabilities([
    ['robotics-real-time-controller-missing',/(robot|motion).*(real.time.*controller|control.*mcu)|deterministic.*robot.*controller/],
    ['robotics-actuator-interface-missing',/(motor|servo|actuator).*(interface|connector|bus)/],
    ['robotics-sensor-interface-missing',/(encoder|sensor|imu).*(interface|connector|bus)/],
    ['robotics-platform-connectors-missing',/(robot|platform).*(connector|port)/,3],
    ['robotics-interface-protection-missing',/(robot|actuator|sensor|field).*(esd|tvs|protection|isolation)/],
    ['robotics-power-tree-missing',/(robot|battery).*(power.*tree|regulated.*rail|power.*distribution)/],
    ['robotics-power-monitoring-missing',/(robot|battery|rail).*(voltage|current).*monitor|power.*telemetry/],
    ['robotics-emergency-stop-missing',/(emergency.*stop|e.stop|safe.*enable|actuator.*inhibit)/],
    ['robotics-watchdog-supervisor-missing',/(hardware.*watchdog|safety.*supervisor|brownout.*supervisor)/],
    ['robotics-safe-default-state-missing',/(robot|actuator).*(default.off|failsafe|reset.*safe)/],
  ])
  if(/robot platform coordination/.test(semanticText)&&topology==='stm32-controller')errors.push('robotics-main-category-mapped-to-generic-can-controller')
  if(/modular robot io expansion/.test(semanticText))requireCapabilities([
    ['robotics-expansion-mezzanine-connectors-missing',/(mezzanine|board.to.board).*(connector|socket)/,2],
    ['robotics-expansion-pin-map-evidence-missing',/(mezzanine|parent.*board).*(pin.*map|connector.*mapping)/],
    ['robotics-expansion-rail-ownership-missing',/(mezzanine|expansion).*(rail.*ownership|power.*source|backfeed)/],
    ['robotics-expansion-io-connectors-missing',/(robot|expansion).*(io|sensor|actuator).*(connector|port)/,2],
    ['robotics-expansion-io-protection-missing',/(expansion|external.*io).*(esd|tvs|protection|isolation)/],
    ['robotics-expansion-level-translation-missing',/(expansion|io).*(level.*translator|level.*shift|voltage.*domain)/],
    ['robotics-expansion-default-state-missing',/(expansion|io).*(default.*state|failsafe|reset.*safe)/],
    ['robotics-expansion-identification-missing',/(board.*id|expansion.*id|enumeration.*eeprom|address.*strap)/],
    ['robotics-expansion-hotplug-evidence-missing',/(hot.plug|mating.*sequence|inrush|bus.*isolation).*(verified|evidence|policy)/],
    ['robotics-expansion-current-capacity-missing',/(mezzanine|connector|rail).*(current.*capacity|ampacity|temperature.*rise)/],
  ])
  if(/modular robot io expansion/.test(semanticText)&&topology==='rp2040-instrument')errors.push('robotics-expansion-category-mapped-to-usb-instrument')
  if(/digital audio processing/.test(semanticText))requireCapabilities([
    ['audio-dsp-processor-missing',/(audio|signal).*(dsp|digital.*signal.*processor)|audio.*processor/],
    ['audio-codec-converter-missing',/(audio).*(codec|adc|dac)|converter.*audio/],
    ['audio-input-connector-missing',/(audio|line|microphone).*(input.*connector|input.*jack)/],
    ['audio-output-connector-missing',/(audio|line|headphone).*(output.*connector|output.*jack)/],
    ['audio-input-conditioning-missing',/(audio|microphone).*(input.*buffer|preamp|bias|antialias)/],
    ['audio-output-conditioning-missing',/(audio|headphone).*(output.*buffer|amplifier|reconstruction.*filter)/],
    ['audio-master-clock-missing',/(audio|codec).*(master.*clock|mclk|low.jitter.*clock)/],
    ['audio-low-noise-power-missing',/(audio|codec).*(low.noise.*supply|filtered.*rail|ldo.*rail)/],
    ['audio-pop-mute-protection-missing',/(audio|output).*(mute|pop|click|dc.*protection)/],
    ['audio-performance-evidence-missing',/(snr|thd\+?n|dynamic.*range|sample.*rate).*(verified|budget|evidence)/],
    ['audio-grounding-layout-evidence-missing',/(audio|mixed.signal).*(grounding|return.*path|layout).*evidence/],
  ])
  if(/digital audio processing/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('audio-dsp-category-mapped-to-pd-sink')
  if(/low-distortion power amplification/.test(semanticText))requireCapabilities([
    ['audio-amplifier-power-stage-missing',/(audio|speaker).*(power.*amplifier|output.*stage|class.[abd])/],
    ['audio-amplifier-input-stage-missing',/(audio|line).*(input.*buffer|receiver|preamplifier|gain.*stage)/],
    ['audio-amplifier-speaker-connector-missing',/(speaker|audio.*output).*(connector|terminal)/],
    ['audio-amplifier-supply-connector-missing',/(amplifier|power).*(supply.*connector|power.*terminal)/],
    ['audio-amplifier-output-filter-missing',/(speaker|class.d|audio.*output).*(lc.*filter|output.*filter|zobel)/],
    ['audio-amplifier-speaker-protection-missing',/(speaker|audio.*output).*(dc.*protection|relay|disconnect|short.*circuit)/],
    ['audio-amplifier-mute-sequencing-missing',/(amplifier|audio).*(mute|pop|click|startup.*sequence)/],
    ['audio-amplifier-bulk-decoupling-missing',/(amplifier|power.*stage).*(bulk|dc.link|local.*decoupling)/],
    ['audio-amplifier-thermal-protection-missing',/(amplifier|power.*stage).*(thermal.*monitor|overtemperature|heatsink)/],
    ['audio-amplifier-load-stability-evidence-missing',/(load.*stability|reactive.*load|phase.*margin).*(verified|evidence|test)/],
    ['audio-amplifier-performance-evidence-missing',/(thd\+?n|snr|output.*power|bandwidth).*(verified|budget|evidence)/],
  ])
  if(/low-distortion power amplification/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('audio-amplifier-category-mapped-to-pd-sink')
  if(/capacitive user input/.test(semanticText))requireCapabilities([
    ['touch-controller-missing',/(capacitive|touch).*(controller|sensor.*ic|sensing.*mcu)/],
    ['touch-electrodes-missing',/(touch|capacitive).*(electrode|button|slider|wheel)/,2],
    ['touch-sense-conditioning-missing',/(touch|sense).*(series.*resistor|filter|reference.*capacitor|conditioning)/],
    ['touch-host-interface-missing',/(touch|interface).*(host.*connector|i2c|spi|interrupt)/],
    ['touch-esd-protection-missing',/(touch|fascia|host).*(esd|protection)/],
    ['touch-overlay-evidence-missing',/(overlay|fascia).*(material|thickness|dielectric).*(verified|evidence|declared)/],
    ['touch-shield-ground-strategy-missing',/(touch|electrode).*(driven.*shield|hatched.*ground|shield.*strategy)/],
    ['touch-water-glove-evidence-missing',/(water|glove|moisture).*(touch|rejection|operation).*evidence/],
    ['touch-baseline-recovery-missing',/(touch|capacitive).*(baseline|recalibration|stuck.*key|failsafe)/],
    ['touch-production-raw-count-test-missing',/(touch|electrode).*(raw.*count|production.*test|sensitivity.*test)/],
  ])
  if(/capacitive user input/.test(semanticText)&&topology==='stm32-controller')errors.push('touch-interface-category-mapped-to-can-controller')
  if(/display and operator controls/.test(semanticText))requireCapabilities([
    ['hmi-display-interface-missing',/(display|lcd|oled).*(connector|interface|controller)/],
    ['hmi-display-power-backlight-missing',/(display|backlight).*(driver|power.*rail|current.*control)/],
    ['hmi-operator-controls-missing',/(button|encoder|touch|keypad).*(operator|control|input)|operator.*control/],
    ['hmi-control-protection-missing',/(operator|button|encoder|touch).*(esd|protection|filter)/],
    ['hmi-application-controller-missing',/(hmi|display).*(controller|graphics.*mcu|application.*processor)/],
    ['hmi-ui-storage-missing',/(font|graphic|ui).*(flash|storage)|display.*asset.*storage/],
    ['hmi-host-interface-missing',/(hmi|operator).*(host.*connector|can|rs.?485|ethernet|usb.*device)/],
    ['hmi-watchdog-recovery-missing',/(hmi|display).*(watchdog|recovery|brownout)/],
    ['hmi-display-timing-evidence-missing',/(frame.*rate|pixel.*clock|display.*timing|memory.*bandwidth).*(verified|budget|evidence)/],
    ['hmi-safe-state-evidence-missing',/(hmi|operator).*(safe.*state|fault.*indication|failsafe).*evidence/],
  ])
  if(/display and operator controls/.test(semanticText)&&topology==='rp2040-instrument')errors.push('hmi-category-mapped-to-usb-instrument')
  if(/remote soil and climate monitoring/.test(semanticText))requireCapabilities([['soil-sensor-interface-missing',/soil.*sensor|moisture.*interface/],['climate-sensor-missing',/climate.*sensor|temperature.*humidity/],['agriculture-radio-missing',/lora|cellular|wireless.*radio/],['field-interface-protection-missing',/field.*protection|sensor.*esd|surge.*sensor/],['agriculture-probe-excitation-missing',/(soil|probe).*(excitation|bias|polarity.*reversal|power.*switch)/],['agriculture-cable-surge-path-missing',/(probe|field.*cable).*(surge|eft|common.mode|chassis.*discharge)/],['agriculture-antenna-network-missing',/(agriculture|radio).*(antenna|matching)|antenna.*field.*node/],['agriculture-energy-source-missing',/(solar|battery).*(charger|energy.*storage|source)|field.*energy.*source/],['agriculture-energy-budget-missing',/(mission.*life|energy.*budget|solar.*balance).*(verified|calculated|evidence)/],['agriculture-local-storage-timebase-missing',/(rtc|timebase|local.*storage|data.*buffer).*(agriculture|field|logger)/],['agriculture-ingress-condensation-missing',/(ingress|ip\d\d|condensation|membrane.*vent).*(verified|protection|evidence)/],['agriculture-corrosion-uv-evidence-missing',/(corrosion|uv|chemical.*exposure).*(verified|protection|evidence)/]])
  if(/remote soil and climate monitoring/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('agriculture-category-mapped-to-indoor-sensor-shell')
  if(/compact compute-module carrier/.test(semanticText))requireCapabilities([['compute-module-connector-missing',/compute.*module.*connector|module.*socket/],['carrier-power-tree-missing',/carrier.*power|module.*regulator|power.*sequenc/],['carrier-storage-interface-missing',/emmc|sd.*card|storage.*connector/],['carrier-high-speed-io-missing',/pcie|ethernet|usb.*host|csi|dsi/],['carrier-module-pin-map-evidence-missing',/(compute.*module|carrier).*(pin.*map|connector.*mapping).*evidence/],['carrier-reset-power-good-missing',/(module|carrier).*(reset|power.good|enable.*sequence)/],['carrier-boot-recovery-missing',/(boot.*strap|recovery|debug.*console).*(module|carrier)|module.*recovery/],['carrier-high-speed-protection-missing',/(usb|ethernet|hdmi|pcie).*(esd|protection|common.mode)/],['carrier-signal-integrity-evidence-missing',/(pcie|usb3|hdmi|mipi|ethernet).*(impedance|loss|skew).*evidence/],['carrier-backpower-evidence-missing',/(usb|hdmi|gpio|carrier).*(backpower|reverse.*current|power.*ownership).*evidence/],['carrier-thermal-solution-missing',/(compute.*module|processor).*(heatsink|thermal.*solution|airflow)/],['carrier-manufacturing-bringup-missing',/(carrier|module).*(boundary.*scan|bringup|manufacturing.*test)/]])
  if(/compact compute-module carrier/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('linux-carrier-category-mapped-to-pd-sink')
  if(/high-speed fpga expansion/.test(semanticText))requireCapabilities([['fpga-device-missing',/fpga/],['fpga-configuration-memory-missing',/configuration.*flash|fpga.*flash/],['fpga-high-speed-connector-missing',/high.speed.*connector|mezzanine/],['fpga-bank-decoupling-missing',/fpga.*decoupling|bank.*decoupling/],['fpga-clock-missing',/fpga.*clock|oscillator/],['fpga-bank-voltage-plan-missing',/(fpga|io.*bank).*(vcco|bank.*voltage|io.*standard).*plan/],['fpga-power-sequencing-missing',/(fpga|core|aux|transceiver).*(power.*sequence|sequencer|power.good)/],['fpga-jtag-reset-missing',/(fpga).*(jtag|configuration.*reset|program.*header)/],['fpga-mezzanine-pin-map-missing',/(fpga|mezzanine).*(pin.*map|lane.*map|connector.*mapping)/],['fpga-high-speed-channel-evidence-missing',/(transceiver|pcie|high.speed).*(impedance|loss|skew|channel.*budget).*evidence/],['fpga-pdn-evidence-missing',/(fpga|core.*rail).*(pdn|target.*impedance|transient.*current).*evidence/],['fpga-timing-analysis-missing',/(fpga|design).*(timing.*analysis|static.*timing|constraints).*evidence/],['fpga-thermal-solution-missing',/(fpga).*(thermal.*analysis|heatsink|junction.*temperature)/]])
  if(/high-speed fpga expansion/.test(semanticText)&&topology==='rp2040-instrument')errors.push('fpga-category-mapped-to-usb-instrument')
  if(/multi-channel digital capture/.test(semanticText))requireCapabilities([
    ['logic-analyzer-probe-connectors-missing',/(logic|digital).*(probe.*connector|channel.*connector|input.*header)/],
    ['logic-analyzer-input-channels-missing',/(logic|digital).*(input.*channel|capture.*channel|channel.*bank)/],
    ['logic-analyzer-input-protection-missing',/(probe|digital.*input).*(esd|overvoltage|clamp|protection)/],
    ['logic-analyzer-level-threshold-missing',/(logic|digital.*input).*(level.*translator|threshold|comparator|voltage.*domain)/],
    ['logic-analyzer-capture-engine-missing',/(logic|capture).*(fpga|cpld|pio|capture.*engine|sampler)/],
    ['logic-analyzer-trigger-engine-missing',/(logic|capture).*(hardware.*trigger|trigger.*engine|pattern.*trigger)/],
    ['logic-analyzer-sample-clock-missing',/(logic|capture).*(sample.*clock|timebase|oscillator|pll)/],
    ['logic-analyzer-capture-buffer-missing',/(logic|capture).*(sram|fifo|capture.*buffer|memory)/],
    ['logic-analyzer-host-stream-missing',/(logic|analyzer).*(usb|ethernet|host.*interface|streaming)/],
    ['logic-analyzer-bandwidth-evidence-missing',/(sample.*rate|input.*bandwidth|toggle.*rate).*(verified|measured|budget|evidence)/],
    ['logic-analyzer-timing-evidence-missing',/(setup|hold|aperture|channel.*skew|timing.*uncertainty).*(verified|measured|budget|evidence)/],
    ['logic-analyzer-production-test-missing',/(logic|capture).*(loopback|known.*pattern|production.*test|channel.*test)/],
  ])
  if(/multi-channel digital capture/.test(semanticText)&&topology==='rp2040-instrument')errors.push('logic-analyzer-category-mapped-to-generic-usb-instrument')
  if(/protected analog acquisition/.test(semanticText))requireCapabilities([
    ['oscilloscope-input-connector-missing',/(oscilloscope|analog).*(input.*connector|bnc|mcx)/],
    ['oscilloscope-attenuator-missing',/(oscilloscope|analog.*input).*(attenuator|gain.*range|input.*divider)/],
    ['oscilloscope-overload-protection-missing',/(oscilloscope|analog.*input).*(overload|surge|clamp|protection)/],
    ['oscilloscope-coupling-termination-missing',/(oscilloscope|analog.*input).*(ac.*coupling|dc.*coupling|50.*ohm|1.*meg)/],
    ['oscilloscope-front-end-amplifier-missing',/(oscilloscope|analog).*(front.end.*amplifier|variable.*gain|adc.*driver)/],
    ['oscilloscope-antialias-filter-missing',/(oscilloscope|adc).*(anti.alias|low.pass.*filter)/],
    ['oscilloscope-adc-missing',/(oscilloscope|acquisition).*(adc|analog.to.digital)/],
    ['oscilloscope-reference-clock-missing',/(oscilloscope|adc).*(voltage.*reference|sample.*clock|low.jitter.*clock)/],
    ['oscilloscope-trigger-pickoff-missing',/(oscilloscope|analog).*(trigger.*pickoff|trigger.*comparator)/],
    ['oscilloscope-shield-grounding-missing',/(oscilloscope|front.end).*(shield|guard|chassis|grounding)/],
    ['oscilloscope-bandwidth-linearity-evidence-missing',/(bandwidth|flatness|linearity|distortion).*(verified|measured|budget|evidence)/],
    ['oscilloscope-calibration-overload-evidence-missing',/(calibration|compensation|overload.*recovery).*(verified|measured|procedure|evidence)/],
  ])
  if(/protected analog acquisition/.test(semanticText)&&topology==='rp2040-instrument')errors.push('oscilloscope-category-mapped-to-generic-usb-instrument')
  if(/precision resistance and voltage measurement/.test(semanticText))requireCapabilities([
    ['measurement-kelvin-input-missing',/(resistance|measurement).*(kelvin|four.wire|force.*sense)/],
    ['measurement-protected-voltage-input-missing',/(voltage|measurement).*(input.*protection|overvoltage|fuse|clamp)/],
    ['measurement-current-source-missing',/(resistance|ohm).*(precision.*current|current.*source|excitation)/],
    ['measurement-input-multiplexer-missing',/(measurement|analog).*(multiplexer|range.*switch|relay)/],
    ['measurement-low-bias-amplifier-missing',/(measurement|precision).*(instrumentation.*amplifier|low.*bias.*amplifier|buffer)/],
    ['measurement-precision-adc-missing',/(measurement|precision).*(adc|delta.sigma.*converter)/],
    ['measurement-reference-missing',/(measurement|adc).*(precision.*reference|voltage.*reference)/],
    ['measurement-guarding-missing',/(measurement|analog).*(driven.*guard|guard.*ring|guarded.*island)/],
    ['measurement-isolated-power-data-missing',/(measurement|analog).*(isolation|isolated.*power|isolated.*data)/],
    ['measurement-calibration-storage-missing',/(measurement|calibration).*(eeprom|coefficient.*storage|traceability)/],
    ['measurement-uncertainty-evidence-missing',/(uncertainty|error.*budget|accuracy).*(verified|calculated|evidence)/],
    ['measurement-leakage-noise-evidence-missing',/(leakage|noise|thermal.*emf|burden.*voltage).*(verified|measured|budget|evidence)/],
  ])
  if(/precision resistance and voltage measurement/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('measurement-category-mapped-to-pd-sink')
  if(/position feedback sensing/.test(semanticText))requireCapabilities([
    ['encoder-sensing-element-missing',/(encoder|position).*(magnetic.*sensor|optical.*sensor|resolver|sensing.*element)/],
    ['encoder-target-missing',/(encoder|position).*(magnet|code.*wheel|target|scale)/],
    ['encoder-signal-conditioning-missing',/(encoder|position).*(signal.*conditioning|comparator|interpolator|receiver)/],
    ['encoder-output-interface-missing',/(encoder|position).*(quadrature|abi|ssi|biss|spi|sin.*cos).*interface/],
    ['encoder-connector-missing',/(encoder|motor).*(connector|cable.*interface)/],
    ['encoder-input-output-protection-missing',/(encoder|motor.*cable).*(esd|surge|reverse|protection)/],
    ['encoder-power-filtering-missing',/(encoder|position).*(filtered.*supply|low.noise.*regulator|decoupling)/],
    ['encoder-index-home-missing',/(encoder|position).*(index|home|zero.*reference)/],
    ['encoder-alignment-evidence-missing',/(shaft|magnet|code.*wheel|sensor).*(alignment|runout|air.*gap|concentricity).*evidence/],
    ['encoder-resolution-accuracy-evidence-missing',/(resolution|angular.*accuracy|linearity).*(verified|measured|budget|evidence)/],
    ['encoder-speed-timing-evidence-missing',/(maximum.*speed|rpm|edge.*rate|latency|jitter).*(verified|measured|budget|evidence)/],
    ['encoder-calibration-production-test-missing',/(encoder|position).*(calibration|production.*test|end.of.line.*test)/],
  ])
  if(/position feedback sensing/.test(semanticText)&&topology==='usb-c-esp32-sensor')errors.push('encoder-category-mapped-to-generic-wireless-sensor')
  if(/multi-rail power telemetry/.test(semanticText))requireCapabilities([
    ['power-monitor-rail-connectors-missing',/(power|rail).*(input.*connector|busbar|terminal)/,2],
    ['power-monitor-current-sense-elements-missing',/(rail|current).*(shunt|current.*sense.*element)/,2],
    ['power-monitor-kelvin-sense-missing',/(shunt|current).*(kelvin|four.wire.*sense)/],
    ['power-monitor-multichannel-converter-missing',/(power|rail).*(multichannel.*monitor|current.*sense.*amplifier|measurement.*adc)/],
    ['power-monitor-voltage-divider-protection-missing',/(rail|voltage).*(divider|input.*protection|clamp)/],
    ['power-monitor-common-mode-evidence-missing',/(rail|monitor).*(common.mode|bus.*voltage.*range).*(verified|evidence|budget)/],
    ['power-monitor-isolation-grounding-missing',/(power|monitor).*(isolation|ground.*domain|isolated.*data)/],
    ['power-monitor-telemetry-interface-missing',/(power|telemetry).*(host.*interface|can|rs.?485|ethernet|usb)/],
    ['power-monitor-rail-protection-missing',/(rail|busbar).*(fuse|surge|reverse|esd|protection)/],
    ['power-monitor-calibration-storage-missing',/(power|current|voltage).*(calibration|coefficient.*storage|traceability)/],
    ['power-monitor-accuracy-thermal-evidence-missing',/(power|current|voltage).*(accuracy|error.*budget|temperature.*rise|thermal.*drift).*evidence/],
    ['power-monitor-production-test-missing',/(power|rail).*(known.*load|calibration.*fixture|production.*test)/],
  ])
  if(/multi-rail power telemetry/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('power-monitor-category-mapped-to-pd-sink')
  if(/isolated current measurement/.test(semanticText))requireCapabilities([
    ['isolated-current-sensor-missing',/isolated.*current.*sensor|current.*isolation|hall.*current|fluxgate/],
    ['current-conductor-or-shunt-missing',/busbar|current.*shunt|primary.*conductor/],
    ['current-isolation-barrier-missing',/isolation.*(barrier|creepage|clearance)/],
    ['current-sensor-rated-insulation-missing',/(current|sensor).*(working.*voltage|reinforced|basic.*insulation|isolation.*rating)/],
    ['current-sensor-primary-protection-missing',/(primary|busbar|shunt).*(fuse|fault.*energy|overcurrent|protection)/],
    ['current-sensor-secondary-power-missing',/(current|sensor).*(isolated.*power|low.noise.*supply|secondary.*supply)/],
    ['current-measurement-output-missing',/measurement.*output|isolated.*adc|current.*sensor.*output/],
    ['current-sensor-output-protection-missing',/(output|secondary).*(esd|clamp|protection).*current|current.*output.*protection/],
    ['current-sensor-offset-calibration-missing',/(current|sensor).*(offset.*calibration|zero.*calibration|coefficient.*storage)/],
    ['current-sensor-range-bandwidth-evidence-missing',/(current.*range|bandwidth|response.*time).*(verified|measured|budget|evidence)/],
    ['current-sensor-thermal-error-evidence-missing',/(current|shunt|sensor).*(temperature.*rise|thermal.*drift|error.*budget).*evidence/],
    ['current-sensor-saturation-fault-test-missing',/(current|sensor).*(saturation|overcurrent.*recovery|fault.*test|production.*test)/],
  ])
  if(/isolated current measurement/.test(semanticText)&&topology==='usb-c-pd-sink')errors.push('current-sensor-category-mapped-to-pd-sink')
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
