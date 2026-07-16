import test from 'node:test'
import assert from 'node:assert/strict'
import { authoritativePadRoutingInput,compactEsp32FixedCorridors,stm32AuthoritativeFixedCorridors } from '../lib/routing/authoritative-pad-routing.mjs'
import { routeCollisionAwareChannelsV2 } from '../lib/routing/collision-aware-channel-router-v2.mjs'

const scan={boardSize:{bounds:{minX:0,minY:0,maxX:50,maxY:30}},layers:[{name:'F.Cu',type:'signal'},{name:'In1.Cu',type:'signal'},{name:'In2.Cu',type:'signal'},{name:'B.Cu',type:'signal'}],nets:[{name:'USB_D+',number:1},{name:'USB_D-',number:2},{name:'I2C_SCL',number:3},{name:'I2C_SDA',number:4},{name:'BLOCKER',number:5}],tracks:[],vias:[],pads:[
  {ref:'U1',pad:'1',netName:'USB_D+',x:10,y:10,widthMm:.4,heightMm:1.2},
  {ref:'J1',pad:'A6',netName:'USB_D+',x:40,y:8,widthMm:.3,heightMm:.8},
  {ref:'U1',pad:'2',netName:'USB_D-',x:10,y:12,widthMm:.4,heightMm:1.2},
  {ref:'J1',pad:'A7',netName:'USB_D-',x:40,y:14,widthMm:.3,heightMm:.8},
  {ref:'U1',pad:'3',netName:'I2C_SCL',x:12,y:18,widthMm:.4,heightMm:1.2},
  {ref:'J2',pad:'1',netName:'I2C_SCL',x:38,y:20,widthMm:.8,heightMm:.8},
  {ref:'U1',pad:'4',netName:'I2C_SDA',x:12,y:20,widthMm:.4,heightMm:1.2},
  {ref:'J2',pad:'2',netName:'I2C_SDA',x:38,y:22,widthMm:.8,heightMm:.8},
  {ref:'U1',pad:'5',netName:'BLOCKER',x:25,y:15,widthMm:2,heightMm:2},
]}

test('derives ESP32-class topology and obstacles from transformed placed pads',()=>{
  const input=authoritativePadRoutingInput(scan,{clearance:.15})
  assert.equal(input.nets.length,4)
  assert.equal(input.padCount,9)
  assert.equal(input.occupancy.tracks.filter(v=>v.kind==='projected-pad-obstacle').length,9)
  assert.deepEqual(input.nets.find(n=>n.net==='USB_D+').endpoints.map(p=>[p.ref,p.pad,p.x,p.y]),[['U1','1',10,10],['J1','A6',40,8]])
  const routed=routeCollisionAwareChannelsV2({...input,trackWidth:.12,viaDiameter:.4})
  assert.equal(routed.diagnostics.netsRouted,4)
  assert.deepEqual(routed.diagnostics.crossNetCollisions,[])
})

test('existing foreign occupancy is enforced instead of silently discarded',()=>{
  const base={nets:[{net:'A',endpoints:[{x:5,y:5},{x:45,y:5}]}],bounds:{minX:0,minY:0,maxX:50,maxY:20},layers:['F.Cu'],clearance:.2,trackWidth:.15,viaDiameter:.5}
  const clear=routeCollisionAwareChannelsV2(base)
  const blocked=routeCollisionAwareChannelsV2({...base,occupancy:{tracks:[],vias:[{net:'B',x:25,y:5,diameter:3}]}})
  assert.notDeepEqual(blocked.tracks,clear.tracks)
  assert.deepEqual(blocked.diagnostics.crossNetCollisions,[])
})

test('compact authoritative USB fanout uses manufacturable drills and staggered foreign-net vias',()=>{
  const ep=(ref,x,y)=>({ref,x,y}),nets=[
    {net:'USB_DP',endpoints:[ep('J1',9.68,6.5),ep('J1',9.68,7.5),ep('U1',29.1,19.25)]},
    {net:'USB_DN',endpoints:[ep('J1',9.68,6),ep('J1',9.68,7),ep('U1',27.83,19.25)]},
    {net:'CC1',endpoints:[ep('J1',9.68,5.5),ep('R1',32.25,20.075)]},
    {net:'CC2',endpoints:[ep('J1',9.68,8.5),ep('R2',7.675,18)]},
  ]
  const result=compactEsp32FixedCorridors({bounds:{minX:1,minY:1,maxX:41,maxY:20},nets},{trackWidth:.2,viaDiameter:.5})
  assert.deepEqual(result.completedNets.slice(0,4),['USB_DP','USB_DN','CC1','CC2'])
  assert.ok(result.vias.every(v=>v.drill>=.3))
  const usb=result.vias.filter(v=>/^USB_D/.test(v.net))
  for(let i=0;i<usb.length;i++)for(let j=i+1;j<usb.length;j++)if(usb[i].net!==usb[j].net)assert.ok(Math.hypot(usb[i].x-usb[j].x,usb[i].y-usb[j].y)>=.7-1e-9)
  assert.deepEqual(result.vias.filter(v=>v.net==='USB_DN').slice(0,2).map(v=>[v.x,v.y]),[[8.5,6],[8,7]])
  assert.ok(result.tracks.some(t=>t.net==='USB_DN'&&t.layer==='In2.Cu'&&t.start.y===19&&t.end.y===19))
})

test('STM32 authoritative corridor proof activates only for its exact endpoint topology',()=>{
  const endpoints=(items)=>items.map(value=>{const [ref,pad]=value.split(':');return{ref,pad,x:ref==='U2'&&pad==='1'?27.275:0,y:ref==='U2'&&pad==='1'?8.345:0}})
  const specs={CANH:['D1:1','J2:3','R1:1','U2:7'],CANL:['D1:2','J2:4','R1:2','U2:6'],GND:['C1:2','C2:2','C3:2','D1:3','J1:2','J2:1','U1:23','U1:35','U1:47','U2:2','U3:1'],'3V3':['C1:1','C2:1','C3:1','J2:2','U1:24','U1:36','U1:48','U2:3','U3:2'],CAN_TX:['U1:33','U2:1'],CAN_RX:['U1:32','U2:4'],I2C_SCL:['J2:5','U1:42'],I2C_SDA:['J2:6','U1:43'],'5V':['J1:1','U3:3']}
  const input={bounds:{minX:1,minY:1,maxX:61,maxY:37},nets:Object.entries(specs).map(([net,items])=>({net,endpoints:endpoints(items)}))}
  const routed=stm32AuthoritativeFixedCorridors(input,{trackWidth:.2,viaDiameter:.6})
  assert.equal(routed.tracks.length,108)
  assert.equal(routed.vias.length,31)
  assert.deepEqual(new Set(routed.completedNets),new Set(['GND','5V','CAN_TX','I2C_SDA','3V3','CAN_RX','CANH','CANL','I2C_SCL']))
  assert.ok(routed.vias.every(v=>v.diameter===.5&&v.drill===.3))
  const changed=structuredClone(input);changed.nets.find(n=>n.net==='CANH').endpoints[0].pad='99'
  assert.deepEqual(stm32AuthoritativeFixedCorridors(changed,{}).completedNets,[])
})
