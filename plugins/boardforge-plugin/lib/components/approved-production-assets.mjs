const pins=n=>Array.from({length:n},(_,i)=>({number:String(i+1),name:String(i+1)}))
const pads=n=>Array.from({length:n},(_,i)=>({name:String(i+1)}))
const entry=(mpn,symbol,footprint,pinMap,packageName)=>({mpn,symbol:{libId:symbol,pins:Object.keys(pinMap).map(number=>({number,name:number}))},footprint:{libId:footprint,pads:Object.keys(pinMap).map(name=>({name}))},pinMap:Object.freeze(pinMap),package:packageName,physicalPinCount:physicalCount(packageName,pinMap),approval:'boardforge.production-asset-registry.v1'})

export const approvedProductionAssets=Object.freeze({
  'USB4105-GF-A':entry('USB4105-GF-A','Connector:USB_C_Receptacle_USB2.0_16P','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{A1:'GND',B12:'GND',A4:'VUSB',B9:'VUSB',A5:'CC1',B5:'CC2',A6:'USB_DP',B6:'USB_DP',A7:'USB_DN',B7:'USB_DN',S1:'GND'},'USB-C 16P top mount'),
  'MCP1700T-3302E/TT':entry('MCP1700T-3302E/TT','Regulator_Linear:MCP1700-3302E_SOT23','Package_TO_SOT_SMD:SOT-23',{1:'GND',2:'3V3',3:'VUSB'},'SOT-23-3'),
  'M20-9990645':entry('M20-9990645','Connector_Generic:Conn_01x06','Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical',{1:'GND',2:'3V3',3:'I2C_SCL',4:'I2C_SDA',5:'UART_TX',6:'UART_RX'},'1x6 2.54mm vertical'),
  'RC0603FR-075K1L':entry('RC0603FR-075K1L','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'SIGNAL',2:'GND'},'0603'),
  'RC0603FR-07120RL':entry('RC0603FR-07120RL','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'CANH',2:'CANL'},'0603'),
  'CL10B104KB8NNNC':entry('CL10B104KB8NNNC','Device:C','Capacitor_SMD:C_0603_1608Metric',{1:'3V3',2:'GND'},'0603'),
  'NUP2105LT1G':entry('NUP2105LT1G','Device:D_TVS_x2_AAC','Package_TO_SOT_SMD:SOT-23',{1:'CANH',2:'GND',3:'CANL'},'SOT-23-3'),
  'SC0914(13)':entry('SC0914(13)','MCU_RaspberryPi_and_Boards:RP2040','Package_DFN_QFN:QFN-56-1EP_7x7mm_P0.4mm_EP3.2x3.2mm',{1:'3V3',6:'I2C_SCL',7:'I2C_SDA',8:'3V3',24:'SWCLK',25:'SWDIO',46:'USB_DN',47:'USB_DP',48:'3V3',49:'3V3',50:'3V3',51:'QSPI_SD3',52:'QSPI_SCLK',53:'QSPI_SD0',54:'QSPI_SD2',55:'QSPI_SD1',56:'QSPI_CS',57:'GND'},'QFN-56-EP'),
  'W25Q128JVSIQ':entry('W25Q128JVSIQ','Memory_Flash:W25Q128JVS','Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',{1:'QSPI_CS',2:'QSPI_SD1',3:'QSPI_SD2',4:'GND',5:'QSPI_SD0',6:'QSPI_SCLK',7:'QSPI_SD3',8:'3V3'},'SOIC-8'),
  'USBLC6-2SC6':entry('USBLC6-2SC6','Power_Protection:USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',{1:'USB_DP_CONN',2:'GND',3:'USB_DN_CONN',4:'USB_DN',5:'VBUS',6:'USB_DP'},'SOT-23-6'),
  'STM32F103C8T6':entry('STM32F103C8T6','MCU_ST_STM32F1:STM32F103C8Tx','Package_QFP:LQFP-48_7x7mm_P0.5mm',{23:'GND',35:'GND',47:'GND',24:'3V3',36:'3V3',48:'3V3',32:'CAN_RX',33:'CAN_TX',42:'I2C_SCL',43:'I2C_SDA'},'LQFP-48'),
  'SN65HVD230DR':entry('SN65HVD230DR','Interface_CAN_LIN:SN65HVD230','Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',{1:'CAN_TX',2:'GND',3:'3V3',4:'CAN_RX',6:'CANL',7:'CANH'},'SOIC-8'),
  'RC0603FR-07120RL':entry('RC0603FR-07120RL','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'CANH',2:'CANL'},'0603'),
  'CL10B104KB8NNNC':entry('CL10B104KB8NNNC','Device:C','Capacitor_SMD:C_0603_1608Metric',{1:'3V3',2:'GND'},'0603'),
  'CC0603KRX7R7BB105':entry('CC0603KRX7R7BB105','Device:C','Capacitor_SMD:C_0603_1608Metric',{1:'3V3',2:'GND'},'0603'),
  '10118194-0001LF':entry('10118194-0001LF','Connector:USB_B_Micro','Connector_USB:USB_Micro-B_Amphenol_10118194_Horizontal',{1:'VUSB',2:'USB_DN',3:'USB_DP',5:'GND'},'USB Micro-B'),
  'M20-9990245':entry('M20-9990245','Connector_Generic:Conn_01x02','Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',{1:'5V',2:'GND'},'1x2 2.54mm vertical'),
})

export function approvedAssetFor(mpn,{requiredPinCount}={}){const asset=approvedProductionAssets[mpn]||null;if(!asset)return null;if(requiredPinCount&&asset.physicalPinCount!==requiredPinCount)return null;return structuredClone(asset)}
function physicalCount(packageName,pinMap){const text=String(packageName),match=text.match(/(?:LQFP|SOIC|QFN)[-_]?(\d+)|SOT-23-(\d+)|1x(\d+)|(\d+)P/i);if(!match)return Object.keys(pinMap).length;const count=Number(match.slice(1).find(Boolean));return /QFN/i.test(text)&&/EP/i.test(text)?count+1:count}
