import{BOARD006_ISOLATION_REMEDIATION}from'../board006-isolation-remediation.mjs'
export const INDUSTRIAL_IO_TEMPLATE_SCHEMA='boardforge.phase2c.production-template.industrial-io.v1'
const part=(ref,role,mpn,pinCount,rating={})=>({ref,role,mpn,pinCount,rating})
export const industrialIoTemplate=Object.freeze({schema:INDUSTRIAL_IO_TEMPLATE_SCHEMA,id:'006_INDUSTRIAL_IO',class:'industrial-control',purpose:'isolated field IO',outline:{kind:'custom',family:'din rail',maximumAreaMm2:2650,maximumWidthMm:88,minimumRailClearanceMm:3},electrical:{layers:4,fieldInputMaximumVdc:24,logicVoltageV:3.3,galvanicallyIsolated:true,noMains:true,minimumIsolationVrms:2500,minimumCreepageMm:4,minimumClearanceMm:3.2},requirements:[part('J1','FIELD_INPUT_TERMINAL','1725656',4,{ratedV:250,ratedA:12}),part('F1','FIELD_INPUT_FUSE','0451002.MRL',2,{ratedVdc:125,ratedA:2}),part('D1','FIELD_TVS','SMBJ33A',2,{standoffV:33}),part('U1','ISOLATED_DIGITAL_INPUT','ISO1212DBQR',16,{channels:2,isolationVrms:2500}),part('U2','LOGIC_CONTROLLER','STM32F103C8T6',48,{logicVoltageV:3.3}),part('U3','ISOLATED_POWER','THI 2-0511M',6,{isolationVrms:3000,inputV:5,outputV:5,outputCurrentMa:400}),part('J2','LOGIC_IO_HEADER','M20-9990645',6,{logicVoltageV:3.3})],iso1212Networks:[1,2].map(channel=>({channel,RTHR:{ref:`R${channel}1`,ohms:1000,ratedPowerW:.25,selection:'PRIMARY_SOURCE_DESIGN_PROCEDURE_REQUIRED'},RSENSE:{ref:`R${channel}2`,ohms:562,ratedPowerW:.125,operationClass:'TYPE_1_OR_3'},CIN:{ref:`C${channel}1`,farads:10e-9,ratedVoltageV:100,selection:'PRIMARY_SOURCE_DESIGN_PROCEDURE_REQUIRED'}})),isolationRemediation:BOARD006_ISOLATION_REMEDIATION,mandatoryCircuits:['fused and TVS-clamped 24V field entry','two isolated field inputs with explicit RTHR RSENSE CIN networks','THI 2-0511M 3000 VACrms isolated field-side power','3.3V logic controller and service header'],isolationGate:{failClosed:true,requiredEvidence:['KiCad DRC with isolation keepout','creepage and clearance geometry report','isolated power dielectric rating in VACrms','field/logic net-domain audit','exact THI 2-0511M production asset binding']},sourcing:{exactMpnRequired:true,liveClaim:false,runtimeStatus:'REQUIRES_LIVE_VERIFICATION'},acceptance:{minimumFunctionalBlocks:4,placeholderPartsAllowed:false,zeroUnroutedRequired:true,dinRailOutlineRequired:true}})
export function validateIndustrialIoTemplate(t=industrialIoTemplate){const e=[];if(t.schema!==INDUSTRIAL_IO_TEMPLATE_SCHEMA)e.push('schema');if(t.id!=='006_INDUSTRIAL_IO'||t.class!=='industrial-control')e.push('manifest-identity');if(t.outline?.kind!=='custom'||t.outline?.family!=='din rail')e.push('din-rail-outline-required');if(t.outline?.maximumAreaMm2>2650)e.push('area-exceeds-manifest');if(!t.electrical?.noMains)e.push('mains-input-forbidden');if(!t.electrical?.galvanicallyIsolated)e.push('field-isolation-required');if(t.electrical?.minimumIsolationVrms<2500)e.push('isolation-rating-too-low');if(t.electrical?.minimumCreepageMm<4)e.push('creepage-too-small');if(t.electrical?.minimumClearanceMm<3.2)e.push('clearance-too-small');for(const role of['FIELD_INPUT_TERMINAL','FIELD_INPUT_FUSE','FIELD_TVS','ISOLATED_DIGITAL_INPUT','LOGIC_CONTROLLER','ISOLATED_POWER','LOGIC_IO_HEADER'])if(!t.requirements?.some(x=>x.role===role))e.push(`missing-role:${role}`);if(!t.isolationGate?.failClosed)e.push('isolation-gate-must-fail-closed');if(t.sourcing?.liveClaim&&t.sourcing?.runtimeStatus!=='LIVE_VERIFIED')e.push('false-live-claim');if(t.acceptance?.minimumFunctionalBlocks<4)e.push('insufficient-functional-blocks');return{ok:!e.length,errors:e}}

