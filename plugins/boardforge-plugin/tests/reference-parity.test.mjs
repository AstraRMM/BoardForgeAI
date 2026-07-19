import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyReferenceParity } from '../lib/components/reference-parity.mjs'
import { stm32ControllerCategoryPcbEvidence, usbEsp32CategoryPcbEvidence } from '../lib/real-board-proof.mjs'
import { approvedAssetFor } from '../lib/components/approved-production-assets.mjs'

const row = (ref) => ({ ref, componentUuid: `uuid-${ref}`, bindingId: `binding-${ref}` })
test('strict reference parity accepts identical linked surfaces', () => {
  const rows = [row('U1'), row('J1')]
  assert.equal(verifyReferenceParity({ bindings: rows, schematic: rows, pcb: rows, bom: rows, cpl: rows }).passed, true)
})
test('approved pilot assets preserve manufacturer package pin numbering', () => {
  assert.deepEqual(approvedAssetFor('MCP1700T-3302E/TT').pinMap, { 1: 'GND', 2: '3V3', 3: 'VUSB' })
  assert.deepEqual(approvedAssetFor('M20-9990645').pinMap, { 1: 'GND', 2: '3V3', 3: 'I2C_SCL', 4: 'I2C_SDA', 5: 'UART_TX', 6: 'UART_RX' })
  const usb = approvedAssetFor('USB4105-GF-A').pinMap
  assert.deepEqual({ A1: usb.A1, B12: usb.B12, A5: usb.A5, B5: usb.B5, A6: usb.A6, B6: usb.B6, A7: usb.A7, B7: usb.B7 }, { A1: 'GND', B12: 'GND', A5: 'CC1', B5: 'CC2', A6: 'USB_DP', B6: 'USB_DP', A7: 'USB_DN', B7: 'USB_DN' })
})
test('STM32 controller uses approved MCU and CAN transceiver physical pins', () => {
  const stm = approvedAssetFor('STM32F103C8T6').pinMap
  assert.deepEqual({ 23: stm[23], 24: stm[24], 32: stm[32], 33: stm[33], 42: stm[42], 43: stm[43] }, { 23: 'GND', 24: '3V3', 32: 'CAN_RX', 33: 'CAN_TX', 42: 'I2C_SCL', 43: 'I2C_SDA' })
  const can = approvedAssetFor('SN65HVD230DR').pinMap
  assert.deepEqual(can, { 1: 'CAN_TX', 2: 'GND', 3: '3V3', 4: 'CAN_RX', 6: 'CANL', 7: 'CANH' })
  const pcb = stm32ControllerCategoryPcbEvidence()
  const u2 = pcb.footprints.find((item) => item.ref === 'U2')
  assert.equal(u2.pads.find((item) => item.number === '7').netName, 'CANH')
  assert.equal(u2.pads.find((item) => item.number === '6').netName, 'CANL')
  assert.deepEqual(pcb.footprints.map((item)=>item.ref).sort(), ['C1','C2','C3','D1','J1','J2','R1','U1','U2','U3'])
})
test('USB-C pilot geometry includes real CC pads, pull-downs, and terminated CC routes', () => {
  const evidence = usbEsp32CategoryPcbEvidence()
  const byRef = new Map(evidence.footprints.map((item) => [item.ref, item]))
  assert.deepEqual([...byRef.keys()].sort(), ['J1', 'J2', 'R1', 'R2', 'U1', 'U2'])
  assert.equal(byRef.get('J1').pads.find((pad) => pad.number === 'A5').netName, 'CC1')
  assert.equal(byRef.get('J1').pads.find((pad) => pad.number === 'B5').netName, 'CC2')
  assert.equal(byRef.get('R1').pads.find((pad) => pad.number === '2').netName, 'GND')
  assert.equal(byRef.get('R2').pads.find((pad) => pad.number === '2').netName, 'GND')
  assert.ok(evidence.segments.some((segment) => segment.netNumber === 10))
  assert.ok(evidence.segments.some((segment) => segment.netNumber === 11))
})
test('strict reference parity rejects missing, extra, and UUID-divergent surfaces', () => {
  const bindings = [row('U1'), row('J1')]
  const result = verifyReferenceParity({ bindings, schematic: bindings, pcb: [{ ...row('U1'), componentUuid: 'wrong' }, row('X1')], bom: bindings, cpl: bindings })
  assert.equal(result.passed, false)
  assert.ok(result.blockers.some((item) => item.code === 'REFERENCE_MISSING' && item.ref === 'J1'))
  assert.ok(result.blockers.some((item) => item.code === 'REFERENCE_EXTRA' && item.ref === 'X1'))
  assert.ok(result.blockers.some((item) => item.code === 'COMPONENT_UUID_MISMATCH' && item.ref === 'U1'))
})
