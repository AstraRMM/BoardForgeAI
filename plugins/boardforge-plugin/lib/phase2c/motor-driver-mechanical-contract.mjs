export const MOTOR_DRIVER_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.motor-driver-mechanical-contract.v1',boardId:'014_MOTOR_DRIVER',outlineFamily:'thermal wings-motor-driver',maximumAreaMm2:2650,bodyEnvelope:Object.freeze({minWidthMm:52,maxWidthMm:58,minHeightMm:32,maxHeightMm:38}),thermalWings:Object.freeze({count:2,minimumProjectionMm:3,minimumSpanMm:12,minimumFastenerDiameterMm:3,minimumFastenerKeepoutRadiusMm:3,minimumCopperAreaMm2:35,minimumThermalVias:6}),placementEnvelopes:Object.freeze({powerInput:Object.freeze({maximumX:6}),logic:Object.freeze({minX:7,maxX:28}),gateDrive:Object.freeze({minX:25,maxX:38}),powerStage:Object.freeze({minX:34,maxX:52}),motorOutput:Object.freeze({minimumX:50})}),separation:Object.freeze({minimumLogicToSwitchNodeMm:3.2})})

export function validateMotorDriverMechanicalGeometry(evidence={}){
 const c=MOTOR_DRIVER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{}
 if(outline.length<12||evidence.outlineClosed!==true)errors.push('thermal-wing-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('motor-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('motor-body-envelope-invalid')
 const wings=evidence.thermalWings||[]
 if(wings.length!==c.thermalWings.count)errors.push('two-thermal-wings-required')
 for(const [i,wing]of wings.entries()){
  if((wing.projectionMm||0)<c.thermalWings.minimumProjectionMm||(wing.spanMm||0)<c.thermalWings.minimumSpanMm)errors.push(`thermal-wing-${i+1}-undersized`)
  if(!wing.fastener||wing.fastener.diameterMm<c.thermalWings.minimumFastenerDiameterMm)errors.push(`thermal-wing-${i+1}-fastener-missing`)
  if((wing.fastener?.keepoutRadiusMm||0)<c.thermalWings.minimumFastenerKeepoutRadiusMm||wing.fastener?.allLayersKeepout!==true)errors.push(`thermal-wing-${i+1}-fastener-keepout-unverified`)
  if((wing.copperAreaMm2||0)<c.thermalWings.minimumCopperAreaMm2||(wing.thermalViaCount||0)<c.thermalWings.minimumThermalVias||wing.allCopperLayersTied!==true)errors.push(`thermal-wing-${i+1}-heat-spreading-unverified`)
  if(wing.fastener&&!pointInPolygon([wing.fastener.x,wing.fastener.y],outline))errors.push(`thermal-wing-${i+1}-fastener-outside-outline`)
 }
 const p=evidence.placements||{},e=c.placementEnvelopes
 requireRange(p.logic,'logic',e.logic,errors);requireRange(p.gateDrive,'gate-drive',e.gateDrive,errors);requireRange(p.powerStage,'power-stage',e.powerStage,errors)
 if(!p.powerInput||(p.powerInput.maxX??Infinity)>e.powerInput.maximumX)errors.push('motor-power-input-not-on-left-edge')
 if(!p.motorOutput||(p.motorOutput.minX??-Infinity)<e.motorOutput.minimumX)errors.push('motor-output-not-on-right-edge')
 if(evidence.powerStageToWingRootMaximumMm>5||!Number.isFinite(evidence.powerStageToWingRootMaximumMm))errors.push('power-stage-too-far-from-thermal-wing-root')
 const separation=evidence.separation||{}
 if((separation.logicToSwitchNodeMm||0)<c.separation.minimumLogicToSwitchNodeMm)errors.push('logic-to-switch-node-clearance-insufficient')
 if(separation.switchNodeAllLayersKeepoutVerified!==true)errors.push('switch-node-keepout-unverified')
 if(evidence.highCurrentEdgeClearanceVerified!==true)errors.push('high-current-edge-clearance-unverified')
 if(evidence.thermalModelPrimarySourceVerified!==true)errors.push('power-stage-thermal-evidence-missing')
 return{schema:'boardforge.phase2c.motor-driver-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
