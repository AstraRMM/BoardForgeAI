export const BLE_BEACON_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.ble-beacon-mechanical-contract.v1',boardId:'025_BLE_BEACON',outlineFamily:'wearable organic-ble-beacon',maximumAreaMm2:900,
 organicProfile:Object.freeze({minimumVertices:12,minimumEdgeRadiusMm:3,maximumWidthMm:38,maximumHeightMm:26}),
 retention:Object.freeze({minimumHoleDiameterMm:3,minimumKeepoutRadiusMm:3}),
 placementEnvelopes:Object.freeze({retention:Object.freeze({maximumXmm:5}),battery:Object.freeze({minX:7,maxX:25}),antenna:Object.freeze({minimumXmm:27})}),
 separation:Object.freeze({minimumAntennaToBatteryMm:5}),
})

export function validateBleBeaconMechanicalGeometry(evidence={}){
 const c=BLE_BEACON_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),profile=evidence.organicProfile||{}
 if(outline.length<c.organicProfile.minimumVertices||evidence.outlineClosed!==true)errors.push('wearable-organic-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('ble-beacon-outline-exceeds-maximum-area')
 if(!bounds||bounds.width>c.organicProfile.maximumWidthMm||bounds.height>c.organicProfile.maximumHeightMm)errors.push('ble-beacon-compact-envelope-invalid')
 if((profile.minimumEdgeRadiusMm||0)<c.organicProfile.minimumEdgeRadiusMm||profile.tangentTransitionsVerified!==true||profile.noAcuteExteriorCorners!==true)errors.push('wearable-organic-edge-treatment-unverified')
 if(profile.skinAndEnclosureClearanceVerified!==true||profile.maximumAssemblyHeightVerified!==true)errors.push('wearable-envelope-clearance-unverified')
 const retention=evidence.retention||{}
 if(retention.centerXmm>c.placementEnvelopes.retention.maximumXmm||(retention.holeDiameterMm||0)<c.retention.minimumHoleDiameterMm||!pointInPolygon([retention.centerXmm,retention.centerYmm],outline))errors.push('wearable-retention-feature-invalid')
 if((retention.copperKeepoutRadiusMm||0)<c.retention.minimumKeepoutRadiusMm||retention.allLayersKeepout!==true||retention.edgeClearanceVerified!==true)errors.push('wearable-retention-keepout-unverified')
 const p=evidence.placements||{},e=c.placementEnvelopes
 requireRange(p.battery,'battery',e.battery,errors)
 if(!p.antenna||(p.antenna.minX??-Infinity)<e.antenna.minimumXmm)errors.push('ble-antenna-not-on-opposite-end')
 const antenna=evidence.antennaKeepout||{}
 if(antenna.allCopperLayers!==true||antenna.noPlanesTracksOrVias!==true||antenna.noComponentsExceptFeedAndMatching!==true||antenna.enclosureAndBodyClearanceVerified!==true)errors.push('ble-antenna-keepout-unverified')
 const separation=evidence.separation||{}
 if((separation.antennaToBatteryMm||0)<c.separation.minimumAntennaToBatteryMm)errors.push('ble-antenna-battery-separation-insufficient')
 if(separation.retentionLoadPathClearOfComponents!==true)errors.push('retention-load-path-component-clearance-unverified')
 if(evidence.serviceAccessWithinEnvelope!==true)errors.push('ble-beacon-service-access-unverified')
 return{schema:'boardforge.phase2c.ble-beacon-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){if(!Number.isFinite(point[0])||!Number.isFinite(point[1]))return false;let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
