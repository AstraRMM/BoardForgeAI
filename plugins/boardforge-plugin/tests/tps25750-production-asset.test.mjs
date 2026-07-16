import test from 'node:test'
import assert from 'node:assert/strict'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'

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
