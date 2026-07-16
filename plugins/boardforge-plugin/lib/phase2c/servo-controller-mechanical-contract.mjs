export const SERVO_CONTROLLER_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.servo-controller-mechanical-contract.v1',boardId:'015_SERVO_CONTROLLER',outlineFamily:'connector comb-servo-controller',maximumAreaMm2:3000,bodyEnvelope:Object.freeze({minWidthMm:58,maxWidthMm:63,minHeightMm:34,maxHeightMm:40}),comb:Object.freeze({minimumTeeth:4,minimumProjectionMm:3,minimumToothSpanMm:4,maximumPitchErrorMm:.5,connectorPinsPerBay:3,minimumCableExitDepthMm:8}),mounting:Object.freeze({minimumHoles:2,minimumHoleDiameterMm:3,minimumKeepoutRadiusMm:3}),placementEnvelopes:Object.freeze({logic:Object.freeze({minX:7,maxX:34}),signalBuffer:Object.freeze({minX:30,maxX:47}),servoPowerSpine:Object.freeze({minX:44,maxX:62}),servoConnectors:Object.freeze({minimumX:58}),powerInput:Object.freeze({maximumX:7})})})

export function validateServoControllerMechanicalGeometry(evidence={}){
 const c=SERVO_CONTROLLER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{}
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('servo-comb-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('servo-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('servo-body-envelope-invalid')
 const teeth=evidence.combTeeth||[],bays=evidence.servoConnectorBays||[]
 if(teeth.length<c.comb.minimumTeeth)errors.push('servo-connector-comb-too-few-teeth')
 if(bays.length!==teeth.length)errors.push('servo-comb-to-connector-count-mismatch')
 const pitches=[]
 for(const [i,tooth]of teeth.entries()){
  if((tooth.projectionMm||0)<c.comb.minimumProjectionMm||(tooth.spanMm||0)<c.comb.minimumToothSpanMm)errors.push(`servo-comb-tooth-${i+1}-undersized`)
  const bay=bays[i];if(!bay||bay.pinCount!==c.comb.connectorPinsPerBay)errors.push(`servo-connector-bay-${i+1}-not-three-pin`)
  if(bay&&Math.abs((bay.centerY??Infinity)-(tooth.centerY??-Infinity))>.5)errors.push(`servo-connector-bay-${i+1}-not-aligned-to-tooth`)
  if(bay&&(bay.minX??-Infinity)<c.placementEnvelopes.servoConnectors.minimumX)errors.push(`servo-connector-bay-${i+1}-not-on-comb-edge`)
  if(bay&&(bay.cableExitDepthMm||0)<c.comb.minimumCableExitDepthMm)errors.push(`servo-connector-bay-${i+1}-cable-exit-obstructed`)
  if(i)pitches.push(tooth.centerY-teeth[i-1].centerY)
 }
 if(pitches.length&&Math.max(...pitches)-Math.min(...pitches)>c.comb.maximumPitchErrorMm)errors.push('servo-comb-pitch-not-uniform')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoles)errors.push('servo-controller-mounting-holes-missing')
 for(const [i,hole]of holes.entries())if(hole.diameterMm<c.mounting.minimumHoleDiameterMm||hole.keepoutRadiusMm<c.mounting.minimumKeepoutRadiusMm||hole.allLayersKeepout!==true)errors.push(`servo-mounting-hole-${i+1}-keepout-unverified`)
 const p=evidence.placements||{},e=c.placementEnvelopes
 requireRange(p.logic,'servo-logic',e.logic,errors);requireRange(p.signalBuffer,'servo-signal-buffer',e.signalBuffer,errors);requireRange(p.servoPowerSpine,'servo-power-spine',e.servoPowerSpine,errors)
 if(!p.powerInput||(p.powerInput.maxX??Infinity)>e.powerInput.maximumX)errors.push('servo-power-input-not-on-opposite-edge')
 if(evidence.powerSpineCopperWidthVerified!==true)errors.push('servo-power-spine-current-capacity-unverified')
 if(evidence.bulkCapacitorAdjacentToComb!==true)errors.push('servo-bulk-capacitor-not-adjacent-to-comb')
 if(evidence.logicPowerDomainSeparated!==true)errors.push('servo-logic-power-domain-separation-unverified')
 return{schema:'boardforge.phase2c.servo-controller-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
