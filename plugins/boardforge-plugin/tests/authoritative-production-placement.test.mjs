import test from 'node:test'
import assert from 'node:assert/strict'
import { COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY, footprintOccupancy, placeAuthoritativeProductionFootprints } from '../lib/placement/authoritative-production-placement.mjs'
import { resolveAuthoritativeKiCadFootprint } from '../lib/components/authoritative-kicad-footprint-resolver.mjs'
import { approvedAssetFor } from '../lib/components/approved-production-assets.mjs'

const fp = (libId, w, h, pads) => ({ libId, sourceFile: `/installed/${libId}.kicad_mod`, definition: `(footprint "${libId}" (fp_rect (start ${-w/2} ${-h/2}) (end ${w/2} ${h/2}) (layer "F.CrtYd")))`, pads })
const library = {
  'RF_Module:ESP32-S3-WROOM-1': fp('RF_Module:ESP32-S3-WROOM-1', 18.5, 25.5, [{ number:'1',x:-8,y:7,widthMm:1,heightMm:1,layers:['F.Cu'] },{ number:'14',x:8,y:1,widthMm:1,heightMm:1,layers:['F.Cu'] }]),
  'Connector_USB:USB_C': fp('Connector_USB:USB_C', 9, 10, [{ number:'A4',x:2,y:-2,widthMm:.6,heightMm:1,layers:['F.Cu'] }]),
  'Package_TO_SOT_SMD:SOT-23': fp('Package_TO_SOT_SMD:SOT-23', 3.8, 3.8, [{ number:'1',x:-1,y:1,widthMm:.7,heightMm:.8,layers:['F.Cu'] }]),
  'Connector:Header': fp('Connector:Header', 3, 16, [{ number:'1',x:0,y:-6.35,widthMm:1.7,heightMm:1.7,layers:['*.Cu'],drill:{widthMm:1} }]),
}

test('authoritative ESP32 placement resolves exact packages before routing and returns real pad endpoints', () => {
  const components = [
    { ref:'U1', footprint:'RF_Module:ESP32-S3-WROOM-1', pinMap:{1:'GND',14:'USB_DP'} },
    { ref:'J1', footprint:'Connector_USB:USB_C', pinMap:{A4:'VBUS'} },
    { ref:'U2', footprint:'Package_TO_SOT_SMD:SOT-23', pinMap:{1:'GND'} },
    { ref:'J2', footprint:'Connector:Header', pinMap:{1:'GND'} },
  ]
  const result = placeAuthoritativeProductionFootprints({ components, outline:[{x:0,y:0},{x:58,y:0},{x:58,y:36},{x:0,y:36}], holes:[{x:3,y:3,diameterMm:3},{x:55,y:33,diameterMm:3}], resolver:id=>library[id] })
  assert.equal(result.resolvedBeforeRouting, true)
  assert.deepEqual(result.placements.map(p=>p.ref), ['U1','J1','U2','J2'])
  assert.equal(result.endpoints.find(p=>p.ref==='U1'&&p.pad==='14').netName, 'USB_DP')
  assert.equal(result.placements.find(p=>p.ref==='U1').libId, 'RF_Module:ESP32-S3-WROOM-1')
  for (const p of result.placements) assert.equal(p.occupancy.source, 'F.CrtYd')
})

test('authoritative placement fails closed when exact courtyards cannot fit', () => {
  assert.throws(() => placeAuthoritativeProductionFootprints({ components:[{ref:'U1',footprint:'huge'}], outline:[{x:0,y:0},{x:5,y:0},{x:5,y:5},{x:0,y:5}], resolver:()=>fp('huge',10,10,[{number:'1',x:0,y:0,widthMm:1,heightMm:1,layers:['F.Cu']}]) }), error => error.code === 'AUTHORITATIVE_PRODUCTION_PLACEMENT_BLOCKED')
})

