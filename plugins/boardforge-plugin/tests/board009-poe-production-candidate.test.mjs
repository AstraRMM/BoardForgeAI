import test from'node:test'
import assert from'node:assert/strict'
import{board009PoeProductionDefinition,createBoard009PoeCandidate,validateBoard009UsbBootTopology,verifyBoard009CanonicalAssets}from'../lib/phase2c/board009-poe-production-candidate.mjs'
import{categoryPowerFlags}from'../lib/real-board-proof.mjs'
import{poeSensorProductionProposal,validatePoeSensorArchitecture}from'../lib/phase2c/templates/poe-sensor.mjs'
import{approvedAssetFor}from'../lib/components/approved-production-assets.mjs'
import{placeAuthoritativeProductionFootprints}from'../lib/placement/authoritative-production-placement.mjs'
import{board009LocalSupportPlacement}from'../lib/phase2c/board009-placement-contract.mjs'
import{emitBoard009PoeTrainingCandidate}from'../lib/phase2c/board009-poe-production-candidate.mjs'
import{readFile}from'node:fs/promises'
import path from'node:path'

test('Board009 autonomous training intent freezes the measured compact 85 x 55 mm Class-0 envelope without claiming certification',()=>{
 assert.equal(poeSensorProductionProposal.maximumAreaMm2,4675)
 assert.deepEqual(poeSensorProductionProposal.compactnessEnvelopeMm,{width:85,height:55,areaMm2:4675,outlineFamily:'dual isolation-waist notch'})
 assert.match(poeSensorProductionProposal.compactnessRationale,/smallest measured source-derived envelope/)
 assert.match(poeSensorProductionProposal.status,/^BLOCKED_/)
 assert.match(poeSensorProductionProposal.trainingIntent.power.input,/Class 0/)
 assert.match(poeSensorProductionProposal.trainingIntent.power.isolatedOutput,/3\.6 W/)
 assert.ok(!('acceptance'in poeSensorProductionProposal))
 assert.match(poeSensorProductionProposal.trainingIntent.sourceRequirements.join(' '),/both connected across isolated \+VDC\/-VDC/)
})

test('Board009 resolver independently verifies authoritative package identities and refuses incomplete physical pin projection',()=>{
 const canonical=verifyBoard009CanonicalAssets()
 assert.ok(canonical.bindings.some(x=>x.ref==='J_ETH'&&x.symbolPinCount===15&&x.footprintPadCount===15))
 assert.ok(canonical.bindings.some(x=>x.ref==='U_POE'&&x.symbolPinCount===8&&x.footprintPadCount===8))
 assert.ok(canonical.errors.some(x=>x.startsWith('board009-physical-symbol-pins-unbound:U_ETH:')))
 assert.ok(canonical.errors.some(x=>x.startsWith('board009-physical-symbol-pins-unbound:U_HOST:')))
 assert.ok(!canonical.errors.some(x=>x.startsWith('board009-physical-symbol-pins-unbound:U_POE:')))
 assert.ok(!canonical.errors.some(x=>x.startsWith('board009-authoritative-symbol-name-mismatch:J_ETH')))
})

test('Board009 does not emit a KiCad candidate until all physical bindings and board evidence exist',()=>{
 const candidate=createBoard009PoeCandidate()
 assert.equal(candidate.status,'BLOCKED_BEFORE_KICAD_EMISSION')
 for(const code of['board009-ag9905-required-support-circuit-unbound','board009-w5500-reference-network-unbound','board009-host-boot-programming-unbound','board009-usb-boot-topology-unbound','board009-secondary-regulator-current-budget-unverified','board009-primary-secondary-layout-unverified'])assert.ok(candidate.errors.includes(code),code)
 assert.deepEqual(candidate.sourceBoundPowerSupport.magJackRectification.pins,{9:'POE_RECT_POS',10:'POE_RECT_NEG'})
 assert.equal(candidate.sourceBoundPowerSupport.magJackRectification.externalBridgesForbidden,true)
 assert.equal(candidate.sourceBoundPowerSupport.capacitors[1].mpn,'GRM31CR61H106KA12L')
})

test('PoE architecture requires a host and 3V3 regulator in addition to the PD and Ethernet roles',()=>{
 const roles=['ethernet MAC PHY controller','PoE MagJack ethernet magnetics','PoE PD controller','isolated PoE converter','ethernet cable surge ESD protection','25 MHz ethernet clock crystal','ethernet PHY strap network','ethernet MAC PHY decoupling','environmental temperature humidity sensor','primary secondary isolation barrier'].map((role,i)=>({ref:`X${i}`,role}))
 const errors=validatePoeSensorArchitecture({topologyId:'poe-sensor',bom:roles,semanticEvidence:{poeSensor:{}}}).errors
 assert.ok(errors.includes('poe-sensor-spi-host-missing'))
 assert.ok(errors.includes('poe-sensor-3v3-regulator-missing'))
})

