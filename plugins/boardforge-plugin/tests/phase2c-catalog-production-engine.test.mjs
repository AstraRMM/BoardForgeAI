import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { catalogDefinition, validateCatalogSemanticTopology, verifyCatalogAuthoritativePcbSelection } from '../lib/phase2c/catalog-production-engine.mjs'
import { validateChallengeManifest } from '../lib/challenge/phase2c-challenge.mjs'

test('all 50 campaign specifications retain unique custom outline intent',()=>{const result=validateChallengeManifest(manifest);assert.equal(result.ok,true,result.errors.join('; '));assert.equal(result.customOutlineCount,50);assert.equal(new Set(manifest.boards.map(b=>b.outline.family)).size,50)})
test('catalog definitions 007-050 are real electrical topology requests with closed manufacturable polygons',()=>{for(let i=6;i<manifest.boards.length;i++){const d=catalogDefinition(manifest.boards[i],i);assert.ok(d.bom.length>=6,d.id);assert.ok(d.outlinePoints.length>=7,d.id);assert.equal(d.topologyId.length>0,true);assert.match(d.prompt,new RegExp(manifest.boards[i].purpose.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))}})

test('CAN/fieldbus catalog boards select the CAN-capable STM32 production topology',()=>{
  const d=catalogDefinition(manifest.boards[6],6)
  assert.equal(d.topologyId,'stm32-controller')
  assert.ok(d.bom.some(row=>row.mpn==='SN65HVD230DR'))
  assert.doesNotThrow(()=>d.bom.map(row=>row.ref))
})

test('catalog definition rejects missing board input with an actionable contract error',()=>{
  assert.throws(()=>catalogDefinition(undefined,6),/Catalog board specification is required/)
})

test('dual-bus CAN gateway has two independently named CAN physical channels',()=>{
  const d=catalogDefinition(manifest.boards[7],7)
  assert.equal(d.topologyId,'can-gateway')
  assert.equal(d.bom.filter(row=>row.mpn==='SN65HVD230DR').length,2)
  assert.ok(d.bom.some(row=>row.ref==='J3'))
  assert.ok(d.bom.some(row=>row.ref==='R2'))
})

test('Board008 clone-based dual CAN shell fails closed before placement or routing',()=>{
  const definition=catalogDefinition(manifest.boards[7],7),gate=validateCatalogSemanticTopology(definition)
  assert.equal(gate.ok,false)
  for(const code of['dual-can-controller-capability-missing','mcu-boot-bias-network-missing','mcu-reset-network-missing','mcu-debug-connector-missing','power-entry-protection-missing','dual-can-termination-not-selectable','dual-can-phy-mode-bias-missing','gateway-per-rail-decoupling-insufficient','power-entry-surge-suppression-missing','power-entry-bulk-decoupling-missing'])assert.ok(gate.errors.includes(code),code)
  assert.equal(definition.bom.find(row=>row.ref==='U1').mpn,'STM32F103C8T6')
})

test('dual CAN semantic gate requires explicit controller capability and support circuits',()=>{
  const definition=catalogDefinition(manifest.boards[7],7)
  definition.bom=definition.bom.map(row=>row.ref==='U1'?{...row,mpn:'DUAL_CAN_MCU',role:'dual CAN controller'}:row.ref==='U4'?{...row,role:'second CAN physical layer'}:row)
  definition.bom.push({ref:'R_BOOT',role:'BOOT0 bias strap'},{ref:'R_RESET',role:'reset bias RC'},{ref:'J_SWD',role:'SWD debug header'},{ref:'F_PWR',role:'input fuse protection'},{ref:'JP_TERM',role:'selectable termination jumper'},{ref:'R_MODE1',role:'CAN transceiver mode bias'},{ref:'R_MODE2',role:'CAN transceiver mode bias'},{ref:'D_PWR',role:'input surge suppression'},{ref:'C_BULK',role:'power input bulk decoupling'},{ref:'C4',role:'MCU decoupling'},{ref:'C5',role:'MCU decoupling'},{ref:'C6',role:'CAN decoupling'})
  assert.deepEqual(validateCatalogSemanticTopology(definition).errors,[])
})

