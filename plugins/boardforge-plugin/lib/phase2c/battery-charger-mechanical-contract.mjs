export const BATTERY_CHARGER_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.battery-charger-mechanical-contract.v1',boardId:'020_BATTERY_CHARGER',outlineFamily:'thermal tab-battery-charger',maximumAreaMm2:1950,bodyEnvelope:Object.freeze({minWidthMm:42,maxWidthMm:50,minHeightMm:30,maxHeightMm:36}),thermalTab:Object.freeze({minimumProjectionMm:3,minimumSpanMm:10,minimumFastenerDiameterMm:3,minimumKeepoutRadiusMm:3,minimumCopperAreaMm2:45,minimumThermalVias:8}),placement:Object.freeze({sourceMaximumXmm:6,batteryMinimumXmm:40,powerStageMinXmm:14,powerStageMaxXmm:32,maximumStageToTabRootMm:5,minimumNtcToPowerStageMm:10})})

export function validateBatteryChargerMechanicalGeometry(evidence={}){
 const c=BATTERY_CHARGER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{},tab=evidence.thermalTab||{}
 if(outline.length<8||evidence.outlineClosed!==true)errors.push('battery-charger-thermal-tab-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('battery-charger-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('battery-charger-body-envelope-invalid')
 if((tab.projectionMm||0)<c.thermalTab.minimumProjectionMm||(tab.spanMm||0)<c.thermalTab.minimumSpanMm)errors.push('battery-charger-thermal-tab-undersized')
 if(!tab.fastener||tab.fastener.diameterMm<c.thermalTab.minimumFastenerDiameterMm)errors.push('battery-charger-tab-fastener-missing')
 if((tab.fastener?.keepoutRadiusMm||0)<c.thermalTab.minimumKeepoutRadiusMm||tab.fastener?.allLayersKeepout!==true)errors.push('battery-charger-tab-fastener-keepout-unverified')
 if((tab.copperAreaMm2||0)<c.thermalTab.minimumCopperAreaMm2||(tab.thermalViaCount||0)<c.thermalTab.minimumThermalVias||tab.allCopperLayersTied!==true)errors.push('battery-charger-tab-thermal-path-unverified')
 const p=evidence.placements||{}
 if(!p.sourceInput||(p.sourceInput.maxX??Infinity)>c.placement.sourceMaximumXmm)errors.push('battery-charger-source-not-on-left-edge')
 if(!p.batteryConnector||(p.batteryConnector.minX??-Infinity)<c.placement.batteryMinimumXmm)errors.push('battery-charger-battery-not-on-right-edge')
 if(!p.powerStage||p.powerStage.minX<c.placement.powerStageMinXmm||p.powerStage.maxX>c.placement.powerStageMaxXmm)errors.push('battery-charger-power-stage-outside-tab-zone')
 if(evidence.powerStageToTabRootMm>c.placement.maximumStageToTabRootMm||!Number.isFinite(evidence.powerStageToTabRootMm))errors.push('battery-charger-power-stage-too-far-from-tab')
 if(evidence.ntcToPowerStageMm<c.placement.minimumNtcToPowerStageMm||!Number.isFinite(evidence.ntcToPowerStageMm)||p.ntcConnector?.batteryContactVerified!==true)errors.push('battery-charger-temperature-sense-placement-invalid')
 if(evidence.highCurrentPathCapacityVerified!==true)errors.push('battery-charger-current-path-capacity-unverified')
 if(evidence.switchNodeKeepoutVerified!==true)errors.push('battery-charger-switch-node-keepout-unverified')
 if(evidence.packVoltagePrimarySourceVerified!==true||evidence.thermalModelPrimarySourceVerified!==true)errors.push('battery-charger-source-backed-design-evidence-missing')
 if(evidence.connectorPolarityKeyingVerified!==true)errors.push('battery-charger-connector-keying-unverified')
 return{schema:'boardforge.phase2c.battery-charger-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
