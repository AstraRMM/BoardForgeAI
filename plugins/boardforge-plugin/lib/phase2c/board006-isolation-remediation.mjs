export const BOARD006_ISOLATION_REMEDIATION=Object.freeze({
 schema:'boardforge.phase2c.board006-isolation-remediation.v1',boardId:'006_INDUSTRIAL_IO',status:'PROPOSAL_NOT_ACCEPTANCE',
 isolatedPower:Object.freeze({mpn:'THI 2-0511M',manufacturer:'Traco Power',minimumIsolationVrms:2500,sourceIsolationVrms:3000,inputV:5,outputV:5,outputCurrentMa:400,pinMap:Object.freeze({1:'GND',7:'NC',8:'NC',9:'FIELD_5V',10:'FIELD_GND',16:'5V'}),primarySource:'https://www.tracopower.com/products/thi2m.pdf'}),
 iso1212:Object.freeze({mpn:'ISO1212DBQR',channels:2,requiredRoles:Object.freeze(['RTHR','RSENSE','CIN']),type13RecommendedRsenseOhm:562,primarySource:'https://www.ti.com/lit/ds/symlink/iso1211.pdf',designProcedureSection:'8.2.1.2'}),
 isolationCorridor:Object.freeze({minimumClearanceMm:3.2,minimumCreepageMm:4}),
})

export function validateBoard006IsolationRemediation(evidence={}){
 const c=BOARD006_ISOLATION_REMEDIATION,errors=[],power=evidence.isolatedPower||{}
 if(power.mpn!==c.isolatedPower.mpn)errors.push('replacement-isolated-power-identity-unproven')
 if(power.primarySourceUrl!==c.isolatedPower.primarySource||power.primarySourceVerified!==true)errors.push('replacement-isolated-power-primary-source-unverified')
 if(power.ratingUnit!=='VACrms'||(power.isolationVrms||0)<c.isolatedPower.minimumIsolationVrms)errors.push('replacement-isolated-power-below-2500vrms')
 if(power.inputV!==c.isolatedPower.inputV||power.outputV!==c.isolatedPower.outputV||(power.outputCurrentMa||0)<c.isolatedPower.outputCurrentMa)errors.push('replacement-isolated-power-operating-point-unverified')
 for(const[pin,net]of Object.entries(c.isolatedPower.pinMap))if(power.pinMap?.[pin]!==net)errors.push(`replacement-isolated-power-pin-${pin}-must-be-${net}`)
 const iso=evidence.iso1212||{},channels=iso.channels||[],refs=new Set()
 if(iso.mpn!==c.iso1212.mpn||iso.primarySourceUrl!==c.iso1212.primarySource||iso.primarySourceVerified!==true)errors.push('iso1212-primary-source-unverified')
 for(let index=0;index<c.iso1212.channels;index++)for(const role of c.iso1212.requiredRoles){
  const part=channels[index]?.[role],code=`iso1212-channel-${index+1}-${role.toLowerCase()}`
  if(!part||!part.ref||part.primarySourceVerified!==true||part.designCalculationVerified!==true)errors.push(`${code}-evidence-incomplete`)
  else{
   if(refs.has(part.ref))errors.push(`${code}-reference-not-unique`);refs.add(part.ref)
   if(role==='CIN'?!((part.farads||0)>0&&(part.ratedVoltageV||0)>0):!((part.ohms||0)>0&&(part.ratedPowerW||0)>0))errors.push(`${code}-value-or-rating-invalid`)
   if(role==='RSENSE'&&part.ohms!==c.iso1212.type13RecommendedRsenseOhm)errors.push(`${code}-not-type1-type3-562ohm`)
  }
 }
 const corridor=evidence.isolationCorridor||{}
 if(corridor.allLayersKeepoutVerified!==true||corridor.noCopperPlanesTracksViasOrMountMetal!==true)errors.push('board006-isolation-corridor-unverified')
 if((corridor.clearanceMm||0)<c.isolationCorridor.minimumClearanceMm)errors.push('board006-isolation-clearance-below-3.2mm')
 if((corridor.creepageMm||0)<c.isolationCorridor.minimumCreepageMm)errors.push('board006-isolation-creepage-below-4mm')
 if(evidence.domainAudit?.fieldGround!=='FIELD_GND'||evidence.domainAudit?.logicGround!=='GND'||evidence.domainAudit?.groundsGalvanicallyDistinct!==true)errors.push('board006-field-logic-domain-audit-failed')
 if(evidence.assetBinding?.symbolFootprintPinMapVerified!==true||evidence.assetBinding?.exactMpnVerified!==true)errors.push('replacement-isolated-power-asset-binding-unverified')
 return{schema:'boardforge.phase2c.board006-isolation-remediation-validation.v1',ok:errors.length===0,errors,proposalOnly:true,requirements:c}
}
