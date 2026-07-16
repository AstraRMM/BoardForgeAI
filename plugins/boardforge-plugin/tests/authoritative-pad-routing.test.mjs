import test from 'node:test'
import assert from 'node:assert/strict'
import { authoritativePadRoutingInput,compactEsp32FixedCorridors,rp2040InstrumentFixedCorridors,stm32AuthoritativeFixedCorridors,tps25750SourceFixedCorridors } from '../lib/routing/authoritative-pad-routing.mjs'
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

test('TPS25750 source raw input corridor activates only for exact transformed topology',()=>{
  const p=(ref,pad,x,y)=>({ref,pad,x,y}),input={bounds:{maxX:61,maxY:31},nets:[
    {net:'5V_RAW',endpoints:[p('J1','1',38.5,28.5),p('F1','1',29.288,28.5)]},
    {net:'PP5V',endpoints:[p('F1','2',35.212,28.5)]},
    {net:'CC1',endpoints:[p('U2','28',40.1,21.575),p('J2','A5',19.75,2.32)]},
    {net:'CC2',endpoints:[p('U2','29',39.7,21.575),p('J2','B5',22.75,2.32)]},
    {net:'3V3',endpoints:[p('U1','2',19.45,14.438),p('U2','1',35.575,22.5),p('U2','38',36.1,21.575),p('U3','8',33.575,21.595),p('C_3V3','1',29.45,7.25)]},
    {net:'1V5',endpoints:[p('U2','4',35.575,23.7),p('C_1V5','1',19.45,24.75)]},
  ]}
  const result=tps25750SourceFixedCorridors(input,{trackWidth:.2,viaDiameter:.6})
  assert.deepEqual(result.completedNets,['5V_RAW','3V3','1V5'])
  assert.equal(result.tracks[1].layer,'In4.Cu')
  assert.deepEqual([result.vias[0].x,result.vias[0].y],[27.5,28.5])
  assert.equal(result.tracks.filter(x=>x.net==='3V3'&&x.layer==='F.Cu').length,5)
  assert.equal(result.tracks.filter(x=>x.net==='3V3'&&x.layer==='In3.Cu').length,6)
  assert.equal(result.vias.filter(x=>x.net==='3V3').length,5)
  assert.equal(result.tracks.filter(x=>x.net==='1V5').length,3)
  const changed=structuredClone(input);changed.nets.find(n=>n.net==='CC1').endpoints[0].pad='99'
  assert.deepEqual(tps25750SourceFixedCorridors(changed,{}).completedNets,[])
})

test('RP2040 frozen topology includes the cumulatively proven SCLK perimeter corridor',()=>{
  const p=(ref,pad,x,y)=>({ref,pad,x,y}),nets=[
    {net:'USB_DP',endpoints:[p('D1','6',18.418,21.05),p('U1','47',33,16.563)]},{net:'USB_DN',endpoints:[p('D1','4',18.418,22.95),p('U1','46',33.4,16.563)]},
    {net:'VBUS',endpoints:[p('J1','A4',5.92,16.32),p('J1','A9',10.72,16.32),p('D1','5',18.418,22),p('U3','3',25.258,10)]},
    {net:'GND',endpoints:[p('J1','A1',5.12,16.32),p('J1','A12',11.52,16.32),p('J1','SH',4,16.895),p('J1','SH',4,21.075),p('J1','SH',12.64,16.895),p('J1','SH',12.64,21.075),p('U3','1',23.383,9.05),p('C1','2',28.905,9.95),p('C2','2',32.775,11.2),p('C3','2',37.895,11.2),p('U1','57',32,20),p('U2','4',42.325,21.905),p('R1','2',14.905,30),p('R2','2',18.745,30),p('D1','2',16.143,22),p('J2','1',51.2,20)]},
    {net:'QSPI_SCLK',endpoints:[p('U1','52',31,16.563),p('U2','6',47.275,20.635)]},{net:'QSPI_CS',endpoints:[p('U1','56',29.4,16.563),p('U2','1',42.325,18.095)]},{net:'QSPI_SD3',endpoints:[p('U1','51',31.4,16.563),p('U2','7',47.275,19.365)]},{net:'QSPI_SD2',endpoints:[p('U1','54',30.2,16.563),p('U2','3',42.325,20.635)]},{net:'QSPI_SD1',endpoints:[p('U1','55',29.8,16.563),p('U2','2',42.325,19.365)]},{net:'QSPI_SD0',endpoints:[p('U1','53',30.6,16.563),p('U2','5',47.275,21.905)]},
  ]
  const result=rp2040InstrumentFixedCorridors({bounds:{maxX:63,maxY:39},nets},{trackWidth:.2,viaDiameter:.5})
  assert.ok(result.completedNets.includes('QSPI_SCLK'))
  assert.ok(result.vias.some(v=>v.net==='QSPI_SCLK'&&v.x===32&&v.y===12))
  assert.ok(result.completedNets.includes('QSPI_CS'))
  assert.ok(result.vias.some(v=>v.net==='QSPI_CS'&&v.x===28.8&&v.y===15.1))
  assert.ok(result.completedNets.includes('QSPI_SD3'))
  assert.ok(result.vias.some(v=>v.net==='QSPI_SD3'&&v.x===31.8&&v.y===15))
  assert.ok(result.completedNets.includes('QSPI_SD2'))
  assert.ok(result.tracks.some(t=>t.net==='QSPI_SD2'&&t.layer==='In1.Cu'&&t.start.y===22.8&&t.end.y===22.8))
  assert.ok(result.completedNets.includes('QSPI_SD1'))
  assert.ok(result.vias.some(v=>v.net==='QSPI_SD1'&&v.x===29.6&&v.y===19.2))
  assert.ok(result.completedNets.includes('QSPI_SD0'))
  assert.ok(result.vias.some(v=>v.net==='QSPI_SD0'&&v.x===29.8&&v.y===12))
  assert.deepEqual(result.partialNets,[])
  assert.equal(result.completedNets.includes('GND'),true)
  assert.equal(result.tracks.filter(t=>t.net==='GND').length,31)
  assert.equal(result.vias.filter(v=>v.net==='GND').length,9)
  assert.ok(result.tracks.some(t=>t.net==='GND'&&t.layer==='B.Cu'&&t.start.y===23&&t.end.y===23))
})
