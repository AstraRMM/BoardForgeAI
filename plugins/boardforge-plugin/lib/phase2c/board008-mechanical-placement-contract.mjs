export const BOARD008_MECHANICAL_PLACEMENT_CONTRACT=Object.freeze({
  schema:'boardforge.phase2c.board008-mechanical-placement-contract.v1',maximumAreaMm2:3350,
  envelopeMm:Object.freeze({width:68,height:44}),mounting:Object.freeze({requiredCount:4,diameterMm:2.2}),
  requiredServiceZones:Object.freeze(['CAN1_PORT','CAN2_PORT','POWER_ACCESS','DEBUG_ACCESS']),
  requiredCorridors:Object.freeze(['CAN1_PAIR','CAN2_PAIR','3V3_BACKBONE','GND_BACKBONE','POWER_ENTRY','DEBUG_SIGNALS']),
})

const placementPreferences=Object.freeze({
  J1:Object.freeze({nx:.09,ny:.31,rotations:Object.freeze([90,270])}),J2:Object.freeze({nx:.94,ny:.23,rotations:Object.freeze([90,270])}),J3:Object.freeze({nx:.94,ny:.77,rotations:Object.freeze([90,270])}),
  U1:Object.freeze({nx:.50,ny:.50,rotations:Object.freeze([0,90,270,180])}),U2:Object.freeze({nx:.76,ny:.30,rotations:Object.freeze([0,180,90,270])}),U4:Object.freeze({nx:.76,ny:.70,rotations:Object.freeze([0,180,90,270])}),
  U3:Object.freeze({nx:.25,ny:.40,rotations:Object.freeze([0,180,90,270])}),R1:Object.freeze({nx:.83,ny:.20,rotations:Object.freeze([90,0,180,270])}),R2:Object.freeze({nx:.83,ny:.80,rotations:Object.freeze([90,0,180,270])}),
  D1:Object.freeze({nx:.70,ny:.18,rotations:Object.freeze([0,180,90,270])}),D2:Object.freeze({nx:.70,ny:.82,rotations:Object.freeze([0,180,90,270])}),C1:Object.freeze({nx:.42,ny:.33,rotations:Object.freeze([90,0,180,270])}),C2:Object.freeze({nx:.68,ny:.33,rotations:Object.freeze([90,0,180,270])}),C3:Object.freeze({nx:.32,ny:.40,rotations:Object.freeze([90,0,180,270])}),
  Q1:Object.freeze({nx:.31,ny:.55,rotations:Object.freeze([0,180,90,270])}),D_PWR:Object.freeze({nx:.22,ny:.48,rotations:Object.freeze([0,180,90,270])}),C_BULK:Object.freeze({nx:.23,ny:.23,rotations:Object.freeze([0,180,90,270])}),
  JP1:Object.freeze({nx:.84,ny:.23,rotations:Object.freeze([90,270,0,180])}),JP2:Object.freeze({nx:.84,ny:.77,rotations:Object.freeze([90,270,0,180])}),R_BOOT:Object.freeze({nx:.40,ny:.72,rotations:Object.freeze([90,0,180,270])}),R_RESET:Object.freeze({nx:.47,ny:.72,rotations:Object.freeze([90,0,180,270])}),C_RESET:Object.freeze({nx:.47,ny:.64,rotations:Object.freeze([90,0,180,270])}),
  C4:Object.freeze({nx:.50,ny:.30,rotations:Object.freeze([90,0,180,270])}),C5:Object.freeze({nx:.50,ny:.70,rotations:Object.freeze([90,0,180,270])}),C6:Object.freeze({nx:.58,ny:.50,rotations:Object.freeze([90,0,180,270])}),C7:Object.freeze({nx:.68,ny:.70,rotations:Object.freeze([90,0,180,270])}),
})
export function board008PlacementPreferences(){return structuredClone(placementPreferences)}