test('Board009 RP2040 group uses an authoritative 12 MHz clock, RUN pull-up, and SWD header',()=>{
 const definition=board009PoeProductionDefinition(),maps=definition.categorySchematicPinMaps
 for(const ref of['Y_HOST','C_HOST_XIN','C_HOST_XOUT','R_HOST_RUN','J_SWD'])assert.ok(definition.bom.some(row=>row.ref===ref),ref)
 assert.deepEqual(maps.Y_HOST,{1:'HOST_XIN',2:'SELV_GND',3:'HOST_XOUT',4:'SELV_GND'})
 assert.deepEqual(maps.R_HOST_RUN,{1:'3V3',2:'HOST_RUN_N'})
 assert.deepEqual(maps.J_SWD,{1:'SELV_GND',2:'3V3',3:'SWDIO',4:'SWCLK',5:'HOST_RUN_N',6:null})
 assert.ok(definition.schematicPlacements.U_HOST.x-definition.schematicPlacements.U_ETH.x>=100,'native RP2040 and W5500 label stubs need separate schematic columns')
 assert.match(definition.supportCircuitEvidence.rp2040.source,/raspberrypi\.com/)
 assert.match(definition.supportCircuitEvidence.rp2040.verification,/KiCad ERC/)
})

test('Board009 USB-C ROM boot model has exact CC Rd, sense-only VBUS, and a runtime-isolated BOOTSEL switch',()=>{
 const definition=board009PoeProductionDefinition(),maps=definition.categorySchematicPinMaps
 for(const ref of['J_USB','D_USB','S_BOOT','R_USB_CC1','R_USB_CC2','R_USB_VBUS_TOP','R_USB_VBUS_BOTTOM'])assert.ok(definition.bom.some(row=>row.ref===ref),ref)
 assert.equal(validateBoard009UsbBootTopology(definition).ok,true)
 assert.deepEqual(maps.R_USB_CC1,{1:'USB_BOOT_CC1',2:'SELV_GND'})
 assert.deepEqual(maps.R_USB_CC2,{1:'USB_BOOT_CC2',2:'SELV_GND'})
 assert.deepEqual(maps.S_BOOT,{1:'QSPI_CS',2:'SELV_GND'})
 assert.deepEqual(maps.R_USB_VBUS_TOP,{1:'USB_BOOT_VBUS',2:'USB_BOOT_VBUS_SENSE'})
 assert.deepEqual(maps.R_USB_VBUS_BOTTOM,{1:'USB_BOOT_VBUS_SENSE',2:'SELV_GND'})
 assert.equal(maps.U_HOST[41],'USB_BOOT_VBUS_SENSE');assert.equal(maps.U_HOST[46],'USB_BOOT_DN');assert.equal(maps.U_HOST[47],'USB_BOOT_DP')
 assert.equal(definition.usbBootTopology.selfPowered,true);assert.equal(definition.usbBootTopology.bootSwitchNormallyOpen,true);assert.equal(definition.usbBootTopology.bootSwitchConductsOnlyWhilePressed,true)
})

test('Board009 USB-C boot gate rejects VBUS powering 3V3 or a permanently asserted BOOTSEL',()=>{
 const powered=board009PoeProductionDefinition();powered.categorySchematicPinMaps.J_USB.A4='3V3'
 const bootAsserted=board009PoeProductionDefinition();bootAsserted.usbBootTopology.bootSwitchNormallyOpen=false
 const crowdedSchematic=board009PoeProductionDefinition();crowdedSchematic.schematicPlacements.R_USB_CC1.x=300
 assert.ok(validateBoard009UsbBootTopology(powered).errors.includes('board009-usb-boot-vbus-to-board-power-path'))
 assert.ok(validateBoard009UsbBootTopology(bootAsserted).errors.includes('board009-usb-boot-runtime-isolation-declaration-invalid'))
 assert.ok(validateBoard009UsbBootTopology(crowdedSchematic).errors.includes('board009-usb-boot-schematic-label-corridor-invalid'))
})

