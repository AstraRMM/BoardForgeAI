export const DRONE_PERIPHERAL_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.drone-peripheral-mechanical-contract.v1',boardId:'021_DRONE_PERIPHERAL',outlineFamily:'drone stack-drone-peripheral',maximumAreaMm2:2300,outline:Object.freeze({minWidthMm:40,maxWidthMm:48,minHeightMm:40,maxHeightMm:48,maximumAspectRatio:1.1,minimumClippedCorners:4}),mounting:Object.freeze({holeCount:4,maximumSquarePitchErrorMm:.25,minimumHoleDiameterMm:3,minimumKeepoutRadiusMm:3}),centerKeepout:Object.freeze({minimumWidthMm:12,minimumHeightMm:12}),connectors:Object.freeze({minimumEdgeGroups:3,minimumCableExitDepthMm:8})})

export function validateDronePeripheralMechanicalGeometry(evidence={}){
 const c=DRONE_PERIPHERAL_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<8||evidence.outlineClosed!==true)errors.push('drone-stack-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('drone-stack-outline-exceeds-maximum-area')
 if(bounds){const aspect=Math.max(bounds.width,bounds.height)/Math.min(bounds.width,bounds.height);if(bounds.width<c.outline.minWidthMm||bounds.width>c.outline.maxWidthMm||bounds.height<c.outline.minHeightMm||bounds.height>c.outline.maxHeightMm||aspect>c.outline.maximumAspectRatio)errors.push('drone-stack-envelope-invalid')}
 if((evidence.clippedCornerCount||0)<c.outline.minimumClippedCorners)errors.push('drone-stack-corner-clearance-incomplete')
 const holes=evidence.mountingHoles||[]
 if(holes.length!==c.mounting.holeCount)errors.push('drone-stack-four-hole-pattern-required')
 if(evidence.mountingPatternPrimarySourceVerified!==true)errors.push('drone-stack-mounting-datum-unverified')
 if(holes.length===4){const xs=[...new Set(holes.map(h=>h.x))].sort((a,b)=>a-b),ys=[...new Set(holes.map(h=>h.y))].sort((a,b)=>a-b);if(xs.length!==2||ys.length!==2||Math.abs((xs[1]-xs[0])-(ys[1]-ys[0]))>c.mounting.maximumSquarePitchErrorMm||!holes.every(h=>xs.includes(h.x)&&ys.includes(h.y)))errors.push('drone-stack-hole-pattern-not-square')}
 for(const [i,h]of holes.entries())if(h.diameterMm<c.mounting.minimumHoleDiameterMm||h.keepoutRadiusMm<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`drone-stack-hole-${i+1}-keepout-unverified`)
 const keepout=evidence.centerKeepout||{}
 if(keepout.widthMm<c.centerKeepout.minimumWidthMm||keepout.heightMm<c.centerKeepout.minimumHeightMm||keepout.allLayersAndCourtyard!==true)errors.push('drone-stack-center-keepout-unverified')
 const groups=evidence.edgeConnectorGroups||[]
 if(groups.length<c.connectors.minimumEdgeGroups)errors.push('drone-stack-edge-connector-groups-insufficient')
 if(new Set(groups.map(g=>g.edge)).size<3)errors.push('drone-stack-connectors-not-distributed-across-edges')
 for(const [i,g]of groups.entries())if((g.cableExitDepthMm||0)<c.connectors.minimumCableExitDepthMm||g.serviceAccessVerified!==true)errors.push(`drone-stack-connector-group-${i+1}-access-obstructed`)
 if(evidence.powerEntryEdgeSeparatedFromSensitiveSignals!==true)errors.push('drone-stack-power-signal-edge-separation-unverified')
 if(evidence.undersideHeightEnvelopeVerified!==true||evidence.topsidePropClearanceVerified!==true)errors.push('drone-stack-vertical-envelope-unverified')
 if(evidence.vibrationRetentionVerified!==true)errors.push('drone-stack-vibration-retention-unverified')
 return{schema:'boardforge.phase2c.drone-peripheral-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
