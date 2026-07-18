import { findCrossNetCollisions } from './collision-aware-channel-router.mjs'

export function optimizeDensePeripheralPlacement({nets,pivot,movable=(point)=>point.x>pivot.x}={}){
  const transforms=[['identity',(p)=>p],['mirror-y',(p)=>({...p,y:2*pivot.y-p.y})],['mirror-x',(p)=>({...p,x:2*pivot.x-p.x})],['rotate-180',(p)=>({...p,x:2*pivot.x-p.x,y:2*pivot.y-p.y})]]
  const candidates=transforms.map(([name,fn])=>{const routed=nets.map(tree=>({...tree,endpoints:tree.endpoints.map(p=>movable(p,tree)?fn(p):p)}));const segments=routed.filter(x=>x.endpoints.length===2).map(x=>({net:x.net,layer:'F.Cu',start:x.endpoints[0],end:x.endpoints[1],width:0}));return{name,nets:routed,score:findCrossNetCollisions({tracks:segments,vias:[],clearance:0}).length*1e6+segments.reduce((s,x)=>s+Math.hypot(x.end.x-x.start.x,x.end.y-x.start.y),0)}})
  return candidates.sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name))[0]
}

export function optimizeConnectorPinAssignment({sources,slots}={}){
  if(!sources?.length||sources.length!==slots?.length)throw new Error('sources and slots must have equal non-zero length')
  const candidates=[]
  for(const order of permutations(slots)){
    const nets=sources.map((source,index)=>({net:source.net,endpoints:[source.point,order[index].point],pin:order[index].pin}))
    const tracks=nets.map(x=>({net:x.net,layer:'F.Cu',start:x.endpoints[0],end:x.endpoints[1],width:0}))
    const score=findCrossNetCollisions({tracks,vias:[],clearance:0}).length*1e6+tracks.reduce((sum,x)=>sum+Math.hypot(x.end.x-x.start.x,x.end.y-x.start.y),0)
    candidates.push({score,assignments:nets.map(x=>({net:x.net,pin:x.pin,point:x.endpoints[1]}))})
  }
  return candidates.sort((a,b)=>a.score-b.score||JSON.stringify(a.assignments).localeCompare(JSON.stringify(b.assignments)))[0]
}
function permutations(items){if(items.length<2)return[items];return items.flatMap((item,index)=>permutations([...items.slice(0,index),...items.slice(index+1)]).map(rest=>[item,...rest]))}

