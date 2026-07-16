export const BLDC_CONTROLLER_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.bldc-controller-mechanical-contract.v1',boardId:'016_BLDC_CONTROLLER',outlineFamily:'circular motor mount-bldc-controller',maximumAreaMm2:3350,outline:Object.freeze({minimumVertices:16,maximumAspectRatio:1.1,maximumRadialDeviationFraction:.1,minimumDiameterMm:52,maximumDiameterMm:66}),mounting:Object.freeze({minimumHoles:3,maximumRadiusErrorMm:.5,maximumAngularErrorDeg:3,minimumHoleKeepoutRadiusMm:3}),motorPilot:Object.freeze({minimumBoardKeepoutBeyondPilotMm:2}),threePhase:Object.freeze({count:3,nominalSeparationDeg:120,maximumAngularErrorDeg:8,minimumThermalCopperAreaMm2:45,minimumThermalVias:8}),connectors:Object.freeze({minimumEdgeInsetMm:1,maximumEdgeInsetMm:6})})

export function validateBldcControllerMechanicalGeometry(evidence={}){
 const c=BLDC_CONTROLLER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),center=evidence.center||null
 if(outline.length<c.outline.minimumVertices||evidence.outlineClosed!==true)errors.push('circular-motor-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('bldc-outline-exceeds-maximum-area')
 if(bounds){const diameter=(bounds.width+bounds.height)/2,aspect=Math.max(bounds.width,bounds.height)/Math.min(bounds.width,bounds.height);if(diameter<c.outline.minimumDiameterMm||diameter>c.outline.maximumDiameterMm)errors.push('bldc-outline-diameter-invalid');if(aspect>c.outline.maximumAspectRatio)errors.push('bldc-outline-not-circular')}
 if(!center||radialDeviation(outline,center)>c.outline.maximumRadialDeviationFraction)errors.push('bldc-outline-radial-deviation-excessive')
 const pilot=evidence.motorPilot||{}
 if(!(pilot.diameterMm>0)||pilot.primaryMechanicalDrawingVerified!==true||pilot.nonPlatedCutout!==true)errors.push('motor-pilot-opening-unverified')
 if((pilot.boardKeepoutBeyondPilotMm||0)<c.motorPilot.minimumBoardKeepoutBeyondPilotMm||pilot.allLayersKeepout!==true)errors.push('motor-pilot-keepout-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoles)errors.push('bldc-mounting-pattern-incomplete')
 if(holes.length>=c.mounting.minimumHoles&&center){const radii=holes.map(h=>distance(h,center)),angles=holes.map(h=>angle(h,center)).sort((a,b)=>a-b),ideal=360/holes.length;if(Math.max(...radii)-Math.min(...radii)>c.mounting.maximumRadiusErrorMm)errors.push('bldc-mounting-radius-not-concentric');const gaps=angles.map((a,i)=>(angles[(i+1)%angles.length]-a+360)%360);if(gaps.some(g=>Math.abs(g-ideal)>c.mounting.maximumAngularErrorDeg))errors.push('bldc-mounting-angle-not-symmetric')}
 for(const [i,h]of holes.entries())if((h.keepoutRadiusMm||0)<c.mounting.minimumHoleKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`bldc-mounting-hole-${i+1}-keepout-unverified`)
 validateThreePhase(evidence.powerStages,'power-stage',c,center,errors,true);validateThreePhase(evidence.phaseConnectors,'phase-connector',c,center,errors,false)
 if(!evidence.dcInput||!center||!nearEdge(evidence.dcInput,center,bounds,c.connectors))errors.push('bldc-dc-input-not-on-board-edge')
 if(evidence.controlPlacement?.outsidePilotKeepout!==true||evidence.controlPlacement?.insideMountingPattern!==true)errors.push('bldc-control-placement-invalid')
 if(evidence.highCurrentCopperEdgeClearanceVerified!==true)errors.push('bldc-high-current-edge-clearance-unverified')
 return{schema:'boardforge.phase2c.bldc-controller-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function validateThreePhase(rows,name,c,center,errors,thermal){if(!Array.isArray(rows)||rows.length!==c.threePhase.count){errors.push(`bldc-${name}-count-invalid`);return}if(center){const angles=rows.map(row=>angle(row,center)).sort((a,b)=>a-b),gaps=angles.map((a,i)=>(angles[(i+1)%3]-a+360)%360);if(gaps.some(g=>Math.abs(g-c.threePhase.nominalSeparationDeg)>c.threePhase.maximumAngularErrorDeg))errors.push(`bldc-${name}-angular-spacing-invalid`)}if(thermal)for(const [i,row]of rows.entries())if((row.thermalCopperAreaMm2||0)<c.threePhase.minimumThermalCopperAreaMm2||(row.thermalViaCount||0)<c.threePhase.minimumThermalVias||row.allCopperLayersTied!==true)errors.push(`bldc-power-stage-${i+1}-thermal-path-unverified`)}
function nearEdge(p,center,bounds,c){const radius=Math.min(bounds.width,bounds.height)/2,d=distance(p,center),inset=radius-d;return inset>=c.minimumEdgeInsetMm&&inset<=c.maximumEdgeInsetMm}
function radialDeviation(points,center){if(!points.length)return Infinity;const r=points.map(p=>distance({x:p[0],y:p[1]},center)),mean=r.reduce((a,b)=>a+b,0)/r.length;return(Math.max(...r)-Math.min(...r))/mean}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}function angle(a,b){return(Math.atan2(a.y-b.y,a.x-b.x)*180/Math.PI+360)%360}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
