export const ROBOTICS_MAIN_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.robotics-main-mechanical-contract.v1',boardId:'033_ROBOTICS_MAIN',outlineFamily:'robot chassis-robotics-main',maximumAreaMm2:900,
 wheelReliefs:Object.freeze({requiredCount:2,minimumDepthMm:4,minimumSpanMm:12}),
 chassisPattern:Object.freeze({requiredHoleCount:4,minimumWidthMm:22,minimumHeightMm:12,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
 placement:Object.freeze({frontSensorsMinimumYmm:18,rearPowerMaximumYmm:6,coreMinXmm:12,coreMaxXmm:28}),
})

export function validateRoboticsMainMechanicalGeometry(evidence={}){
 const c=ROBOTICS_MAIN_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<12||evidence.outlineClosed!==true)errors.push('robot-chassis-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('robotics-main-outline-exceeds-maximum-area')
 const datum=evidence.chassisDatum||{}
 if(datum.centerlineRecorded!==true||datum.forwardAxisRecorded!==true||datum.chassisEnvelopeVerified!==true)errors.push('robot-chassis-datum-unverified')
 const reliefs=evidence.wheelReliefs||[]
 if(reliefs.length!==c.wheelReliefs.requiredCount||reliefs.some(r=>(r.depthMm||0)<c.wheelReliefs.minimumDepthMm||(r.spanMm||0)<c.wheelReliefs.minimumSpanMm||r.edgeCutsVerified!==true))errors.push('robot-wheel-reliefs-unverified')
 if(evidence.wheelReliefsSymmetric!==true||reliefs.some(r=>r.wheelSweepClearanceVerified!==true))errors.push('robot-wheel-sweep-clearance-unverified')
 const holes=evidence.chassisMountingHoles||[]
 if(holes.length!==c.chassisPattern.requiredHoleCount)errors.push('robot-chassis-mount-count-invalid')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.chassisPattern.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`chassis-mount-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.chassisPattern.minimumKeepoutRadiusMm||h.allLayersKeepout!==true||h.standoffClearanceVerified!==true)errors.push(`chassis-mount-${i+1}-keepout-unverified`)
 }
 if((datum.mountPatternWidthMm||0)<c.chassisPattern.minimumWidthMm||(datum.mountPatternHeightMm||0)<c.chassisPattern.minimumHeightMm||datum.mountPatternSymmetric!==true)errors.push('robot-chassis-mount-pattern-unverified')
 const p=evidence.placements||{}
 if(!p.frontSensors||(p.frontSensors.minY??-Infinity)<c.placement.frontSensorsMinimumYmm)errors.push('robot-sensor-interface-not-on-front-edge')
 if(!p.rearPower||(p.rearPower.maxY??Infinity)>c.placement.rearPowerMaximumYmm)errors.push('robot-power-not-on-rear-edge')
 if(!p.coordinationCore||p.coordinationCore.minX<c.placement.coreMinXmm||p.coordinationCore.maxX>c.placement.coreMaxXmm)errors.push('robot-coordination-core-not-centered')
 if(!Array.isArray(p.motorInterfaces)||p.motorInterfaces.length!==2||p.motorInterfaces.some(x=>x.alignedToSide!==true))errors.push('robot-motor-interfaces-not-side-aligned')
 if(evidence.cableRouting?.clearOfWheelSweeps!==true||evidence.cableRouting?.strainReliefAndChassisTiePointsVerified!==true)errors.push('robot-chassis-cable-routing-unverified')
 if(evidence.assemblyClearance?.maximumHeightVerified!==true||evidence.assemblyClearance?.batteryAndFrameClearanceVerified!==true)errors.push('robot-chassis-assembly-clearance-unverified')
 return{schema:'boardforge.phase2c.robotics-main-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