test('Board011 USB hub cannot masquerade as an RP2040 instrument with decorative port scallops',()=>{
  const definition=catalogDefinition(manifest.boards[10],10),gate=validateCatalogSemanticTopology(definition)
  assert.equal(definition.topologyId,'rp2040-instrument');assert.equal(gate.ok,false)
  for(const code of['custom-outline-exceeds-maximum-area','usb-hub-controller-missing','usb-hub-upstream-port-missing','usb-hub-four-downstream-ports-missing','usb-hub-port-power-control-missing','usb-hub-overcurrent-evidence-missing','usb-hub-clock-evidence-missing','usb-hub-category-mapped-to-mcu-instrument'])assert.ok(gate.errors.includes(code),code)
  assert.ok(gate.outlineAreaMm2>gate.maximumAreaMm2)
  assert.equal(definition.bom.filter(row=>/usb4105/i.test(row.mpn)).length,1)
})

test('USB hub semantic gate requires one upstream and at least four downstream ports',()=>{
  const definition=catalogDefinition(manifest.boards[10],10);definition.topologyId='usb-hub-controller';definition.catalog.maximumAreaMm2=3000
  definition.bom=[{ref:'U1',role:'USB hub controller'},{ref:'J_UP',role:'upstream USB connector'},...[1,2,3,4].map(index=>({ref:`J_D${index}`,role:'downstream USB connector'})),{ref:'U_PWR',role:'per-port power switch and current limit'},{ref:'U_OC',role:'per-port overcurrent monitor'},{ref:'Y1',role:'hub crystal clock'}]
  assert.deepEqual(validateCatalogSemanticTopology(definition).errors,[])
})

test('remaining catalog clones cannot pass without their advertised architecture hardware',()=>{
  const expected=new Map([
    [15,'bldc-controller-missing'],[21,'gnss-receiver-missing'],[22,'environmental-sensors-missing'],[23,'lora-radio-missing'],[27,'data-acquisition-front-end-missing'],[31,'soil-sensor-interface-missing'],[38,'compute-module-connector-missing'],[39,'fpga-device-missing'],[43,'encoder-sensor-interface-missing'],[45,'isolated-current-sensor-missing'],[46,'high-voltage-divider-missing'],[47,'high-density-connectors-missing'],
  ])
  for(const [index,code]of expected){const definition=catalogDefinition(manifest.boards[index],index),gate=validateCatalogSemanticTopology(definition);assert.equal(gate.ok,false,manifest.boards[index].id);assert.ok(gate.errors.includes(code),`${manifest.boards[index].id}: ${code}`)}
})

test('all unsupported catalog clones 007-050 fail semantic validation before generation',()=>{
  const passing=[];for(let index=6;index<manifest.boards.length;index++){const definition=catalogDefinition(manifest.boards[index],index);if(validateCatalogSemanticTopology(definition).ok)passing.push(manifest.boards[index].id)}
  assert.deepEqual(passing,[])
})

test('Board012 ESP32 shell cannot masquerade as a USB isolator',()=>{
  const definition=catalogDefinition(manifest.boards[11],11),gate=validateCatalogSemanticTopology(definition)
  assert.equal(definition.topologyId,'usb-c-esp32-sensor');assert.equal(gate.ok,false)
  for(const code of['usb-isolator-device-missing','usb-isolator-isolated-power-missing','usb-isolator-upstream-connector-missing','usb-isolator-downstream-connector-missing','usb-isolator-upstream-esd-missing','usb-isolator-downstream-esd-missing','usb-isolator-upstream-decoupling-missing','usb-isolator-downstream-decoupling-missing','usb-isolator-rating-primary-source-unverified','usb-isolator-power-rating-primary-source-unverified','usb-isolator-creepage-clearance-unverified','usb-isolator-category-mapped-to-esp32-sensor'])assert.ok(gate.errors.includes(code),code)
})

