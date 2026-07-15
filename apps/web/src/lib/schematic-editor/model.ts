export type Id=string
export type Point={x:number;y:number}
export type SymbolNode=Point&{id:Id;reference:string;value:string;rotation:number;footprint:string;pins:{id:Id;x:number;y:number;name:string}[]}
export type Wire={id:Id;start:Point;end:Point;net?:string}
export type Label=Point&{id:Id;text:string}
export type SchematicDocument={format:'boardforge.kicad-schematic-intermediate';version:1;title:string;symbols:SymbolNode[];wires:Wire[];labels:Label[];preservedKiCad:unknown[]}
export type Change={kind:'added'|'removed'|'modified';objectType:'symbol'|'wire'|'label';id:Id;summary:string}

export const sampleSchematic:SchematicDocument={format:'boardforge.kicad-schematic-intermediate',version:1,title:'USB Sensor Node',preservedKiCad:[{kind:'lib_symbols',status:'preserved-raw'}],symbols:[
 {id:'sym-j1',reference:'J1',value:'USB-C',footprint:'Connector_USB:USB_C',x:12,y:25,rotation:0,pins:[{id:'j1-1',x:6,y:23,name:'VBUS'},{id:'j1-2',x:6,y:27,name:'GND'}]},
 {id:'sym-u1',reference:'U1',value:'MCU',footprint:'Package_QFP:LQFP-48',x:42,y:25,rotation:0,pins:[{id:'u1-1',x:34,y:23,name:'VDD'},{id:'u1-2',x:34,y:27,name:'GND'},{id:'u1-3',x:50,y:25,name:'SDA'}]},
 {id:'sym-r1',reference:'R1',value:'4.7k',footprint:'Resistor_SMD:R_0603',x:68,y:25,rotation:90,pins:[{id:'r1-1',x:62,y:25,name:'1'},{id:'r1-2',x:74,y:25,name:'2'}]},
],wires:[{id:'wire-1',start:{x:6,y:23},end:{x:34,y:23},net:'VBUS'}],labels:[{id:'label-1',x:20,y:23,text:'VBUS'}]}

export function fixtureFromJson(input:string):SchematicDocument{const value:unknown=JSON.parse(input);if(!value||typeof value!=='object'||(value as SchematicDocument).format!=='boardforge.kicad-schematic-intermediate')throw new Error('Unsupported schematic fixture');return structuredClone(value as SchematicDocument)}
export function moveSelection(doc:SchematicDocument,ids:Set<Id>,delta:Point):SchematicDocument{return{...doc,symbols:doc.symbols.map(s=>ids.has(s.id)?{...s,x:s.x+delta.x,y:s.y+delta.y,pins:s.pins.map(p=>({...p,x:p.x+delta.x,y:p.y+delta.y}))}:s),labels:doc.labels.map(l=>ids.has(l.id)?{...l,x:l.x+delta.x,y:l.y+delta.y}:l),wires:doc.wires.map(w=>ids.has(w.id)?{...w,start:{x:w.start.x+delta.x,y:w.start.y+delta.y},end:{x:w.end.x+delta.x,y:w.end.y+delta.y}}:w)}}
export function rotateSelection(doc:SchematicDocument,ids:Set<Id>,degrees=90):SchematicDocument{return{...doc,symbols:doc.symbols.map(s=>ids.has(s.id)?{...s,rotation:(s.rotation+degrees+360)%360}:s)}}
export function diffSchematic(base:SchematicDocument,next:SchematicDocument):Change[]{const changes:Change[]=[];for(const [type,a,b] of [['symbol',base.symbols,next.symbols],['wire',base.wires,next.wires],['label',base.labels,next.labels]] as const){const before=new Map(a.map(x=>[x.id,JSON.stringify(x)])),after=new Map(b.map(x=>[x.id,JSON.stringify(x)]));for(const [id,value] of after)changes.push(...(!before.has(id)?[{kind:'added',objectType:type,id,summary:`${type} added`} as Change]:before.get(id)!==value?[{kind:'modified',objectType:type,id,summary:`${type} properties or geometry changed`} as Change]:[]));for(const id of before.keys())if(!after.has(id))changes.push({kind:'removed',objectType:type,id,summary:`${type} removed`})}return changes}
export function nextId(prefix:string,doc:SchematicDocument){return`${prefix}-${doc.symbols.length+doc.wires.length+doc.labels.length+1}`}
