import {readFileSync,realpathSync} from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOTS=[process.env.KICAD10_FOOTPRINT_DIR,'C:\\Program Files\\KiCad\\10.0\\share\\kicad\\footprints'].filter(Boolean)
const cache=new Map()

export function resolveAuthoritativeKiCadFootprint(libId,{roots=DEFAULT_ROOTS}={}){
  const [library,...parts]=String(libId||'').split(':'),name=parts.join(':')
  validateSegment(library,'library');validateSegment(name,'footprint')
  for(const root of roots){
    const key=`${root}|${libId}`;if(cache.has(key)){const hit=cache.get(key);if(hit)return structuredClone(hit);continue}
    const file=path.join(root,`${library}.pretty`,`${name}.kicad_mod`)
    try{
      const resolvedRoot=realpathSync(root),resolvedFile=realpathSync(file)
      if(!isWithin(resolvedRoot,resolvedFile))throw new Error(`KiCad footprint path escapes installed root: ${libId}`)
      const definition=readFileSync(resolvedFile,'utf8'),pads=extractFootprintPads(definition)
      if(!/^\s*\(footprint\s+"[^"]+"/.test(definition))throw new Error(`Invalid KiCad footprint module: ${libId}`)
      if(!pads.length)throw new Error(`KiCad footprint has no pads: ${libId}`)
      const result={schema:'boardforge.authoritative-kicad-footprint.v1',libId,library,name,sourceFile:resolvedFile,definition,pads,padNumbers:[...new Set(pads.map(p=>p.number))]}
      cache.set(key,result);return structuredClone(result)
    }catch(error){if(error?.code!=='ENOENT'&&error?.code!=='ENOTDIR')throw error;cache.set(key,null)}
  }
  throw new Error(`KiCad footprint is not installed: ${libId}`)
}

export function extractFootprintPads(definition){
  const result=[]
  for(let start=definition.indexOf('(pad ');start>=0;start=definition.indexOf('(pad ',start+5)){
    const block=balanced(definition,start);if(!block)continue
    const head=block.match(/^\(pad\s+("(?:[^"\\]|\\.)*"|[^\s()]+)\s+([^\s()]+)\s+([^\s()]+)/),at=block.match(/\(at\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s+(-?[\d.]+))?/),size=block.match(/\(size\s+([\d.]+)\s+([\d.]+)/),layers=block.match(/\(layers\s+([^\)]+)\)/),drill=block.match(/\(drill(?:\s+(oval))?\s+([\d.]+)(?:\s+([\d.]+))?/)
    if(!head||!at||!size)continue
    result.push({number:unquote(head[1]),type:head[2],shape:head[3],x:Number(at[1]),y:Number(at[2]),rotation:Number(at[3]||0),widthMm:Number(size[1]),heightMm:Number(size[2]),layers:(layers?.[1].match(/"[^"]+"|[^\s]+/g)||[]).map(unquote),drill:drill?{shape:drill[1]||'round',widthMm:Number(drill[2]),heightMm:Number(drill[3]||drill[2])}:null,definition:block})
  }
  return result
}

export function transformAuthoritativePads(pads,{x=0,y=0,rotation=0,side='front'}={}){
  const angle=rotation*Math.PI/180,mirror=side==='back'?-1:1
  return pads.map(pad=>{const lx=pad.x*mirror,ly=pad.y,px=x+lx*Math.cos(angle)-ly*Math.sin(angle),py=y+lx*Math.sin(angle)+ly*Math.cos(angle);return{...pad,x:px,y:py,rotation:(pad.rotation*mirror+rotation+360)%360,side}})
}

/** Serialize an installed .kicad_mod as a PCB footprint instance.
 * KiCad stores child pad positions relative to the footprint origin but pad
 * orientation in board coordinates, so the instance rotation must be added to
 * every pad orientation. Geometry coordinates and sizes remain untouched.
 */
export function serializeAuthoritativeKiCadFootprint({resolved,ref,value='',at,netByPad={},uuidFor=()=>null,silkscreen='preserve'}={}){
  if(!resolved?.definition||!resolved?.name)throw new TypeError('A resolved authoritative footprint is required')
  const rotation=Number(at?.rotation||0),nets=netByPad instanceof Map?netByPad:new Map(Object.entries(netByPad).map(([key,value])=>[String(key),value]))
  let text=resolved.definition
    .replace(/^\s*\(footprint\s+"[^"]+"/,`(footprint "${escapeText(resolved.name)}"`)
    .replace(/(\(layer\s+"F\.Cu"\))/,`$1\n\t(at ${format(at?.x)} ${format(at?.y)} ${format(rotation)})${uuidFor('footprint')?`\n\t(uuid "${uuidFor('footprint')}")`:''}`)
    .replace(/\(property\s+"Reference"\s+"[^"]+"/,`(property "Reference" "${escapeText(ref)}"`)
    .replace(/\(property\s+"Value"\s+"[^"]+"/,`(property "Value" "${escapeText(value)}"`)
  if(silkscreen==='fabrication')text=text.replace(/\(layer\s+"F\.SilkS"\)/g,'(layer "F.Fab")')
  let cursor=0,out='',padIndex=0
  while(true){const start=text.indexOf('(pad ',cursor);if(start<0){out+=text.slice(cursor);break}out+=text.slice(cursor,start);const block=balanced(text,start);if(!block){out+=text.slice(start);break}
    const number=unquote(block.match(/^\(pad\s+("(?:[^"\\]|\\.)*"|[^\s()]+)/)?.[1]||'""'),net=nets.get(String(number));let next=rotatePadOrientation(block,rotation)
    if(net?.netNumber&&net?.netName&&!/\(net\s+\d+\s+"/.test(next))next=next.replace(/\)\s*$/,`\n\t\t(net ${net.netNumber} "${escapeText(net.netName)}")\n\t)`)
    out+=next;cursor=start+block.length;padIndex++
  }
  let uuidIndex=0
  return out.replace(/\(uuid\s+"[^"]+"\)/g,match=>{const uuid=uuidFor(`item-${uuidIndex++}`);return uuid?`(uuid "${uuid}")`:match})
}

export function rotatePadOrientation(block,footprintRotation=0){
  return block.replace(/\(at\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s+(-?[\d.]+))?\)/,(_,x,y,padRotation)=>`(at ${x} ${y} ${format(normalizeAngle(Number(padRotation||0)+Number(footprintRotation||0)))})`)
}

function validateSegment(value,label){if(!value||value==='.'||value==='..'||/[\\/\0]/.test(value))throw new TypeError(`KiCad footprint ${label} is invalid`)}
function isWithin(root,file){const relative=path.relative(root,file);return relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)}
function unquote(value){const text=String(value);return text.startsWith('"')?JSON.parse(text):text}
function balanced(text,start){let depth=0,quoted=false,escaped=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"')quoted=true;else if(ch==='(')depth++;else if(ch===')'&&--depth===0)return text.slice(start,i+1)}return null}
function normalizeAngle(value){const angle=((value%360)+360)%360;return angle>180?angle-360:angle}
function format(value){const number=Number(value||0);return Number.isInteger(number)?String(number):String(Number(number.toFixed(6)))}
function escapeText(value){return String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