test('asymmetric courtyard rotation follows KiCad board coordinates', () => {
  const header=fp('Connector:AsymmetricHeader',4,16,[{number:'1',x:0,y:0,widthMm:1,heightMm:1,layers:['*.Cu']},{number:'6',x:0,y:12.7,widthMm:1,heightMm:1,layers:['*.Cu']}])
  // Replace the centered test courtyard with the installed-header pattern:
  // the footprint origin is at pad 1 and the body extends in +Y.
  header.definition='(footprint "Connector:AsymmetricHeader" (fp_rect (start -2 -2) (end 2 14.7) (layer "F.CrtYd")))'
  const result=placeAuthoritativeProductionFootprints({components:[{ref:'J1',footprint:'header',fixedAt:{x:20,y:20,rotation:270}}],outline:[{x:0,y:0},{x:40,y:0},{x:40,y:40},{x:0,y:40}],resolver:()=>header})
  const placed=result.placements[0]
  assert.ok(placed.occupancy.minX<6,`expected KiCad -Y projection, got minX ${placed.occupancy.minX}`)
  assert.ok(Math.abs(placed.endpoints.find(row=>row.pad==='6').x-7.3)<1e-9)
})

test('installed ESP32 RF courtyard is honored instead of shrinking to proof body geometry', () => {
  const occupancy = footprintOccupancy(resolveAuthoritativeKiCadFootprint('RF_Module:ESP32-S3-WROOM-1'))
  assert.equal(occupancy.source, 'F.CrtYd')
  assert.ok(occupancy.width >= 48 && occupancy.height >= 41, `unexpected RF courtyard ${occupancy.width}x${occupancy.height}`)
  assert.throws(() => placeAuthoritativeProductionFootprints({ components:[{ref:'U1',footprint:'RF_Module:ESP32-S3-WROOM-1'}], outline:[{x:0,y:0},{x:58,y:0},{x:58,y:36},{x:0,y:36}] }), error => error.code === 'AUTHORITATIVE_PRODUCTION_PLACEMENT_BLOCKED')
})

test('tagged ESP32 antenna keepout may extend through only its designated edge', () => {
  const outline=[{x:0,y:0},{x:58,y:0},{x:58,y:36},{x:0,y:36}]
  const result=placeAuthoritativeProductionFootprints({ components:[{ref:'U1',footprint:'RF_Module:ESP32-S3-WROOM-1',rfAntennaEdge:'top',fixedAt:{x:29,y:13.25,rotation:0}}], outline })
  const module=result.placements[0]
  assert.equal(module.rfAntennaPolicy.edge,'top')
  assert.ok(module.occupancy.minY<0)
  assert.ok(module.occupancy.minX>0&&module.occupancy.maxX<58)
  assert.ok(module.pads.every(p=>p.x-p.widthMm/2>=.25&&p.x+p.widthMm/2<=57.75&&p.y-p.heightMm/2>=.25&&p.y+p.heightMm/2<=35.75))
})

test('RF edge policy rejects untagged, sideways, and multiple-edge courtyard escape', () => {
  const outline=[{x:0,y:0},{x:58,y:0},{x:58,y:36},{x:0,y:36}], base={ref:'U1',footprint:'RF_Module:ESP32-S3-WROOM-1'}
  const blocked=component=>assert.throws(()=>placeAuthoritativeProductionFootprints({components:[component],outline}),error=>error.code==='AUTHORITATIVE_PRODUCTION_PLACEMENT_BLOCKED')
  blocked({...base,fixedAt:{x:29,y:13.25,rotation:0}})
  blocked({...base,rfAntennaEdge:'top',fixedAt:{x:29,y:18,rotation:90}})
  blocked({...base,rfAntennaEdge:'top',fixedAt:{x:20,y:13.25,rotation:0}})
})

