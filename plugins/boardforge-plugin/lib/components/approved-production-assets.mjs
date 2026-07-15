const pins=n=>Array.from({length:n},(_,i)=>({number:String(i+1),name:String(i+1)}))
const pads=n=>Array.from({length:n},(_,i)=>({name:String(i+1)}))
const entry=(mpn,symbol,footprint,pinMap,packageName)=>({mpn,symbol:{libId:symbol,pins:Object.keys(pinMap).map(number=>({number,name:number}))},footprint:{libId:footprint,pads:Object.keys(pinMap).map(name=>({name}))},pinMap:Object.freeze(pinMap),package:packageName,approval:'boardforge.production-asset-registry.v1'})

export const approvedProductionAssets=Object.freeze({
  'USB4105-GF-A':entry('USB4105-GF-A','Connector:USB_C_Receptacle_USB2.0_16P','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{A1:'GND',B12:'GND',A4:'VUSB',B9:'VUSB',A5:'CC1',B5:'CC2',A6:'USB_DP',B6:'USB_DP',A7:'USB_DN',B7:'USB_DN',S1:'GND'},'USB-C 16P top mount'),
  'MCP1700T-3302E/TT':entry('MCP1700T-3302E/TT','Regulator_Linear:MCP1700-3302E_SOT23','Package_TO_SOT_SMD:SOT-23',{1:'GND',2:'3V3',3:'VUSB'},'SOT-23-3'),
  'M20-9990645':entry('M20-9990645','Connector_Generic:Conn_01x06','Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical',{1:'GND',2:'3V3',3:'I2C_SCL',4:'I2C_SDA',5:'UART_TX',6:'UART_RX'},'1x6 2.54mm vertical'),
  'RC0603FR-075K1L':entry('RC0603FR-075K1L','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'SIGNAL',2:'GND'},'0603'),
})

export function approvedAssetFor(mpn,{requiredPinCount}={}){const asset=approvedProductionAssets[mpn]||null;if(!asset)return null;if(requiredPinCount&&asset.footprint.pads.length!==requiredPinCount)return null;return structuredClone(asset)}
