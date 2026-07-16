export const INDUSTRIAL_SENSOR_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.industrial-sensor-mechanical-contract.v1',boardId:'031_INDUSTRIAL_SENSOR',outlineFamily:'probe neck-industrial-sensor',maximumAreaMm2:3000,
 probeNeck:Object.freeze({minimumProjectionMm:12,minimumUsableLengthMm:10,minimumWidthMm:8,maximumWidthMm:12,minimumShoulderMm:10}),
 placement:Object.freeze({probeMinimumXmm:51,analogFrontEndMinXmm:36,analogFrontEndMaxXmm:50,fieldConnectorMaximumXmm:7}),
 separation:Object.freeze({minimumProbeToHeatSourceMm:10}),mounting:Object.freeze({minimumHoleCount:2,minimumDiameterMm:3,minimumKeepoutRadiusMm:3}),
})

export function validateIndustrialSensorMechanicalGeometry(evidence={}){
 const c=INDUSTRIAL_SENSOR_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('probe-neck-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('industrial-sensor-outline-exceeds-maximum-area')
 const neck=evidence.probeNeck||{}
 if((neck.projectionMm||0)<c.probeNeck.minimumProjectionMm||(neck.usableLengthMm||0)<c.probeNeck.minimumUsableLengthMm||(neck.widthMm||0)<c.probeNeck.minimumWidthMm||(neck.widthMm??Infinity)>c.probeNeck.maximumWidthMm||(neck.topShoulderMm||0)<c.probeNeck.minimumShoulderMm||(neck.bottomShoulderMm||0)<c.probeNeck.minimumShoulderMm||neck.edgeCutsVerified!==true)errors.push('purposeful-probe-neck-unverified')
 if(neck.enclosureSealBoundaryVerified!==true||neck.insertionAndRemovalClearanceVerified!==true)errors.push('probe-neck-enclosure-interface-unverified')
 const p=evidence.placements||{}
 if(!p.probe||(p.probe.minX??-Infinity)<c.placement.probeMinimumXmm)errors.push('sensing-probe-not-on-neck')
 if(!p.analogFrontEnd||p.analogFrontEnd.minX<c.placement.analogFrontEndMinXmm||p.analogFrontEnd.maxX>c.placement.analogFrontEndMaxXmm)errors.push('analog-front-end-not-at-probe-root')
 if(!p.fieldConnector||(p.fieldConnector.maxX??Infinity)>c.placement.fieldConnectorMaximumXmm)errors.push('field-connector-not-opposite-probe-neck')
 const probe=evidence.probeEnvironment||{}
 if(probe.sensingSurfaceExposedAsRequired!==true||probe.noTallPartsBlockMediumFlow!==true||probe.cleanableClearanceVerified!==true)errors.push('probe-sensing-environment-unverified')
 if(probe.guardAndCopperBoundaryVerified!==true||probe.noMountMetalInSensingZone!==true)errors.push('probe-electromechanical-guard-unverified')
 const separation=evidence.separation||{}
 if((separation.probeToHeatSourceMm||0)<c.separation.minimumProbeToHeatSourceMm||separation.noHeatSpreadingCopperIntoNeck!==true)errors.push('probe-thermal-isolation-insufficient')
 if(separation.fieldCableStrainClearOfProbe!==true)errors.push('field-cable-strain-path-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('industrial-sensor-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true||h.ruggedStandoffClearanceVerified!==true)errors.push(`mounting-hole-${i+1}-rugged-keepout-unverified`)
  if(h.onProbeNeck===true)errors.push(`mounting-hole-${i+1}-intrudes-probe-neck`)
 }
 return{schema:'boardforge.phase2c.industrial-sensor-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
