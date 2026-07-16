export const POWER_DISTRIBUTION_MECHANICAL_CONTRACT=Object.freeze({schema:'boardforge.phase2c.power-distribution-mechanical-contract.v1',boardId:'018_POWER_DISTRIBUTION',outlineFamily:'mounting ears-power-distribution',maximumAreaMm2:1250,bodyEnvelope:Object.freeze({minWidthMm:38,maxWidthMm:44,minHeightMm:20,maxHeightMm:26}),ears:Object.freeze({minimumCount:2,minimumProjectionMm:3,minimumLengthMm:7,minimumHoleDiameterMm:3,minimumKeepoutRadiusMm:3}),branches:Object.freeze({minimumCount:4,minimumPitchMm:4,maximumPitchErrorMm:.5,minimumFuseServiceGapMm:1.5}),placement:Object.freeze({inputMaximumXmm:6,outputMinimumXmm:36,fuseMinXmm:18,fuseMaxXmm:30,trunkMinXmm:6,trunkMaxXmm:18})})

export function validatePowerDistributionMechanicalGeometry(evidence={}){
 const c=POWER_DISTRIBUTION_MECHANICAL_CONTRACT,errors=[],outline=evidence.outline||[],area=polygonArea(outline),bounds=polygonBounds(outline),body=evidence.body||{}
 if(outline.length<10||evidence.outlineClosed!==true)errors.push('power-distribution-ear-outline-invalid')
 if(!Number.isFinite(area)||area>c.maximumAreaMm2)errors.push('power-distribution-outline-exceeds-maximum-area')
 if(body.widthMm<c.bodyEnvelope.minWidthMm||body.widthMm>c.bodyEnvelope.maxWidthMm||body.heightMm<c.bodyEnvelope.minHeightMm||body.heightMm>c.bodyEnvelope.maxHeightMm)errors.push('power-distribution-body-envelope-invalid')
 const ears=evidence.mountingEars||[]
 if(ears.length<c.ears.minimumCount)errors.push('power-distribution-mounting-ears-missing')
 for(const [i,ear]of ears.entries()){
  if((ear.projectionMm||0)<c.ears.minimumProjectionMm||(ear.lengthMm||0)<c.ears.minimumLengthMm)errors.push(`power-distribution-ear-${i+1}-undersized`)
  if(!ear.hole||ear.hole.diameterMm<c.ears.minimumHoleDiameterMm)errors.push(`power-distribution-ear-${i+1}-hole-missing`)
  if((ear.hole?.keepoutRadiusMm||0)<c.ears.minimumKeepoutRadiusMm||ear.hole?.allLayersKeepout!==true)errors.push(`power-distribution-ear-${i+1}-keepout-unverified`)
 }
 if(!evidence.inputTerminal||(evidence.inputTerminal.maxX??Infinity)>c.placement.inputMaximumXmm)errors.push('power-distribution-input-not-on-left-edge')
 const fuses=evidence.branchFuses||[],outputs=evidence.outputTerminals||[]
 if(fuses.length<c.branches.minimumCount)errors.push('power-distribution-fused-branches-insufficient')
 if(outputs.length!==fuses.length)errors.push('power-distribution-fuse-output-count-mismatch')
 const pitches=[]
 for(const [i,fuse]of fuses.entries()){
  if(fuse.minX<c.placement.fuseMinXmm||fuse.maxX>c.placement.fuseMaxXmm)errors.push(`power-distribution-fuse-${i+1}-outside-service-zone`)
  if((fuse.serviceGapMm||0)<c.branches.minimumFuseServiceGapMm)errors.push(`power-distribution-fuse-${i+1}-service-gap-insufficient`)
  const output=outputs[i];if(!output||(output.minX??-Infinity)<c.placement.outputMinimumXmm||output.branch!==i+1)errors.push(`power-distribution-output-${i+1}-not-on-service-edge`)
  if(i)pitches.push(fuse.centerY-fuses[i-1].centerY)
 }
 if(pitches.length&&(Math.min(...pitches)<c.branches.minimumPitchMm||Math.max(...pitches)-Math.min(...pitches)>c.branches.maximumPitchErrorMm))errors.push('power-distribution-branch-pitch-invalid')
 const trunk=evidence.powerTrunk||{}
 if(trunk.minX<c.placement.trunkMinXmm||trunk.maxX>c.placement.trunkMaxXmm||trunk.currentCapacityVerified!==true||trunk.allCopperLayersTied!==true)errors.push('power-distribution-trunk-unverified')
 if(evidence.branchCurrentCapacityVerified!==true)errors.push('power-distribution-branch-capacity-unverified')
 if(evidence.edgeCopperClearanceVerified!==true)errors.push('power-distribution-edge-clearance-unverified')
 if(evidence.faultThermalSpacingVerified!==true)errors.push('power-distribution-fault-thermal-spacing-unverified')
 return{schema:'boardforge.phase2c.power-distribution-mechanical-validation.v1',ok:errors.length===0,errors,areaMm2:area,bounds,maximumAreaMm2:c.maximumAreaMm2}
}

function polygonArea(p){if(!Array.isArray(p)||p.length<3)return NaN;let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function polygonBounds(p){if(!Array.isArray(p)||!p.length)return null;const x=p.map(q=>q[0]),y=p.map(q=>q[1]);return{minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}}