export function routeCollisionAwareChannelsV2({nets=[],bounds,layers=['F.Cu','In1.Cu','In2.Cu','B.Cu'],occupancy={tracks:[],vias:[]},clearance=.2,trackWidth=.16,viaDiameter=.5,lanePitch=.8,dogbone=.7}={}){
  if(!bounds||!layers.length)throw new Error('bounds and layers required')
  // Preserve the topology with reusable occupancy. This lets a later dense batch
  // deterministically rip up and reorder earlier routes instead of being trapped
  // by the caller's batch order.
  const prior=occupancy.routedNets||[]
  const merged=new Map(prior.map(tree=>[tree.net,tree]))
  for(const tree of nets)merged.set(tree.net,structuredClone(tree))
  const requested=new Set(nets.map(tree=>tree.net))
  // Occupancy is authoritative geometry, not a routing hint. In particular,
  // projected footprint pads are supplied as pad-obstacle vias so a regenerated
  // route cannot cross copper belonging to another net.
  const tracks=(occupancy.tracks||[]).map(item=>structuredClone(item)),vias=[
    ...(occupancy.vias||[]).map(item=>structuredClone(item)),
    ...(occupancy.tracks||[]).filter(item=>/^GND$/i.test(item.net)&&item.kind==='projected-pad-obstacle').map(item=>({net:'GND',x:(item.start.x+item.end.x)/2,y:(item.start.y+item.end.y)/2,diameter:viaDiameter,drill:viaDiameter/2,kind:'ground-plane-pad-guard'})),
    ...[...merged.values()].filter(tree=>powerRank(tree)===0).flatMap(tree=>(tree.endpoints||[]).map(p=>({net:tree.net,x:p.x,y:p.y,diameter:viaDiameter,drill:viaDiameter/2,kind:'reserved-power'}))),
  ],addedTracks=[],addedVias=[]
  const ordered=[...merged.values()].flatMap(partitionLargeTree).sort((a,b)=>routeClass(a)-routeClass(b)||ioRank(a)-ioRank(b)||qspiRank(a)-qspiRank(b)||routeDifficulty(a)-routeDifficulty(b)||String(a.net).localeCompare(String(b.net))||Number(a.partition||0)-Number(b.partition||0))
  const bundled=new Set()
  for(const names of [['I2C_SCL','I2C_SDA'],['SWCLK','SWDIO']]){
    const group=names.map(name=>ordered.find(tree=>tree.net===name)).filter(Boolean)
    // Direct bundle endpoint vias are only valid for PTH endpoints. Canonical
    // SMD packages must use the general dogbone/halo escape path below.
    if(group.length!==names.length||group.some(tree=>tree.endpoints?.length!==2||tree.endpoints.some(p=>!p.throughHole)))continue
    const candidate=buildCoupledBundle(group,{bounds,layers,tracks,vias,clearance,trackWidth,viaDiameter,lanePitch})
    if(!candidate)throw Object.assign(new Error(`physical routing lanes exhausted for bundle ${names.join('/')}`),{code:'PHYSICAL_LANES_EXHAUSTED',net:names.join('/')})
    tracks.push(...candidate.tracks);vias.push(...candidate.vias);for(const tree of group){bundled.add(tree.net);if(requested.has(tree.net)){addedTracks.push(...candidate.tracks.filter(x=>x.net===tree.net));addedVias.push(...candidate.vias.filter(x=>x.net===tree.net))}}
  }
  for(const tree of ordered){
    if(bundled.has(tree.net))continue
    const endpoints=[...(tree.endpoints||[])].sort((a,b)=>a.x-b.x||a.y-b.y);if(endpoints.length<2)continue
    let accepted=null
    for(const layer of preferredLayers(tree,layers))for(const laneY of [null,...laneCandidates(bounds,lanePitch)]){
      const candidate=laneY===null
        ?buildShortestCandidate(tree.net,endpoints,layer,{bounds,trackWidth,viaDiameter,tracks,vias,clearance,lanePitch})
        :buildCandidate(tree.net,endpoints,layer,laneY,{bounds,dogbone,trackWidth,viaDiameter,tracks,vias,clearance})
      if(candidate&&!introducedCollisions(tracks,vias,candidate.tracks,candidate.vias,clearance).length){accepted=candidate;break}
    }
    if(!accepted)throw Object.assign(new Error(`physical routing lanes exhausted for ${tree.net}`),{code:'PHYSICAL_LANES_EXHAUSTED',net:tree.net,partialResult:{schema:'boardforge.collision-aware-channel-routing.v2.partial',tracks:[...addedTracks],vias:[...addedVias],failedNet:tree.net,completedNets:[...new Set(addedTracks.map(item=>item.net))]}})
    tracks.push(...accepted.tracks);vias.push(...accepted.vias);if(requested.has(tree.net)){addedTracks.push(...accepted.tracks);addedVias.push(...accepted.vias)}
  }
  const result={schema:'boardforge.collision-aware-channel-routing.v2',tracks:addedTracks,vias:addedVias,occupancy:{tracks,vias,routedNets:[...merged.values()].map(tree=>structuredClone(tree))}}
  result.diagnostics={crossNetCollisions:introducedCollisions(occupancy.tracks||[],occupancy.vias||[],addedTracks,addedVias,clearance),netsRouted:new Set(addedTracks.map(t=>t.net)).size}
  return result
}

