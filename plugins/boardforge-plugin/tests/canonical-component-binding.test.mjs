import test from 'node:test'
import assert from 'node:assert/strict'
import { projectCanonicalBinding, resolveCanonicalComponentBinding, verifyBindingProjection } from '../lib/components/canonical-component-binding.mjs'
import { PART_LOOKUP_STATUSES } from '../lib/sourcing/normalized-part-result.mjs'

const now = new Date('2026-07-15T12:00:00.000Z')
const requirement = { id: 'usb-esd-1', ref: 'D1', logicalRole: 'USB_ESD', value: 'USB ESD protection', mpn: 'USBLC6-2SC6', criticalPins: ['1', '2', '3'] }
const selected = { manufacturerPartNumber: 'USBLC6-2SC6', manufacturer: 'STMicroelectronics', provider: 'digikey', matchType: 'exact', status: PART_LOOKUP_STATUSES.VERIFIED_IN_STOCK, stockStatus: 'IN_STOCK', quantityAvailable: 1234, lastChecked: now.toISOString() }
const assets = { symbol: { libId: 'Power_Protection:USBLC6-2SC6', pins: [{number:'1',name:'I/O1'},{number:'2',name:'GND'},{number:'3',name:'I/O2'}] }, footprint: { libId: 'Package_TO_SOT_SMD:SOT-23-6', pads: [{name:'1'},{name:'2'},{name:'3'}] }, pinMap: {'1':'USB_DP','2':'GND','3':'USB_DN'} }

test('canonical component binding joins live exact MPN, assets, pin map, BOM and manufacturing evidence', async () => {
  const binding = await resolveCanonicalComponentBinding({ requirement, now, lookupService:{lookup:async()=>({selected})}, assetResolver:async()=>assets })
  const projection = projectCanonicalBinding(binding)
  assert.match(binding.bindingId,/^[a-f0-9]{64}$/)
  assert.equal(projection.schematic.bindingId,projection.pcb.bindingId)
  assert.equal(projection.bom.manufacturerPartNumber,'USBLC6-2SC6')
  assert.equal(projection.manufacturingEvidence.supplierEvidence.live,true)
  assert.deepEqual(verifyBindingProjection(binding,projection),{ok:true,errors:[]})
})

test('ambiguous or non-exact sourcing cannot select an engineering component', async () => {
  await assert.rejects(resolveCanonicalComponentBinding({ requirement, now, lookupService:{lookup:async()=>({selected:{...selected,matchType:'fuzzy',status:PART_LOOKUP_STATUSES.AMBIGUOUS_MATCH}})}, assetResolver:async()=>assets }),/LIVE_EXACT_SUPPLIER_EVIDENCE_REQUIRED/)
})

test('stale supplier response cannot masquerade as live pilot evidence', async () => {
  await assert.rejects(resolveCanonicalComponentBinding({ requirement, now, lookupService:{lookup:async()=>({selected:{...selected,lastChecked:'2026-07-15T11:00:00.000Z'}})}, assetResolver:async()=>assets }),/SUPPLIER_EVIDENCE_STALE/)
})

test('symbol footprint pin-map mismatch blocks every downstream projection', async () => {
  const bad={...assets,pinMap:{'99':'USB_DP'},footprint:{...assets.footprint,pads:[{name:'1'},{name:'2'},{name:'3'}]}}
  await assert.rejects(resolveCanonicalComponentBinding({ requirement:{...requirement,criticalPins:['99']}, now, lookupService:{lookup:async()=>({selected})}, assetResolver:async()=>bad }),/SYMBOL_FOOTPRINT_PIN_MAP_INVALID/)
})

test('projection verifier detects downstream MPN or identity drift', async () => {
  const binding=await resolveCanonicalComponentBinding({requirement,now,lookupService:{lookup:async()=>({selected})},assetResolver:async()=>assets})
  const projection=projectCanonicalBinding(binding); projection.bom.manufacturerPartNumber='OTHER'; projection.pcb.bindingId='wrong'
  assert.deepEqual(verifyBindingProjection(binding,projection).errors,['pcb:binding_id_mismatch','bom:mpn_mismatch'])
})
