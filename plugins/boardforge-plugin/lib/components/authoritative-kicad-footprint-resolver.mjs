import {readFileSync,realpathSync} from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOTS=[process.env.KICAD10_FOOTPRINT_DIR,'C:\\Program Files\\KiCad\\10.0\\share\\kicad\\footprints'].filter(Boolean)
const cache=new Map()

export function resolveAuthoritativeKiCadFootprint(libId,{roots=DEFAULT_ROOTS}={}){
  const [library,...parts]=String(libId||'').split(':'),name=parts.join(':')
  validateSegment(library,'library');validateSegment(name,'footprint')
  if(libId==='BoardForge:THI_2-0511M_DIP16_6Lead'){
    const definition=bundledThi20511mFootprintDefinition(),pads=extractFootprintPads(definition)
    return {schema:'boardforge.authoritative-kicad-footprint.v1',libId,library,name,sourceFile:'bundled:traco-thi2m-datasheet-rev-2024-06-19-page-4-plus-boardforge-tht-fabrication-rule',definition,pads,padNumbers:[...new Set(pads.map(p=>p.number))]}
  }
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

/** Exact THI 2-0511M package geometry from Traco's June 19, 2024 outline.
 * The source specifies its 0.50 mm leads and 2.54 mm / 10.16 mm pin grid;
 * BoardForge's documented through-hole rule adds a 0.30 mm finished-hole
 * allowance (0.80 mm drill) and a 1.60 mm annular-ring pad.  Those latter
 * values are an explicit fabrication rule, never claimed as a Traco drawing. */
export function bundledThi20511mFootprintDefinition(){return`(footprint "THI_2-0511M_DIP16_6Lead"
	(version 20240108)
	(generator "boardforge")
	(layer "F.Cu")
	(attr through_hole)
	(property "Reference" "REF**" (at 5.08 -4.1 0) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
	(property "Value" "THI 2-0511M" (at 5.08 21.88 0) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))
	(fp_rect (start -1.62 -3) (end 11.78 20.8) (stroke (width 0.12) (type solid)) (fill none) (layer "F.Fab"))
	(fp_rect (start -2.12 -3.5) (end 12.28 21.3) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_rect (start -1.75 -3.13) (end 11.91 20.93) (stroke (width 0.12) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_line (start -1.75 -1.27) (end -0.48 -1.27) (stroke (width 0.25) (type solid)) (layer "F.SilkS"))
	(pad "1" thru_hole rect (at 0 0) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask"))
	(pad "7" thru_hole circle (at 0 15.24) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask"))
	(pad "8" thru_hole circle (at 0 17.78) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask"))
	(pad "9" thru_hole circle (at 10.16 17.78) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask"))
	(pad "10" thru_hole circle (at 10.16 15.24) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask"))
	(pad "16" thru_hole circle (at 10.16 0) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask"))
)`}

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
  // KiCad board coordinates are Y-down, so a positive footprint rotation is
  // the opposite sign from the conventional Cartesian transform.
  const angle=-rotation*Math.PI/180,mirror=side==='back'?-1:1
  return pads.map(pad=>{const lx=pad.x*mirror,ly=pad.y,px=x+lx*Math.cos(angle)-ly*Math.sin(angle),py=y+lx*Math.sin(angle)+ly*Math.cos(angle);return{...pad,x:px,y:py,rotation:(pad.rotation*mirror+rotation+360)%360,side}})
}

/** Serialize an installed .kicad_mod as a PCB footprint instance.
 * KiCad stores child pad positions relative to the footprint origin but pad
 * orientation in board coordinates, so the instance rotation must be added to
 * every pad orientation. Geometry coordinates and sizes remain untouched.
 */
export function serializeAuthoritativeKiCadFootprint({resolved,ref,value='',at,netByPad={},padNumberAliases={},properties={},uuidFor=()=>null,silkscreen='preserve'}={}){
  if(!resolved?.definition||!resolved?.name)throw new TypeError('A resolved authoritative footprint is required')
  const rotation=Number(at?.rotation||0),nets=netByPad instanceof Map?netByPad:new Map(Object.entries(netByPad).map(([key,value])=>[String(key),value]))
  let text=resolved.definition
    .replace(/^\s*\(footprint\s+"[^"]+"/,`(footprint "${escapeText(resolved.name)}"`)
    .replace(/(\(layer\s+"F\.Cu"\))/,`$1\n\t(at ${format(at?.x)} ${format(at?.y)} ${format(rotation)})${uuidFor('footprint')?`\n\t(uuid "${uuidFor('footprint')}")`:''}`)
    .replace(/\(property\s+"Reference"\s+"[^"]+"/,`(property "Reference" "${escapeText(ref)}"`)
    .replace(/\(property\s+"Value"\s+"[^"]+"/,`(property "Value" "${escapeText(value)}"`)
  // KiCad's official thermal-via footprints intentionally combine SMD lands
  // with plated thermal vias.  Keeping their source `attr smd` makes KiCad
  // 10 flag the otherwise exact instance as a component-type mismatch.  The
  // footprint attribute is optional metadata; omit only that contradictory
  // classification for a mixed-technology authoritative footprint, while
  // preserving every sourced pad, drill, layer, shape and geometry verbatim.
  if(resolved.pads.some(pad=>pad.type==='smd')&&resolved.pads.some(pad=>pad.type==='thru_hole'))text=text.replace(/^\s*\(attr\s+smd\)\s*$/m,'')
  const extraProperties=Object.entries(properties).filter(([,propertyValue])=>propertyValue!=null).map(([name,propertyValue],index)=>`\n\t(property "${escapeText(name)}" "${escapeText(propertyValue)}"\n\t\t(at 0 0 0)\n\t\t(layer "F.Fab")\n\t\t(hide yes)\n\t\t(uuid "${uuidFor(`property-${index}-${name}`)}")\n\t\t(effects (font (size 1 1) (thickness 0.15)))\n\t)`).join('')
  if(extraProperties)text=text.replace(/(\(property\s+"Value"[\s\S]*?\n\t\))/,(match)=>match+extraProperties)
  if(silkscreen==='fabrication')text=text.replace(/\(layer\s+"F\.SilkS"\)/g,'(layer "F.Fab")')
  let cursor=0,out='',padIndex=0
  while(true){const start=text.indexOf('(pad ',cursor);if(start<0){out+=text.slice(cursor);break}out+=text.slice(cursor,start);const block=balanced(text,start);if(!block){out+=text.slice(start);break}
    const number=unquote(block.match(/^\(pad\s+("(?:[^"\\]|\\.)*"|[^\s()]+)/)?.[1]||'""'),net=nets.get(String(number));let next=rotatePadOrientation(block,rotation)
    if(padNumberAliases[number])next=next.replace(/^\(pad\s+("(?:[^"\\]|\\.)*"|[^\s()]+)/,`(pad "${escapeText(padNumberAliases[number])}"`)
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
