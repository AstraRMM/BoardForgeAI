import test from 'node:test'
import assert from 'node:assert/strict'
import { findCrossNetCollisions } from '../lib/routing/collision-aware-channel-router.mjs'
import { routeCollisionAwareChannelsV2 } from '../lib/routing/collision-aware-channel-router-v2.mjs'
import { rp2040InstrumentCategoryPcbEvidence } from '../lib/real-board-proof.mjs'

const evidence=rp2040InstrumentCategoryPcbEvidence()
const layers=['F.Cu','In1.Cu','In2.Cu','B.Cu']
const bounds={minX:0,minY:0,maxX:64,maxY:40}
const nets=evidence.nets.filter(row=>row.name).map(({name:net})=>({net,endpoints:evidence.footprints.flatMap(footprint=>footprint.pads.filter(pad=>pad.netName===net).map(pad=>({x:footprint.at.x+pad.x,y:footprint.at.y+pad.y}))) }))
const netNames=nets.map(row=>row.net)
const input={bounds,layers,clearance:.12,trackWidth:.12,viaDiameter:.4,lanePitch:.7,dogbone:.55,nets}

test('realistic 19-net RP2040 topology routes on four copper layers without cross-net track or via collisions',()=>{
  assert.equal(nets.length,19)
  assert.deepEqual(nets.find(row=>row.net==='QSPI_CS').endpoints,[{x:35,y:24},{x:42,y:23}])
  assert.ok(nets.find(row=>row.net==='GND').endpoints.length>=8)
  const result=routeCollisionAwareChannelsV2(input)
  assert.equal(result.diagnostics.netsRouted,19)
  assert.deepEqual(result.diagnostics.crossNetCollisions,[])
  assert.deepEqual(findCrossNetCollisions({...result.occupancy,clearance:input.clearance}),[])
  assert.equal(layers.length,4)
})

test('shared occupancy remains collision-free across sequential routing batches',()=>{
  let occupancy={tracks:[],vias:[]}
  for(const batch of batches()) {
    const result=routeCollisionAwareChannelsV2({...input,nets:batch,occupancy})
    occupancy=result.occupancy
    assert.deepEqual(result.diagnostics.crossNetCollisions,[])
  }
  assert.deepEqual(findCrossNetCollisions({...occupancy,clearance:input.clearance}),[])
  assert.deepEqual(new Set(occupancy.tracks.map(row=>row.net)),new Set(netNames))
})

test('sequential and single-call routing are deterministic for identical topology and occupancy',()=>{
  const once=routeCollisionAwareChannelsV2(structuredClone(input))
  const again=routeCollisionAwareChannelsV2(structuredClone(input))
  assert.deepEqual(once,again)
  const sequential=runSequential()
  assert.deepEqual(sequential,runSequential())
})

test('every declared RP2040 endpoint belongs to its net routing graph',()=>{
  const result=routeCollisionAwareChannelsV2(input)
  for(const tree of nets) for(const endpoint of tree.endpoints) {
    const touchesTrack=result.occupancy.tracks.some(track=>track.net===tree.net&&(same(track.start,endpoint)||same(track.end,endpoint)))
    assert.equal(touchesTrack,true,`${tree.net} endpoint ${endpoint.x},${endpoint.y} is absent from track graph`)
    const endpointLayers=result.occupancy.tracks.filter(track=>track.net===tree.net&&(same(track.start,endpoint)||same(track.end,endpoint))).map(track=>track.layer)
    if(endpointLayers.some(layer=>layer!=='F.Cu')) assert.equal(result.occupancy.vias.some(via=>via.net===tree.net&&same(via,endpoint)),true,`${tree.net} internal-layer endpoint lacks its via`)
  }
})

function batches(){return [nets.filter(row=>['I2C_SCL','I2C_SDA','SWDIO','SWCLK'].includes(row.net)),nets.filter(row=>row.net.startsWith('QSPI_')),nets.filter(row=>!['GND','3V3'].includes(row.net)&&!row.net.startsWith('QSPI_')&&!['I2C_SCL','I2C_SDA','SWDIO','SWCLK'].includes(row.net)),nets.filter(row=>['GND','3V3'].includes(row.net))]}
function runSequential(){let occupancy={tracks:[],vias:[]};for(const batch of batches())occupancy=routeCollisionAwareChannelsV2({...input,nets:batch,occupancy}).occupancy;return occupancy}
function same(a,b){return a.x===b.x&&a.y===b.y}