test('RF keepout rejects another component even when its body would otherwise fit', () => {
  const outline=[{x:0,y:0},{x:58,y:0},{x:58,y:36},{x:0,y:36}]
  assert.throws(()=>placeAuthoritativeProductionFootprints({components:[
    {ref:'U1',footprint:'RF_Module:ESP32-S3-WROOM-1',rfAntennaEdge:'top',fixedAt:{x:29,y:13.25,rotation:0}},
    {ref:'U2',footprint:'Package_TO_SOT_SMD:SOT-23',fixedAt:{x:20,y:20,rotation:0}},
  ],outline,resolver:id=>id==='Package_TO_SOT_SMD:SOT-23'?library[id]:resolveAuthoritativeKiCadFootprint(id)}),error=>error.code==='AUTHORITATIVE_PRODUCTION_PLACEMENT_BLOCKED'&&error.ref==='U2')
})

test('complete compact ESP32-1U topology fits below the 900 mm2 cap with authoritative occupancy', () => {
  const rows=[['U1','ESP32-S3-WROOM-1-N8R8'],['J1','USB4105-GF-A'],['U2','MCP1700T-3302E/TT'],['J2','M20-9990645'],['R1','RC0603FR-075K1L'],['R2','RC0603FR-075K1L']]
  const components=rows.map(([ref,mpn])=>{const asset=approvedAssetFor(mpn);return{ref,mpn:ref==='U1'?COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.mpn:mpn,footprint:ref==='U1'?COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.footprint:asset.footprint,pinMap:asset.pinMap}})
  const {widthMm:w,heightMm:h,areaMm2}=COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.outline
  const result=placeAuthoritativeProductionFootprints({components,outline:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],topology:'generic'})
  assert.ok(areaMm2<=900)
  assert.deepEqual(result.placements.map(p=>p.ref),rows.map(([ref])=>ref))
  assert.ok(result.endpoints.length>90)
  assert.ok(result.placements.every(p=>p.libId.includes(':')&&p.sourceFile.endsWith('.kicad_mod')))
})

test('STM32 controller resolves every production package around mounting holes before routing',()=>{
  const rows=[['U1','STM32F103C8T6'],['U2','SN65HVD230DR'],['U3','MCP1700T-3302E/TT'],['J1','M20-9990245'],['J2','M20-9990645'],['R1','RC0603FR-07120RL'],['C1','CL10B104KB8NNNC'],['C2','CL10B104KB8NNNC'],['C3','CC0603KRX7R7BB105'],['D1','NUP2105LT1G']]
  const overrides={U3:{1:'GND',2:'3V3',3:'5V'},J2:{1:'GND',2:'3V3',3:'CANH',4:'CANL',5:'I2C_SCL',6:'I2C_SDA'},R1:{1:'CANH',2:'CANL'},C1:{1:'3V3',2:'GND'},C2:{1:'3V3',2:'GND'},C3:{1:'3V3',2:'GND'}}
  const components=rows.map(([ref,mpn])=>{const asset=approvedAssetFor(mpn);return{ref,mpn,footprint:asset.footprint,pinMap:overrides[ref]||asset.pinMap}})
  const outline=[[8,0],[54,0],[60,4],[62,14],[59,19],[62,24],[60,34],[54,38],[8,38],[2,34],[0,24],[3,19],[0,14],[2,4]].map(([x,y])=>({x,y}))
  const holes=[[7,7],[55,7],[55,31],[7,31]].map(([x,y])=>({x,y,diameterMm:2.4}))
  const result=placeAuthoritativeProductionFootprints({components,outline,holes,topology:'generic'})
  assert.deepEqual(result.placements.map(row=>row.ref),rows.map(([ref])=>ref))
  assert.equal(result.endpoints.find(row=>row.ref==='J2'&&row.pad==='3').netName,'CANH')
  for(const placed of result.placements)for(const hole of holes){const dx=Math.max(placed.occupancy.minX-hole.x,0,hole.x-placed.occupancy.maxX),dy=Math.max(placed.occupancy.minY-hole.y,0,hole.y-placed.occupancy.maxY);assert.ok(Math.hypot(dx,dy)>=1.7-1e-9,`${placed.ref} overlaps mounting hole`)}
})
