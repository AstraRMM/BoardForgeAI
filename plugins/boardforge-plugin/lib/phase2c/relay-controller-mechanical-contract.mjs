export const RELAY_CONTROLLER_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.relay-controller-mechanical-contract.v1',boardId:'013_RELAY_CONTROLLER',outlineFamily:'terminal ears-relay-controller',maximumAreaMm2:2300,
 bodyEnvelope:Object.freeze({minWidthMm:52,maxWidthMm:58,minHeightMm:32,maxHeightMm:38}),
 ears:Object.freeze({minimumCount:2,minimumProjectionMm:3,minimumLengthMm:8,mountingHoleRequired:true,minimumHoleDiameterMm:3,minimumCopperKeepoutRadiusMm:3}),
 placementEnvelopes:Object.freeze({logic:Object.freeze({minX:7,maxX:28}),relayDrivers:Object.freeze({minX:27,maxX:39}),relayBank:Object.freeze({minX:37,maxX:53}),fieldTerminals:Object.freeze({minimumX:52}),powerInput:Object.freeze({maximumX:6})}),
 domainSeparation:Object.freeze({minimumLogicToContactClearanceMm:3.2,allLayersKeepoutRequired:true}),
})

export function validateRelayControllerMechanicalGeometry(evidence={}){
 const c=RELAY_CONTROLLER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{}
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('terminal-ear-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('relay-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('relay-body-envelope-invalid')
 const ears=evidence.ears||[]
 if(ears.length<c.ears.minimumCount)errors.push('terminal-ears-missing')
 for(const [index,ear]of ears.entries()){
   if((ear.projectionMm||0)<c.ears.minimumProjectionMm||(ear.lengthMm||0)<c.ears.minimumLengthMm)errors.push(`terminal-ear-${index+1}-undersized`)
   if(!ear.hole||ear.hole.diameterMm<c.ears.minimumHoleDiameterMm)errors.push(`terminal-ear-${index+1}-mounting-hole-missing`)
   if((ear.hole?.copperKeepoutRadiusMm||0)<c.ears.minimumCopperKeepoutRadiusMm||ear.hole?.allLayersKeepout!==true)errors.push(`terminal-ear-${index+1}-hole-keepout-unverified`)
   if(ear.hole&&!pointInPolygon([ear.hole.x,ear.hole.y],outline))errors.push(`terminal-ear-${index+1}-hole-outside-outline`)
 }
 const p=evidence.placements||{},e=c.placementEnvelopes
 requireRange(p.logic,'logic',e.logic,errors);requireRange(p.relayDrivers,'relay-drivers',e.relayDrivers,errors);requireRange(p.relayBank,'relay-bank',e.relayBank,errors)
 if(!p.fieldTerminals||(p.fieldTerminals.minX??-Infinity)<e.fieldTerminals.minimumX)errors.push('field-terminals-not-on-output-edge')
 if(!p.powerInput||(p.powerInput.maxX??Infinity)>e.powerInput.maximumX)errors.push('power-input-not-on-opposite-edge')
 const separation=evidence.domainSeparation||{}
 if((separation.logicToContactClearanceMm||0)<c.domainSeparation.minimumLogicToContactClearanceMm)errors.push('logic-to-contact-clearance-insufficient')
 if(separation.allLayersKeepoutVerified!==true)errors.push('logic-to-contact-keepout-unverified')
 if(separation.contactVoltagePrimarySourceVerified!==true)errors.push('relay-contact-voltage-evidence-missing')
 if(evidence.edgeCopperClearanceVerified!==true)errors.push('terminal-ear-edge-copper-clearance-unverified')
 return{schema:'boardforge.phase2c.relay-controller-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
