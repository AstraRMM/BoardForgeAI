import assert from'node:assert/strict'
import test from'node:test'
import {boardforgeReviewSymbolLibrary} from'../lib/schematic-generator.mjs'
import {resolveAuthoritativeKiCadSymbol} from'../lib/components/authoritative-kicad-symbol-resolver.mjs'

test('bundled TPS25750D symbol matches TI SLVSFR7A Table 6-1 pin identities',()=>{
  const s=resolveAuthoritativeKiCadSymbol('BoardForge:TPS25750D')
  assert.equal(s.sourceFile,'bundled:ti-tps25750-slvsfr7a-table-6-1')
  assert.equal(s.pins.length,40)
  assert.deepEqual(Object.fromEntries(['1','4','11','16','17','20','23','28','29','32','34','38','39','40'].map(pin=>[pin,s.pinMap[pin]])),{'1':'LDO_3V3','4':'LDO_1V5','11':'GND','16':'I2Cm_SDA','17':'I2Cm_SCL','20':'PPHV','23':'VBUS_IN','28':'CC1','29':'CC2','32':'VBUS','34':'PP5V','38':'VIN_3V3','39':'GND','40':'DRAIN'})
})

test('TPS25750D electrical pin types preserve power and open-drain behavior',()=>{
  const byPin=Object.fromEntries(resolveAuthoritativeKiCadSymbol('BoardForge:TPS25750D').pins.map(pin=>[pin.number,pin.electricalType]))
  assert.equal(byPin['1'],'power_out');assert.equal(byPin['4'],'power_out');assert.equal(byPin['17'],'open_collector')
  assert.equal(byPin['23'],'passive');assert.equal(byPin['28'],'bidirectional');assert.equal(byPin['32'],'passive');assert.equal(byPin['34'],'power_in');assert.equal(byPin['38'],'power_in');assert.equal(byPin['39'],'power_in')
})

test('project-local BoardForge library contains the real TPS25750D symbol, not BF_CONN pins',()=>{
  const text=boardforgeReviewSymbolLibrary([{symbol:'BoardForge:TPS25750D'}])
  assert.match(text,/\(symbol "TPS25750D"/);assert.match(text,/\(name "I2Cm_SCL"/);assert.doesNotMatch(text,/BF_CONN_40|\(name "P17"/)
})
