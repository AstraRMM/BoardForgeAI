export const ROBOTICS_EXPANSION_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.robotics-expansion-mechanical-contract.v1',boardId:'034_ROBOTICS_EXPANSION',outlineFamily:'mezzanine matched-robotics-expansion',maximumAreaMm2:1250,
 registrationNotches:Object.freeze({requiredCount:2,minimumWidthMm:4,minimumDepthMm:3,minimumSpacingMm:8}),
 stackMounting:Object.freeze({requiredHoleCount:2,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
 placement:Object.freeze({mezzanineConnectorMaximumYmm:7,ioConnectorMinimumYmm:19,logicMinXmm:12,logicMaxXmm:32}),
})

export function validateRoboticsExpansionMechanicalGeometry(evidence={}){
 const c=ROBOTICS_EXPANSION_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<12||evidence.outlineClosed!==true)errors.push('mezzanine-matched-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('robotics-expansion-outline-exceeds-maximum-area')
 const datum=evidence.stackDatum||{}
 if(datum.originRecorded!==true||datum.rotationRecorded!==true||datum.parentBoardEnvelopeMatched!==true)errors.push('mezzanine-stack-datum-unverified')
 const notches=evidence.registrationNotches||[]
 if(notches.length!==c.registrationNotches.requiredCount||notches.some(n=>(n.widthMm||0)<c.registrationNotches.minimumWidthMm||(n.depthMm||0)<c.registrationNotches.minimumDepthMm||n.edgeCutsVerified!==true))errors.push('mezzanine-registration-notches-unverified')
 if(notches.length===2&&Math.abs((notches[1].centerXmm??0)-(notches[0].centerXmm??0))<c.registrationNotches.minimumSpacingMm)errors.push('mezzanine-registration-notch-spacing-insufficient')
 if(evidence.notchesSymmetricAndParentMatched!==true)errors.push('mezzanine-registration-match-unverified')
 const p=evidence.placements||{}
 if(!Array.isArray(p.mezzanineConnectors)||p.mezzanineConnectors.length<2||p.mezzanineConnectors.some(x=>(x.maxY??Infinity)>c.placement.mezzanineConnectorMaximumYmm||x.parentMateAligned!==true))errors.push('mezzanine-connectors-not-parent-aligned')
 if(!Array.isArray(p.ioConnectors)||p.ioConnectors.length<2||p.ioConnectors.some(x=>(x.minY??-Infinity)<c.placement.ioConnectorMinimumYmm))errors.push('robot-io-connectors-not-on-service-edge')
 if(!p.expansionLogic||p.expansionLogic.minX<c.placement.logicMinXmm||p.expansionLogic.maxX>c.placement.logicMaxXmm)errors.push('expansion-logic-outside-central-envelope')
 const stack=evidence.stackClearance||{}
 if(stack.connectorMatedHeightVerified!==true||stack.topAndBottomComponentEnvelopesVerified!==true||stack.noCollisionWithParentComponents!==true)errors.push('mezzanine-stack-height-clearance-unverified')
 if(stack.insertionAndRemovalToolAccessVerified!==true||stack.ioCableExitClearOfParentBoard!==true)errors.push('mezzanine-service-access-unverified')
 const holes=evidence.stackMountingHoles||[]
 if(holes.length!==c.stackMounting.requiredHoleCount)errors.push('mezzanine-stack-mount-count-invalid')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.stackMounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline)||h.parentStandoffAligned!==true)errors.push(`stack-mount-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.stackMounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true||h.fastenerClearanceVerified!==true)errors.push(`stack-mount-${i+1}-keepout-unverified`)
 }
 if(evidence.cableStrain?.transferredToChassisNotMezzanine!==true)errors.push('mezzanine-io-cable-strain-unverified')
 return{schema:'boardforge.phase2c.robotics-expansion-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
