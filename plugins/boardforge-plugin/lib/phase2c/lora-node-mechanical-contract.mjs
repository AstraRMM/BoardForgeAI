export const LORA_NODE_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.lora-node-mechanical-contract.v1',boardId:'024_LORA_NODE',outlineFamily:'antenna tail-lora-node',maximumAreaMm2:3350,
 antennaTail:Object.freeze({minimumProjectionMm:18,minimumUsableLengthMm:16,minimumWidthMm:10,maximumNeckWidthMm:14}),
 placementEnvelopes:Object.freeze({antenna:Object.freeze({minimumXmm:50}),radio:Object.freeze({minX:34,maxX:48}),serviceAndPower:Object.freeze({maximumXmm:7})}),
 separation:Object.freeze({minimumAntennaToNoisyCircuitMm:12}),mounting:Object.freeze({minimumHoleCount:2,minimumHoleDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
})

export function validateLoraNodeMechanicalGeometry(evidence={}){
 const c=LORA_NODE_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('antenna-tail-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('lora-node-outline-exceeds-maximum-area')
 const tail=evidence.antennaTail||{}
 if((tail.projectionMm||0)<c.antennaTail.minimumProjectionMm||(tail.usableLengthMm||0)<c.antennaTail.minimumUsableLengthMm||(tail.widthMm||0)<c.antennaTail.minimumWidthMm||(tail.neckWidthMm??Infinity)>c.antennaTail.maximumNeckWidthMm||tail.edgeCutsVerified!==true)errors.push('purposeful-antenna-tail-unverified')
 const keepout=evidence.antennaKeepout||{}
 if(keepout.tailCoverageVerified!==true||keepout.allCopperLayers!==true||keepout.noPlanesTracksOrVias!==true||keepout.noComponentsExceptFeedAndMatching!==true)errors.push('lora-antenna-all-layer-keepout-unverified')
 if(keepout.enclosureClearanceVerified!==true||keepout.noMetalOrBatteryInFieldRegion!==true)errors.push('lora-antenna-field-clearance-unverified')
 const p=evidence.placements||{},e=c.placementEnvelopes
 if(!p.antenna||(p.antenna.minX??-Infinity)<e.antenna.minimumXmm)errors.push('lora-antenna-not-in-tail')
 requireRange(p.radio,'lora-radio',e.radio,errors)
 if(!p.serviceAndPower||(p.serviceAndPower.maxX??Infinity)>e.serviceAndPower.maximumXmm)errors.push('service-and-power-not-opposite-antenna-tail')
 const feed=evidence.rfFeed||{}
 if(feed.adjacentRadioMatchingAndAntenna!==true||feed.staysOutsideUnrelatedCircuitry!==true)errors.push('lora-rf-feed-placement-unverified')
 const separation=evidence.separation||{}
 if((separation.antennaToNoisyCircuitMm||0)<c.separation.minimumAntennaToNoisyCircuitMm)errors.push('lora-antenna-noisy-circuit-separation-insufficient')
 if(separation.cableAndEnclosureClearOfAntennaField!==true)errors.push('lora-cable-and-enclosure-clearance-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('lora-node-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumHoleDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`mounting-hole-${i+1}-keepout-unverified`)
  if(h.inAntennaTail===true)errors.push(`mounting-hole-${i+1}-intrudes-antenna-tail`)
 }
 return{schema:'boardforge.phase2c.lora-node-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
