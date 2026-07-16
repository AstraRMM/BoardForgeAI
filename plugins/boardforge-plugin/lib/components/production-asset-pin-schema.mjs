export const PRODUCTION_ASSET_PIN_SCHEMA='boardforge.production-asset-pin-schema.v2'

export function productionAssetPinSchema({symbolPinMap,footprintPadMap,pinAliases={}}={}){
  if(!symbolPinMap||!footprintPadMap)throw new TypeError('symbolPinMap and footprintPadMap are required')
  const aliases=Object.fromEntries(Object.entries(pinAliases).map(([pin,pad])=>[String(pin),String(pad)]))
  const errors=[]
  for(const pin of Object.keys(symbolPinMap)){
    const pad=aliases[pin]||pin
    if(!(pad in footprintPadMap))errors.push(`symbol-pin-without-footprint-pad:${pin}->${pad}`)
    else if(symbolPinMap[pin]!==footprintPadMap[pad])errors.push(`logical-net-mismatch:${pin}->${pad}:${symbolPinMap[pin]}!=${footprintPadMap[pad]}`)
  }
  for(const pad of Object.keys(footprintPadMap))if(!Object.keys(symbolPinMap).some(pin=>(aliases[pin]||pin)===pad))errors.push(`footprint-pad-without-symbol-pin:${pad}`)
  return {schema:PRODUCTION_ASSET_PIN_SCHEMA,symbolPinMap:Object.freeze({...symbolPinMap}),footprintPadMap:Object.freeze({...footprintPadMap}),pinAliases:Object.freeze(aliases),valid:errors.length===0,errors}
}

export function planEsp32TopologyPowerFlags({usbPowerNet='VUSB',groundNet='GND',usbSourceRef='J1'}={}){
  return [
    {ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:usbPowerNet,source:{ref:usbSourceRef,kind:'external-usb-power'},reason:'USB connector power pins are passive in KiCad and require an explicit source assertion.'},
    {ref:'#FLG02',symbolLibId:'power:PWR_FLAG',rail:groundNet,source:{ref:usbSourceRef,kind:'external-usb-power-return'},reason:'USB connector ground pins are passive in KiCad and require an explicit external return assertion.'},
  ]
}

export function planExternalConnectorPowerFlags({powerNet='5V',groundNet='GND',sourceRef='J1',sourceKind='external-connector-power'}={}){
  return [
    {ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:powerNet,source:{ref:sourceRef,kind:sourceKind},reason:`${sourceRef} supplies ${powerNet} through passive connector pins.`},
    {ref:'#FLG02',symbolLibId:'power:PWR_FLAG',rail:groundNet,source:{ref:sourceRef,kind:`${sourceKind}-return`},reason:`${sourceRef} supplies the external power return through passive connector pins.`},
  ]
}
