export const GPS_IMU_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.gps-imu-mechanical-contract.v1',boardId:'022_GPS_IMU',outlineFamily:'rf keepout nose-gps-imu',maximumAreaMm2:2650,
 body:Object.freeze({maximumXmm:42}),nose:Object.freeze({minimumProjectionMm:8,minimumSpanMm:10}),
 placementEnvelopes:Object.freeze({rearConnectors:Object.freeze({maximumXmm:6}),imu:Object.freeze({minX:15,maxX:27,minY:7,maxY:17}),gnssReceiver:Object.freeze({minX:30,maxX:42}),antenna:Object.freeze({minimumXmm:42})}),
 separation:Object.freeze({minimumImuToNoisyCircuitMm:8,minimumAntennaToNoisyCircuitMm:10}),
 mounting:Object.freeze({minimumHoleCount:2,minimumHoleDiameterMm:2.5,minimumCopperKeepoutRadiusMm:2.5}),
})

export function validateGpsImuMechanicalGeometry(evidence={}){
 const c=GPS_IMU_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<8||evidence.outlineClosed!==true)errors.push('rf-nose-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('gps-imu-outline-exceeds-maximum-area')
 const nose=evidence.rfNose||{}
 if((nose.projectionMm||0)<c.nose.minimumProjectionMm||(nose.spanMm||0)<c.nose.minimumSpanMm||nose.edgeCutsVerified!==true)errors.push('purposeful-rf-nose-unverified')
 const keepout=evidence.antennaKeepout||{}
 if(keepout.allCopperLayers!==true||keepout.noPlanesTracksOrVias!==true||keepout.noComponentsExceptFeedAndMatching!==true)errors.push('antenna-all-layer-keepout-unverified')
 if(keepout.skyViewClear!==true||keepout.enclosureClearanceVerified!==true)errors.push('antenna-sky-view-unverified')
 const p=evidence.placements||{},e=c.placementEnvelopes
 requireRange(p.imu,'imu',e.imu,errors);requireRange(p.gnssReceiver,'gnss-receiver',e.gnssReceiver,errors)
 if(!p.antenna||(p.antenna.minX??-Infinity)<e.antenna.minimumXmm)errors.push('antenna-not-in-rf-nose')
 if(!p.rearConnectors||(p.rearConnectors.maxX??Infinity)>e.rearConnectors.maximumXmm)errors.push('connectors-not-opposite-rf-nose')
 if(evidence.connectorCableExitClearOfSkyView!==true)errors.push('connector-cable-exit-sky-view-unverified')
 const imu=evidence.imuDatum||{}
 if(imu.axisDatumRecorded!==true||imu.rotationRecorded!==true||imu.mechanicalCenterVerified!==true)errors.push('imu-axis-and-center-datum-unverified')
 const separation=evidence.separation||{}
 if((separation.imuToNoisyCircuitMm||0)<c.separation.minimumImuToNoisyCircuitMm)errors.push('imu-noisy-circuit-separation-insufficient')
 if((separation.antennaToNoisyCircuitMm||0)<c.separation.minimumAntennaToNoisyCircuitMm)errors.push('antenna-noisy-circuit-separation-insufficient')
 if(separation.feedAndMatchingAdjacentToAntenna!==true)errors.push('antenna-feed-placement-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('gps-imu-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumHoleDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumCopperKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`mounting-hole-${i+1}-keepout-unverified`)
  if(h.insideAntennaKeepout===true)errors.push(`mounting-hole-${i+1}-intrudes-antenna-keepout`)
 }
 if(evidence.mountingSymmetricAboutImu!==true)errors.push('mounting-not-symmetric-about-imu')
 return{schema:'boardforge.phase2c.gps-imu-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX||p.minY!==undefined&&(p.minY<e.minY||p.maxY>e.maxY))errors.push(`${name}-outside-placement-envelope`)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