test('USB isolator gate accepts only complete source-backed isolation evidence',()=>{
  const roles=['USB data isolator','isolated DC power converter','upstream USB connector','downstream USB connector','upstream USB ESD','downstream USB ESD','upstream rail decoupling','downstream rail decoupling']
  const definition={id:'usb-isolator',topologyId:'usb-isolator',name:'galvanically isolated USB',bom:roles.map((role,index)=>({ref:`X${index}`,role})),semanticEvidence:{usbIsolation:{isolatorPrimarySourceVerified:true,isolationVrms:2500,isolatedPowerPrimarySourceVerified:true,powerIsolationVrms:1500,keepoutVerified:true,creepageMm:4,clearanceMm:3.2}}}
  assert.deepEqual(validateCatalogSemanticTopology(definition).errors,[])
})

test('Board010 USB bench topology cannot masquerade as an Ethernet controller',()=>{
  const definition=catalogDefinition(manifest.boards[9],9),gate=validateCatalogSemanticTopology(definition)
  assert.equal(gate.ok,false)
  assert.equal(definition.topologyId,'rp2040-instrument')
  for(const code of['ethernet-mac-controller-missing','ethernet-phy-missing','ethernet-rj45-connector-missing','ethernet-magnetics-missing','ethernet-reference-clock-missing','ethernet-phy-reset-network-missing','ethernet-phy-strap-network-missing','ethernet-line-protection-missing','ethernet-line-termination-missing','ethernet-phy-decoupling-missing','ethernet-phy-power-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Ethernet category gate accepts an explicitly complete controller path',()=>{
  const roles=['Ethernet MAC controller','Ethernet PHY','RJ45 Ethernet connector','Ethernet magnetics transformer','PHY reference clock','PHY reset network','PHY strap network','Ethernet ESD protection','Ethernet line termination','PHY decoupling','PHY supply regulator']
  const definition={id:'ethernet-controller',topologyId:'ethernet-controller',name:'Ethernet controller',bom:roles.map((role,index)=>({ref:`X${index}`,role}))}
  assert.deepEqual(validateCatalogSemanticTopology(definition).errors,[])
})

test('catalog mechanics preserve clearance around every topology placement envelope',()=>{for(let i=6;i<manifest.boards.length;i++){const d=catalogDefinition(manifest.boards[i],i),xs=d.outlinePoints.map(p=>p[0]),ys=d.outlinePoints.map(p=>p[1]);assert.ok(Math.min(...xs)<=-.75,`${d.id}: left clearance`);assert.ok(Math.min(...ys)<=-.75,`${d.id}: top clearance`);assert.ok(Math.max(...xs)>=d.widthMm+.75,`${d.id}: right clearance`);assert.ok(Math.max(...ys)>=d.heightMm+.75,`${d.id}: bottom clearance`)}})

test('Board013 relay controller cannot masquerade as the generic CAN controller',()=>{
  const definition=catalogDefinition(manifest.boards[12],12),gate=validateCatalogSemanticTopology(definition)
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','relay-output-devices-missing','relay-coil-drivers-missing','relay-flyback-protection-missing','relay-contact-connectors-missing','relay-output-protection-missing','relay-input-isolation-or-protection-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Board014 motor driver cannot masquerade as a USB-C PD sink',()=>{
  const definition=catalogDefinition(manifest.boards[13],13),gate=validateCatalogSemanticTopology(definition)
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','brushed-motor-h-bridge-missing','brushed-motor-power-switches-missing','brushed-motor-connector-missing','brushed-motor-current-sense-missing','brushed-motor-power-entry-protection-missing','brushed-motor-transient-clamp-missing','brushed-motor-gate-control-missing','brushed-motor-bulk-decoupling-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Board015 servo controller cannot masquerade as a generic CAN controller',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[14],14))
  assert.equal(gate.ok,false)
  for(const code of ['servo-channel-connectors-missing','servo-pwm-controller-missing','servo-power-entry-protection-missing','servo-rail-bulk-decoupling-missing','servo-rail-current-capability-missing','servo-signal-protection-missing','servo-failsafe-output-state-missing','servo-supply-monitoring-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Board016 BLDC controller requires a complete protected three-phase power path',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[15],15))
  assert.equal(gate.ok,false)
  for(const code of ['bldc-controller-missing','bldc-three-phase-gate-drive-missing','bldc-power-switches-missing','bldc-current-sense-missing','bldc-motor-connector-missing','bldc-dc-link-decoupling-missing','bldc-power-entry-protection-missing','bldc-rotor-position-interface-missing','bldc-safe-gate-disable-missing','bldc-regeneration-handling-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Board017 requires four independently protected switching channels',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[16],16))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','quad-switch-power-devices-missing','quad-switch-gate-networks-missing','quad-switch-output-terminals-missing','quad-switch-inductive-clamps-missing','quad-switch-current-rating-evidence-missing','quad-switch-default-off-evidence-missing','quad-switch-thermal-path-evidence-missing','quad-switch-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board018 requires independently fused and rated distribution branches',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[17],17))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','power-distribution-branch-fuses-missing','power-distribution-output-terminals-missing','power-distribution-bus-capacity-evidence-missing','power-distribution-branch-rating-evidence-missing','power-distribution-test-or-indication-missing','power-distribution-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board019 requires real cell protection, switching, sensing and balancing',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[18],18))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','bms-cell-monitor-missing','bms-cell-tap-connector-missing','bms-balance-channels-missing','bms-charge-discharge-switches-missing','bms-pack-current-sense-missing','bms-temperature-sense-missing','bms-pack-protection-missing','bms-threshold-evidence-missing','bms-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board020 requires a chemistry-qualified rechargeable pack charger',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[19],19))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','battery-charger-controller-missing','battery-charger-pack-connector-missing','battery-charger-current-programming-missing','battery-charger-voltage-chemistry-evidence-missing','battery-charger-temperature-qualification-missing','battery-charger-termination-status-missing','battery-charger-reverse-or-power-path-missing','battery-charger-safety-timer-missing','battery-charger-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board021 requires a mapped and protected flight-stack peripheral fabric',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[20],20))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','drone-stack-connectors-missing','drone-peripheral-ports-missing','drone-port-protection-missing','drone-power-rail-distribution-missing','drone-power-monitoring-missing','drone-level-translation-missing','drone-port-ground-return-evidence-missing','drone-stack-pin-map-evidence-missing','drone-peripheral-category-mapped-to-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board022 requires complete GNSS RF and inertial sensor signal chains',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[21],21))
  assert.equal(gate.ok,false)
  for(const code of ['gnss-receiver-missing','imu-sensor-missing','gnss-antenna-path-missing','gnss-rf-protection-filter-missing','gnss-antenna-bias-evidence-missing','gnss-backup-supply-missing','gnss-pps-interface-missing','imu-low-noise-supply-missing','imu-interrupt-interface-missing','imu-orientation-evidence-missing','gps-imu-category-mapped-to-esp32-shell'])assert.ok(gate.errors.includes(code),code)
})

