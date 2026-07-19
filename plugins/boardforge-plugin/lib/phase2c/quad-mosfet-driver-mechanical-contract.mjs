export const QUAD_MOSFET_DRIVER_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.quad-mosfet-driver-mechanical-contract.v1',boardId:'017_QUAD_MOSFET_DRIVER',outlineFamily:'thermal edge-quad-mosfet-driver',maximumAreaMm2:900,bodyEnvelope:Object.freeze({minWidthMm:32,maxWidthMm:38,minHeightMm:18,maxHeightMm:23}),thermalEdge:Object.freeze({minimumProjectionMm:3,minimumSpanMm:26,channelCount:4,maximumPitchErrorMm:.5,minimumCopperAreaPerChannelMm2:22,minimumViasPerChannel:4}),mounting:Object.freeze({minimumHoles:2,minimumHoleDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),placement:Object.freeze({controlHeaderMaximumXmm:5,powerInputMinimumXmm:31,channelMinimumYmm:14,outputTerminalMaximumYmm:5})})

export function validateQuadMosfetDriverMechanicalGeometry(evidence={}){
 const c=QUAD_MOSFET_DRIVER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{},edge=evidence.thermalEdge||{}
 if(outline.length<8||evidence.outlineClosed!==true)errors.push('quad-switch-thermal-edge-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('quad-switch-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('quad-switch-body-envelope-invalid')
 if((edge.projectionMm||0)<c.thermalEdge.minimumProjectionMm||(edge.spanMm||0)<c.thermalEdge.minimumSpanMm||edge.exposedEdgeVerified!==true)errors.push('quad-switch-thermal-edge-unverified')
 const cells=evidence.channelCells||[],outputs=evidence.outputTerminals||[]
 if(cells.length!==c.thermalEdge.channelCount)errors.push('quad-switch-requires-four-channel-cells')
 if(outputs.length!==cells.length)errors.push('quad-switch-output-terminal-count-mismatch')
 const pitches=[]
 for(const [i,cell]of cells.entries()){
  if((cell.centerY??-Infinity)<c.placement.channelMinimumYmm)errors.push(`quad-switch-channel-${i+1}-not-at-thermal-edge`)
  if((cell.thermalCopperAreaMm2||0)<c.thermalEdge.minimumCopperAreaPerChannelMm2||(cell.thermalViaCount||0)<c.thermalEdge.minimumViasPerChannel||cell.allCopperLayersTied!==true)errors.push(`quad-switch-channel-${i+1}-thermal-path-unverified`)
  const output=outputs[i];if(!output||output.channel!==i+1||(output.maxY??Infinity)>c.placement.outputTerminalMaximumYmm)errors.push(`quad-switch-channel-${i+1}-output-not-on-service-edge`)
  if(i)pitches.push(cell.centerX-cells[i-1].centerX)
 }
 if(pitches.length&&Math.max(...pitches)-Math.min(...pitches)>c.thermalEdge.maximumPitchErrorMm)errors.push('quad-switch-channel-pitch-not-uniform')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoles)errors.push('quad-switch-mounting-holes-missing')
 for(const [i,h]of holes.entries())if(h.diameterMm<c.mounting.minimumHoleDiameterMm||h.keepoutRadiusMm<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`quad-switch-mounting-hole-${i+1}-keepout-unverified`)
 if(!evidence.controlHeader||(evidence.controlHeader.maxX??Infinity)>c.placement.controlHeaderMaximumXmm)errors.push('quad-switch-control-header-not-on-left-edge')
 if(!evidence.powerInput||(evidence.powerInput.minX??-Infinity)<c.placement.powerInputMinimumXmm)errors.push('quad-switch-power-input-not-on-right-edge')
 if(evidence.logicToSwitchNodeKeepoutVerified!==true)errors.push('quad-switch-logic-switch-node-keepout-unverified')
 if(evidence.sharedPowerBusCurrentCapacityVerified!==true)errors.push('quad-switch-power-bus-capacity-unverified')
 if(evidence.perChannelProtectionPlacementVerified!==true)errors.push('quad-switch-channel-protection-placement-unverified')
 return{schema:'boardforge.phase2c.quad-mosfet-driver-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
