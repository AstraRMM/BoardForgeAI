export const ENVIRONMENTAL_LOGGER_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.environmental-logger-mechanical-contract.v1',boardId:'023_ENVIRONMENTAL_LOGGER',outlineFamily:'vented enclosure-environmental-logger',maximumAreaMm2:3000,
 ventedChamber:Object.freeze({minimumProjectionMm:8,minimumSpanMm:20,minimumOpeningCount:3,minimumTotalOpenAreaMm2:30}),
 placementEnvelopes:Object.freeze({environmentalSensors:Object.freeze({minX:56,maxX:64}),loggerElectronics:Object.freeze({minX:16,maxX:48}),serviceConnector:Object.freeze({maximumX:6})}),
 separation:Object.freeze({minimumSensorToHeatSourceMm:10}),mounting:Object.freeze({minimumHoleCount:2,minimumHoleDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
})

export function validateEnvironmentalLoggerMechanicalGeometry(evidence={}){
 const c=ENVIRONMENTAL_LOGGER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('vented-enclosure-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('environmental-logger-outline-exceeds-maximum-area')
 const chamber=evidence.ventedChamber||{}
 if((chamber.projectionMm||0)<c.ventedChamber.minimumProjectionMm||(chamber.spanMm||0)<c.ventedChamber.minimumSpanMm||chamber.edgeCutsVerified!==true)errors.push('purposeful-vented-chamber-unverified')
 const vents=chamber.openings||[]
 if(vents.length<c.ventedChamber.minimumOpeningCount||sum(vents,'openAreaMm2')<c.ventedChamber.minimumTotalOpenAreaMm2||vents.some(v=>v.edgeCutsVerified!==true))errors.push('environmental-vent-openings-insufficient')
 if(chamber.airPathToSensorsVerified!==true||chamber.drainAndCondensationPathVerified!==true)errors.push('sensor-chamber-air-and-drain-path-unverified')
 if(chamber.enclosureVentAlignmentVerified!==true||chamber.weatherShieldClearanceVerified!==true)errors.push('sensor-chamber-enclosure-interface-unverified')
 const p=evidence.placements||{},e=c.placementEnvelopes
 requireRange(p.environmentalSensors,'environmental-sensors',e.environmentalSensors,errors);requireRange(p.loggerElectronics,'logger-electronics',e.loggerElectronics,errors)
 if(!p.serviceConnector||(p.serviceConnector.maxX??Infinity)>e.serviceConnector.maximumX)errors.push('service-connector-not-opposite-vented-chamber')
 const separation=evidence.separation||{}
 if((separation.sensorToHeatSourceMm||0)<c.separation.minimumSensorToHeatSourceMm)errors.push('sensor-heat-source-separation-insufficient')
 if(separation.noHeatSpreadingCopperIntoChamber!==true)errors.push('sensor-chamber-thermal-isolation-unverified')
 if(separation.sensorAirflowNotBlockedByTallParts!==true)errors.push('sensor-airflow-component-clearance-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('environmental-logger-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumHoleDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`mounting-hole-${i+1}-keepout-unverified`)
  if(h.blocksVentOrDrain===true)errors.push(`mounting-hole-${i+1}-blocks-environmental-path`)
 }
 if(evidence.serviceAccessClearOfVents!==true)errors.push('service-access-vent-clearance-unverified')
 return{schema:'boardforge.phase2c.environmental-logger-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function requireRange(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function sum(a,key){return a.reduce((total,x)=>total+(Number(x[key])||0),0)}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
