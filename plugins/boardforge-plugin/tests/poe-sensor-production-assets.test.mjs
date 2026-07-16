import test from'node:test'
import assert from'node:assert/strict'
import{approvedAssetFor}from'../lib/components/approved-production-assets.mjs'
import{resolveAuthoritativeKiCadSymbol}from'../lib/components/authoritative-kicad-symbol-resolver.mjs'
import{resolveAuthoritativeKiCadFootprint}from'../lib/components/authoritative-kicad-footprint-resolver.mjs'

const expected={
 W5500:['Interface_Ethernet:W5500','Package_QFP:LQFP-48_7x7mm_P0.5mm',48],
 BME280:['Sensor:BME280','Package_LGA:Bosch_LGA-8_2.5x2.5mm_P0.65mm_ClockwisePinNumbering',8],
 '7499010121A':['Connector:RJ45_Wuerth_7499010121A','Connector_RJ:RJ45_Wuerth_7499010121A_Horizontal',13],
 Ag9905LP:['Converter_DCDC:Ag9905LP','Converter_DCDC:Converter_DCDC_Silvertel_Ag99xxLP_THT',8],
 Q22FA2380184517:['Device:Crystal_GND24','Crystal:Crystal_SMD_SeikoEpson_FA238-4Pin_3.2x2.5mm',4],
}

test('Board009 exact assets resolve to installed authoritative KiCad identities',()=>{for(const[mpn,[symbol,footprint]]of Object.entries(expected)){const a=approvedAssetFor(mpn);assert.equal(a.symbol.libId,symbol,mpn);assert.equal(a.footprint.libId,footprint,mpn);assert.ok(resolveAuthoritativeKiCadSymbol(symbol));assert.ok(resolveAuthoritativeKiCadFootprint(footprint))}})
test('W5500 and BME280 registry pins preserve manufacturer numbering',()=>{const w=approvedAssetFor('W5500'),b=approvedAssetFor('BME280');assert.deepEqual(Object.fromEntries(['1','2','5','6','30','31','32','33','34','35','36','37'].map(k=>[k,w.pinMap[k]])),{'1':'ETH_TXN','2':'ETH_TXP','5':'ETH_RXN','6':'ETH_RXP','30':'XTAL_IN','31':'XTAL_OUT','32':'ETH_CS_N','33':'SPI_SCLK','34':'SPI_MISO','35':'SPI_MOSI','36':'ETH_INT_N','37':'ETH_RESET_N'});assert.deepEqual(b.pinMap,{1:'GND',2:'3V3',3:'I2C_SDA',4:'I2C_SCL',5:'GND',6:'3V3',7:'GND',8:'3V3'})})
test('Ag9905LP remains the exact LP-DIL-8 part and is never relabeled Ag9900M',()=>{const a=approvedAssetFor('Ag9905LP');assert.equal(a.mpn,'Ag9905LP');assert.equal(a.package,'LP-DIL-8');assert.deepEqual(a.pinMap,{1:'POE_5V',2:'POE_5V',3:'GND',4:'POE_ADJ',5:'POE_RECT_POS',6:'POE_RECT_POS',7:'POE_RECT_NEG',8:'POE_RECT_NEG'});assert.equal(approvedAssetFor('Ag9900M'),null)})
test('Wuerth exact MagJack is explicitly prohibited from satisfying a PoE power path',()=>{const a=approvedAssetFor('7499010121A');assert.match(a.applicationLimitations.join(' '),/non-PoE/);assert.equal(a.pinMap.SH,'CHASSIS');assert.equal(a.pinMap[8],'CHASSIS')})
test('Epson exact recommended reel code supplies the required 25 MHz grounded-can footprint',()=>{const a=approvedAssetFor('Q22FA2380184517');assert.equal(a.sourceEvidence,'https://download.epsondevice.com/td/pdf/td_xtal_mhz/FA-238_Q22FA23801845_en.pdf');assert.deepEqual(a.pinMap,{1:'XTAL_IN',2:'GND',3:'XTAL_OUT',4:'GND'})})
