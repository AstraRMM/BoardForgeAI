import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { generateTps25750GlobalHandoff, generateTps25750LocalBreakoutV4 } from '../lib/routing/dense-qfn-power-breakout-planner.mjs'
import { usbCPdSourceCategoryPcbEvidence } from '../lib/real-board-proof.mjs'

const cli = 'C:/Program Files/KiCad/10.0/bin/kicad-cli.exe'
const netByPin = { 1:'3V3',11:'GND',12:'GND',14:'GND',15:'DRAIN',20:'NC20',21:'NC21',22:'NC22',23:'VBUS',24:'VBUS',25:'VBUS',30:'DRAIN',31:'GND',32:'VBUS',33:'VBUS',34:'PP5V',35:'PP5V',38:'3V3',39:'GND',40:'DRAIN' }
function fixturePads(){const p=[];for(let n=1;n<=10;n++)p.push({number:n,net:netByPin[n]??`S${n}`,x:-3.2,y:-1.8+(n-1)*.4,widthMm:.35,heightMm:.18});for(let n=11;n<=19;n++)p.push({number:n,net:netByPin[n]??`S${n}`,x:-1.6+(n-11)*.4,y:2.2,widthMm:.18,heightMm:.35});for(let n=20;n<=29;n++)p.push({number:n,net:netByPin[n]??`S${n}`,x:3.2,y:1.8-(n-20)*.4,widthMm:.35,heightMm:.18});for(let n=30;n<=38;n++)p.push({number:n,net:netByPin[n]??`S${n}`,x:1.6-(n-30)*.4,y:-2.2,widthMm:.18,heightMm:.35});p.push({number:39,net:'GND',x:-.7,y:0,widthMm:1,heightMm:1},{number:40,net:'DRAIN',x:.7,y:0,widthMm:1,heightMm:1});return p}

test('TPS25750 V4 plus global Board005 rail handoff is proven by real KiCad DRC', { skip: !fs.existsSync(cli) }, () => {
  const evidence=usbCPdSourceCategoryPcbEvidence(),u2=evidence.footprints.find(f=>f.ref==='U2'),foreign=evidence.footprints.filter(f=>f.ref!=='U2')
  const pads=u2.pads.map(p=>({number:p.number,net:p.netName,x:p.x,y:p.y,widthMm:p.w,heightMm:p.h})), plan=generateTps25750LocalBreakoutV4({pads})
  const rails=new Set(['GND','DRAIN','VBUS','PP5V','3V3'])
  const externalEndpoints=foreign.flatMap(f=>f.pads.filter(p=>rails.has(p.netName)).map(p=>({net:p.netName,x:f.at.x+p.x-u2.at.x,y:f.at.y+p.y-u2.at.y,widthMm:p.w,heightMm:p.h,diameterMm:Math.max(p.w,p.h),smd:true,ref:f.ref,pad:p.number})))
  const occupancy=foreign.flatMap(f=>f.pads.map(p=>({net:p.netName,x:f.at.x+p.x-u2.at.x,y:f.at.y+p.y-u2.at.y,widthMm:p.w,heightMm:p.h,layers:['F.Cu']})))
  const global=generateTps25750GlobalHandoff({breakout:plan,externalEndpoints,foreignOccupancy:occupancy,stepMm:.25,boardBounds:{minX:-u2.at.x+.75,maxX:62-u2.at.x-.75,minY:-u2.at.y+.75,maxY:32-u2.at.y-.75}})
  assert.equal(global.modelAccepted,true,JSON.stringify(global.failedNets))
  const names=[...new Set(pads.map(p=>p.net).concat([...rails]))], nums=Object.fromEntries(names.map((n,i)=>[n,i+1])), ox=u2.at.x,oy=u2.at.y
  const netText=names.map(n=>`  (net ${nums[n]} "${n}")`).join('\n')
  const padText=pads.map(p=>`    (pad "${p.number}" smd rect (at ${p.x} ${p.y}) (size ${p.widthMm} ${p.heightMm}) (layers "F.Cu" "F.Paste" "F.Mask") (net ${nums[p.net]} "${p.net}"))`).join('\n')
  const segText=plan.segments.concat(global.segments).map(s=>`  (segment (start ${s.from.x+ox} ${s.from.y+oy}) (end ${s.to.x+ox} ${s.to.y+oy}) (width ${s.widthMm}) (layer "${s.layer}") (net ${nums[s.net]}))`).join('\n')
  const viaText=plan.vias.concat(global.vias).map(v=>`  (via (at ${v.at.x+ox} ${v.at.y+oy}) (size ${v.diameterMm}) (drill ${v.drillMm}) (layers "F.Cu" "B.Cu") (net ${nums[v.net]}))`).join('\n')
  const foreignText=foreign.map(f=>`  (footprint "${f.ref}" (layer "F.Cu") (at ${f.at.x} ${f.at.y})\n    (fp_rect (start ${-f.body.w/2-.35} ${-f.body.h/2-.35}) (end ${f.body.w/2+.35} ${f.body.h/2+.35}) (stroke (width .05) (type default)) (fill none) (layer "F.CrtYd"))\n${f.pads.map(p=>`    (pad "${p.number}" smd rect (at ${p.x} ${p.y}) (size ${p.w} ${p.h}) (layers "F.Cu" "F.Paste" "F.Mask")${rails.has(p.netName)?` (net ${nums[p.netName]} "${p.netName}")`:''})`).join('\n')}\n  )`).join('\n')
  const board=`(kicad_pcb (version 20240108) (generator pcbnew)\n (general (thickness 1.6))\n (paper "A4")\n (layers (0 "F.Cu" signal) (2 "In1.Cu" power) (4 "In2.Cu" power) (6 "In3.Cu" power) (8 "In4.Cu" power) (31 "B.Cu" signal) (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (44 "Edge.Cuts" user) (46 "F.CrtYd" user))\n (setup (pad_to_mask_clearance 0))\n${netText}\n  (footprint "TPS25750" (layer "F.Cu") (at ${ox} ${oy})\n${padText}\n  )\n${foreignText}\n${segText}\n${viaText}\n (gr_rect (start 0 0) (end 62 32) (stroke (width .05) (type default)) (fill none) (layer "Edge.Cuts"))\n)`
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bf-tps25750-kicad-')), pcb=path.join(dir,'fixture.kicad_pcb'), report=path.join(dir,'drc.json')
  fs.writeFileSync(pcb,board)
  fs.writeFileSync(path.join(dir,'fixture.kicad_dru'),`(version 1)\n(rule "BoardForge fine pitch track" (constraint track_width (min 0.1mm)))\n(rule "BoardForge micro drill" (constraint hole_size (min 0.2mm)))\n(rule "BoardForge micro via" (constraint via_diameter (min 0.4mm)))\n`)
  execFileSync(cli,['pcb','drc','--format','json','--output',report,pcb],{stdio:'pipe'})
  const parsed=JSON.parse(fs.readFileSync(report,'utf8'))
  const violations=parsed.violations??[], unconnected=parsed.unconnected_items??[]
  assert.deepEqual({violations:violations.length,unconnected:unconnected.length},{violations:0,unconnected:0},JSON.stringify({violations:violations.slice(0,5),unconnected:unconnected.slice(0,5)}))
  const accepted=generateTps25750GlobalHandoff({breakout:plan,externalEndpoints,kicadDrc:{ran:true,errors:0,warnings:0,unconnected:0}})
  assert.equal(accepted.accepted,true)
  assert.equal(accepted.immutableOccupancy.segments,plan.segments)
})
