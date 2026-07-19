export function chooseFootprintTransform({sourceByNet,pads,positions,rotations=[0,90,180,270]}) {
  const candidates=[]
  for(const position of positions)for(const rotation of rotations){
    const transformed=transformPads(pads,position,rotation)
    const segments=transformed.filter(p=>sourceByNet[p.net]).map(p=>({net:p.net,start:sourceByNet[p.net],end:{x:p.x,y:p.y}}))
    const crossings=countCrossings(segments),length=segments.reduce((sum,s)=>sum+Math.hypot(s.end.x-s.start.x,s.end.y-s.start.y),0)
    candidates.push({position,rotation,pads:transformed,crossings,length,score:crossings*10000+length})
  }
  candidates.sort((a,b)=>a.score-b.score||a.rotation-b.rotation||a.position.x-b.position.x||a.position.y-b.position.y)
  return {best:candidates[0],candidates}
}

export function transformPads(pads,position,rotation=0){
  const radians=rotation*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians)
  return pads.map(p=>({...p,x:position.x+p.x*c-p.y*s,y:position.y+p.x*s+p.y*c}))
}

export function countCrossings(segments){let count=0;for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++)if(segments[i].net!==segments[j].net&&intersects(segments[i],segments[j]))count++;return count}
function intersects(a,b){const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a.start,a.end,b.start)*o(a.start,a.end,b.end)<0&&o(b.start,b.end,a.start)*o(b.start,b.end,a.end)<0}