test('Board023 requires a durable low-power environmental logging chain',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[22],22))
  assert.equal(gate.ok,false)
  for(const code of ['environmental-sensors-missing','logger-storage-missing','logger-rtc-missing','logger-backup-power-missing','logger-controller-missing','logger-storage-protection-missing','logger-sensor-power-control-missing','logger-low-power-evidence-missing','logger-watchdog-brownout-missing','logger-sensor-self-heating-evidence-missing','logger-condensation-protection-missing','environmental-logger-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board024 requires a region-qualified low-power LoRa RF chain',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[23],23))
  assert.equal(gate.ok,false)
  for(const code of ['lora-radio-missing','lora-antenna-network-missing','low-power-supply-control-missing','lora-region-frequency-evidence-missing','lora-rf-filter-match-missing','lora-rf-esd-missing','lora-reference-clock-missing','lora-host-control-interface-missing','lora-tx-current-decoupling-missing','lora-link-budget-evidence-missing','lora-category-mapped-to-esp32-shell'])assert.ok(gate.errors.includes(code),code)
})

test('Board025 requires a compact provisioned low-power BLE beacon',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[24],24))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','ble-beacon-radio-missing','ble-beacon-antenna-missing','ble-beacon-battery-source-missing','ble-beacon-low-iq-power-missing','ble-beacon-programming-interface-missing','ble-beacon-identity-provisioning-missing','ble-beacon-energy-budget-missing','ble-beacon-rf-compliance-missing','ble-beacon-category-mapped-to-usb-sensor-shell'])assert.ok(gate.errors.includes(code),code)
})

