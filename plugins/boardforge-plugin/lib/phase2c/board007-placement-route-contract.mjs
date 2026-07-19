import {createConnectorEarMechanicalFixture} from './connector-ear-mechanical-contract.mjs'

export const BOARD007_PLACEMENT_ROUTE_CONTRACT=Object.freeze({
  schema:'boardforge.phase2c.board007-placement-route-contract.v1',
  topologyId:'can-controller-connector-ears',
  requiredRefs:Object.freeze(['U1','U2','U3','J1','J2','Q1','D_PWR','C_BULK','R1','JP1','R_BOOT','R_RESET','C_RESET','C1','C2','C3','C4','C5','C6','D1']),
  componentBodyZone:Object.freeze({minX:4.5,maxX:57.5,minY:2,maxY:36}),
  connectorServiceZones:Object.freeze({
    J1:Object.freeze({edge:'left',minX:4,maxX:10,minY:14,maxY:24}),
    J2:Object.freeze({edge:'right',minX:52,maxX:58,minY:10,maxY:28}),
  }),
  minimumPowerCorridorWidthMm:2,
  dPwrPlacementWindow:Object.freeze({minX:18,maxX:22,minY:13.5,maxY:17}),
})

const placements=Object.freeze({
  J1:Object.freeze({nx:.105,ny:.50,rotations:Object.freeze([90,270])}),
  U3:Object.freeze({nx:.24,ny:.50,rotations:Object.freeze([0,180,90,270])}),
  C3:Object.freeze({nx:.31,ny:.50,rotations:Object.freeze([90,0,180,270])}),
  U1:Object.freeze({nx:.50,ny:.50,rotations:Object.freeze([0,90,270,180])}),
  C1:Object.freeze({nx:.46,ny:.27,rotations:Object.freeze([90,0,180,270])}),
  U2:Object.freeze({nx:.70,ny:.50,rotations:Object.freeze([0,180,90,270])}),
  C2:Object.freeze({nx:.70,ny:.27,rotations:Object.freeze([90,0,180,270])}),
  D1:Object.freeze({nx:.78,ny:.72,rotations:Object.freeze([0,180,90,270])}),
  R1:Object.freeze({nx:.80,ny:.25,rotations:Object.freeze([90,0,180,270])}),
  J2:Object.freeze({nx:.895,ny:.50,rotations:Object.freeze([0,180])}),
  Q1:Object.freeze({nx:.36,ny:.73,rotations:Object.freeze([0,180,90,270])}),
  D_PWR:Object.freeze({nx:19/60,ny:14/36,rotations:Object.freeze([0,180,90,270])}),
  C_BULK:Object.freeze({nx:.34,ny:.24,rotations:Object.freeze([0,180,90,270])}),
  JP1:Object.freeze({nx:.46,ny:.70,rotations:Object.freeze([0,180])}),
  R_BOOT:Object.freeze({nx:.62,ny:.70,rotations:Object.freeze([90,0,180,270])}),
  R_RESET:Object.freeze({nx:.52,ny:.73,rotations:Object.freeze([0,90,180,270])}),
  C_RESET:Object.freeze({nx:.52,ny:.66,rotations:Object.freeze([0,90,180,270])}),
  C4:Object.freeze({nx:.58,ny:.34,rotations:Object.freeze([0,90,180,270])}),
  C5:Object.freeze({nx:.58,ny:.66,rotations:Object.freeze([0,90,180,270])}),
  C6:Object.freeze({nx:.62,ny:.30,rotations:Object.freeze([90,0,180,270])}),
})

export function board007PlacementPreferences(){return structuredClone(placements)}

