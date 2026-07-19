'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {BoardDocument,Id,Point,boardBounds,deleteSelection,sampleBoard,transformSelection} from '../../lib/pcb-editor/model'
import styles from './BrowserPcbEditor.module.css'

type View={zoom:number;x:number;y:number}; type Tool='select'|'pan'|'measure'
const LAYERS=['F.Cu','B.Cu','Edge.Cuts','F.SilkS','Drill'] as const
export function BrowserPcbEditor(){
 const [board,setBoard]=useState(sampleBoard),[history,setHistory]=useState<BoardDocument[]>([]),[future,setFuture]=useState<BoardDocument[]>([])
 const [view,setView]=useState<View>({zoom:8,x:70,y:70}),[tool,setTool]=useState<Tool>('select'),[selected,setSelected]=useState<Set<Id>>(new Set())
 const [visible,setVisible]=useState(new Set<string>(LAYERS)),[grid,setGrid]=useState(true),[measure,setMeasure]=useState<Point[]>([])
 const svg=useRef<SVGSVGElement>(null),drag=useRef<{screen:Point;world:Point;view:View;moving:boolean}|null>(null)
 const commit=useCallback((next:BoardDocument)=>{setHistory(h=>[...h,board]);setFuture([]);setBoard(next)},[board])
 const screenToWorld=(e:{clientX:number;clientY:number})=>{const r=svg.current!.getBoundingClientRect();return{x:(e.clientX-r.left-view.x)/view.zoom,y:(e.clientY-r.top-view.y)/view.zoom}}
 const fit=()=>{const r=svg.current?.getBoundingClientRect(),b=boardBounds(board);if(r)setView({zoom:Math.min((r.width-80)/(b.maxX-b.minX),(r.height-80)/(b.maxY-b.minY)),x:40-b.minX*Math.min((r.width-80)/(b.maxX-b.minX),(r.height-80)/(b.maxY-b.minY)),y:40-b.minY*Math.min((r.width-80)/(b.maxX-b.minX),(r.height-80)/(b.maxY-b.minY))})}
 const choose=(id:Id,e:React.MouseEvent)=>{e.stopPropagation();setSelected(s=>{const n=new Set(e.shiftKey?s:[]);if(n.has(id))n.delete(id);else n.add(id);return n})}
 const down=(e:React.PointerEvent)=>{svg.current?.setPointerCapture(e.pointerId);if(tool==='select'&&!(e.target as Element).closest('[data-object-id]'))setSelected(new Set());const w=screenToWorld(e);drag.current={screen:{x:e.clientX,y:e.clientY},world:w,view,moving:tool==='select'&&selected.size>0};if(tool==='measure')setMeasure(m=>m.length===2?[w]:[...m,w])}
 const move=(e:React.PointerEvent)=>{if(!drag.current)return;const d=drag.current;if(tool==='pan'||e.button===1)setView({...d.view,x:d.view.x+e.clientX-d.screen.x,y:d.view.y+e.clientY-d.screen.y})}
 const up=(e:React.PointerEvent)=>{const d=drag.current;if(d?.moving){const w=screenToWorld(e);commit(transformSelection(board,selected,{x:w.x-d.world.x,y:w.y-d.world.y}))}drag.current=null}
 const wheel=(e:React.WheelEvent)=>{e.preventDefault();const old=screenToWorld(e),zoom=Math.max(2,Math.min(40,view.zoom*(e.deltaY<0?1.15:.87)));const r=svg.current!.getBoundingClientRect();setView({zoom,x:e.clientX-r.left-old.x*zoom,y:e.clientY-r.top-old.y*zoom})}
 const undo=()=>setHistory(h=>{if(!h.length)return h;setFuture(f=>[board,...f]);setBoard(h[h.length-1]);return h.slice(0,-1)})
 const redo=()=>setFuture(f=>{if(!f.length)return f;setHistory(h=>[...h,board]);setBoard(f[0]);return f.slice(1)})
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}if(e.key==='Delete'||e.key==='Backspace'){if(selected.size){commit(deleteSelection(board,selected));setSelected(new Set())}}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)})
 const active=useMemo(()=>[...selected][0],[selected]);const object=board.footprints.find(x=>x.id===active)||board.vias.find(x=>x.id===active)||board.holes.find(x=>x.id===active)||board.tracks.find(x=>x.id===active)
 const setNum=(key:'x'|'y'|'rotation',value:number)=>{if(!active)return;commit({...board,footprints:board.footprints.map(f=>f.id===active?{...f,[key]:value}:f),vias:board.vias.map(v=>v.id===active?{...v,[key]:value}:v),holes:board.holes.map(h=>h.id===active?{...h,[key]:value}:h)})}
 return <div className={styles.shell}>
  <header><strong>PCB geometry sandbox</strong><span>Sample board: {board.title}</span><span className={styles.saved}>Browser-only model · not connected to a KiCad project</span></header>
  <nav aria-label="PCB tools">{(['select','pan','measure'] as Tool[]).map(t=><button aria-pressed={tool===t} onClick={()=>setTool(t)} key={t}>{t}</button>)}<i/><button onClick={undo} disabled={!history.length}>Undo</button><button onClick={redo} disabled={!future.length}>Redo</button><button onClick={()=>setGrid(x=>!x)} aria-pressed={grid}>Grid</button><button onClick={fit}>Fit</button><button aria-label="Zoom in" onClick={()=>setView(v=>({...v,zoom:Math.min(40,v.zoom*1.2)}))}>+</button><button aria-label="Zoom out" onClick={()=>setView(v=>({...v,zoom:Math.max(2,v.zoom/1.2)}))}>−</button><output aria-label="Zoom percentage">{Math.round(view.zoom/8*100)}%</output></nav>
  <aside className={styles.layers}><h2>Layers</h2>{LAYERS.map(l=><label key={l}><input type="checkbox" checked={visible.has(l)} onChange={()=>setVisible(v=>{const n=new Set(v);if(n.has(l))n.delete(l);else n.add(l);return n})}/><span className={styles[l.replace('.','')]} />{l}</label>)}<h2>Sample geometry</h2><p>{board.footprints.length} footprints</p><p>{board.tracks.length} tracks · {board.vias.length} via</p><p>{board.issues.length} illustrative clearance warning</p><p>This editor does not load, validate, or save a KiCad file.</p></aside>
  <main className={styles.canvas}><svg ref={svg} tabIndex={0} role="application" aria-label="Interactive PCB editor" onPointerDown={down} onPointerMove={move} onPointerUp={up} onWheel={wheel}>
   <defs><pattern id="pcbgrid" width={view.zoom*2.54} height={view.zoom*2.54} patternUnits="userSpaceOnUse" x={view.x} y={view.y}><circle cx="1" cy="1" r=".7" fill="#334155"/></pattern></defs>{grid&&<rect width="100%" height="100%" fill="url(#pcbgrid)"/>}
   <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
    <path d={board.outline.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+' Z'} className={styles.board}/>
    {visible.has('Edge.Cuts')&&<path d={board.outline.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+' Z'} className={styles.edge}/>}
    {visible.has('Drill')&&board.holes.map(h=><circle key={h.id} cx={h.x} cy={h.y} r={h.diameter/2} className={`${styles.hole} ${selected.has(h.id)?styles.selected:''}`} onClick={e=>choose(h.id,e)}/>)}
    {board.tracks.filter(t=>visible.has(t.layer)).map(t=><line key={t.id} x1={t.start.x} y1={t.start.y} x2={t.end.x} y2={t.end.y} stroke={t.layer==='F.Cu'?'#ef4444':'#3b82f6'} strokeWidth={t.width} className={selected.has(t.id)?styles.selectedStroke:''} onClick={e=>choose(t.id,e)}/>)}
    {board.vias.map(v=><circle key={v.id} cx={v.x} cy={v.y} r={v.diameter/2} className={`${styles.via} ${selected.has(v.id)?styles.selected:''}`} onClick={e=>choose(v.id,e)}/>)}
    {board.footprints.filter(f=>visible.has(f.layer)).map(f=><g key={f.id} data-object-id={f.id} role="button" aria-label={`Select ${f.reference}`} transform={`translate(${f.x} ${f.y}) rotate(${f.rotation})`} className={selected.has(f.id)?styles.selectedFootprint:''} onPointerDown={e=>choose(f.id,e)}><rect x="-5" y="-5" width="10" height="10" className={styles.footprint}/>{f.pads.map(p=><rect key={p.id} x={p.x-p.width/2} y={p.y-p.height/2} width={p.width} height={p.height} className={styles.pad}/>)}<text y="-6">{f.reference}</text></g>)}
    {board.issues.map(i=><g key={i.id} transform={`translate(${i.x} ${i.y})`}><circle r="2" className={styles.issue}/><text className={styles.issueText}>!</text><title>{i.message}</title></g>)}
    {measure.length>0&&<g className={styles.measure}><circle cx={measure[0].x} cy={measure[0].y} r=".5"/>{measure.length===2&&<><line x1={measure[0].x} y1={measure[0].y} x2={measure[1].x} y2={measure[1].y}/><text x={(measure[0].x+measure[1].x)/2} y={(measure[0].y+measure[1].y)/2}>{Math.hypot(measure[1].x-measure[0].x,measure[1].y-measure[0].y).toFixed(2)} mm</text></>}</g>}
   </g></svg></main>
  <aside className={styles.inspector}><h2>Properties</h2>{object&&'x'in object?<><strong>{'reference'in object?object.reference:object.id}</strong><label>X (mm)<input type="number" value={object.x} onChange={e=>setNum('x',+e.target.value)}/></label><label>Y (mm)<input type="number" value={object.y} onChange={e=>setNum('y',+e.target.value)}/></label>{'rotation'in object&&<label>Rotation<input type="number" value={object.rotation} onChange={e=>setNum('rotation',+e.target.value)}/></label>}<button onClick={()=>{commit(deleteSelection(board,selected));setSelected(new Set())}}>Delete selection</button></>:<p>Select a footprint, track, via, or hole. Shift-click for multi-select; drag to move.</p>}<h2>Illustrative warnings</h2>{board.issues.map(i=><p className={styles.issueCard} key={i.id} title={i.message}>⚠ {i.message}</p>)}</aside>
  <footer><span>X/Y in millimetres</span><span>{selected.size} selected</span><span>Grid 2.54 mm</span></footer>
 </div>
}
