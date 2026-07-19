export const AGRICULTURE_NODE_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.agriculture-node-mechanical-contract.v1',boardId:'032_AGRICULTURE_NODE',outlineFamily:'weatherproof capsule-agriculture-node',maximumAreaMm2:3350,
 capsule:Object.freeze({minimumVertices:12,minimumEdgeRadiusMm:6,maximumWidthMm:76,maximumHeightMm:44}),
 seal:Object.freeze({minimumInsetMm:2}),placement:Object.freeze({probeAndPowerGlandsMaximumXmm:7,antennaMinimumXmm:57,coreMinXmm:16,coreMaxXmm:52}),
 mounting:Object.freeze({minimumBossCount:2,minimumHoleDiameterMm:3,minimumKeepoutRadiusMm:3}),
})

export function validateAgricultureNodeMechanicalGeometry(evidence={}){
 const c=AGRICULTURE_NODE_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),capsule=evidence.capsuleProfile||{}
 if(outline.length<c.capsule.minimumVertices||evidence.outlineClosed!==true)errors.push('weatherproof-capsule-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('agriculture-node-outline-exceeds-maximum-area')
 if(!bounds||bounds.width>c.capsule.maximumWidthMm||bounds.height>c.capsule.maximumHeightMm||(capsule.minimumEdgeRadiusMm||0)<c.capsule.minimumEdgeRadiusMm||capsule.tangentTransitionsVerified!==true)errors.push('weatherproof-capsule-profile-unverified')
 const seal=evidence.sealPath||{}
 if(seal.closedContinuousPathVerified!==true||(seal.minimumOutlineInsetMm||0)<c.seal.minimumInsetMm||seal.enclosureGasketAligned!==true)errors.push('weatherproof-gasket-path-unverified')
 if(seal.noCopperViasComponentsOrSlotsCrossPath!==true||seal.noUnsealedFastenersInsidePath!==true)errors.push('weatherproof-seal-boundary-compromised')
 const p=evidence.placements||{}
 if(!p.probeAndPowerGlands||(p.probeAndPowerGlands.maxX??Infinity)>c.placement.probeAndPowerGlandsMaximumXmm)errors.push('field-glands-not-on-sealed-service-end')
 if(!p.antenna||(p.antenna.minX??-Infinity)<c.placement.antennaMinimumXmm)errors.push('agriculture-antenna-not-on-opposite-capsule-end')
 if(!p.coreElectronics||p.coreElectronics.minX<c.placement.coreMinXmm||p.coreElectronics.maxX>c.placement.coreMaxXmm)errors.push('agriculture-core-outside-sealed-central-envelope')
 const vent=evidence.climateVent||{}
 if(vent.weatherMembraneInterfaceVerified!==true||vent.drainPathVerified!==true||vent.airPathToClimateSensorVerified!==true)errors.push('climate-sensor-weather-vent-unverified')
 if(vent.clearOfSplashLineAndCableGlands!==true)errors.push('climate-vent-placement-unverified')
 const antenna=evidence.antennaKeepout||{}
 if(antenna.allCopperLayers!==true||antenna.noPlanesTracksOrVias!==true||antenna.noMetalBatteryOrFastenersInFieldRegion!==true||antenna.enclosureWindowVerified!==true)errors.push('agriculture-antenna-keepout-unverified')
 if(evidence.cableAndProbeStrain?.glandRetentionVerified!==true||evidence.cableAndProbeStrain?.loadPathClearOfSealAndComponents!==true)errors.push('agriculture-gland-strain-path-unverified')
 const bosses=evidence.mountingBosses||[]
 if(bosses.length<c.mounting.minimumBossCount)errors.push('agriculture-node-mounting-bosses-missing')
 for(const [i,b]of bosses.entries()){
  if((b.holeDiameterMm||0)<c.mounting.minimumHoleDiameterMm||!pointInPolygon([b.x,b.y],outline))errors.push(`mounting-boss-${i+1}-invalid`)
  if((b.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||b.allLayersKeepout!==true||b.sealedBossInterfaceVerified!==true)errors.push(`mounting-boss-${i+1}-seal-keepout-unverified`)
  if(b.inAntennaOrVentRegion===true)errors.push(`mounting-boss-${i+1}-intrudes-functional-end`)
 }
 return{schema:'boardforge.phase2c.agriculture-node-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
