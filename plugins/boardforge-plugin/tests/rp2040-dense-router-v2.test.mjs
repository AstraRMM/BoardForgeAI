import test from 'node:test'
import assert from 'node:assert/strict'
import {routeCollisionAwareChannelsV2 as route,optimizeDensePeripheralPlacement,optimizeConnectorPinAssignment} from '../lib/routing/collision-aware-channel-router-v2.mjs'
import {findCrossNetCollisions} from '../lib/routing/collision-aware-channel-router.mjs'

const P={
 GND:[[10,15],[10,16],[10,25],[15,22],[31,20],[42,20],[17,11],[14.1,19],[14.1,27],[25,11],[31,11],[45,31],[56,15]],
 '3V3':[[27,17],[27,20],[35,16],[35,17],[35,18],[38,17],[21,10],[25,9],[31,9],[45,29],[56,17]],
 VBUS:[[10,17],[10,18],[19,22],[17,9]], CC1:[[10,19],[11.9,19]],CC2:[[10,20],[11.9,27]],
 USB_DP_CONN:[[10,21],[10,22],[15,20]],USB_DN_CONN:[[10,23],[10,24],[15,24]],USB_DP:[[19,20],[27,24]],USB_DN:[[19,24],[27,23]],
 QSPI_CS:[[35,24],[42,23]],QSPI_SD1:[[35,23],[42,22]],QSPI_SD2:[[35,22],[42,21]],QSPI_SD0:[[35,21],[38,20]],QSPI_SCLK:[[35,20],[38,19]],QSPI_SD3:[[35,19],[38,18]],
 SWDIO:[[27,22],[56,25]],SWCLK:[[27,21],[56,23]],I2C_SCL:[[27,18],[56,19]],I2C_SDA:[[27,19],[56,21]]
}
const options={bounds:{minX:0,minY:0,maxX:64,maxY:40},layers:['F.Cu','In1.Cu','In2.Cu','B.Cu'],clearance:.12,trackWidth:.12,viaDiameter:.4,lanePitch:.7,dogbone:.55}
const qspiNames=['QSPI_CS','QSPI_SD1','QSPI_SD2','QSPI_SD0','QSPI_SCLK','QSPI_SD3']
const optimized=optimizeDensePeripheralPlacement({nets:qspiNames.map(net=>({net,endpoints:P[net].map(([x,y])=>({x,y}))})),pivot:{x:40,y:20},movable:()=>false})
const optimizedByNet=new Map(optimized.nets.map(x=>[x.net,x.endpoints]))
const connector=optimizeConnectorPinAssignment({sources:['I2C_SCL','I2C_SDA','SWCLK','SWDIO'].map(net=>({net,point:{x:P[net][0][0],y:P[net][0][1]}})),slots:[3,4,5,6].map((pin,index)=>({pin,point:{x:56,y:19+index*2}}))})
const trees=names=>names.map(net=>({net,endpoints:optimizedByNet.get(net)||P[net].map(([x,y])=>({x,y}))}))
test('actual RP2040/QSPI/J2 dense endpoints route in shared occupancy',()=>{
 let occupancy={tracks:[],vias:[]}
 for(const names of [['GND','3V3'],['QSPI_CS','QSPI_SD1','QSPI_SD2','QSPI_SD0','QSPI_SCLK','QSPI_SD3'],['VBUS','CC1','CC2','USB_DP_CONN','USB_DN_CONN','USB_DP','USB_DN'],['SWDIO','SWCLK','I2C_SCL','I2C_SDA']])occupancy=route({...options,nets:trees(names),occupancy}).occupancy
 assert.equal(new Set(occupancy.tracks.map(x=>x.net)).size,19)
 assert.deepEqual(findCrossNetCollisions({...occupancy,clearance:options.clearance}),[])
 assert.equal(optimized.name,'identity')
 assert.deepEqual(connector.assignments.map(x=>[x.pin,x.net]),[[3,'I2C_SCL'],[4,'I2C_SDA'],[5,'SWCLK'],[6,'SWDIO']])
})
