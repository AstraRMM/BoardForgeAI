export const DATA_LOGGER_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.data-logger-mechanical-contract.v1',boardId:'028_DATA_LOGGER',outlineFamily:'card notch-data-logger',maximumAreaMm2:1950,
 cardNotch:Object.freeze({minimumWidthMm:12,minimumDepthMm:5}),cardBay:Object.freeze({minimumInsertionClearanceMm:8}),
 placement:Object.freeze({cardSocketMinimumYmm:24,acquisitionMaximumYmm:20,serviceMaximumYmm:6}),
 mounting:Object.freeze({minimumHoleCount:2,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
})

export function validateDataLoggerMechanicalGeometry(evidence={}){
 const c=DATA_LOGGER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<8||evidence.outlineClosed!==true)errors.push('card-notch-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('data-logger-outline-exceeds-maximum-area')
 const notch=evidence.cardNotch||{}
 if((notch.widthMm||0)<c.cardNotch.minimumWidthMm||(notch.depthMm||0)<c.cardNotch.minimumDepthMm||notch.inwardCutoutVerified!==true||notch.edgeCutsVerified!==true)errors.push('purposeful-card-notch-unverified')
 if(notch.centeredOnCardBay!==true||notch.fingerAccessVerified!==true)errors.push('card-notch-access-unverified')
 const bay=evidence.cardBay||{}
 if((bay.insertionClearanceMm||0)<c.cardBay.minimumInsertionClearanceMm||bay.cardEnvelopeVerified!==true||bay.insertionAxisClear!==true)errors.push('removable-card-insertion-envelope-unverified')
 if(bay.retentionAndEjectTravelVerified!==true||bay.enclosureOpeningAligned!==true)errors.push('removable-card-retention-interface-unverified')
 const p=evidence.placements||{}
 if(!p.cardSocket||(p.cardSocket.minY??-Infinity)<c.placement.cardSocketMinimumYmm)errors.push('card-socket-not-at-notched-edge')
 if(!p.acquisitionChannels||(p.acquisitionChannels.maxY??Infinity)>c.placement.acquisitionMaximumYmm)errors.push('acquisition-channels-in-card-service-zone')
 if(!p.serviceAndPower||(p.serviceAndPower.maxY??Infinity)>c.placement.serviceMaximumYmm)errors.push('service-and-power-not-opposite-card-edge')
 if(evidence.cardKeepout?.topAndBottomAssemblyClear!==true||evidence.cardKeepout?.noTallPartsInExtractionPath!==true)errors.push('card-extraction-keepout-unverified')
 if(evidence.channelCableExit?.clearOfCardPath!==true||evidence.channelCableExit?.strainReliefVerified!==true)errors.push('logger-channel-cable-exit-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('data-logger-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`mounting-hole-${i+1}-keepout-unverified`)
  if(h.inCardInsertionPath===true)errors.push(`mounting-hole-${i+1}-intrudes-card-path`)
 }
 return{schema:'boardforge.phase2c.data-logger-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
