export function routeCollisionAwareChannels({nets=[],bounds,layers=['In1.Cu','In2.Cu'],clearance=0.25,trackWidth=0.2,viaDiameter=0.6,lanePitch=1.2,dogbone=0.9}={}){
  if(!bounds||layers.length<1)throw new Error('bounds and at least one routing layer are required')
  const tracks=[],vias=[],occupancy=[]
  const ordered=[...nets].sort((a,b)=>String(a.net).localeCompare(String(b.net)))
  const routed=ordered.filter(n=>(n.endpoints||[]).length>1)
  if(routed.length>layers.length)throw new Error(`collision-free channel routing needs ${routed.length} routing layers; received ${layers.length}`)
  for(let ni=0;ni<ordered.length;ni++){
    const item=ordered[ni],points=[...(item.endpoints||[])].sort(pointOrder)
    if(points.length<2)continue
    const layer=layers[ni],laneY=findLane(bounds,ni,lanePitch,item.net,occupancy,clearance,trackWidth)
    const escapes=[]
    for(let pi=0;pi<points.length;pi++){
      const p=points[pi],escape=findDogbone(p,{bounds,net:item.net,occupancy,clearance,viaDiameter,dogbone,index:pi})
      addTrack(tracks,occupancy,{net:item.net,layer:'F.Cu',start:p,end:escape,width:trackWidth,kind:'dogbone'})
      addVia(vias,occupancy,{net:item.net,x:escape.x,y:escape.y,diameter:viaDiameter,drill:viaDiameter/2,kind:'dogbone'})
      escapes.push(escape)
    }
    const xs=escapes.map(p=>p.x),minX=Math.min(...xs),maxX=Math.max(...xs)
    addTrack(tracks,occupancy,{net:item.net,layer,start:{x:minX,y:laneY},end:{x:maxX,y:laneY},width:trackWidth,kind:'lane'})
    for(const p of escapes)addTrack(tracks,occupancy,{net:item.net,layer,start:p,end:{x:p.x,y:laneY},width:trackWidth,kind:'drop'})
  }
  return{schema:'boardforge.collision-aware-channel-routing.v1',tracks,vias,diagnostics:{netsRequested:nets.length,netsRouted:ordered.filter(n=>(n.endpoints||[]).length>1).length,crossNetCollisions:findCrossNetCollisions({tracks,vias,clearance})}}
}

export function findCrossNetCollisions({tracks=[],vias=[],clearance=.25}={}){const out=[];for(let i=0;i<tracks.length;i++)for(let j=i+1;j<tracks.length;j++){const a=tracks[i],b=tracks[j];if(a.net!==b.net&&a.layer===b.layer&&segmentsNear(a,b,clearance+(a.width+b.width)/2))out.push({a:i,b:j,type:'track-track'})}for(let vi=0;vi<vias.length;vi++)for(let ti=0;ti<tracks.length;ti++){const v=vias[vi],t=tracks[ti];if(v.net!==t.net&&pointSegmentDistance(v,t)<clearance+v.diameter/2+t.width/2)out.push({a:vi,b:ti,type:'via-track'})}for(let i=0;i<vias.length;i++)for(let j=i+1;j<vias.length;j++)if(vias[i].net!==vias[j].net&&distance(vias[i],vias[j])<clearance+(vias[i].diameter+vias[j].diameter)/2)out.push({a:i,b:j,type:'via-via'});return out}

export function connectedNets(result){const map=new Map();for(const t of result.tracks||[]){if(!map.has(t.net))map.set(t.net,[]);map.get(t.net).push(t)}return Object.fromEntries([...map].map(([net,tracks])=>[net,tracks.length>0]))}

function findLane(bounds,index,pitch,net,occ,clearance,width){for(let step=0;step<100;step++){const y=bounds.minY+2+(index+step)*pitch;if(y>bounds.maxY-2)break;const probe={net,layer:'*',start:{x:bounds.minX+1,y},end:{x:bounds.maxX-1,y},width};if(!occ.some(o=>o.type==='via'&&o.net!==net&&pointSegmentDistance(o,probe)<clearance+o.diameter/2+width/2))return y}throw new Error(`no collision-free lane for ${net}`)}
function findDogbone(p,{bounds,net,occupancy,clearance,viaDiameter,dogbone,index}){const signs=index%2?[1,-1]:[-1,1];for(let ring=1;ring<=12;ring++)for(const sign of signs){const q={x:p.x+sign*dogbone*ring,y:p.y};if(q.x<bounds.minX+1||q.x>bounds.maxX-1)continue;if(occupancy.every(o=>o.net===net||farFrom(q,o,clearance+viaDiameter/2)))return q}throw new Error(`no collision-free dogbone for ${net}`)}
function farFrom(p,o,d){return o.type==='via'?distance(p,o)>=d+o.diameter/2:pointSegmentDistance(p,o)>=d+o.width/2}
function addTrack(tracks,occ,t){tracks.push(t);occ.push({...t,type:'track'})}function addVia(vias,occ,v){vias.push(v);occ.push({...v,type:'via'})}
function pointOrder(a,b){return a.x-b.x||a.y-b.y}function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function pointSegmentDistance(p,s){const{x:x1,y:y1}=s.start,{x:x2,y:y2}=s.end,dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;if(!l)return distance(p,s.start);const t=Math.max(0,Math.min(1,((p.x-x1)*dx+(p.y-y1)*dy)/l));return Math.hypot(p.x-(x1+t*dx),p.y-(y1+t*dy))}
function segmentsNear(a,b,d){return pointSegmentDistance(a.start,b)<d||pointSegmentDistance(a.end,b)<d||pointSegmentDistance(b.start,a)<d||pointSegmentDistance(b.end,a)<d||segmentsIntersect(a.start,a.end,b.start,b.end)}
function segmentsIntersect(a,b,c,d){const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a,b,c)*o(a,b,d)<=0&&o(c,d,a)*o(c,d,b)<=0}