test('Board009 supersedes the HDI candidate with a legal standard four-layer USB boot placement',()=>{
 const definition=board009PoeProductionDefinition(),outline=definition.outlinePoints.map(([x,y])=>({x,y}))
 assert.equal(definition.layers,4)
 assert.doesNotMatch(definition.intent.join(' '),/HDI|microvia/i)
 assert.deepEqual(definition.holes.map(hole=>[hole.x,hole.y]),[[10,4],[24,4],[4,51],[81,51]])
 const placement=placeAuthoritativeProductionFootprints({
  components:definition.bom.map(row=>({ref:row.ref,value:row.value,mpn:row.mpn,footprint:approvedAssetFor(row.mpn).footprint.libId,pinMap:definition.categorySchematicPinMaps[row.ref],fixedAt:board009LocalSupportPlacement(row.ref)})),
  outline,holes:definition.holes,topology:definition.topologyId,
 })
 for(const ref of['J_USB','D_USB','R_USB_CC1','R_USB_CC2','R_USB_VBUS_TOP','R_USB_VBUS_BOTTOM','S_BOOT'])assert.ok(placement.placements.some(item=>item.ref===ref),ref)
})

test('Board009 W5500 group explicitly fixes PMODE=111 and filters the AVDD rail',()=>{
 const definition=board009PoeProductionDefinition(),maps=definition.categorySchematicPinMaps
 for(const ref of['R_ETH_RST','C_ETH_RST','R_PMODE0','R_PMODE1','R_PMODE2','FB_AVDD','C_AVDD','C_AVDD_REF','C_ETH_XIN','C_ETH_XOUT','R_TX_CT','C_RX_CT','R_LED_GREEN','R_LED_YELLOW'])assert.ok(definition.bom.some(row=>row.ref===ref),ref)
 assert.deepEqual(maps.FB_AVDD,{1:'3V3',2:'3V3A'})
 assert.deepEqual(maps.R_PMODE0,{1:'3V3',2:'PMODE0'})
 assert.deepEqual(maps.R_PMODE1,{1:'3V3',2:'PMODE1'})
 assert.deepEqual(maps.R_PMODE2,{1:'3V3',2:'PMODE2'})
 assert.deepEqual(maps.R_TX_CT,{1:'ETH_TX_CT',2:'3V3A'})
 assert.deepEqual(maps.C_RX_CT,{1:'ETH_RX_CT',2:'SELV_GND'})
 assert.deepEqual(maps.R_LED_GREEN,{1:'3V3',2:'LED_GREEN_A'})
 assert.equal(maps.U_ETH[24],null)
 assert.equal(maps.U_ETH[25],'LED_GREEN_K')
 assert.equal(definition.bom.find(row=>row.ref==='C_1V2').mpn,'GRM188R71H103KA01D')
 assert.match(definition.supportCircuitEvidence.w5500.source,/wiznet\.io/)
 assert.deepEqual(categoryPowerFlags(definition),[{ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:'3V3A',source:{ref:'FB_AVDD',kind:'filtered-analog-supply'},reason:'FB_AVDD is the physical 3V3-to-AVDD ferrite path documented by the W5500 reference schematic.'}])
})

test('Board009 BME280 group locks the Bosch I2C mode, address, pull-ups, and dual bypass',()=>{
 const definition=board009PoeProductionDefinition(),maps=definition.categorySchematicPinMaps
 for(const ref of['R_I2C_SDA','R_I2C_SCL','C_SENSOR_IO','R_BME_ADDR'])assert.ok(definition.bom.some(row=>row.ref===ref),ref)
 assert.deepEqual(maps.U_SENSOR,{1:'SELV_GND',2:'3V3',3:'I2C_SDA',4:'I2C_SCL',5:'BME_SDO_GND',6:'3V3',7:'SELV_GND',8:'3V3'})
 assert.deepEqual(maps.R_I2C_SDA,{1:'3V3',2:'I2C_SDA'})
 assert.deepEqual(maps.R_I2C_SCL,{1:'3V3',2:'I2C_SCL'})
 assert.equal(definition.bom.find(row=>row.ref==='R_I2C_SDA').mpn,'RC0603FR-074K7L')
 assert.deepEqual(maps.R_BME_ADDR,{1:'BME_SDO_GND',2:'SELV_GND'})
 assert.match(definition.supportCircuitEvidence.bme280.rationale,/0x76/)
})

test('Board009 emits a KiCad-loadable W25 canonical cache for the project-local BoardForge library',async()=>{
 const root=path.resolve('../..','.tmp','boardforge_real_board_proofs_board009_w25_load_regression')
 const emitted=await emitBoard009PoeTrainingCandidate({outputRoot:root,fresh:true})
 const sch=await readFile(path.join(emitted.projectDir,'BF-REAL-BOARD009-POE-PRODUCTION-REV-A.kicad_sch'),'utf8')
 assert.match(sch,/\(lib_id "BoardForge:Winbond_W25Q128JVS_SOIC8_3P9X4P9"\)/)
 assert.match(sch,/\(symbol "Winbond_W25Q128JVS_SOIC8_3P9X4P9_1_1"/)
 assert.equal(emitted.erc?.violations?.length||0,0)
})