export function createBoard007PlacementRoutePlan(){
  const fixture=createConnectorEarMechanicalFixture()
  return{
    schema:'boardforge.phase2c.board007-placement-route-plan.v1',topologyId:BOARD007_PLACEMENT_ROUTE_CONTRACT.topologyId,
    outline:fixture.outline,holes:fixture.holes,placements:board007PlacementPreferences(),
    keepouts:[
      ...fixture.holes.map((hole,index)=>({id:`MOUNT_${index+1}`,kind:'all-layer-circle',x:hole.x,y:hole.y,radiusMm:2.1})),
      {id:'LEFT_EAR_SERVICE',kind:'component-keepout',minX:0,maxX:4,minY:0,maxY:38},
      {id:'RIGHT_EAR_SERVICE',kind:'component-keepout',minX:58,maxX:62,minY:0,maxY:38},
    ],
    corridors:[
      {id:'3V3_BACKBONE',net:'3V3',layer:'In1.Cu',minX:10,maxX:52,minY:33,maxY:35,widthMm:2,viaAccessPitchMm:2,exclusive:true},
      {id:'GND_BACKBONE',net:'GND',layer:'In2.Cu',minX:10,maxX:52,minY:3,maxY:5,widthMm:2,viaAccessPitchMm:2,exclusive:true},
      {id:'CAN_FIELD_PAIR',nets:['CANH','CANL'],layer:'B.Cu',minX:40,maxX:56.5,minY:27,maxY:31,widthMm:4,pairSpacingMm:.8,exclusive:true},
      {id:'MCU_CAN_LOGIC',nets:['CAN_TX','CAN_RX'],layer:'B.Cu',minX:31,maxX:45,minY:8,maxY:13,widthMm:5,pairSpacingMm:.8,exclusive:true},
      {id:'I2C_SERVICE',nets:['I2C_SCL','I2C_SDA'],layer:'F.Cu',minX:31,maxX:56,minY:4,maxY:8,widthMm:4,pairSpacingMm:.8,exclusive:true},
    ],
  }
}

export function validateBoard007PlacementRoutePlan(plan={}){
  const c=BOARD007_PLACEMENT_ROUTE_CONTRACT,errors=[],refs=Object.keys(plan.placements||{}),holes=plan.holes||[],corridors=plan.corridors||[]
  if(plan.topologyId!==c.topologyId)errors.push('board007-placement-topology-invalid')
  for(const ref of c.requiredRefs)if(!refs.includes(ref))errors.push(`board007-placement-missing-${ref}`)
  if(refs.some(ref=>!c.requiredRefs.includes(ref)))errors.push('board007-placement-unexpected-ref')
  if(holes.length!==4)errors.push('board007-placement-mount-count-invalid')
  const rail=corridors.find(x=>x.id==='3V3_BACKBONE')
  if(!rail||rail.net!=='3V3'||rail.layer!=='In1.Cu'||rail.exclusive!==true||(rail.widthMm||0)<c.minimumPowerCorridorWidthMm||(rail.maxX-rail.minX)<35)errors.push('board007-3v3-routing-capacity-unreserved')
  const ground=corridors.find(x=>x.id==='GND_BACKBONE')
  if(!ground||ground.layer===rail?.layer||ground.exclusive!==true)errors.push('board007-ground-routing-capacity-unreserved')
  for(const id of['CAN_FIELD_PAIR','MCU_CAN_LOGIC','I2C_SERVICE'])if(!corridors.some(x=>x.id===id&&x.exclusive===true))errors.push(`board007-corridor-missing-${id}`)
  const keepouts=plan.keepouts||[]
  if(!holes.every((_,index)=>keepouts.some(k=>k.id===`MOUNT_${index+1}`&&k.kind==='all-layer-circle'&&(k.radiusMm||0)>=2.1)))errors.push('board007-mount-keepouts-incomplete')
  if(corridors.some(corridor=>keepouts.some(keepout=>keepout.kind==='all-layer-circle'&&circleTouchesRect(keepout,corridor))))errors.push('board007-corridor-intrudes-mount-keepout')
  for(const [ref,zone]of Object.entries(c.connectorServiceZones)){const p=plan.placements?.[ref],x=(p?.nx??-1)*62,y=(p?.ny??-1)*38;if(x<zone.minX||x>zone.maxX||y<zone.minY||y>zone.maxY)errors.push(`board007-${ref.toLowerCase()}-connector-access-invalid`)}
  {const p=plan.placements?.D_PWR,x=(p?.nx??-1)*62,y=(p?.ny??-1)*38,w=c.dPwrPlacementWindow;if(x<w.minX||x>w.maxX||y<w.minY||y>w.maxY)errors.push('board007-d-pwr-i2c-clearance-invalid')}
  return{schema:'boardforge.phase2c.board007-placement-route-validation.v1',ok:errors.length===0,errors,threeV3CapacityMm:rail?.widthMm||0,corridorCount:corridors.length}
}

function circleTouchesRect(circle,rect){const x=Math.max(rect.minX,Math.min(circle.x,rect.maxX)),y=Math.max(rect.minY,Math.min(circle.y,rect.maxY));return Math.hypot(circle.x-x,circle.y-y)<circle.radiusMm}
