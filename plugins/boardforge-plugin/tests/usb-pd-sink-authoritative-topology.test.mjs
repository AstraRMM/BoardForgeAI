import assert from 'node:assert/strict'
import test from 'node:test'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'
import {resolveAuthoritativeKiCadSymbol} from '../lib/components/authoritative-kicad-symbol-resolver.mjs'
import {validateUsbPdSinkBuckTopology} from '../lib/components/production-asset-pin-schema.mjs'

test('TPS54202 binding follows authoritative KiCad physical pin numbers',()=>{
  const asset=approvedAssetFor('TPS54202DDCR'),symbol=resolveAuthoritativeKiCadSymbol(asset.symbol.libId)
  assert.deepEqual(symbol.pinMap,{1:'GND',2:'SW',3:'VIN',4:'FB',5:'EN',6:'BOOT'})
  assert.deepEqual(asset.pinMap,{1:'GND',2:'SW',3:'VIN',4:'FB',5:'EN',6:'BOOT'})
})

test('PD sink buck topology rejects the current bootstrap-less candidate',()=>{
  const result=validateUsbPdSinkBuckTopology([{ref:'U2',pinMap:{1:'GND',2:'SW',3:'VBUS_SWITCHED',4:'FB',5:'VBUS_SWITCHED',6:'BOOT'}}])
  assert.equal(result.valid,false)
  assert.match(result.errors.join('\n'),/C_BOOT bootstrap capacitor is required/)
})

test('PD sink buck topology accepts an explicit BOOT-to-SW capacitor',()=>{
  const result=validateUsbPdSinkBuckTopology([
    {ref:'U2',pinMap:{1:'GND',2:'SW',3:'VBUS_SWITCHED',4:'FB',5:'VBUS_SWITCHED',6:'BOOT'}},
    {ref:'C_BOOT',pinMap:{1:'BOOT',2:'SW'}},
    {ref:'R_GATE_PULLUP',pinMap:{1:'VBUS_PROTECTED',2:'VBUS_EN_SNK'}},
  ])
  assert.deepEqual(result,{schema:'boardforge.usb-pd-sink-buck-topology-gate.v1',valid:true,errors:[]})
})
