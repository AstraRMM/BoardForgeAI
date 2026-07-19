export const ETHERNET_GATEWAY_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.ethernet-gateway-mechanical-contract.v1',boardId:'027_ETHERNET_GATEWAY',outlineFamily:'dual-port notch-ethernet-gateway',maximumAreaMm2:1600,
 portNotches:Object.freeze({requiredCount:2,minimumWidthMm:6,minimumDepthMm:5,minimumCenterSpacingMm:12}),
 placement:Object.freeze({portEdgeMinimumYmm:24,gatewayLogicMaximumYmm:18,serviceEdgeMaximumYmm:5}),
 mounting:Object.freeze({minimumHoleCount:2,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
})

export function validateEthernetGatewayMechanicalGeometry(evidence={}){
 const c=ETHERNET_GATEWAY_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<12||evidence.outlineClosed!==true)errors.push('dual-port-notch-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('ethernet-gateway-outline-exceeds-maximum-area')
 const notches=evidence.portNotches||[]
 if(notches.length!==c.portNotches.requiredCount)errors.push('dual-port-notch-count-invalid')
 for(const [i,n]of notches.entries()){
  if((n.widthMm||0)<c.portNotches.minimumWidthMm||(n.depthMm||0)<c.portNotches.minimumDepthMm||n.edgeCutsVerified!==true)errors.push(`port-notch-${i+1}-geometry-invalid`)
  if(n.connectorAligned!==true||n.shellAndLatchClearanceVerified!==true)errors.push(`port-notch-${i+1}-connector-clearance-unverified`)
 }
 if(notches.length===2&&Math.abs((notches[1].centerXmm??0)-(notches[0].centerXmm??0))<c.portNotches.minimumCenterSpacingMm)errors.push('ethernet-port-spacing-insufficient')
 if(evidence.notchesSymmetricAboutBoardCenter!==true)errors.push('dual-port-notch-symmetry-unverified')
 const p=evidence.placements||{}
 if(!Array.isArray(p.ethernetPorts)||p.ethernetPorts.length!==2||p.ethernetPorts.some(x=>(x.minY??-Infinity)<c.placement.portEdgeMinimumYmm))errors.push('ethernet-ports-not-in-notched-edge-bays')
 if(!Array.isArray(p.portInterfaceBlocks)||p.portInterfaceBlocks.length!==2||p.portInterfaceBlocks.some(x=>x.immediatelyBehindPort!==true))errors.push('ethernet-port-interface-placement-unverified')
 if(!p.gatewayLogic||(p.gatewayLogic.maxY??Infinity)>c.placement.gatewayLogicMaximumYmm)errors.push('gateway-logic-not-behind-port-interface-row')
 if(!p.serviceAndPower||(p.serviceAndPower.maxY??Infinity)>c.placement.serviceEdgeMaximumYmm)errors.push('service-and-power-not-opposite-port-edge')
 if(evidence.cableExit?.independentPathsVerified!==true||evidence.cableExit?.noLatchInterference!==true)errors.push('dual-port-cable-exit-unverified')
 if(evidence.connectorLoadPath?.clearOfComponents!==true||evidence.connectorLoadPath?.enclosureSupportVerified!==true)errors.push('ethernet-connector-load-path-unverified')
 const holes=evidence.mountingHoles||[]
 if(holes.length<c.mounting.minimumHoleCount)errors.push('ethernet-gateway-mounting-holes-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`mounting-hole-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`mounting-hole-${i+1}-keepout-unverified`)
  if(h.inConnectorLoadPath===true)errors.push(`mounting-hole-${i+1}-interferes-connector-load-path`)
 }
 return{schema:'boardforge.phase2c.ethernet-gateway-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
