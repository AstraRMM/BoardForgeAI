/** Versioned wire DTOs emitted by boardforge-pcb. Never construct board geometry here. */
export type PcbId = string
export type PcbPoint = Readonly<{x:number;y:number}>
export type PcbLayer = Readonly<{id:string;name:string;kind:'copper'|'silkscreen'|'mask'|'paste'|'edge'|'drawing'|'other';side?:'front'|'back'|'inner';color:string}>
export type PcbPad = Readonly<{id:PcbId;at:PcbPoint;size:PcbPoint;shape:'circle'|'rect'|'oval'|'roundrect'|'custom';layers:string[];net?:string;number?:string}>
export type PcbFootprint = Readonly<{id:PcbId;at:PcbPoint;rotation:number;layer:string;reference:string;value:string;pads:PcbPad[];courtyard?:PcbPoint[];modelStatus?:'available'|'missing'|'unknown'}>
export type PcbTrack = Readonly<{id:PcbId;start:PcbPoint;end:PcbPoint;width:number;layer:string;net?:string}>
export type PcbVia = Readonly<{id:PcbId;at:PcbPoint;diameter:number;drill:number;layers:[string,string];net?:string}>
export type PcbGraphic = Readonly<{id:PcbId;kind:'line'|'arc'|'polygon'|'text';layer:string;points:PcbPoint[];width?:number;text?:string}>
export type PcbViolation = Readonly<{id:PcbId;at:PcbPoint;severity:'error'|'warning';rule:string;message:string;objectIds:PcbId[]}>
export type RustPcbViewV1 = Readonly<{
 schema:'boardforge.pcb-view/v1';documentId:string;revision:number;sourceSha256:string;units:'mm';title:string
 bounds:Readonly<{min:PcbPoint;max:PcbPoint}>;layers:PcbLayer[];footprints:PcbFootprint[];tracks:PcbTrack[];vias:PcbVia[];graphics:PcbGraphic[]
 ratsnest:ReadonlyArray<Readonly<{id:PcbId;start:PcbPoint;end:PcbPoint;net:string}>>;violations:PcbViolation[];unsupportedCount:number
}>

export type PcbTransactionOperationV1 =
 | Readonly<{kind:'transform';ids:PcbId[];translation:PcbPoint;rotationDegrees?:number;anchor?:PcbPoint;snapMm?:number}>
 | Readonly<{kind:'delete';ids:PcbId[]}>
 | Readonly<{kind:'duplicate';ids:PcbId[];translation:PcbPoint}>
 | Readonly<{kind:'set-property';id:PcbId;property:string;value:string|number|boolean}>
 | Readonly<{kind:'route-track';net:string;layer:string;width:number;points:PcbPoint[];via?:Readonly<{at:PcbPoint;diameter:number;drill:number;toLayer:string}>}>
export type RustPcbTransactionV1 = Readonly<{schema:'boardforge.pcb-transaction/v1';id:string;baseRevision:number;baseSourceSha256:string;operation:PcbTransactionOperationV1}>
export type RustPcbTransactionResultV1 = Readonly<{schema:'boardforge.pcb-transaction-result/v1';transactionId:string;document:RustPcbViewV1;inverse:RustPcbTransactionV1;diff:unknown}>

export function assertRustPcbView(value:unknown):RustPcbViewV1 {
 if(!value||typeof value!=='object')throw new Error('Rust PCB view is not an object')
 const v=value as Partial<RustPcbViewV1>
 if(v.schema!=='boardforge.pcb-view/v1'||!Number.isInteger(v.revision)||typeof v.sourceSha256!=='string')throw new Error('Unsupported Rust PCB view schema')
 for(const key of ['layers','footprints','tracks','vias','graphics','ratsnest','violations'] as const)if(!Array.isArray(v[key]))throw new Error(`Rust PCB view is missing ${key}`)
 return v as RustPcbViewV1
}
export function pcbObject(view:RustPcbViewV1,id:PcbId){return view.footprints.find(x=>x.id===id)||view.tracks.find(x=>x.id===id)||view.vias.find(x=>x.id===id)||view.graphics.find(x=>x.id===id)}
export function newTransaction(view:RustPcbViewV1,operation:PcbTransactionOperationV1):RustPcbTransactionV1{return{schema:'boardforge.pcb-transaction/v1',id:crypto.randomUUID(),baseRevision:view.revision,baseSourceSha256:view.sourceSha256,operation}}
