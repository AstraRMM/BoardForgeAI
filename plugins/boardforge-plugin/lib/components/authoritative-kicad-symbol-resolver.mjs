import {readFileSync} from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOTS=[process.env.KICAD10_SYMBOL_DIR,'C:\\Program Files\\KiCad\\10.0\\share\\kicad\\symbols'].filter(Boolean)
const fileCache=new Map()

export function resolveAuthoritativeKiCadSymbol(libId,{roots=DEFAULT_ROOTS}={}){
  const [library,...parts]=String(libId||'').split(':'),name=parts.join(':')
  if(!library||!name)throw new TypeError(`KiCad symbol libId must be Library:Name; got ${libId||'empty'}`)
  const source=loadLibrary(library,roots)
  if(!source)throw new Error(`KiCad symbol library is not installed: ${library}`)
  const symbols=indexTopLevelSymbols(source.text),root=symbols.get(name)
  if(!root)throw new Error(`KiCad symbol is not installed: ${libId}`)
  const chain=[],visiting=new Set()
  function visit(symbolName){
    if(visiting.has(symbolName))throw new Error(`KiCad symbol inheritance cycle: ${[...visiting,symbolName].join(' -> ')}`)
    const definition=symbols.get(symbolName)
    if(!definition)throw new Error(`KiCad symbol dependency is missing: ${library}:${symbolName}`)
    visiting.add(symbolName)
    const parent=definition.match(/\(extends\s+"([^"]+)"\)/)?.[1]
    if(parent)visit(parent)
    visiting.delete(symbolName)
    if(!chain.some(row=>row.name===symbolName))chain.push({name:symbolName,definition})
  }
  visit(name)
  const pins=new Map()
  for(const item of chain)for(const pin of extractPinCoordinates(item.definition))pins.set(pin.number,pin)
  return {
    schema:'boardforge.authoritative-kicad-symbol.v1',libId,library,name,
    sourceFile:source.file,dependencyOrder:chain.map(row=>`${library}:${row.name}`),
    definitions:chain.map(row=>row.definition),pins:[...pins.values()],pinMap:Object.fromEntries([...pins].map(([number,pin])=>[number,pin.name])),
  }
}

export function extractPinCoordinates(definition){
  const pins=[]
  for(let start=definition.indexOf('(pin ');start>=0;start=definition.indexOf('(pin ',start+5)){
    const block=balanced(definition,start);if(!block)continue
    const at=block.match(/\(at\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/),number=block.match(/\(number\s+"([^"]+)"/),name=block.match(/\(name\s+"([^"]*)"/),length=block.match(/\(length\s+(-?[\d.]+)/)
    if(!at||!number)continue
    const rotation=Number(at[3]),lengthMm=Number(length?.[1]||0),r=rotation*Math.PI/180,x=Number(at[1]),y=Number(at[2])
    pins.push({number:number[1],name:name?.[1]||'',x,y,rotation,lengthMm,bodyX:x+Math.cos(r)*lengthMm,bodyY:y-Math.sin(r)*lengthMm})
  }
  return pins
}

export function flattenForSchematicCache(resolved,{qualifiedName=resolved?.libId}={}){
  if(!resolved?.definitions?.length||!resolved?.name||!qualifiedName)throw new TypeError('A resolved authoritative KiCad symbol is required')
  const baseName=resolved.dependencyOrder[0].split(':').at(-1),targetName=resolved.name
  let flattened=resolved.definitions[0]
  for(const child of resolved.definitions.slice(1)){
    for(const form of directChildForms(child)){
      if(form.startsWith('(extends '))continue
      const property=form.match(/^\(property\s+"([^"]+)"/)
      if(property)flattened=replaceDirectProperty(flattened,property[1],form)
    }
  }
  // Cached schematic symbols are concrete: inherited unit geometry is renamed
  // to the selected child and the library-qualified id applies only to the root.
  flattened=flattened.replaceAll(`"${baseName}_`,`"${targetName}_`)
  flattened=flattened.replace(/^\(symbol\s+"[^"]+"/,`(symbol "${qualifiedName}"`)
  return flattened
}

function loadLibrary(library,roots){
  for(const root of roots){const file=path.join(root,`${library}.kicad_sym`);if(fileCache.has(file))return fileCache.get(file);try{const value={file,text:readFileSync(file,'utf8')};fileCache.set(file,value);return value}catch{fileCache.set(file,null)}}
  return null
}
function indexTopLevelSymbols(text){
  const result=new Map();let depth=0,quoted=false,escaped=false
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"'){quoted=true;continue}if(ch==='('){if(depth===1&&text.startsWith('(symbol ',i)){const block=balanced(text,i),name=block?.match(/^\(symbol\s+"([^"]+)"/)?.[1];if(block&&name){result.set(name,block);i+=block.length-1;continue}}depth++}else if(ch===')')depth--}
  return result
}
function balanced(text,start){let depth=0,quoted=false,escaped=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"')quoted=true;else if(ch==='(')depth++;else if(ch===')'&&--depth===0)return text.slice(start,i+1)}return null}
function directChildForms(definition){const forms=[];let depth=0,quoted=false,escaped=false;for(let i=0;i<definition.length;i++){const ch=definition[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"'){quoted=true;continue}if(ch==='('){if(depth===1){const form=balanced(definition,i);if(form){forms.push(form);i+=form.length-1;continue}}depth++}else if(ch===')')depth--}return forms}
function replaceDirectProperty(definition,name,replacement){for(const form of directChildForms(definition)){const match=form.match(/^\(property\s+"([^"]+)"/);if(match?.[1]===name)return definition.replace(form,replacement)}const end=definition.lastIndexOf(')');return `${definition.slice(0,end)}\n\t${replacement}\n${definition.slice(end)}`}
