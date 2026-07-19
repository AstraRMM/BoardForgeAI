export const USB_ISOLATOR_MECHANICAL_CONTRACT=Object.freeze({
 schema:'boardforge.phase2c.usb-isolator-mechanical-contract.v1',
 baseEnvelopeMm:Object.freeze({width:42,height:21}),barrierCenterXmm:21,
 isolationClasses:Object.freeze({basic:Object.freeze({minimumWithstandVrms:2500,minimumCreepageMm:4,minimumClearanceMm:4}),reinforced:Object.freeze({minimumWithstandVrms:5000,minimumCreepageMm:8,minimumClearanceMm:8})}),
 domains:Object.freeze({upstream:Object.freeze({maximumXmm:17}),downstream:Object.freeze({minimumXmm:25})}),
 connectorEdges:Object.freeze({upstream:Object.freeze({maximumCenterXmm:4,edge:'left'}),downstream:Object.freeze({minimumCenterXmm:38,edge:'right'})}),
 placementEnvelopes:Object.freeze({upstreamEsd:Object.freeze({minX:5,maxX:13}),usbIsolator:Object.freeze({minX:17,maxX:25}),isolatedPower:Object.freeze({minX:17,maxX:25}),downstreamEsd:Object.freeze({minX:29,maxX:37})}),
 primarySources:Object.freeze([
  Object.freeze({publisher:'Analog Devices',document:'CN-0590',url:'https://www.analog.com/media/en/reference-design-documentation/reference-designs/cn0590.pdf',basis:'Functional/basic: 2.5 kV rms and 3.1 mm minimum creepage; reinforced: 5 kV rms and 8 mm minimum creepage. BoardForge rounds the basic geometry target up to 4 mm.'}),
  Object.freeze({publisher:'Texas Instruments',document:'ISOUSB211 data sheet',url:'https://www.ti.com/lit/gpn/ISOUSB211',basis:'PCB pads must not reduce package creepage/clearance; grooves or ribs may increase creepage. No copper may shortcut the barrier.'}),
 ]),
})

export function validateUsbIsolatorMechanicalGeometry(evidence={}){
 const contract=USB_ISOLATOR_MECHANICAL_CONTRACT,errors=[],isolationClass=evidence.isolationClass||'basic',rating=contract.isolationClasses[isolationClass]
 if(!rating)errors.push('unsupported-isolation-class')
 const outline=evidence.outline||[],bounds=polygonBounds(outline)
 if(outline.length<8||!bounds||bounds.width<contract.baseEnvelopeMm.width||bounds.height<contract.baseEnvelopeMm.height)errors.push('isolation-waist-outline-envelope-invalid')
 if(!evidence.outlineClosed)errors.push('isolation-waist-outline-not-closed')
 const corridor=evidence.corridor||{}
 if(Math.abs((corridor.centerXmm??NaN)-contract.barrierCenterXmm)>.01)errors.push('isolation-corridor-not-centered-on-waist')
 if(rating&&corridor.clearanceMm<rating.minimumClearanceMm)errors.push('isolation-corridor-clearance-insufficient')
 if(rating&&corridor.creepageMm<rating.minimumCreepageMm)errors.push('isolation-corridor-creepage-insufficient')
 if(corridor.allCopperLayersKeepout!==true||corridor.noPlanesTracksOrVias!==true)errors.push('isolation-corridor-copper-keepout-unverified')
 if(corridor.maskAndSilkDoNotBridge!==true)errors.push('isolation-corridor-mask-silk-unverified')
 const ratings=evidence.ratings||{}
 if(ratings.usbIsolatorPrimarySourceVerified!==true||rating&&(ratings.usbIsolatorWithstandVrms||0)<rating.minimumWithstandVrms)errors.push('usb-isolator-primary-rating-insufficient')
 if(ratings.isolatedPowerPrimarySourceVerified!==true||rating&&(ratings.isolatedPowerWithstandVrms||0)<rating.minimumWithstandVrms)errors.push('isolated-power-primary-rating-insufficient')
 const placements=evidence.placements||{}
 requireEdge(placements.upstreamConnector,'upstream',contract.connectorEdges.upstream,errors)
 requireEdge(placements.downstreamConnector,'downstream',contract.connectorEdges.downstream,errors)
 for(const [name,envelope]of Object.entries(contract.placementEnvelopes))requireEnvelope(placements[name],name,envelope,errors)
 if(!separateVerticalBands(placements.usbIsolator,placements.isolatedPower))errors.push('barrier-bridging-components-overlap')
 if(evidence.domainNets?.upstreamGround===evidence.domainNets?.downstreamGround||!evidence.domainNets?.upstreamGround||!evidence.domainNets?.downstreamGround)errors.push('usb-isolator-ground-domains-not-distinct')
 if(evidence.domainNets?.upstreamPower===evidence.domainNets?.downstreamPower||!evidence.domainNets?.upstreamPower||!evidence.domainNets?.downstreamPower)errors.push('usb-isolator-power-domains-not-distinct')
 const slot=evidence.slot||{}
 if(slot.enabled&&(slot.edgeCutsVerified!==true||slot.centerXmm!==contract.barrierCenterXmm||!(slot.lengthMm>0)||slot.plated!==false))errors.push('isolation-slot-geometry-unverified')
 if(evidence.slotRequiredBySelectedPackages===true&&!slot.enabled)errors.push('isolation-slot-required-but-missing')
 return{schema:'boardforge.phase2c.usb-isolator-mechanical-validation.v1',ok:errors.length===0,errors,isolationClass,requirements:rating||null,bounds,slotPolicy:'A slot is optional only when the selected primary-source package ratings and unbroken surface path meet the class target; otherwise require a non-plated Edge.Cuts slot centered on the barrier.'}
}

function polygonBounds(points){if(!Array.isArray(points)||!points.length)return null;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}}
function requireEdge(p,name,rule,errors){if(!p)errors.push(`${name}-connector-placement-missing`);else if(name==='upstream'?p.x>rule.maximumCenterXmm:p.x<rule.minimumCenterXmm)errors.push(`${name}-connector-not-on-${rule.edge}-edge`)}
function requireEnvelope(p,name,e,errors){if(!p)errors.push(`${name}-placement-missing`);else if(p.minX<e.minX||p.maxX>e.maxX)errors.push(`${name}-outside-placement-envelope`)}
function separateVerticalBands(a,b){return a&&b&&(a.maxY<=b.minY||b.maxY<=a.minY)}
