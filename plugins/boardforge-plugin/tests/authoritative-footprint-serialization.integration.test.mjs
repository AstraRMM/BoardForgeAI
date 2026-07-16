import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'
import {resolveAuthoritativeKiCadFootprint,serializeAuthoritativeKiCadFootprint} from '../lib/components/authoritative-kicad-footprint-resolver.mjs'
import {COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY,placeAuthoritativeProductionFootprints} from '../lib/placement/authoritative-production-placement.mjs'

const cli='C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe'

test('rotated authoritative copperless topology has zero KiCad physical DRC violations',{skip:!existsSync(cli),timeout:30000},async()=>{
  const rows=[['U1','ESP32-S3-WROOM-1U-N8R8'],['J1','USB4105-GF-A'],['U2','MCP1700T-3302E/TT'],['J2','M20-9990645'],['R1','RC0603FR-075K1L'],['R2','RC0603FR-075K1L']]
  const components=rows.map(([ref,mpn])=>{const a=approvedAssetFor(mpn);return{ref,mpn,value:mpn,footprint:a.footprint,pinMap:a.footprintPadMap}})
  const {widthMm:w,heightMm:h}=COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.outline
  const placement=placeAuthoritativeProductionFootprints({components,outline:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],topology:'generic',edgeClearanceMm:.5})
  const netNames=[...new Set(components.flatMap(c=>Object.values(c.pinMap)))],netNumber=new Map(netNames.map((name,index)=>[name,index+1]))
  const footprints=placement.placements.map((p,index)=>{const component=components.find(c=>c.ref===p.ref),netByPad=Object.fromEntries(Object.entries(component.pinMap).map(([pad,name])=>[pad,{netNumber:netNumber.get(name),netName:name}]));return serializeAuthoritativeKiCadFootprint({resolved:resolveAuthoritativeKiCadFootprint(p.libId),ref:p.ref,value:component.value,at:p.at,netByPad,silkscreen:'fabrication',uuidFor:key=>uuid(`${index}-${key}`)})}).join('\n')
  const board=`(kicad_pcb (version 20240108) (generator pcbnew)\n (general (thickness 1.6))\n (paper "A4")\n (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (44 "Edge.Cuts" user) (46 "B.CrtYd" user "b.courtyard") (47 "F.CrtYd" user "f.courtyard") (48 "B.Fab" user) (49 "F.Fab" user))\n (setup (pad_to_mask_clearance 0))\n${netNames.map(name=>` (net ${netNumber.get(name)} "${name}")`).join('\n')}\n${footprints}\n (gr_rect (start 0 0) (end ${w} ${h}) (stroke (width .05) (type default)) (fill none) (layer "Edge.Cuts") (uuid "${uuid('edge')}"))\n)`
  const dir=await mkdtemp(path.join(os.tmpdir(),'boardforge-authoritative-serialization-')),pcb=path.join(dir,'copperless.kicad_pcb'),rules=path.join(dir,'copperless.kicad_dru'),report=path.join(dir,'drc.json')
  try{await writeFile(pcb,board);await writeFile(rules,'(version 1)\n(rule "ESP32-S3 module thermal vias"\n (condition "A.Reference == \'U1\'")\n (constraint hole_size (min 0.2mm))\n)\n');const run=spawnSync(cli,['pcb','drc','--output',report,'--format','json',pcb],{encoding:'utf8'});assert.equal(run.status,0,run.stderr||run.stdout);const drc=JSON.parse(await readFile(report,'utf8'));assert.deepEqual((drc.violations||[]).map(v=>`${v.type}: ${v.description}: ${(v.items||[]).map(i=>i.description).join(' / ')}`),[]);assert.ok((drc.unconnected_items||[]).length>0,'copperless proof intentionally remains unrouted')}
  finally{await rm(dir,{recursive:true,force:true})}
})

function uuid(seed){let hex=Buffer.from(seed).toString('hex').padEnd(32,'0').slice(0,32);return`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20)}`}
