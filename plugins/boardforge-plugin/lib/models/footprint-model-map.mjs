export const defaultFootprintModelMap = [
  map(/0603|0805/i, '${KICAD8_3DMODEL_DIR}/Resistors_SMD.3dshapes/R_0603_1608Metric.wrl'),
  map(/LED/i, '${KICAD8_3DMODEL_DIR}/LED_SMD.3dshapes/LED_0603_1608Metric.wrl'),
  map(/USB.*C|Type.?C/i, '${KICAD8_3DMODEL_DIR}/Connector_USB.3dshapes/USB_C_Receptacle_USB2.0.wrl'),
  map(/RJ45|MagJack/i, '${KICAD8_3DMODEL_DIR}/Connector_RJ.3dshapes/RJ45_MagJack_Generic.wrl'),
  map(/SOIC|TSSOP/i, '${KICAD8_3DMODEL_DIR}/Package_SO.3dshapes/SOIC-8_3.9x4.9mm_P1.27mm.wrl'),
  map(/QFN|LQFP/i, '${KICAD8_3DMODEL_DIR}/Package_QFP.3dshapes/LQFP-48_7x7mm_P0.5mm.wrl'),
  map(/Header|JST|Terminal/i, '${KICAD8_3DMODEL_DIR}/Connector_PinHeader_2.54mm.3dshapes/PinHeader_1x04_P2.54mm_Vertical.wrl'),
  map(/MountingHole/i, '${KICAD8_3DMODEL_DIR}/Mechanical.3dshapes/MountingHole_2.2mm.wrl'),
]

export function expectedModelForFootprint(footprint = '') {
  const hit = defaultFootprintModelMap.find((entry) => entry.pattern.test(footprint))
  return hit?.model || ''
}

function map(pattern, model) {
  return { pattern, model }
}
