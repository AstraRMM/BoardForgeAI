export const BATTERY_BMS_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.battery-bms-mechanical-contract.v1',boardId:'019_BATTERY_BMS',outlineFamily:'pack matched-battery-bms',maximumAreaMm2:1600,bodyEnvelope:Object.freeze({minWidthMm:50,maxWidthMm:60,minHeightMm:18,maxHeightMm:26}),registration:Object.freeze({minimumKeyedReliefs:2,minimumReliefDepthMm:1.5,minimumReliefWidthMm:6}),terminals:Object.freeze({negativeMaximumXmm:6,positiveMinimumXmm:50,minimumEdgeClearanceMm:1}),placement:Object.freeze({switchAndShuntMaximumXmm:18,balanceConnectorMinXmm:20,balanceConnectorMaxXmm:38,monitorMinXmm:18,monitorMaxXmm:40}),thermal:Object.freeze({minimumSwitchCopperAreaMm2:45,minimumShuntCopperAreaMm2:30,minimumThermalVias:6})})

export function validateBatteryBmsMechanicalGeometry(evidence={}){
 const c=BATTERY_BMS_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{}
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('bms-pack-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('bms-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('bms-pack-body-envelope-invalid')
 if(evidence.packMechanicalDrawingVerified!==true||evidence.packDatumToleranceVerified!==true)errors.push('bms-pack-datum-unverified')
 const reliefs=evidence.registrationReliefs||[]
 if(reliefs.length<c.registration.minimumKeyedReliefs)errors.push('bms-pack-registration-reliefs-missing')
 for(const [i,r]of reliefs.entries())if((r.depthMm||0)<c.registration.minimumReliefDepthMm||(r.widthMm||0)<c.registration.minimumReliefWidthMm)errors.push(`bms-registration-relief-${i+1}-undersized`)
 const terminals=evidence.currentTerminals||{}
 if(!terminals.negative||(terminals.negative.maxX??Infinity)>c.terminals.negativeMaximumXmm)errors.push('bms-negative-terminal-not-on-left-edge')
 if(!terminals.positive||(terminals.positive.minX??-Infinity)<c.terminals.positiveMinimumXmm)errors.push('bms-positive-terminal-not-on-right-edge')
 if(terminals.edgeClearanceMm<c.terminals.minimumEdgeClearanceMm||terminals.edgeKeepoutVerified!==true)errors.push('bms-current-terminal-edge-keepout-unverified')
 const cellCount=evidence.cellCount,balance=evidence.balanceConnector||{}
 if(!Number.isInteger(cellCount)||cellCount<2)errors.push('bms-cell-count-unverified')
 if(balance.pinCount!==cellCount+1)errors.push('bms-balance-connector-pin-count-mismatch')
 if(balance.minX<c.placement.balanceConnectorMinXmm||balance.maxX>c.placement.balanceConnectorMaxXmm||balance.serviceAccessVerified!==true)errors.push('bms-balance-connector-placement-invalid')
 const power=evidence.powerStage||{}
 if(power.maxX>c.placement.switchAndShuntMaximumXmm||(power.switchCopperAreaMm2||0)<c.thermal.minimumSwitchCopperAreaMm2||(power.shuntCopperAreaMm2||0)<c.thermal.minimumShuntCopperAreaMm2||(power.thermalViaCount||0)<c.thermal.minimumThermalVias||power.allCopperLayersTied!==true)errors.push('bms-switch-shunt-thermal-placement-unverified')
 const monitor=evidence.monitorPlacement||{}
 if(monitor.minX<c.placement.monitorMinXmm||monitor.maxX>c.placement.monitorMaxXmm)errors.push('bms-monitor-outside-measurement-zone')
 if((evidence.temperatureSensors||[]).length<2||!evidence.temperatureSensors?.every(sensor=>sensor.packContactVerified===true))errors.push('bms-pack-temperature-sensing-incomplete')
 if(evidence.senseToPowerKeepoutVerified!==true||evidence.packVoltagePrimarySourceVerified!==true)errors.push('bms-sense-power-spacing-unverified')
 if(evidence.cellTabInsulationKeepoutVerified!==true)errors.push('bms-cell-tab-insulation-keepout-unverified')
 return{schema:'boardforge.phase2c.battery-bms-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
