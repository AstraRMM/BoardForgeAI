import test from 'node:test'
import assert from 'node:assert/strict'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'
import {planEsp32TopologyPowerFlags,planExternalConnectorPowerFlags,productionAssetPinSchema,productionPhysicalNetEquivalent,TPS25750_SOURCE_VBUS_EQUIVALENCE} from '../lib/components/production-asset-pin-schema.mjs'

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

test('TPS25750 source policy permits only the TI-mandated VBUS_IN-to-VBUS physical short',()=>{
  const valid={policy:TPS25750_SOURCE_VBUS_EQUIVALENCE,mpn:'TPS25750DRJKR',pad:'23',canonicalNet:'VBUS_IN',physicalNet:'VBUS'}
  assert.equal(productionPhysicalNetEquivalent(valid),true)
  for(const mutation of [{mpn:'TPS25750DRJKR-X'},{pad:'32'},{canonicalNet:'PPHV'},{physicalNet:'PP5V'},{policy:'generic'}])assert.equal(productionPhysicalNetEquivalent({...valid,...mutation}),false)
})

test('ESP32 approved asset includes exposed-pad 41 in both authoritative domains',()=>{
  const asset=approvedAssetFor('ESP32-S3-WROOM-1-N8R8')
  assert.equal(asset.physicalPinCount,41)
  assert.equal(asset.symbolPinMap['41'],'GND')
  assert.equal(asset.footprintPadMap['41'],'GND')
  assert.equal(asset.pinSchema.valid,true)
})

test('industrial isolated converter exposes both sides of the real SIP-4 pinout',()=>{
  const asset=approvedAssetFor('RFM-0505S')
  assert.deepEqual(asset.symbolPinMap,{1:'5V',2:'GND',3:'FIELD_GND',4:'FIELD_5V'})
  assert.deepEqual(asset.footprintPadMap,asset.symbolPinMap)
  assert.equal(asset.physicalPinCount,4)
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

test('PowerPAK PMOS keeps three-pin symbol identity separate from eight physical lands',()=>{
  const asset=approvedAssetFor('SI7465DP-T1-GE3')
  assert.equal(asset.pinSchema.valid,true,asset.pinSchema.errors.join('\n'))
  assert.deepEqual(asset.symbolPinMap,{1:'G',2:'S',3:'D'})
  assert.deepEqual(asset.pinAliases,{1:'4',2:'1',3:'5'})
  assert.deepEqual(Object.keys(asset.footprintPadMap),['1','2','3','4','5','6','7','8'])
})

test('STM32G0B1 dual-FDCAN asset binds two independent controller channels',()=>{
  const asset=approvedAssetFor('STM32G0B1CBT6')
  assert.equal(asset.pinSchema.valid,true,asset.pinSchema.errors.join('\n'))
  assert.deepEqual(Object.fromEntries(['19','20','47','48'].map(pin=>[pin,asset.symbolPinMap[pin]])),{'19':'CAN2_RX','20':'CAN2_TX','47':'CAN1_RX','48':'CAN1_TX'})
})