function buildCoupledBundle(group,o){
  const ordered=[...group].sort((a,b)=>a.endpoints[0].y-b.endpoints[0].y||String(a.net).localeCompare(String(b.net)))
  const outer=o.layers.filter(x=>x==='B.Cu'),layers=outer.length?outer:o.layers
  for(const layer of layers)for(let ring=0;ring<=32;ring++)for(const sign of ring===0?[0]:[-1,1])for(let escapeRing=0;escapeRing<=12;escapeRing++){
    const offset=sign*ring*o.lanePitch,escape=(escapeRing+1)*o.lanePitch,tracks=[],vias=[]
    for(const tree of ordered){
      const [a,b]=tree.endpoints,dir=Math.sign(b.x-a.x)||1
      const midA={x:a.x+dir*escape,y:a.y+offset},midB={x:b.x-dir*escape,y:b.y+offset}
      for(const [start,end] of [[a,midA],[midA,midB],[midB,b]])if(start.x!==end.x||start.y!==end.y)tracks.push(track(tree.net,layer,start,end,o.trackWidth,'bundle'))
      if(layer!=='F.Cu')for(const p of[a,b])vias.push({net:tree.net,x:p.x,y:p.y,diameter:o.viaDiameter,drill:o.viaDiameter/2,kind:'bundle-endpoint'})
    }
    if(tracks.some(t=>[t.start,t.end].some(p=>p.x<o.bounds.minX+1||p.x>o.bounds.maxX-1||p.y<o.bounds.minY+1||p.y>o.bounds.maxY-1)))continue
    if(!introducedCollisions(o.tracks,o.vias,tracks,vias,o.clearance).length)return{tracks,vias}
  }
  return null
}

function buildShortestCandidate(net,endpoints,layer,o){
  const edgeMargin=o.clearance+Math.max(o.trackWidth,o.viaDiameter)/2
  if(endpoints.some(p=>p.x-o.bounds.minX<edgeMargin||o.bounds.maxX-p.x<edgeMargin||p.y-o.bounds.minY<edgeMargin||o.bounds.maxY-p.y<edgeMargin))return null
  const direct=buildDirectCandidate(net,endpoints,layer,o)
  if(direct)return direct
  if(endpoints.length>2){
    const vias=layer==='F.Cu'?[]:endpoints.map(p=>({net,x:p.x,y:p.y,diameter:o.viaDiameter,drill:o.viaDiameter/2,kind:'endpoint'}))
    if(introducedCollisions(o.tracks,o.vias,[],vias,o.clearance).length)return null
    const tracks=[]
    for(let i=1;i<endpoints.length;i++){
      let found=null
      for(const points of orthogonalPaths(endpoints[i-1],endpoints[i],o)){
        const part=[];for(let j=1;j<points.length;j++)if(points[j-1].x!==points[j].x||points[j-1].y!==points[j].y)part.push(track(net,layer,points[j-1],points[j],o.trackWidth,'tree'))
        if(!introducedCollisions(o.tracks,o.vias,[...tracks,...part],vias,o.clearance).length){found=part;break}
      }
      if(!found)return null;tracks.push(...found)
    }
    return{tracks,vias}
  }
  const [a,b]=endpoints
  const paths=orthogonalPaths(a,b,o)
  for(const points of paths){
    const tracks=[];for(let i=1;i<points.length;i++)if(points[i-1].x!==points[i].x||points[i-1].y!==points[i].y)tracks.push(track(net,layer,points[i-1],points[i],o.trackWidth,'orthogonal'))
    const vias=layer==='F.Cu'?[]:endpoints.map(p=>({net,x:p.x,y:p.y,diameter:o.viaDiameter,drill:o.viaDiameter/2,kind:'endpoint'}))
    if(!introducedCollisions(o.tracks,o.vias,tracks,vias,o.clearance).length)return{tracks,vias}
  }
  return null
}
function orthogonalPaths(a,b,o){
  const paths=[[a,{x:b.x,y:a.y},b],[a,{x:a.x,y:b.y},b]]
  for(let ring=1;ring<=24;ring++)for(const sign of[-1,1]){
    const y=(a.y+b.y)/2+sign*ring*o.lanePitch
    if(y>o.bounds.minY+1&&y<o.bounds.maxY-1)paths.push([a,{x:a.x,y},{x:b.x,y},b])
    const x=(a.x+b.x)/2+sign*ring*o.lanePitch
    if(x>o.bounds.minX+1&&x<o.bounds.maxX-1)paths.push([a,{x,y:a.y},{x,y:b.y},b])
  }
  return paths
}

