export const LED_MATRIX_CONTROLLER_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.led-matrix-controller-mechanical-contract.v1',boardId:'030_LED_MATRIX_CONTROLLER',outlineFamily:'panel matched-led-matrix-controller',maximumAreaMm2:2650,
 panelPattern:Object.freeze({requiredHoleCount:4,minimumWidthMm:44,minimumHeightMm:24,minimumHoleDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
 sideRelief:Object.freeze({requiredCount:2,minimumDepthMm:4,minimumSpanMm:12}),
 placement:Object.freeze({panelConnectorsMinimumYmm:29,powerInputMaximumXmm:7,logicMinXmm:15,logicMaxXmm:42}),
})

export function validateLedMatrixControllerMechanicalGeometry(evidence={}){
 const c=LED_MATRIX_CONTROLLER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<12||evidence.outlineClosed!==true)errors.push('panel-matched-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('led-matrix-outline-exceeds-maximum-area')
 const panel=evidence.panelDatum||{}
 if(panel.originRecorded!==true||panel.rotationRecorded!==true||panel.enclosureAndDisplayAlignmentVerified!==true)errors.push('matrix-panel-datum-unverified')
 const reliefs=evidence.sideReliefs||[]
 if(reliefs.length<c.sideRelief.requiredCount||reliefs.some(r=>(r.depthMm||0)<c.sideRelief.minimumDepthMm||(r.spanMm||0)<c.sideRelief.minimumSpanMm||r.edgeCutsVerified!==true))errors.push('panel-side-reliefs-unverified')
 if(evidence.reliefsSymmetricAboutPanelCenter!==true)errors.push('panel-side-relief-symmetry-unverified')
 const holes=evidence.panelMountingHoles||[]
 if(holes.length!==c.panelPattern.requiredHoleCount)errors.push('panel-mounting-pattern-count-invalid')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.panelPattern.minimumHoleDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`panel-mount-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.panelPattern.minimumKeepoutRadiusMm||h.allLayersKeepout!==true||h.fastenerAndStandoffClearanceVerified!==true)errors.push(`panel-mount-${i+1}-keepout-unverified`)
 }
 if((panel.patternWidthMm||0)<c.panelPattern.minimumWidthMm||(panel.patternHeightMm||0)<c.panelPattern.minimumHeightMm||panel.holesSymmetricAndRegistered!==true)errors.push('panel-mounting-pattern-unverified')
 const p=evidence.placements||{}
 if(!Array.isArray(p.panelConnectors)||p.panelConnectors.length<2||p.panelConnectors.some(x=>(x.minY??-Infinity)<c.placement.panelConnectorsMinimumYmm))errors.push('matrix-connectors-not-on-panel-edge')
 if(!p.powerInput||(p.powerInput.maxX??Infinity)>c.placement.powerInputMaximumXmm)errors.push('matrix-power-input-not-on-service-edge')
 if(!p.controlLogic||p.controlLogic.minX<c.placement.logicMinXmm||p.controlLogic.maxX>c.placement.logicMaxXmm)errors.push('matrix-control-logic-outside-central-envelope')
 if(evidence.cableExit?.clearOfPanelAndFasteners!==true||evidence.cableExit?.connectorServiceLoopsVerified!==true)errors.push('matrix-cable-exit-unverified')
 const thermal=evidence.thermalAndCurrent||{}
 if(thermal.highCurrentPathClearOfMounts!==true||thermal.heatSourceToPanelClearanceVerified!==true||thermal.enclosureAirflowVerified!==true)errors.push('matrix-high-current-thermal-layout-unverified')
 return{schema:'boardforge.phase2c.led-matrix-controller-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
