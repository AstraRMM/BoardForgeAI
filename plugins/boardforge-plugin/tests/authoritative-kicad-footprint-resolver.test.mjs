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

test('resolver rejects traversal and missing installed footprints explicitly',()=>{
  assert.throws(()=>resolveAuthoritativeKiCadFootprint('../Bad:Thing'),/library is invalid/)
  assert.throws(()=>resolveAuthoritativeKiCadFootprint('NoSuchLibrary:NoSuchFootprint'),/not installed/)
})

test('PCB serialization keeps local coordinates and adds footprint rotation to pad orientation',()=>{
  const fp=resolveAuthoritativeKiCadFootprint('RF_Module:ESP32-S3-WROOM-1U')
  const text=serializeAuthoritativeKiCadFootprint({resolved:fp,ref:'U1',value:'ESP32-S3-WROOM-1U-N8R8',at:{x:21,y:10.5,rotation:90},netByPad:{1:{netNumber:4,netName:'GND'}},uuidFor:key=>`00000000-0000-4000-8000-${String(key.length).padStart(12,'0')}`})
  assert.match(text,/\(at 21 10\.5 90\)/)
  assert.match(text,/\(pad "1"[\s\S]*?\(at -8\.75 -8\.41 90\)[\s\S]*?\(size 1\.5 0\.9\)[\s\S]*?\(net 4 "GND"\)/)
  assert.doesNotMatch(text,/\(pad "1"[\s\S]*?\(at 12\.59 19\.25/)
})