function routeDifficulty(tree){const p=tree.endpoints||[];if(p.length<2)return 0;const xs=p.map(x=>x.x),ys=p.map(x=>x.y);return (Math.max(...xs)-Math.min(...xs)+Math.max(...ys)-Math.min(...ys))*Math.max(1,p.length-1)}
function partitionLargeTree(tree){const endpoints=tree.endpoints||[];if(endpoints.length<=6)return[tree];const anchor=endpoints.find(p=>p.throughHole)||endpoints[0],rest=endpoints.filter(p=>p!==anchor),out=[];for(let i=0;i<rest.length;i+=4)out.push({...tree,partition:i/4,endpoints:[anchor,...rest.slice(i,i+4)]});return out}
function powerRank(tree){return /^(GND|3V3|5V|VBUS)$/i.test(tree.net)?0:1}
function qspiRank(tree){if(!/^QSPI_/.test(tree.net))return 1000;return tree.endpoints?.[0]?.y||0}
function ioRank(tree){return tree.net==='I2C_SCL'?0:tree.net==='I2C_SDA'?1:2}
function signalClass(tree){return /^I2C_/.test(tree.net)?0:/^QSPI_/.test(tree.net)?1:2}
function routeClass(tree){if(/^(3V3|5V|VBUS|VUSB)$/i.test(tree.net))return 0;const dense={I2C_SDA:1,UART_TX:2,UART_RX:3,I2C_SCL:4}[tree.net];return dense??(/^GND$/i.test(tree.net)?99:/^QSPI_/.test(tree.net)?6:7)}
function preferredLayers(tree,layers){
  const preferred=/^GND$/i.test(tree.net)?'In1.Cu':/^(3V3|5V|VBUS)$/i.test(tree.net)?'In2.Cu':null
  // A preferred inner power layer is a first choice, not a one-layer prison.
  // If its physical lanes are full, a candidate may use another validated
  // copper layer; KiCad DRC remains the final acceptance authority.
  if(preferred&&layers.includes(preferred))return[preferred,...layers.filter(layer=>layer!==preferred)]
  const densePreferred={I2C_SCL:'In1.Cu',I2C_SDA:'In2.Cu',UART_TX:'B.Cu',UART_RX:'In1.Cu'}[tree.net]
  if(densePreferred&&layers.includes(densePreferred))return[densePreferred,...layers.filter(layer=>layer!==densePreferred)]
  const outer=layers.filter(x=>x==='F.Cu'||x==='B.Cu'),inner=layers.filter(x=>!outer.includes(x))
  if(/^(SWDIO|SWCLK|I2C_SCL|I2C_SDA)$/i.test(tree.net))return[...outer,...inner]
  return outer.length?outer:[...outer,...inner]
}

// Prefer the shortest topology-preserving route. Ordered endpoint sets (the common
// MCU fan-out case) form non-crossing segments and therefore reuse a layer safely.
// Channel search remains the deterministic fallback for obstructed topologies.
function buildDirectCandidate(net,endpoints,layer,o){
  // A plated through-hole pad already spans copper layers. SMD pads do not:
  // placing a via at their center can drill the pad or collide with an adjacent
  // canonical lead. Force SMD non-front routes through the halo escape path.
  if(layer!=='F.Cu'&&endpoints.some(p=>p.throughHole!==true))return null
  const tracks=[],vias=[]
  const edgeMargin=o.clearance+Math.max(o.trackWidth,o.viaDiameter)/2
  if(endpoints.some(p=>p.x-o.bounds.minX<edgeMargin||o.bounds.maxX-p.x<edgeMargin||p.y-o.bounds.minY<edgeMargin||o.bounds.maxY-p.y<edgeMargin))return null
  for(let i=1;i<endpoints.length;i++)tracks.push(track(net,layer,endpoints[i-1],endpoints[i],o.trackWidth,'direct'))
  if(layer!=='F.Cu')for(const p of endpoints)if(!p.throughHole)vias.push({net,x:p.x,y:p.y,diameter:o.viaDiameter,drill:o.viaDiameter/2,kind:'endpoint'})
  return introducedCollisions(o.tracks,o.vias,tracks,vias,o.clearance).length?null:{tracks,vias}
}