export function createBoard008MechanicalPlacementFixture(){
  const outline=[[0,0],[62,0],[62,5],[68,5],[68,15],[62,15],[62,29],[68,29],[68,39],[62,39],[62,44],[0,44]]
  const holes=[[5,4],[57,4],[5,40],[57,40]].map(([x,y])=>({x,y,diameterMm:2.2}))
  return{
    schema:'boardforge.phase2c.board008-mechanical-placement-fixture.v1',outline,holes,widthMm:68,heightMm:44,actualEnvelopeMm:{minX:0,minY:0,maxX:68,maxY:44,width:68,height:44},areaMm2:polygonArea(outline),
    serviceZones:[
      {id:'CAN1_PORT',edge:'right',minX:60,maxX:68,minY:5,maxY:15,connectorRef:'J2',cableExitVerified:true},
      {id:'CAN2_PORT',edge:'right',minX:60,maxX:68,minY:29,maxY:39,connectorRef:'J3',cableExitVerified:true},
      {id:'POWER_ACCESS',edge:'right',minX:60,maxX:68,minY:5,maxY:15,connectorRef:'J2',cableExitVerified:true},
      {id:'DEBUG_ACCESS',edge:'left',minX:0,maxX:10,minY:8,maxY:19,connectorRef:'J1',cableExitVerified:true},
    ],
    placementZones:{controller:{minX:25,maxX:43,minY:13,maxY:31},can1Phy:{minX:45,maxX:57,minY:7,maxY:17},can2Phy:{minX:45,maxX:57,minY:27,maxY:37},power:{minX:10,maxX:23,minY:8,maxY:22},debug:{minX:10,maxX:23,minY:25,maxY:36}},placements:board008PlacementPreferences(),
    corridors:[
      {id:'CAN1_PAIR',nets:['CAN1H','CAN1L'],layer:'B.Cu',minX:45,maxX:65,minY:9,maxY:12,widthMm:3,pairSpacingMm:.8,exclusive:true},
      {id:'CAN2_PAIR',nets:['CAN2H','CAN2L'],layer:'In3.Cu',minX:45,maxX:65,minY:32,maxY:35,widthMm:3,pairSpacingMm:.8,exclusive:true},
      {id:'3V3_BACKBONE',net:'3V3',layer:'In1.Cu',minX:12,maxX:57,minY:20,maxY:22,widthMm:2,exclusive:true},
      {id:'GND_BACKBONE',net:'GND',layer:'In2.Cu',minX:12,maxX:57,minY:23,maxY:25,widthMm:2,exclusive:true},
      {id:'POWER_ENTRY',nets:['5V_RAW','5V'],layer:'F.Cu',minX:5,maxX:24,minY:14,maxY:18,widthMm:4,exclusive:true},
      {id:'DEBUG_SIGNALS',nets:['SWDIO','SWCLK','NRST'],layer:'F.Cu',minX:5,maxX:28,minY:27,maxY:31,widthMm:4,exclusive:true},
    ],
  }
}

export function validateBoard008MechanicalPlacementFixture(fixture={}){
  const c=BOARD008_MECHANICAL_PLACEMENT_CONTRACT,errors=[],outline=fixture.outline||[],holes=fixture.holes||[],zones=fixture.serviceZones||[],corridors=fixture.corridors||[],bounds=polygonBounds(outline),areaMm2=polygonArea(outline)
  if(outline.length<12)errors.push('board008-asymmetric-dual-port-outline-invalid')
  if(!Number.isFinite(areaMm2)||areaMm2>c.maximumAreaMm2)errors.push('board008-outline-exceeds-maximum-area')
  if(!bounds||bounds.width!==c.envelopeMm.width||bounds.height!==c.envelopeMm.height||fixture.widthMm!==bounds.width||fixture.heightMm!==bounds.height)errors.push('board008-actual-envelope-incoherent')
  if(holes.length!==c.mounting.requiredCount)errors.push('board008-mount-count-invalid')
  if(holes.some(h=>h.diameterMm!==c.mounting.diameterMm||!pointInPolygon([h.x,h.y],outline)))errors.push('board008-mount-geometry-invalid')
  for(const id of c.requiredServiceZones)if(!zones.some(z=>z.id===id&&z.cableExitVerified===true))errors.push(`board008-service-zone-missing-${id}`)
  const can=zones.filter(z=>/^CAN[12]_PORT$/.test(z.id));if(can.length!==2||rectOverlap(can[0],can[1]))errors.push('board008-can-port-service-zones-not-separated')
  if(zones.some(z=>holes.some(h=>pointInRect(h,z))))errors.push('board008-mount-in-service-zone')
  for(const id of c.requiredCorridors)if(!corridors.some(x=>x.id===id&&x.exclusive===true))errors.push(`board008-routing-corridor-missing-${id}`)
  const c1=corridors.find(x=>x.id==='CAN1_PAIR'),c2=corridors.find(x=>x.id==='CAN2_PAIR'),rail=corridors.find(x=>x.id==='3V3_BACKBONE'),gnd=corridors.find(x=>x.id==='GND_BACKBONE')
  if(!c1||!c2||c1.layer===c2.layer||rectOverlap(c1,c2))errors.push('board008-can-routing-domains-not-separated')
  if(!rail||rail.widthMm<2||!gnd||gnd.widthMm<2||rail.layer===gnd.layer)errors.push('board008-power-routing-capacity-insufficient')
  return{schema:'boardforge.phase2c.board008-mechanical-placement-validation.v1',ok:errors.length===0,errors,areaMm2,bounds,serviceZoneCount:zones.length,corridorCount:corridors.length}
}

function polygonBounds(p){if(!Array.isArray(p)||p.length<3)return null;const xs=p.map(x=>x[0]),ys=p.map(x=>x[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY}}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function pointInPolygon(point,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function pointInRect(p,r){return p.x>=r.minX&&p.x<=r.maxX&&p.y>=r.minY&&p.y<=r.maxY}
function rectOverlap(a,b){return !(a.maxX<=b.minX||b.maxX<=a.minX||a.maxY<=b.minY||b.maxY<=a.minY)}
