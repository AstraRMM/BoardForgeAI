import assert from 'node:assert/strict'
import test from 'node:test'
import {authoritativeConnectionInventory,rp2040InstrumentFixedCorridors,rp2040InstrumentPowerTopologyGate} from '../lib/routing/authoritative-pad-routing.mjs'

const endpoints=(spec)=>spec.split(' ').map(id=>{const [ref,pad]=id.split(':');return{ref,pad,x:1,y:1,layers:['F.Cu']}})
const input={nets:[
  {net:'GND',endpoints:endpoints('J1:A1 J1:A12 J1:SH J1:SH J1:SH J1:SH D1:2 U1:57 U2:4 U3:1 J2:1 R1:2 R2:2 C1:2 C2:2 C3:2')},
  {net:'VBUS',endpoints:endpoints('J1:A4 J1:A9 D1:5 U3:3')},
  {net:'3V3',endpoints:endpoints('U1:1 U1:48 U1:49 U1:50 U2:8 U3:2 J2:2 C1:1 C2:1 C3:1')},
  ...['CC1','CC2','USB_DN','USB_DP','I2C_SCL','I2C_SDA','SWCLK','SWDIO','QSPI_SD3','QSPI_SCLK','QSPI_SD0','QSPI_SD2','QSPI_SD1','QSPI_CS'].map((net,index)=>({net,endpoints:endpoints(`A${index}:1 B${index}:2`)})),
  {net:'USB_DP_CONN',endpoints:endpoints('J1:A6 J1:B6 D1:1')},
  {net:'USB_DN_CONN',endpoints:endpoints('J1:A7 J1:B7 D1:3')},
]}

test('RP2040 copperless endpoint inventory proves 45 required physical connections',()=>{
  const inventory=authoritativeConnectionInventory(input)
  assert.equal(inventory.requiredConnections,45)
  assert.equal(inventory.nets.find(row=>row.net==='GND').requiredConnections,15)
})

test('RP2040 power topology is fixed to 27 power joins before 18 signal joins',()=>{
  const gate=rp2040InstrumentPowerTopologyGate(input)
  assert.equal(gate.valid,true)
  assert.equal(gate.powerConnections,27)
  assert.equal(gate.signalConnections,18)
  assert.deepEqual([gate.plan.GND.layer,gate.plan.VBUS.layer,gate.plan['3V3'].layer],['B.Cu','In2.Cu','In1.Cu'])
})

test('RP2040 power topology fails closed when a regulator source endpoint disappears',()=>{
  const changed=structuredClone(input)
  changed.nets.find(row=>row.net==='3V3').endpoints=changed.nets.find(row=>row.net==='3V3').endpoints.filter(row=>`${row.ref}:${row.pad}`!=='U3:2')
  const gate=rp2040InstrumentPowerTopologyGate(changed)
  assert.equal(gate.valid,false)
  assert.match(gate.errors.join('\n'),/missing topology anchor U3:2/)
})

test('RP2040 fixed corridors admit only exact USB_DP and four-endpoint VBUS topology',()=>{
  const placed={bounds:{minX:1,minY:1,maxX:63,maxY:39},nets:[
    {net:'USB_DP',endpoints:[{ref:'D1',pad:'6',x:18.418,y:21.05},{ref:'U1',pad:'47',x:33,y:16.563}]},
    {net:'USB_DN',endpoints:[{ref:'D1',pad:'4',x:18.418,y:22.95},{ref:'U1',pad:'46',x:33.4,y:16.563}]},
    {net:'VBUS',endpoints:[{ref:'J1',pad:'A4',x:5.92,y:16.32},{ref:'J1',pad:'A9',x:10.72,y:16.32},{ref:'D1',pad:'5',x:18.418,y:22},{ref:'U3',pad:'3',x:25.258,y:10}]},
    {net:'GND',endpoints:[{ref:'J1',pad:'A1',x:5.12,y:16.32},{ref:'J1',pad:'A12',x:11.52,y:16.32},{ref:'J1',pad:'SH',x:4,y:16.895},{ref:'J1',pad:'SH',x:4,y:21.075},{ref:'J1',pad:'SH',x:12.64,y:16.895},{ref:'J1',pad:'SH',x:12.64,y:21.075},{ref:'U3',pad:'1',x:23.383,y:9.05},{ref:'C1',pad:'2',x:28.905,y:9.95},{ref:'C2',pad:'2',x:32.775,y:11.2},{ref:'C3',pad:'2',x:37.895,y:11.2},{ref:'U1',pad:'57',x:32,y:20},{ref:'U2',pad:'4',x:42.325,y:21.905}]},
  ]}
  const fixed=rp2040InstrumentFixedCorridors(placed,{trackWidth:.25,viaDiameter:.6})
  assert.deepEqual(new Set(fixed.completedNets.slice(0,3)),new Set(['USB_DP','VBUS','USB_DN']))
  assert.equal(fixed.tracks.filter(row=>row.net==='VBUS').length,9)
  assert.equal(fixed.vias.filter(row=>row.net==='VBUS').length,4)
  assert.ok(fixed.vias.some(row=>row.net==='VBUS'&&row.x===20.5&&row.y===22),'VBUS D1 escape must clear the proven USB_DP via corridor')
  assert.equal(fixed.tracks.filter(row=>row.net==='GND').length,20)
  assert.equal(fixed.vias.filter(row=>row.net==='GND').length,6)
  assert.equal(fixed.completedNets.includes('GND'),false,'bounded connector ground subset must not claim the whole GND net')
  assert.equal(fixed.tracks.some(row=>row.net==='3V3'),false)
  const movedLocal=structuredClone(placed);movedLocal.nets.find(row=>row.net==='GND').endpoints.find(row=>row.ref==='U3').x+=.01
  assert.equal(rp2040InstrumentFixedCorridors(movedLocal).tracks.filter(row=>row.net==='GND').length,5,'moved local cluster must fall back to proven J1 subset only')
  const movedLogic=structuredClone(placed);movedLogic.nets.find(row=>row.net==='GND').endpoints.find(row=>row.ref==='U1').x+=.01
  assert.equal(rp2040InstrumentFixedCorridors(movedLogic).tracks.filter(row=>row.net==='GND').length,14,'moved logic ground must retain only the two earlier proven subsets')
  const changed=structuredClone(placed);changed.nets.find(row=>row.net==='VBUS').endpoints[0].x+=.01
  assert.deepEqual(rp2040InstrumentFixedCorridors(changed).completedNets,[])
})