test('Board026 requires a protected two-sided WiFi protocol gateway',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[25],25))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','wifi-gateway-radio-missing','wifi-gateway-antenna-network-missing','wifi-gateway-secondary-protocol-missing','wifi-gateway-field-connector-missing','wifi-gateway-interface-protection-missing','wifi-gateway-security-storage-missing','wifi-gateway-provisioning-recovery-missing','wifi-gateway-throughput-evidence-missing','wifi-gateway-burst-power-evidence-missing','wifi-gateway-category-mapped-to-sensor-shell'])assert.ok(gate.errors.includes(code),code)
})

test('Board027 requires Ethernet plus a protected second gateway protocol',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[26],26))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','ethernet-mac-controller-missing','ethernet-phy-missing','ethernet-rj45-connector-missing','ethernet-magnetics-missing','ethernet-gateway-second-protocol-missing','ethernet-gateway-second-port-missing','ethernet-gateway-second-port-protection-missing','ethernet-gateway-throughput-evidence-missing','ethernet-gateway-buffering-backpressure-missing','ethernet-gateway-security-storage-missing','ethernet-gateway-recovery-update-missing','ethernet-gateway-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board028 requires calibrated acquisition and power-fail-safe removable logging',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[27],27))
  assert.equal(gate.ok,false)
  for(const code of ['data-acquisition-front-end-missing','multi-channel-input-missing','removable-storage-missing','logger-storage-protection-missing','data-logger-input-protection-missing','data-logger-antialias-filter-missing','data-logger-voltage-reference-missing','data-logger-controller-buffering-missing','data-logger-timebase-missing','data-logger-card-power-control-missing','data-logger-power-fail-integrity-missing','data-logger-calibration-evidence-missing','data-logger-category-mapped-to-sensor-shell'])assert.ok(gate.errors.includes(code),code)
})

test('Board029 requires isolated deterministic multi-camera triggering',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[28],28))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','camera-trigger-timing-source-missing','camera-trigger-isolation-missing','camera-trigger-output-drivers-missing','camera-trigger-output-connectors-missing','camera-trigger-output-protection-missing','camera-trigger-sync-input-missing','camera-trigger-jitter-skew-evidence-missing','camera-trigger-voltage-interface-evidence-missing','camera-trigger-default-inactive-missing','camera-trigger-category-mapped-to-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board030 requires a protected high-current LED matrix timing and power path',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[29],29))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','led-matrix-panel-interface-missing','led-matrix-row-column-drive-missing','led-matrix-timing-controller-missing','led-matrix-power-input-protection-missing','led-matrix-bulk-decoupling-missing','led-matrix-current-capacity-evidence-missing','led-matrix-safe-blanking-missing','led-matrix-thermal-monitoring-missing','led-matrix-signal-integrity-evidence-missing','led-matrix-category-mapped-to-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board031 requires a protected calibrated rugged analog sensing chain',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[30],30))
  assert.equal(gate.ok,false)
  for(const code of ['industrial-sensor-probe-interface-missing','industrial-sensor-input-protection-missing','industrial-sensor-excitation-missing','industrial-sensor-analog-front-end-missing','industrial-sensor-filter-missing','industrial-sensor-adc-reference-missing','industrial-sensor-field-power-protection-missing','industrial-sensor-calibration-evidence-missing','industrial-sensor-emc-evidence-missing','industrial-sensor-temperature-evidence-missing','industrial-sensor-category-mapped-to-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board032 requires a weatherproof energy-balanced remote agriculture node',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[31],31))
  assert.equal(gate.ok,false)
  for(const code of ['soil-sensor-interface-missing','climate-sensor-missing','agriculture-radio-missing','field-interface-protection-missing','agriculture-probe-excitation-missing','agriculture-cable-surge-path-missing','agriculture-antenna-network-missing','agriculture-energy-source-missing','agriculture-energy-budget-missing','agriculture-local-storage-timebase-missing','agriculture-ingress-condensation-missing','agriculture-corrosion-uv-evidence-missing','agriculture-category-mapped-to-indoor-sensor-shell'])assert.ok(gate.errors.includes(code),code)
})

