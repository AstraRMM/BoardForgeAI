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
