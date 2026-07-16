export const AUDIO_DSP_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.audio-dsp-mechanical-contract.v1',boardId:'035_AUDIO_DSP',outlineFamily:'rack notch-audio-dsp',maximumAreaMm2:1600,rackNotch:Object.freeze({minimumWidthMm:10,minimumDepthMm:5}),mounting:Object.freeze({requiredHoleCount:2,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5})})

export function validateAudioDspMechanicalGeometry(evidence={}){
 const c=AUDIO_DSP_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),n=evidence.rackNotch||{}
 if(outline.length<8||evidence.outlineClosed!==true)errors.push('rack-notch-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('audio-dsp-outline-exceeds-maximum-area')
 if((n.widthMm||0)<c.rackNotch.minimumWidthMm||(n.depthMm||0)<c.rackNotch.minimumDepthMm||n.inwardCutoutVerified!==true||n.edgeCutsVerified!==true)errors.push('purposeful-rack-notch-unverified')
 if(n.chassisRailAligned!==true||n.insertionToolClearanceVerified!==true)errors.push('rack-notch-chassis-interface-unverified')
 const p=evidence.placements||{}
 if(!Array.isArray(p.audioConnectors)||p.audioConnectors.length<2||p.audioConnectors.some(x=>x.frontPanelAligned!==true))errors.push('audio-connectors-not-front-panel-aligned')
 if(!p.powerAndService||p.powerAndService.rearEdgeAligned!==true)errors.push('audio-power-service-not-rear-aligned')
 if(!p.dspCore||p.dspCore.centralEnvelopeVerified!==true)errors.push('audio-dsp-core-placement-unverified')
 const zones=evidence.signalZones||{}
 if(zones.analogDigitalBoundaryVerified!==true||zones.powerKeptOutOfAnalogConnectorZone!==true||zones.connectorShellClearanceVerified!==true)errors.push('audio-mixed-signal-mechanical-zones-unverified')
 if(evidence.cableExit?.clearOfRackNotchAndFasteners!==true||evidence.assemblyHeight?.rackEnvelopeVerified!==true)errors.push('audio-rack-service-clearance-unverified')
 const holes=evidence.rackMountingHoles||[]
 if(holes.length!==c.mounting.requiredHoleCount)errors.push('audio-rack-mount-count-invalid')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline)||h.chassisDatumAligned!==true)errors.push(`rack-mount-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`rack-mount-${i+1}-keepout-unverified`)
 }
 return{schema:'boardforge.phase2c.audio-dsp-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}
function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