test('Board033 requires protected robot interfaces, power and hardware safety',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[32],32))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','robotics-real-time-controller-missing','robotics-actuator-interface-missing','robotics-sensor-interface-missing','robotics-platform-connectors-missing','robotics-interface-protection-missing','robotics-power-tree-missing','robotics-power-monitoring-missing','robotics-emergency-stop-missing','robotics-watchdog-supervisor-missing','robotics-safe-default-state-missing','robotics-main-category-mapped-to-generic-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board034 requires a verified parent-matched robot mezzanine contract',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[33],33))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','robotics-expansion-mezzanine-connectors-missing','robotics-expansion-pin-map-evidence-missing','robotics-expansion-rail-ownership-missing','robotics-expansion-io-connectors-missing','robotics-expansion-io-protection-missing','robotics-expansion-level-translation-missing','robotics-expansion-default-state-missing','robotics-expansion-identification-missing','robotics-expansion-hotplug-evidence-missing','robotics-expansion-current-capacity-missing','robotics-expansion-category-mapped-to-usb-instrument'])assert.ok(gate.errors.includes(code),code)
})

test('Board035 requires a complete low-noise digital audio signal chain',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[34],34))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','audio-dsp-processor-missing','audio-codec-converter-missing','audio-input-connector-missing','audio-output-connector-missing','audio-input-conditioning-missing','audio-output-conditioning-missing','audio-master-clock-missing','audio-low-noise-power-missing','audio-pop-mute-protection-missing','audio-performance-evidence-missing','audio-grounding-layout-evidence-missing','audio-dsp-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board036 requires a protected thermally proven low-distortion power amplifier',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[35],35))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','audio-amplifier-power-stage-missing','audio-amplifier-input-stage-missing','audio-amplifier-speaker-connector-missing','audio-amplifier-supply-connector-missing','audio-amplifier-output-filter-missing','audio-amplifier-speaker-protection-missing','audio-amplifier-mute-sequencing-missing','audio-amplifier-bulk-decoupling-missing','audio-amplifier-thermal-protection-missing','audio-amplifier-load-stability-evidence-missing','audio-amplifier-performance-evidence-missing','audio-amplifier-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board037 requires a fascia-qualified capacitive electrode system',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[36],36))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','touch-controller-missing','touch-electrodes-missing','touch-sense-conditioning-missing','touch-host-interface-missing','touch-esd-protection-missing','touch-overlay-evidence-missing','touch-shield-ground-strategy-missing','touch-water-glove-evidence-missing','touch-baseline-recovery-missing','touch-production-raw-count-test-missing','touch-interface-category-mapped-to-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board038 requires a display-matched operator interface and recovery path',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[37],37))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','hmi-display-interface-missing','hmi-display-power-backlight-missing','hmi-operator-controls-missing','hmi-control-protection-missing','hmi-application-controller-missing','hmi-ui-storage-missing','hmi-host-interface-missing','hmi-watchdog-recovery-missing','hmi-display-timing-evidence-missing','hmi-safe-state-evidence-missing','hmi-category-mapped-to-usb-instrument'])assert.ok(gate.errors.includes(code),code)
})

