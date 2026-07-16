export const WIFI_GATEWAY_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.wifi-gateway-mechanical-contract.v1',boardId:'026_WIFI_GATEWAY',outlineFamily:'antenna wing-wifi-gateway',maximumAreaMm2:1250,
 antennaWing:Object.freeze({minimumProjectionMm:10,minimumSpanMm:10,maximumNeckWidthMm:12}),
 placementEnvelopes:Object.freeze({antenna:Object.freeze({minimumXmm:38}),radio:Object.freeze({minX:28,maxX:37}),gatewayInterface:Object.freeze({minX:9,maxX:27}),connectors:Object.freeze({maximumXmm:6})}),
 separation:Object.freeze({minimumAntennaToNoisyCircuitMm:8}),mounting:Object.freeze({minimumHoleCount:2,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
})

export function validateWifiGatewayMechanicalGeometry(evidence={}){
 const c=WIFI_GATEWAY_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('antenna-wing-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('wifi-gateway-outline-exceeds-maximum-area')
 const wing=evidence.antennaWing||{}
 if((wing.projectionMm||0)<c.antennaWing.minimumProjectionMm||(wing.spanMm||0)<c.antennaWing.minimumSpanMm||(wing.neckWidthMm??Infinity)>c.antennaWing.maximumNeckWidthMm||wing.edgeCutsVerified!==true)errors.push('purposeful-antenna-wing-unverified')
 if(wing.structuralNeckClearanceVerified!==true||wing.enclosureWindowAligned!==true)errors.push('antenna-wing-mechanical-interface-unverified')
 const keepout=evidence.antennaKeepout||{}
 if(keepout.wholeWingVerified!==true||keepout.allCopperLayers!==true||keepout.noPlanesTracksOrVias!==true||keepout.noComponentsExceptFeedAndMatching!==true)errors.push('wifi-antenna-wing-keepout-unverified')
 if(keepout.noMetalFastenersOrCablesInFieldRegion!==true)errors.push('wifi-antenna-field-clearance-unverified')
 const p=evidence.placements||{},e=c.placementEnvelopes
 if(!p.antenna||(p.antenna.minX??-Infinity)<e.antenna.minimumXmm)errors.push('wifi-antenna-not-on-wing')
 requireRange(p.radio,'wifi-radio',e.radio,errors);requireRange(p.gatewayInterface,'gateway-interface',e.gatewayInterface,errors)
 if(!p.connectors||(p.connectors.maxX??Infinity)>e.connectors.maximumXmm)errors.push('gateway-connectors-not-opposite-antenna-wing')
 const rf=evidence.rfTransition||{}
 if(rf.radioMatchingAndAntennaAdjacent!==true||rf.crossesNoConnectorOrPowerCorridor!==true)errors.push('wifi-rf-transition-unverified')
 const separation=evidence.separation||{}
 if((separation.antennaToNoisyCircuitMm||0)<c.separation.minimumAntennaToNoisyCircuitMm)errors.push('wifi-antenna-noisy-circuit-separation-insufficient')
 if(separation.connectorCableExitClearOfWing!==true)errors.push('gateway-cable-exit-wing-clearance-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('wifi-gateway-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`mounting-hole-${i+1}-keepout-unverified`)
  if(h.inAntennaWing===true)errors.push(`mounting-hole-${i+1}-intrudes-antenna-wing`)
 }
 return{schema:'boardforge.phase2c.wifi-gateway-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
