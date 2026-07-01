export function classifySchematicBlocks(input = {}) {
  const text = JSON.stringify(input).toLowerCase()
  const has = (patterns) => patterns.some((pattern) => pattern.test(text))
  const blocks = [
    block('powerTree', has([/3v3|5v|regulator|buck|ldo|vbus|vin|24v/])),
    block('mcuSupport', has([/mcu|stm32|esp32|rp2040|microcontroller/])),
    block('resetBootDebug', has([/reset|nrst|boot|swd|debug/])),
    block('usb', has([/usb|type.?c|cc1|cc2|d\+|d-/])),
    block('can', has([/canh|canl|can transceiver|can/])),
    block('i2c', has([/i2c|scl|sda/])),
    block('uart', has([/uart|tx|rx|gps/])),
    block('sensors', has([/imu|bmp|barometer|sensor|temperature/])),
    block('protection', has([/tvs|esd|fuse|polyfuse|protection/])),
    block('connectors', has([/connector|header|jst|terminal|rj45|magjack/])),
  ]
  return {
    schema: 'boardforge.schematic-block-classifier.v1',
    blocks,
    present: blocks.filter((item) => item.present).map((item) => item.id),
    missing: blocks.filter((item) => !item.present).map((item) => item.id),
  }
}

function block(id, present) {
  return { id, present: Boolean(present) }
}