test('Board039 requires an exact compute-module carrier and high-speed proof',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[38],38))
  assert.equal(gate.ok,false)
  for(const code of ['compute-module-connector-missing','carrier-power-tree-missing','carrier-storage-interface-missing','carrier-high-speed-io-missing','carrier-module-pin-map-evidence-missing','carrier-reset-power-good-missing','carrier-boot-recovery-missing','carrier-high-speed-protection-missing','carrier-signal-integrity-evidence-missing','carrier-backpower-evidence-missing','carrier-thermal-solution-missing','carrier-manufacturing-bringup-missing','linux-carrier-category-mapped-to-pd-sink'])assert.ok(gate.errors.includes(code),code)
})

test('Board040 requires a bank-planned sequenced high-speed FPGA platform',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[39],39))
  assert.equal(gate.ok,false)
  for(const code of ['fpga-device-missing','fpga-configuration-memory-missing','fpga-high-speed-connector-missing','fpga-bank-decoupling-missing','fpga-clock-missing','fpga-bank-voltage-plan-missing','fpga-power-sequencing-missing','fpga-jtag-reset-missing','fpga-mezzanine-pin-map-missing','fpga-high-speed-channel-evidence-missing','fpga-pdn-evidence-missing','fpga-timing-analysis-missing','fpga-thermal-solution-missing','fpga-category-mapped-to-usb-instrument'])assert.ok(gate.errors.includes(code),code)
})

test('Board041 requires protected deterministic multi-channel digital capture',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[40],40))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','logic-analyzer-probe-connectors-missing','logic-analyzer-input-channels-missing','logic-analyzer-input-protection-missing','logic-analyzer-level-threshold-missing','logic-analyzer-capture-engine-missing','logic-analyzer-trigger-engine-missing','logic-analyzer-sample-clock-missing','logic-analyzer-capture-buffer-missing','logic-analyzer-host-stream-missing','logic-analyzer-bandwidth-evidence-missing','logic-analyzer-timing-evidence-missing','logic-analyzer-production-test-missing','logic-analyzer-category-mapped-to-generic-usb-instrument'])assert.ok(gate.errors.includes(code),code)
})

test('Board042 requires a protected calibrated oscilloscope acquisition chain',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[41],41))
  assert.equal(gate.ok,false)
  for(const code of ['custom-outline-exceeds-maximum-area','oscilloscope-input-connector-missing','oscilloscope-attenuator-missing','oscilloscope-overload-protection-missing','oscilloscope-coupling-termination-missing','oscilloscope-front-end-amplifier-missing','oscilloscope-antialias-filter-missing','oscilloscope-adc-missing','oscilloscope-reference-clock-missing','oscilloscope-trigger-pickoff-missing','oscilloscope-shield-grounding-missing','oscilloscope-bandwidth-linearity-evidence-missing','oscilloscope-calibration-overload-evidence-missing','oscilloscope-category-mapped-to-generic-usb-instrument'])assert.ok(gate.errors.includes(code),code)
})

test('catalog manufacturing refuses stale source copper and accepts only byte-identical promoted candidate',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'boardforge-catalog-authoritative-')),source=path.join(root,'board.kicad_pcb'),candidate=path.join(root,'candidate.kicad_pcb')
  await fs.writeFile(source,'legacy proof-coordinate copper');await fs.writeFile(candidate,'authoritative routed copper')
  const stale=await verifyCatalogAuthoritativePcbSelection({pcbFile:source,routing:{status:'CANDIDATE_PROMOTED',sourcePcb:source,candidatePcb:candidate}})
  assert.equal(stale.ok,false);assert.ok(stale.errors.includes('promoted-source-does-not-match-authoritative-candidate'))
  const deferred=await verifyCatalogAuthoritativePcbSelection({pcbFile:source,routing:{status:'COPPERLESS_CANDIDATE_READY',sourcePcb:source,candidatePcb:candidate}})
  assert.equal(deferred.ok,false);assert.match(deferred.errors[0],/authoritative-routing-status/)
  await fs.copyFile(candidate,source)
  const promoted=await verifyCatalogAuthoritativePcbSelection({pcbFile:source,routing:{status:'CANDIDATE_PROMOTED',sourcePcb:source,candidatePcb:candidate}})
  assert.equal(promoted.ok,true);assert.equal(promoted.sourceSha256,promoted.candidateSha256)
})
