export const CONNECTOR_EAR_MECHANICAL_CONTRACT=Object.freeze({
  schema:'boardforge.phase2c.connector-ear-mechanical-contract.v1',
  maximumAreaMm2:3000,
  envelopeMm:Object.freeze({width:62,height:38}),
  mounting:Object.freeze({requiredCount:4,diameterMm:2.2,minimumEdgeClearanceMm:2}),
})

export function createConnectorEarMechanicalFixture(){
  const outline=[[4,0],[58,0],[58,6],[62,6],[62,14],[58,14],[58,24],[62,24],[62,32],[58,32],[58,38],[4,38],[4,32],[0,32],[0,24],[4,24],[4,14],[0,14],[0,6],[4,6]]
  const holes=[[3.25,10],[58.75,10],[3.25,28],[58.75,28]].map(([x,y])=>({x,y,diameterMm:2.2}))
  return{schema:'boardforge.phase2c.connector-ear-mechanical-fixture.v1',outline,holes,widthMm:62,heightMm:38,actualEnvelopeMm:{minX:0,minY:0,maxX:62,maxY:38,width:62,height:38},areaMm2:polygonArea(outline)}
}

export function validateConnectorEarMechanicalFixture(evidence={}){
  const c=CONNECTOR_EAR_MECHANICAL_CONTRACT,outline=evidence.outline||[],holes=evidence.holes||[],bounds=polygonBounds(outline),areaMm2=polygonArea(outline),errors=[]
  if(outline.length<12)errors.push('connector-ear-outline-invalid')
  if(!Number.isFinite(areaMm2)||areaMm2>c.maximumAreaMm2)errors.push('connector-ear-outline-exceeds-maximum-area')
  if(!bounds||bounds.width!==c.envelopeMm.width||bounds.height!==c.envelopeMm.height)errors.push('connector-ear-actual-envelope-incoherent')
  if(evidence.widthMm!==bounds?.width||evidence.heightMm!==bounds?.height)errors.push('connector-ear-declared-envelope-incoherent')
  if(holes.length!==c.mounting.requiredCount)errors.push('connector-ear-mount-count-invalid')
  const radius=c.mounting.diameterMm/2
  for(const [index,hole]of holes.entries()){
    if(hole.diameterMm!==c.mounting.diameterMm||!pointInPolygon([hole.x,hole.y],outline))errors.push(`connector-ear-hole-${index+1}-invalid`)
    if(!bounds||Math.min(hole.x-bounds.minX,bounds.maxX-hole.x,hole.y-bounds.minY,bounds.maxY-hole.y)-radius<c.mounting.minimumEdgeClearanceMm)errors.push(`connector-ear-hole-${index+1}-edge-clearance-invalid`)
  }
  return{schema:'boardforge.phase2c.connector-ear-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonBounds(points){if(!Array.isArray(points)||points.length<3)return null;const xs=points.map(p=>Number(p[0])),ys=points.map(p=>Number(p[1]));if([...xs,...ys].some(n=>!Number.isFinite(n)))return null;const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY}}
function polygonArea(points){if(!Array.isArray(points)||points.length<3)return NaN;let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1]}return Math.abs(sum)/2}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const[xi,yi]=polygon[i],[xj,yj]=polygon[j],cross=(yi>point[1])!==(yj>point[1])&&point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi;if(cross)inside=!inside}return inside}
