const pins=n=>Array.from({length:n},(_,i)=>({number:String(i+1),name:String(i+1)}))
const pads=n=>Array.from({length:n},(_,i)=>({name:String(i+1)}))
import {productionAssetPinSchema} from './production-asset-pin-schema.mjs'
const entry=(mpn,symbol,footprint,pinMap,packageName,options={})=>{const pinSchema=productionAssetPinSchema({symbolPinMap:options.symbolPinMap||pinMap,footprintPadMap:options.footprintPadMap||pinMap,pinAliases:options.pinAliases});return{mpn,symbol:{libId:symbol,pins:Object.keys(pinSchema.symbolPinMap).map(number=>({number,name:number}))},footprint:{libId:footprint,pads:Object.keys(pinSchema.footprintPadMap).map(name=>({name}))},pinMap:Object.freeze(pinMap),symbolPinMap:pinSchema.symbolPinMap,footprintPadMap:pinSchema.footprintPadMap,pinAliases:pinSchema.pinAliases,pinSchema,package:packageName,physicalPinCount:physicalCount(packageName,pinSchema.footprintPadMap),externalAntennaRequirement:options.externalAntennaRequirement||null,approval:'boardforge.production-asset-registry.v2'}}

export const approvedProductionAssets=Object.freeze({
  'ESP32-S3-WROOM-1-N8R8':entry('ESP32-S3-WROOM-1-N8R8','RF_Module:ESP32-S3-WROOM-1','RF_Module:ESP32-S3-WROOM-1',{1:'GND',2:'3V3',12:'I2C_SDA',17:'I2C_SCL',36:'UART_RX',37:'UART_TX',13:'USB_DN',14:'USB_DP',40:'GND',41:'GND'},'ESP32-S3-WROOM-1 41P'),
  'ESP32-S3-WROOM-1U-N8R8':entry('ESP32-S3-WROOM-1U-N8R8','RF_Module:ESP32-S3-WROOM-1','RF_Module:ESP32-S3-WROOM-1U',{1:'GND',2:'3V3',12:'I2C_SDA',17:'I2C_SCL',36:'UART_RX',37:'UART_TX',13:'USB_DN',14:'USB_DP',40:'GND',41:'GND'},'ESP32-S3-WROOM-1U 41P external antenna',{symbolPinMap:{1:'GND',2:'3V3',12:'I2C_SDA',17:'I2C_SCL',36:'UART_RX',37:'UART_TX',13:'USB_DN',14:'USB_DP',40:'GND',41:'GND'},footprintPadMap:{1:'GND',2:'3V3',12:'I2C_SDA',17:'I2C_SCL',36:'UART_RX',37:'UART_TX',13:'USB_DN',14:'USB_DP',40:'GND',41:'GND'},externalAntennaRequirement:'Fit a compatible external 2.4 GHz antenna to the module U.FL/IPEX connector and verify antenna, cable, enclosure, and regulatory placement before production.'}),
  'USB4105-GF-A':entry('USB4105-GF-A','Connector:USB_C_Receptacle_USB2.0_16P','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{A1:'GND',A12:'GND',B1:'GND',B12:'GND',A4:'VUSB',A9:'VUSB',B4:'VUSB',B9:'VUSB',A5:'CC1',B5:'CC2',A6:'USB_DP',B6:'USB_DP',A7:'USB_DN',B7:'USB_DN',SH:'GND'},'USB-C 16P top mount',{symbolPinMap:{A1:'GND',A12:'GND',B1:'GND',B12:'GND',A4:'VUSB',A9:'VUSB',B4:'VUSB',B9:'VUSB',A5:'CC1',B5:'CC2',A6:'USB_DP',B6:'USB_DP',A7:'USB_DN',B7:'USB_DN',SH:'GND'},footprintPadMap:{A1:'GND',A12:'GND',B1:'GND',B12:'GND',A4:'VUSB',A9:'VUSB',B4:'VUSB',B9:'VUSB',A5:'CC1',B5:'CC2',A6:'USB_DP',B6:'USB_DP',A7:'USB_DN',B7:'USB_DN',SH:'GND'}}),
  'MCP1700T-3302E/TT':entry('MCP1700T-3302E/TT','Regulator_Linear:MCP1700x-330xxTT','Package_TO_SOT_SMD:SOT-23',{1:'GND',2:'3V3',3:'VUSB'},'SOT-23-3'),
  'M20-9990645':entry('M20-9990645','Connector_Generic:Conn_01x06','Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical',{1:'GND',2:'3V3',3:'I2C_SCL',4:'I2C_SDA',5:'UART_TX',6:'UART_RX'},'1x6 2.54mm vertical'),
  'RC0603FR-075K1L':entry('RC0603FR-075K1L','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'SIGNAL',2:'GND'},'0603'),
  'RC0603FR-07120RL':entry('RC0603FR-07120RL','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'CANH',2:'CANL'},'0603'),
  'CL10B104KB8NNNC':entry('CL10B104KB8NNNC','Device:C','Capacitor_SMD:C_0603_1608Metric',{1:'3V3',2:'GND'},'0603'),
  // KiCad 10 ships the manufacturer-specific NUP2105L symbol. Its two
  // cathodes are pins 1/2 and its common anode (ground) is pin 3.
  'NUP2105LT1G':entry('NUP2105LT1G','Power_Protection:NUP2105L','Package_TO_SOT_SMD:SOT-23',{1:'CANH',2:'CANL',3:'GND'},'SOT-23-3'),
  'SC0914(13)':entry('SC0914(13)','MCU_RaspberryPi:RP2040','Package_DFN_QFN:QFN-56-1EP_7x7mm_P0.4mm_EP3.2x3.2mm',{1:'3V3',6:'I2C_SCL',7:'I2C_SDA',24:'SWCLK',25:'SWDIO',46:'USB_DN',47:'USB_DP',48:'3V3',49:'3V3',50:'3V3',51:'QSPI_SD3',52:'QSPI_SCLK',53:'QSPI_SD0',54:'QSPI_SD2',55:'QSPI_SD1',56:'QSPI_CS',57:'GND'},'QFN-56-EP'),
  'W25Q128JVSIQ':entry('W25Q128JVSIQ','Memory_Flash:W25Q128JVS','Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',{1:'QSPI_CS',2:'QSPI_SD1',3:'QSPI_SD2',4:'GND',5:'QSPI_SD0',6:'QSPI_SCLK',7:'QSPI_SD3',8:'3V3'},'SOIC-8'),
  'USBLC6-2SC6':entry('USBLC6-2SC6','Power_Protection:USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',{1:'USB_DP_CONN',2:'GND',3:'USB_DN_CONN',4:'USB_DN',5:'VBUS',6:'USB_DP'},'SOT-23-6'),
  'STM32F103C8T6':entry('STM32F103C8T6','MCU_ST_STM32F1:STM32F103C8Tx','Package_QFP:LQFP-48_7x7mm_P0.5mm',{23:'GND',35:'GND',47:'GND',24:'3V3',36:'3V3',48:'3V3',32:'CAN_RX',33:'CAN_TX',42:'I2C_SCL',43:'I2C_SDA'},'LQFP-48'),
  'SN65HVD230DR':entry('SN65HVD230DR','Interface_CAN_LIN:SN65HVD230','Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',{1:'CAN_TX',2:'GND',3:'3V3',4:'CAN_RX',6:'CANL',7:'CANH'},'SOIC-8'),
  'RC0603FR-07120RL':entry('RC0603FR-07120RL','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'CANH',2:'CANL'},'0603'),
  'CL10B104KB8NNNC':entry('CL10B104KB8NNNC','Device:C','Capacitor_SMD:C_0603_1608Metric',{1:'3V3',2:'GND'},'0603'),
  'CC0603KRX7R7BB105':entry('CC0603KRX7R7BB105','Device:C','Capacitor_SMD:C_0603_1608Metric',{1:'3V3',2:'GND'},'0603'),
  '10118194-0001LF':entry('10118194-0001LF','Connector:USB_B_Micro','Connector_USB:USB_Micro-B_Amphenol_10118194_Horizontal',{1:'VUSB',2:'USB_DN',3:'USB_DP',5:'GND'},'USB Micro-B'),
  'M20-9990245':entry('M20-9990245','Connector_Generic:Conn_01x02','Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',{1:'5V',2:'GND'},'1x2 2.54mm vertical'),
  'STUSB4500QTR':entry('STUSB4500QTR','Interface_USB:STUSB4500QTR','Package_DFN_QFN:QFN-24-1EP_4x4mm_P0.5mm_EP2.7x2.7mm',{1:'CC1DB',2:'CC1',3:'NC',4:'CC2',5:'CC2DB',6:'RESET',7:'SCL',8:'SDA',9:'DISCH',10:'GND',11:'ATTACH',12:'ADDR0',13:'ADDR1',14:'POWER_OK3',15:'GPIO',16:'VBUS_EN_SNK',17:'A_B_SIDE',18:'VBUS_VS_DISCH',19:'ALERT',20:'POWER_OK2',21:'VREG_1V2',22:'VSYS',23:'VREG_2V7',24:'VDD',25:'GND'},'QFN-24-EP'),
  'SI7465DP-T1-GE3':entry('SI7465DP-T1-GE3','Transistor_FET:Q_PMOS_GSD','Package_SO:PowerPAK_SO-8_Single',{1:'S',2:'S',3:'S',4:'G',5:'D',6:'D',7:'D',8:'D'},'PowerPAK-SO-8'),
  'TPS54202DDCR':entry('TPS54202DDCR','Regulator_Switching:TPS54202DDC','Package_TO_SOT_SMD:SOT-23-6',{1:'BST',2:'GND',3:'FB',4:'EN',5:'VIN',6:'SW'},'SOT-23-6'),
  'SMAJ24A':entry('SMAJ24A','Device:D_TVS','Diode_SMD:D_SMA',{1:'VBUS_PROTECTED',2:'GND'},'SMA-2'),
  '3413.0218.22':entry('3413.0218.22','Device:Fuse','Resistor_SMD:R_2512_6332Metric',{1:'VBUS_RAW',2:'VBUS_FUSED'},'2410-2'),
  'SRN6045TA-4R7M':entry('SRN6045TA-4R7M','Device:L','Inductor_SMD:L_Bourns_SRN6045TA',{1:'SW',2:'5V'},'6x6mm-2'),
  'UWT1H100MCL1GB':entry('UWT1H100MCL1GB','Device:C_Polarized','Capacitor_SMD:CP_Elec_6.3x5.4',{1:'VBUS_PROTECTED',2:'GND'},'6.3x5.4mm-2'),
  'UWT1E220MCL1GB':entry('UWT1E220MCL1GB','Device:C_Polarized','Capacitor_SMD:CP_Elec_6.3x5.4',{1:'5V',2:'GND'},'6.3x5.4mm-2'),
  'RC0603FR-0773K2L':entry('RC0603FR-0773K2L','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'5V_SENSE',2:'FB'},'0603-2'),
  'RC0603FR-0710KL':entry('RC0603FR-0710KL','Device:R','Resistor_SMD:R_0603_1608Metric',{1:'FB',2:'GND'},'0603-2'),
  'TPS25750DRJKR':entry('TPS25750DRJKR','BoardForge:TPS25750D','Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4',{1:'LDO_3V3',2:'ADCIN1',3:'ADCIN2',4:'LDO_1V5',5:'GPIO0',6:'GPIO1',7:'GPIO2',8:'I2Cs_SDA',9:'I2Cs_SCL',10:'I2Cs_IRQ',11:'GND',12:'GND',13:'GPIO11',14:'GND',15:'DRAIN',16:'I2Cm_SDA',17:'I2Cm_SCL',18:'I2Cm_IRQ',19:'GPIO3',20:'PPHV',21:'PPHV',22:'PPHV',23:'VBUS_IN',24:'VBUS_IN',25:'VBUS_IN',26:'GPIO4_USB_P',27:'GPIO5_USB_N',28:'CC1',29:'CC2',30:'DRAIN',31:'GND',32:'VBUS',33:'VBUS',34:'PP5V',35:'PP5V',36:'GPIO7',37:'GPIO6',38:'VIN_3V3',39:'GND',40:'DRAIN'},'WQFN-38-2EP'),
  'M24C64-WMN6TP':entry('M24C64-WMN6TP','Memory_EEPROM:24LC64','Package_SO:SO-8_3.9x4.9mm_P1.27mm',{1:'E0',2:'E1',3:'E2',4:'GND',5:'SDA',6:'SCL',7:'WC',8:'3V3'},'SOIC-8'),
  'SMAJ5.0A':entry('SMAJ5.0A','Device:D_TVS','Diode_SMD:D_SMA',{1:'PROTECTED_5V',2:'GND'},'SMA-2'),
  '1725656':entry('1725656','Connector_Generic:Conn_01x04','Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical',{1:'FIELD_24V_RAW',2:'FIELD_GND',3:'FIELD_IN1',4:'FIELD_IN2'},'1x4 5mm terminal'),
  '0451002.MRL':entry('0451002.MRL','Device:Fuse','Fuse:Fuse_1206_3216Metric',{1:'FIELD_24V_RAW',2:'FIELD_24V_FUSED'},'1206-2'),
  'SMBJ33A':entry('SMBJ33A','Device:D_TVS','Diode_SMD:D_SMB',{1:'FIELD_24V_FUSED',2:'FIELD_GND'},'SMB-2'),
  'ISO1212DBQR':entry('ISO1212DBQR','Isolator:ISO1212','Package_SO:SSOP-16_3.9x4.9mm_P0.635mm',{1:'SENSE1',2:'FGND1',3:'SUB1',4:'IN1',5:'SENSE2',6:'FGND2',7:'SUB2',8:'IN2',9:'GND',10:'OUT2',11:'NC',12:'EN',13:'VCC',14:'OUT1',15:'NC',16:'GND'},'SSOP-16'),
  'RFM-0505S':entry('RFM-0505S','Connector_Generic:Conn_01x04','Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical',{1:'5V',2:'GND',3:'FIELD_GND',4:'NC'},'DCDC-4'),
  'UWT1A151MCL1GS':entry('UWT1A151MCL1GS','Device:C_Polarized','Capacitor_SMD:CP_Elec_8x10.5',{1:'PP5V',2:'GND'},'8x10mm-2'),
  'UWT1E4R7MCL1GB':entry('UWT1E4R7MCL1GB','Device:C_Polarized','Capacitor_SMD:CP_Elec_4x5.4',{1:'VBUS',2:'GND'},'4x5.4mm-2'),
})

export function approvedAssetFor(mpn,{requiredPinCount}={}){const asset=approvedProductionAssets[mpn]||null;if(!asset)return null;if(requiredPinCount&&asset.physicalPinCount!==requiredPinCount)return null;return structuredClone(asset)}
function physicalCount(packageName,pinMap){const text=String(packageName),match=text.match(/(?:LQFP|SOIC|QFN|WQFN)[-_]?(\d+)|SOT-23-(\d+)|1x(\d+)|(\d+)P/i);if(!match)return Object.keys(pinMap).length;const count=Number(match.slice(1).find(Boolean));if(/2EP/i.test(text))return count+2;return /QFN/i.test(text)&&/EP/i.test(text)?count+1:count}
