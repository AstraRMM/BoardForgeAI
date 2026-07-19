export const CAMERA_TRIGGER_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.camera-trigger-mechanical-contract.v1',boardId:'029_CAMERA_TRIGGER',outlineFamily:'camera mount-camera-trigger',maximumAreaMm2:2300,
 mountTongue:Object.freeze({minimumProjectionMm:10,minimumWidthMm:8,minimumShoulderWidthMm:8}),
 mountSlot:Object.freeze({minimumLengthMm:6,minimumWidthMm:3,minimumKeepoutMm:2.5}),
 placement:Object.freeze({cameraOutputsMinimumYmm:23,controlMaximumYmm:18,serviceMaximumYmm:5}),
 mounting:Object.freeze({minimumAuxiliaryHoleCount:2,minimumDiameterMm:2.5,minimumKeepoutRadiusMm:2.5}),
})

export function validateCameraTriggerMechanicalGeometry(evidence={}){
 const c=CAMERA_TRIGGER_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline)
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('camera-mount-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('camera-trigger-outline-exceeds-maximum-area')
 const tongue=evidence.mountTongue||{}
 if((tongue.projectionMm||0)<c.mountTongue.minimumProjectionMm||(tongue.widthMm||0)<c.mountTongue.minimumWidthMm||(tongue.leftShoulderMm||0)<c.mountTongue.minimumShoulderWidthMm||(tongue.rightShoulderMm||0)<c.mountTongue.minimumShoulderWidthMm||tongue.edgeCutsVerified!==true)errors.push('purposeful-camera-mount-tongue-unverified')
 if(tongue.centeredOnCameraAxis!==true||tongue.enclosureAndCameraClearanceVerified!==true)errors.push('camera-mount-axis-interface-unverified')
 const slot=evidence.mountSlot||{}
 if((slot.lengthMm||0)<c.mountSlot.minimumLengthMm||(slot.widthMm||0)<c.mountSlot.minimumWidthMm||slot.inTongue!==true||slot.edgeCutsVerified!==true)errors.push('camera-mount-slot-invalid')
 if((slot.copperKeepoutMm||0)<c.mountSlot.minimumKeepoutMm||slot.allLayersKeepout!==true||slot.fastenerHeadClearanceVerified!==true)errors.push('camera-mount-slot-keepout-unverified')
 const p=evidence.placements||{}
 if(!Array.isArray(p.cameraOutputs)||p.cameraOutputs.length<2||p.cameraOutputs.some(x=>(x.minY??-Infinity)<c.placement.cameraOutputsMinimumYmm))errors.push('camera-trigger-outputs-not-on-camera-edge')
 if(!p.triggerControl||(p.triggerControl.maxY??Infinity)>c.placement.controlMaximumYmm)errors.push('trigger-control-in-output-service-zone')
 if(!p.serviceAndPower||(p.serviceAndPower.maxY??Infinity)>c.placement.serviceMaximumYmm)errors.push('service-and-power-not-opposite-camera-edge')
 const isolation=evidence.isolationCorridor||{}
 if(isolation.betweenControlAndOutputs!==true||isolation.allLayersClearanceVerified!==true||isolation.noMountMetalBridge!==true)errors.push('camera-trigger-isolation-corridor-unverified')
 if(evidence.cableExit?.synchronizedOutputsHaveEqualServicePath!==true||evidence.cableExit?.clearOfMountAndFastener!==true)errors.push('camera-output-cable-exit-unverified')
 const holes=evidence.auxiliaryMountingHoles||[]
 if(holes.length<c.mounting.minimumAuxiliaryHoleCount)errors.push('camera-trigger-auxiliary-mounting-missing')
 for(const [i,h]of holes.entries()){
  if((h.diameterMm||0)<c.mounting.minimumDiameterMm||!pointInPolygon([h.x,h.y],outline))errors.push(`auxiliary-mount-${i+1}-invalid`)
  if((h.copperKeepoutRadiusMm||0)<c.mounting.minimumKeepoutRadiusMm||h.allLayersKeepout!==true)errors.push(`auxiliary-mount-${i+1}-keepout-unverified`)
  if(h.inIsolationCorridor===true)errors.push(`auxiliary-mount-${i+1}-bridges-isolation-corridor`)
 }
 return{schema:'boardforge.phase2c.camera-trigger-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];if(cross)inside=!inside}return inside}
