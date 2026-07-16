import test from 'node:test'
import assert from 'node:assert/strict'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'
import {planEsp32TopologyPowerFlags,planExternalConnectorPowerFlags,productionAssetPinSchema} from '../lib/components/production-asset-pin-schema.mjs'

test('schema supports distinct symbol pin and footprint pad aliases without conflating identities',()=>{
  const result=productionAssetPinSchema({symbolPinMap:{SHIELD:'GND',VBUS:'5V'},footprintPadMap:{S1:'GND',A4:'5V'},pinAliases:{SHIELD:'S1',VBUS:'A4'}})
  assert.equal(result.valid,true)
  assert.deepEqual(result.pinAliases,{SHIELD:'S1',VBUS:'A4'})
})

test('schema rejects alias mappings whose logical nets disagree',()=>{
  const result=productionAssetPinSchema({symbolPinMap:{1:'3V3'},footprintPadMap:{A:'GND'},pinAliases:{1:'A'}})
  assert.equal(result.valid,false)
  assert.match(result.errors[0],/logical-net-mismatch/)
})

test('ESP32 approved asset includes exposed-pad 41 in both authoritative domains',()=>{
  const asset=approvedAssetFor('ESP32-S3-WROOM-1-N8R8')
  assert.equal(asset.physicalPinCount,41)
  assert.equal(asset.symbolPinMap['41'],'GND')
  assert.equal(asset.footprintPadMap['41'],'GND')
  assert.equal(asset.pinSchema.valid,true)
})

test('ESP32 topology power plan asserts only passive external supply and return rails',()=>{
  const flags=planEsp32TopologyPowerFlags()
  assert.deepEqual(flags.map(row=>[row.ref,row.symbolLibId,row.rail,row.source.ref]),[['#FLG01','power:PWR_FLAG','VUSB','J1'],['#FLG02','power:PWR_FLAG','GND','J1']])
  assert.equal(new Set(flags.map(row=>row.rail)).size,2)
})

test('external connector topology power plan asserts source-backed 5V and return only',()=>{
  const flags=planExternalConnectorPowerFlags()
  assert.deepEqual(flags.map(row=>[row.ref,row.rail,row.source.ref,row.source.kind]),[
    ['#FLG01','5V','J1','external-connector-power'],
    ['#FLG02','GND','J1','external-connector-power-return'],
  ])
})
