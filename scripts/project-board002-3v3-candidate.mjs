#!/usr/bin/env node
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'

const [source,target]=process.argv.slice(2)
if(!source||!target||path.resolve(source)===path.resolve(target))throw new Error('usage: source.kicad_pcb candidate.kicad_pcb')
const required=new Map(Object.entries({U1:['24','36','48'],U2:['3'],U3:['2'],J2:['2'],C1:['1'],C2:['1'],C3:['1']}))
let text=await readFile(source,'utf8'),projected=0
for(const block of [...topForms(text,'footprint')].reverse()){
  const ref=block.text.match(/\(property\s+"Reference"\s+"([^"]+)"/)?.[1],pads=required.get(ref)
  if(!pads)continue
  let updated=block.text
  for(const pad of pads){
    const row=[...topForms(updated,'pad')].find(item=>item.text.match(/^\(pad\s+"?([^"\s)]+)"?/)?.[1]===pad)
    if(!row)throw new Error(`Missing ${ref}.${pad}`)
    if(/\(net\s+/.test(row.text))throw new Error(`${ref}.${pad} is already netted; refusing replacement`)
    const next=`${row.text.slice(0,-1)}\n\t\t(net "3V3")\n\t)`
    updated=updated.slice(0,row.start)+next+updated.slice(row.end);projected++
  }
  text=text.slice(0,block.start)+updated+text.slice(block.end)
}
if(projected!==9)throw new Error(`Expected 9 projected 3V3 pads, got ${projected}`)
await writeFile(target,text,'utf8')
try{await copyFile(source.replace(/\.kicad_pcb$/i,'.kicad_dru'),target.replace(/\.kicad_pcb$/i,'.kicad_dru'))}catch{}
console.log(JSON.stringify({schema:'boardforge.board002-3v3-projection-candidate.v1',source,target,projected,sourceUnchanged:true},null,2))

function*topForms(source,name){for(let start=source.indexOf(`(${name}`);start>=0;){const end=balanced(source,start);yield{start,end,text:source.slice(start,end)};start=source.indexOf(`(${name}`,end)}}
function balanced(source,start){let depth=0,quoted=false,escaped=false;for(let i=start;i<source.length;i++){const char=source[i];if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false}else if(char==='"')quoted=true;else if(char==='(')depth++;else if(char===')'&&--depth===0)return i+1}throw new Error('Unbalanced KiCad form')}
