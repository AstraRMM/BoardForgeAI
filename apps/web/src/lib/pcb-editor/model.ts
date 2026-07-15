export type Id = string
export type Point = { x: number; y: number }
export type Layer = 'F.Cu' | 'B.Cu' | 'Edge.Cuts' | 'F.SilkS' | 'Drill'
export type Pad = Point & { id: Id; width: number; height: number; shape: 'circle' | 'rect'; net?: string }
export type Footprint = Point & { id: Id; reference: string; value: string; rotation: number; pads: Pad[]; layer: 'F.Cu' | 'B.Cu' }
export type Track = { id: Id; start: Point; end: Point; width: number; layer: 'F.Cu' | 'B.Cu'; net?: string }
export type Via = Point & { id: Id; diameter: number; drill: number; net?: string }
export type Hole = Point & { id: Id; diameter: number; plated: boolean }
export type Issue = Point & { id: Id; severity: 'error' | 'warning'; message: string; objectId?: Id }
export type BoardDocument = {
  format: 'boardforge.kicad-intermediate'; version: 1; units: 'mm'; title: string
  outline: Point[]; footprints: Footprint[]; tracks: Track[]; vias: Via[]; holes: Hole[]; issues: Issue[]
  preservedKiCad?: unknown[]
}

export const sampleBoard: BoardDocument = {
  format: 'boardforge.kicad-intermediate', version: 1, units: 'mm', title: 'USB Sensor Node',
  outline: [{x:0,y:0},{x:80,y:0},{x:80,y:50},{x:0,y:50}],
  holes: [{id:'h1',x:5,y:5,diameter:3.2,plated:false},{id:'h2',x:75,y:45,diameter:3.2,plated:false}],
  footprints: [
    {id:'fp1',reference:'J1',value:'USB-C',x:8,y:25,rotation:90,layer:'F.Cu',pads:[{id:'p1',x:-2,y:0,width:2,height:1,shape:'rect',net:'VBUS'},{id:'p2',x:2,y:0,width:2,height:1,shape:'rect',net:'GND'}]},
    {id:'fp2',reference:'U1',value:'MCU',x:40,y:25,rotation:0,layer:'F.Cu',pads:[{id:'p3',x:-3,y:-3,width:1.5,height:1.5,shape:'rect',net:'VBUS'},{id:'p4',x:3,y:3,width:1.5,height:1.5,shape:'rect',net:'GND'}]},
  ],
  tracks:[{id:'t1',start:{x:6,y:25},end:{x:37,y:22},width:.6,layer:'F.Cu',net:'VBUS'},{id:'t2',start:{x:10,y:25},end:{x:43,y:28},width:.5,layer:'B.Cu',net:'GND'}],
  vias:[{id:'v1',x:25,y:27,diameter:1.6,drill:.8,net:'GND'}],
  issues:[{id:'i1',x:37,y:22,severity:'warning',message:'Copper clearance is close to the configured limit.',objectId:'t1'}],
}

export function boardBounds(board: BoardDocument) {
  const xs=board.outline.map(p=>p.x), ys=board.outline.map(p=>p.y)
  return {minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)}
}

export function transformSelection(board: BoardDocument, ids: Set<Id>, delta: Point, rotation = 0): BoardDocument {
  const move=<T extends Point & {id:Id}>(o:T):T => ids.has(o.id) ? {...o,x:o.x+delta.x,y:o.y+delta.y,...('rotation' in o && typeof o.rotation === 'number' ? {rotation:(o.rotation+rotation)%360}: {})} : o
  return {...board, footprints:board.footprints.map(move), vias:board.vias.map(move), holes:board.holes.map(move)}
}

export function deleteSelection(board: BoardDocument, ids: Set<Id>): BoardDocument {
  const keep=(o:{id:Id})=>!ids.has(o.id)
  return {...board,footprints:board.footprints.filter(keep),tracks:board.tracks.filter(keep),vias:board.vias.filter(keep),holes:board.holes.filter(keep)}
}
