import test from 'node:test'
import assert from 'node:assert/strict'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'
import {productionAssetBindings} from '../lib/phase2c/manufacturing-pipeline.mjs'
import {TPS25750_SOURCE_VBUS_EQUIVALENCE} from '../lib/components/production-asset-pin-schema.mjs'

test('TPS25750 RJK grouped terminals project onto KiCad REF0038A widened lands',()=>{
  const asset=approvedAssetFor('TPS25750DRJKR')
  assert.equal(asset.pinSchema.valid,true,asset.pinSchema.errors.join('\n'))
  assert.deepEqual(asset.pinAliases,{21:'20',22:'20',24:'23',25:'23',33:'32',35:'34'})
  assert.equal(asset.footprintPadMap['20'],'PPHV')
  assert.equal(asset.footprintPadMap['23'],'VBUS_IN')
  assert.equal(asset.footprintPadMap['32'],'VBUS')
  assert.equal(asset.footprintPadMap['34'],'PP5V')
  for(const omitted of ['21','22','24','25','33','35'])assert.equal(omitted in asset.footprintPadMap,false)
})

test('TPS25750 VBUS_IN and VBUS remain distinct canonical functions',()=>{
  const asset=approvedAssetFor('TPS25750DRJKR')
  for(const pin of ['23','24','25'])assert.equal(asset.symbolPinMap[pin],'VBUS_IN')
  for(const pin of ['32','33'])assert.equal(asset.symbolPinMap[pin],'VBUS')
})

test('Board005 binding records the TI-required shared physical VBUS node without erasing canonical VBUS_IN',()=>{
  const pinMap={23:'VBUS',24:'VBUS',25:'VBUS',32:'VBUS',33:'VBUS'}
  const [binding]=productionAssetBindings({components:[{ref:'U2',exactMpnRequirement:'TPS25750DRJKR',pinMap,canonicalBinding:{status:'BOUND',binding:{manufacturerPartNumber:'TPS25750DRJKR',pinMap,bindingId:'test'},projections:{schematic:{symbol:{libId:'BoardForge:TPS25750D'},footprint:'Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4'}}}}]}).components
  assert.equal(binding.footprintPadMap['23'],'VBUS_IN')
  assert.equal(binding.physicalNetEquivalencePolicy,TPS25750_SOURCE_VBUS_EQUIVALENCE)
  assert.equal(binding.symbolPinMap['23'],'VBUS')
})

test('TPS25750 physical-node equivalence is withheld from incomplete or different topologies',()=>{
  const pinMap={23:'VBUS_IN',24:'VBUS_IN',25:'VBUS_IN',32:'VBUS',33:'VBUS'}
  const [binding]=productionAssetBindings({components:[{ref:'U2',exactMpnRequirement:'TPS25750DRJKR',pinMap,canonicalBinding:{status:'BOUND',binding:{manufacturerPartNumber:'TPS25750DRJKR',pinMap,bindingId:'test'},projections:{schematic:{symbol:{libId:'BoardForge:TPS25750D'},footprint:'Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4'}}}}]}).components
  assert.equal(binding.physicalNetEquivalencePolicy,null)
})
