import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveAuthoritativeKiCadFootprint,serializeAuthoritativeKiCadFootprint,transformAuthoritativePads} from '../lib/components/authoritative-kicad-footprint-resolver.mjs'

test('installed ESP32-S3 module resolves exact SMD pads and exposed pad 41 drills',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('RF_Module:ESP32-S3-WROOM-1')
  assert.match(fp.sourceFile,/RF_Module\.pretty[\\/]ESP32-S3-WROOM-1\.kicad_mod$/)
  assert.ok(fp.pads.some(p=>p.number==='1'&&p.type==='smd'))
  assert.ok(fp.pads.some(p=>p.number==='41'&&p.drill?.widthMm>0))
  assert.deepEqual(fp.padNumbers.slice(0,3),['','1','2'])
})

test('installed USB4105 footprint preserves alphanumeric pad names and exact layers',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal')
  for(const number of['A1','A4','A5','A6','A7','B1','B4','B5','B6','B7','SH'])assert.ok(fp.padNumbers.includes(number),number)
  assert.ok(fp.pads.find(p=>p.number==='A4').layers.includes('F.Cu'))
})

test('0603 passive pads expose transform-ready local geometry',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('Resistor_SMD:R_0603_1608Metric')
  assert.deepEqual(fp.padNumbers,['1','2'])
  const placed=transformAuthoritativePads(fp.pads,{x:10,y:20,rotation:90})
  assert.ok(placed.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.side==='front'))
  assert.notDeepEqual(placed.map(p=>[p.x,p.y]),fp.pads.map(p=>[p.x,p.y]))
})

test('installed MiniMELF footprint resolves under the KiCad 10 package identifier',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('Resistor_SMD:R_MiniMELF_MMA-0204')
  assert.match(fp.sourceFile,/Resistor_SMD\.pretty[\\/]R_MiniMELF_MMA-0204\.kicad_mod$/)
  assert.deepEqual(fp.padNumbers,['1','2'])
})

test('resolver rejects traversal and missing installed footprints explicitly',()=>{
  assert.throws(()=>resolveAuthoritativeKiCadFootprint('../Bad:Thing'),/library is invalid/)
  assert.throws(()=>resolveAuthoritativeKiCadFootprint('NoSuchLibrary:NoSuchFootprint'),/not installed/)
})

test('source-derived THI 2-0511M footprint retains its six exact lead positions and declared fabrication rule',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('BoardForge:THI_2-0511M_DIP16_6Lead')
  assert.equal(fp.sourceFile,'bundled:traco-thi2m-datasheet-rev-2024-06-19-page-4-plus-boardforge-tht-fabrication-rule')
  assert.deepEqual(fp.padNumbers,['1','7','8','9','10','16'])
  assert.deepEqual(fp.pads.find(p=>p.number==='1')&&[p(fp,'1','x'),p(fp,'1','y')],[0,0])
  assert.deepEqual(fp.pads.find(p=>p.number==='7')&&[p(fp,'7','x'),p(fp,'7','y')],[0,15.24])
  assert.deepEqual(fp.pads.find(p=>p.number==='8')&&[p(fp,'8','x'),p(fp,'8','y')],[0,17.78])
  assert.deepEqual(fp.pads.find(p=>p.number==='9')&&[p(fp,'9','x'),p(fp,'9','y')],[10.16,17.78])
  assert.ok(fp.pads.every(pad=>pad.type==='thru_hole'&&pad.drill?.widthMm===.8&&pad.widthMm===1.6))
})
function p(fp,number,key){return fp.pads.find(pad=>pad.number===number)?.[key]}

test('PCB serialization keeps local coordinates and adds footprint rotation to pad orientation',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('RF_Module:ESP32-S3-WROOM-1U')
  const text=serializeAuthoritativeKiCadFootprint({resolved:fp,ref:'U1',value:'ESP32-S3-WROOM-1U-N8R8',at:{x:21,y:10.5,rotation:90},netByPad:{1:{netNumber:4,netName:'GND'}},uuidFor:key=>`00000000-0000-4000-8000-${String(key.length).padStart(12,'0')}`})
  assert.match(text,/\(at 21 10\.5 90\)/)
  assert.match(text,/\(pad "1"[\s\S]*?\(at -8\.75 -8\.41 90\)[\s\S]*?\(size 1\.5 0\.9\)[\s\S]*?\(net 4 "GND"\)/)
  assert.doesNotMatch(text,/\(pad "1"[\s\S]*?\(at 12\.59 19\.25/)
})

test('PCB serialization carries canonical custom fields into authoritative footprint instances',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('Resistor_SMD:R_0603_1608Metric')
  const text=serializeAuthoritativeKiCadFootprint({resolved:fp,ref:'R1',value:'10k',at:{x:10,y:10},properties:{BoardForgeComponentUuid:'component-uuid',BoardForgeBindingId:'binding-id'},uuidFor:key=>`00000000-0000-4000-8000-${String(key.length).padStart(12,'0')}`})
  assert.match(text,/\(property "BoardForgeComponentUuid" "component-uuid"/)
  assert.match(text,/\(property "BoardForgeBindingId" "binding-id"/)
})

test('PCB serialization repeats logical pin numbers for physically grouped package lands',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('Package_SO:PowerPAK_SO-8_Single')
  const text=serializeAuthoritativeKiCadFootprint({resolved:fp,ref:'Q1',value:'SI7465DP-T1-GE3',at:{x:10,y:10},netByPad:{1:{netNumber:1,netName:'SOURCE'},2:{netNumber:1,netName:'SOURCE'},3:{netNumber:1,netName:'SOURCE'},4:{netNumber:2,netName:'GATE'},5:{netNumber:3,netName:'DRAIN'},6:{netNumber:3,netName:'DRAIN'},7:{netNumber:3,netName:'DRAIN'},8:{netNumber:3,netName:'DRAIN'}},padNumberAliases:{1:'2',2:'2',3:'2',4:'1',5:'3',6:'3',7:'3',8:'3'}})
  assert.equal([...text.matchAll(/\(pad "2"/g)].length,3)
  assert.equal([...text.matchAll(/\(pad "1"/g)].length,1)
  assert.equal([...text.matchAll(/\(pad "3"/g)].length,5)
  assert.doesNotMatch(text,/\(pad "[4-8]"/)
})