export const INDUSTRIAL_IO_PRODUCTION_TOPOLOGY_REQUIREMENTS=Object.freeze({
 isolatedConverter:{mpn:'THI 2-0511M',minimumIsolationVrms:2500,pinMap:Object.freeze({1:'GND',7:'NC',8:'NC',9:'FIELD_5V',10:'FIELD_GND',16:'5V'})},
 iso1212:{channels:2,requiredNetworkRoles:Object.freeze(['RTHR','RSENSE','CIN']),requiredNoConnectPins:Object.freeze(['3','12'])},
 isolationCorridor:{minimumClearanceMm:3.2,minimumCreepageMm:4,keepoutRequired:true},
 stm32f103c8t6:{requiredPowerPins:Object.freeze(['1','8','9','23','24','35','36','47','48'])},
})

/** Fail-closed manufacturing topology audit. Values are intentionally not
 * synthesized here: resistor/capacitor selections and dielectric evidence
 * must come from the primary device design procedure and sourcing record. */
export function validateIndustrialIoProductionTopology(evidence={}){
 const errors=[],requirements=INDUSTRIAL_IO_PRODUCTION_TOPOLOGY_REQUIREMENTS,converter=evidence.isolatedConverter||{}
 if(converter.mpn!==requirements.isolatedConverter.mpn)errors.push('isolated-converter-identity-unproven')
 if(converter.ratingUnit!=='VACrms')errors.push('isolated-converter-rating-unit-must-be-vacrms')
 if((converter.isolationVrms||0)<requirements.isolatedConverter.minimumIsolationVrms)errors.push('isolated-converter-rating-below-system-gate')
 for(const [pin,net]of Object.entries(requirements.isolatedConverter.pinMap))if(converter.pinMap?.[pin]!==net)errors.push(`isolated-converter-pin-${pin}-must-be-${net}`)
 const channels=evidence.iso1212?.channels||[]
 for(let index=0;index<requirements.iso1212.channels;index++)for(const role of requirements.iso1212.requiredNetworkRoles){const p=channels[index]?.[role];if(!p?.primarySourceVerified||!p?.designCalculationVerified||!p?.ref)errors.push(`iso1212-channel-${index+1}-${role.toLowerCase()}-unproven`);else if(role==='CIN'?!((p.farads||0)>0&&(p.ratedVoltageV||0)>0):!((p.ohms||0)>0&&(p.ratedPowerW||0)>0))errors.push(`iso1212-channel-${index+1}-${role.toLowerCase()}-value-or-rating-invalid`)}
 for(const pin of requirements.iso1212.requiredNoConnectPins)if(!evidence.iso1212?.noConnectPins?.includes(pin))errors.push(`iso1212-sub-pin-${pin}-must-be-nc`)
 const corridor=evidence.isolationCorridor||{}
 if(corridor.keepoutVerified!==true)errors.push('isolation-keepout-unverified')
 if((corridor.clearanceMm||0)<requirements.isolationCorridor.minimumClearanceMm)errors.push('isolation-clearance-below-3.2mm')
 if((corridor.creepageMm||0)<requirements.isolationCorridor.minimumCreepageMm)errors.push('isolation-creepage-below-4mm')
 const connected=new Set(evidence.stm32?.connectedPowerPins||[])
 for(const pin of requirements.stm32f103c8t6.requiredPowerPins)if(!connected.has(pin))errors.push(`stm32-power-pin-${pin}-unconnected`)
 if(evidence.assetBinding?.isolatedConverterExactMpnVerified!==true||evidence.assetBinding?.isolatedConverterSymbolFootprintPinMapVerified!==true)errors.push('isolated-converter-production-asset-binding-unverified')
 return{ok:errors.length===0,errors,requirements}
}