function buildCandidate(net,endpoints,layer,laneY,o){const tracks=[],vias=[],anchors=[];for(let i=0;i<endpoints.length;i++){const p=endpoints[i];if(p.throughHole){anchors.push(p);tracks.push(track(net,layer,p,{x:p.x,y:laneY},o.trackWidth,'pth-drop'));continue}const escape=findEscape(p,i,net,{...o,tracks:[...o.tracks,...tracks],vias:[...o.vias,...vias]});if(!escape)return null;anchors.push(escape);tracks.push(track(net,'F.Cu',p,escape,o.trackWidth,'dogbone'));vias.push({net,x:escape.x,y:escape.y,diameter:o.viaDiameter,drill:o.viaDiameter/2,kind:'dogbone'});tracks.push(track(net,layer,escape,{x:escape.x,y:laneY},o.trackWidth,'drop'))}const xs=anchors.map(v=>v.x);tracks.push(track(net,layer,{x:Math.min(...xs),y:laneY},{x:Math.max(...xs),y:laneY},o.trackWidth,'lane'));return introducedCollisions(o.tracks,o.vias,tracks,vias,o.clearance).length?null:{tracks,vias}}
function findEscape(p,index,net,o){
  // Canonical packages expose pads on every side (and thermal grids), so an
  // x-only dogbone search can falsely declare routable geometry exhausted.
  // Search deterministic radial spokes; the final full-candidate collision
  // check still fails closed if the escape segment itself is not legal.
  const directions=Array.from({length:16},(_,i)=>{const angle=(i+(index%2?8:0))*Math.PI/8;return{x:Math.cos(angle),y:Math.sin(angle)}})
  for(let ring=1;ring<=24;ring++)for(const direction of directions){
    const q={x:p.x+direction.x*o.dogbone*ring,y:p.y+direction.y*o.dogbone*ring}
    if(q.x<o.bounds.minX+1||q.x>o.bounds.maxX-1||q.y<o.bounds.minY+1||q.y>o.bounds.maxY-1)continue
    const probe={tracks:[...o.tracks,track(net,'F.Cu',p,q,o.trackWidth,'escape-probe')],vias:[...o.vias,{net,x:q.x,y:q.y,diameter:o.viaDiameter}]}
    if(!introducedCollisions(o.tracks,o.vias,[probe.tracks.at(-1)],[probe.vias.at(-1)],o.clearance).length)return q
  }
  return null
}
function* laneCandidates(b,p){const center=(b.minY+b.maxY)/2;for(let i=0;;i++){const ys=i===0?[center]:[center+i*p,center-i*p];let yielded=false;for(const y of ys)if(y>b.minY+1&&y<b.maxY-1){yielded=true;yield y}if(!yielded&&center+i*p>=b.maxY-1&&center-i*p<=b.minY+1)return}}
function introducedCollisions(baseTracks,baseVias,newTracks,newVias,clearance){
  const bt=baseTracks.length,bv=baseVias.length
  return findCrossNetCollisions({tracks:[...baseTracks,...newTracks],vias:[...baseVias,...newVias],clearance}).filter(hit=>hit.type==='track-track'?(hit.a>=bt||hit.b>=bt):hit.type==='via-track'?(hit.a>=bv||hit.b>=bt):(hit.a>=bv||hit.b>=bv))
}
function track(net,layer,start,end,width,kind){return{net,layer,start,end,width,kind}}
