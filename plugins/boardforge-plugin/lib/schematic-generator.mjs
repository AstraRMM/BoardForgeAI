import crypto from 'node:crypto'
import { assignNetsToClasses } from './net-classes.mjs'
import { flattenForSchematicCache, resolveAuthoritativeKiCadSymbol } from './components/authoritative-kicad-symbol-resolver.mjs'

export function generateSchematicModel(board, components = [], input = {}) {
  const nets = assignNetsToClasses(normalizeNets(input.nets, components))
  const symbols = placeSymbols(components.map((component) => {
    const fallback = fallbackAssets(component)
    const footprint = component.footprint?.libId || component.footprint || fallback.footprint
    // Schematic pins and footprint pads may use different identifiers (for
    // example USB-C SH versus footprint pad S1). Prefer the explicit symbol
    // domain whenever a canonical binding supplies both maps.
    const pinMap = hasUsefulPinMap(component.symbolPinMap)
      ? component.symbolPinMap
      : (hasUsefulPinMap(component.pinMap) ? component.pinMap : fallbackPinMap(component))
    const rawSymbol = normalizeSchematicSymbol(component, component.symbol?.libId || component.symbol || fallback.symbol, footprint)
    const useNative = shouldUseNativeSymbol(component, rawSymbol, pinMap)
    const schematicPinMap = useNative ? pinMap : schematicConnectorPinMap(pinMap)
    const symbol = useNative ? rawSymbol : (schematicConnectorSymbol(schematicPinMap) || rawSymbol)
    const installed=useNative?authoritativeSymbol(symbol):null
    return {
      ref: component.ref,
      value: component.value || component.group || 'component',
      group: component.group || inferGroup(component),
      role: component.role || null,
      symbol,
      pinGeometry:installed?.pinGeometry||null,
      footprint,
      model3d: component.model3d || fallback.model3d || null,
      package: component.package || fallback.package || null,
      assetSource: component.assetSource || (fallback.assumed ? 'BoardForge controlled library default' : null),
      assetConfidence: component.assetConfidence || component.confidence || (fallback.assumed ? 'ASSUMED_REVIEW_REQUIRED' : 'UNRESOLVED'),
      reviewNotes: [...new Set([component.reviewNotes, fallback.reviewNotes].filter(Boolean))],
      lcsc: component.lcsc || component.procurement?.lcsc || null,
      mpn: component.mpn || null,
      supportsRef: component.supportsRef || null,
      sourceSymbol: component.symbol?.libId || component.symbol || fallback.symbol || null,
      originalPinMap: pinMap,
      pinMap: schematicPinMap,
      pinCount: Object.keys(schematicPinMap || {}).filter((pin) => schematicPinMap[pin]).length,
      uuid: component.schematicUuid || crypto.randomUUID(),
      componentUuid: component.componentUuid || null,
      bindingId: component.bindingId || null,
    }
  }))
  const powerSymbols = [...new Set(nets.filter((net) => isPowerNet(net.name)).map((net) => net.name))]
  const powerFlags = normalizeSourceBackedPowerFlags(input.powerFlags, components, nets)
  const diffPairs = detectDiffPairs(nets)
  const warnings = schematicWarnings(symbols, nets)
  const readinessGates = [
    gate('symbol_binding', !symbols.some((item) => !item.symbol), 'Every component must resolve to a KiCad symbol.'),
    gate('footprint_binding', !symbols.some((item) => !item.footprint), 'Every component must resolve to a KiCad footprint.'),
    gate('pin_mapping', !symbols.some((item) => !item.pinCount), 'Every schematic symbol should have mapped electrical pins.'),
    gate('connectivity', !weakNets(nets, symbols).length, 'Every non-power net should have at least two pins.'),
    gate('erc_required', false, 'KiCad ERC must pass before release or PCB sync.'),
  ]
  const blocked = readinessGates.some((item) => item.status === 'blocked' && item.name !== 'erc_required')
  return {
    schemaVersion: 2,
    generatedBy: 'BoardForge Plugin CLI',
    generatedAt: new Date().toISOString(),
    status: blocked ? 'SCHEMATIC_MODEL_NEEDS_ASSET_REVIEW' : 'SCHEMATIC_MODEL_READY_NEEDS_ERC',
    boardName: board.name,
    summary: {
      symbolCount: symbols.length,
      netCount: nets.length,
      powerRails: powerSymbols,
      differentialPairCount: diffPairs.length,
      assumedAssets: symbols.filter((item) => /ASSUMED/i.test(item.assetConfidence || '')).map((item) => item.ref),
      missingAssets: symbols.filter((item) => !item.symbol || !item.footprint).map((item) => item.ref),
    },
    readinessGates,
    symbols,
    nets,
    powerSymbols,
    powerFlags,
    powerRails: powerSymbols.map((name) => ({
      name,
      pins: pinsForNet(name, symbols).length,
      className: nets.find((net) => net.name === name)?.className || 'POWER',
    })),
    differentialPairs: diffPairs,
    netGroups: groupNets(nets),
    warnings,
    // The writer only emits named-net labels when an explicit generation caller
    // requests them. This avoids recreating the old unsafe free-form wire output.
    input: { emitConnectivityLabels: input.emitConnectivityLabels === true },
    humanReviewRequired: true,
  }
}

export function boardforgeNetlistFromComponents(components = [], nets = []) {
  const mappedComponents = components.map((component) => ({
    ...component,
    pinMap: hasUsefulPinMap(component.pinMap) ? component.pinMap : fallbackPinMap(component),
  }))
  const netMap = new Map((nets || []).map((net) => [net.name, { name: net.name, className: net.className || 'DEFAULT', pins: [] }]))
  for (const component of mappedComponents) {
    for (const [pin, netName] of Object.entries(component.pinMap || {})) {
      if (!netName) continue
      const entry = netMap.get(netName) || { name: netName, className: 'DEFAULT', pins: [] }
      entry.pins.push({ ref: component.ref, pin, group: component.group || null, value: component.value || null })
      netMap.set(netName, entry)
    }
  }
  return {
    schemaVersion: 1,
    generatedBy: 'BoardForge Plugin CLI',
    components: mappedComponents.map((component) => ({
      ref: component.ref,
      value: component.value || component.group || '',
      group: component.group || null,
      symbol: component.symbol?.libId || component.symbol || null,
      footprint: component.footprint?.libId || component.footprint || null,
      pinCount: Object.keys(component.pinMap || {}).length,
    })),
    nets: [...netMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    warnings: [...netMap.values()].filter((net) => net.pins.length < 2).map((net) => ({ severity: 'WARNING', code: 'NET_HAS_FEWER_THAN_TWO_PINS', message: `${net.name} has ${net.pins.length} mapped pin(s).`, net: net.name })),
    humanReviewRequired: true,
  }
}

function fallbackPinMap(component) {
  if (component.group === 'USB') return usbPinMap(component)
  if (component.group === 'ESP32_S3') return esp32S3Wroom1PinMap()
  if (component.group === 'REGULATOR') return { VIN: 'VUSB', GND: 'GND', VOUT: '3V3' }
  if (component.group === 'SENSOR_CONNECTOR') return { 1: '3V3', 2: 'GND', 3: 'I2C_SCL', 4: 'I2C_SDA' }
  if (component.group === 'RJ45') return { 'TX+': 'ETH_TX_P', 'TX-': 'ETH_TX_N', 'RX+': 'ETH_RX_P', 'RX-': 'ETH_RX_N', SHIELD: 'CHASSIS' }
  if (component.group === 'CAP') return { 1: '3V3', 2: 'GND' }
  if (component.group === 'RES') return { 1: component.netA || null, 2: component.netB || null }
  if (component.group === 'TVS') return { VBUS: 'VUSB', DP: 'USB_DP', DN: 'USB_DN', GND: 'GND' }
  return {}
}

function normalizeSchematicSymbol(component, symbol, footprint = '') {
  const group = component.group || inferGroup(component)
  const footprintText = String(footprint || '')
  const pinMap = component.pinMap || {}
  if (group === 'ESP32_S3' && /ESP32-S3-WROOM/i.test(footprintText)) return 'RF_Module:ESP32-S3-WROOM-1'
  if (group === 'USB' && hasSimpleSequentialPins(pinMap)) return 'Connector_Generic:Conn_01x04'
  return symbol
}

function shouldUseNativeSymbol(component = {}, symbol = '', pinMap = {}) {
  if (component.forceProductionProjection === true) return Boolean(symbol) && !/^BoardForge:BF_CONN_/i.test(symbol)
  const group = component.group || inferGroup(component)
  if (!symbol) return false
  if (/^BoardForge:BF_CONN_/i.test(symbol)) return false
  if (group === 'ESP32_S3' && /ESP32-S3/i.test(symbol)) return true
  if (group === 'REGULATOR' && /(Regulator_|AP2112|AMS1117)/i.test(symbol)) return true
  if (group === 'CAP' && /^Device:C/i.test(symbol)) return true
  if (group === 'RES' && /^Device:R/i.test(symbol)) return true
  if (group === 'SWITCH' && /^Switch:/i.test(symbol)) return true
  if (/^Connector_Generic:Conn_01x/i.test(symbol) && hasSimpleSequentialPins(pinMap)) return true
  return false
}

function hasSimpleSequentialPins(pinMap = {}) {
  const pins = Object.keys(pinMap).map(String)
  return ['1', '2', '3', '4'].every((pin) => pins.includes(pin))
}

function esp32S3Wroom1PinMap() {
  return {
    1: 'GND',
    2: '3V3',
    3: 'EN',
    13: 'USB_DN',
    14: 'USB_DP',
    27: 'BOOT',
    32: 'I2C_SCL',
    33: 'I2C_SDA',
    40: 'GND',
    41: 'GND',
  }
}

function usbPinMap(component) {
  const footprint = String(component.footprint?.libId || component.footprint || component.footprintFile || '').toUpperCase()
  const base = { VBUS: 'VUSB', GND: 'GND', 'D+': 'USB_DP', 'D-': 'USB_DN' }
  return /PINHEADER|CONN_01X04|HEADER/.test(footprint) || /DEBUG HEADER/i.test(component.value || '') ? { 1: 'USB_DN', 2: 'USB_DP', 3: 'VUSB', 4: 'GND' } : { ...base, CC1: 'CC1', CC2: 'CC2' }
}

function hasUsefulPinMap(pinMap) {
  return Boolean(pinMap && Object.keys(pinMap).length && Object.values(pinMap).some(Boolean))
}

function schematicConnectorPinMap(pinMap = {}) {
  return Object.fromEntries(Object.entries(pinMap || {})
    .filter(([, net]) => net)
    .map(([, net], index) => [String(index + 1), net]))
}

function schematicConnectorSymbol(pinMap = {}) {
  const pinCount = Object.keys(pinMap || {}).length
  if (!pinCount) return null
  const bounded = Math.max(1, Math.min(40, pinCount))
  return `BoardForge:BF_CONN_${bounded}`
}

export function kicadSchematicFromModel(board, schematicModel) {
  const allSymbols=[...schematicModel.symbols,...powerFlagSymbols(schematicModel.powerFlags)]
  const libSymbols = embeddedLibSymbols(allSymbols)
  const symbolText = allSymbols.map((symbol) => symbolObject(symbol, 'BoardForge')).join('\n')
  const connectivity = schematicModel.input?.emitConnectivityLabels === true
    ? netLabelConnectivityObjects(allSymbols)
    : []
  const netLabels = schematicModel.nets.map((net, index) => noteObject(`net ${net.name}`, 25, 176 + index * 4))
  const reviewText = reviewObjects(schematicModel)
  const instances = allSymbols.map((symbol) => `\t\t(path "/${symbol.uuid}" (reference "${safe(symbol.ref)}") (unit 1) (value "${safe(symbol.value)}") (footprint "${safe(String(symbol.footprint || '').split(':').pop())}"))`).join('\n')
  return `(kicad_sch
\t(version 20250114)
\t(generator "BoardForge Plugin CLI")
\t(generator_version "0.1.0")
\t(uuid "${crypto.randomUUID()}")
\t(paper "A4")
\t(title_block
\t\t(title "${safe(board.name)}")
\t\t(company "BoardForge AI")
\t\t(comment 1 "BoardForge schematic model generated for ERC and human review.")
\t\t(comment 2 "Generated from structured BoardForge component, pin-map, and net intent.")
\t)
\t(lib_symbols
${libSymbols}
\t)
${reviewText}
${symbolText}
${connectivity.join('\n')}
${netLabels.join('\n')}
\t(sheet_instances
\t\t(path "/" (page "1"))
\t)
\t(symbol_instances
${instances}
\t)
)
`
}

function embeddedLibSymbols(symbols = []) {
  const unique = new Map()
  for (const symbol of symbols) if (!unique.has(symbol.symbol)) unique.set(symbol.symbol, symbol)
  const emitted=new Set(),definitions=[]
  for(const symbol of unique.values()){
    const installed=authoritativeSymbol(symbol.symbol)
    if(!installed){definitions.push(embeddedMappedSymbol(symbol.symbol,Object.keys(symbol.pinMap||{})));continue}
    for(const definition of installed.definitions)if(!emitted.has(definition)){emitted.add(definition);definitions.push(definition)}
  }
  return definitions.join('\n')
}

function powerFlagSymbols(flags=[]){return flags.map((flag,index)=>{const installed=authoritativeSymbol('power:PWR_FLAG');return{ref:flag.ref||`#FLG0${index+1}`,value:'PWR_FLAG',group:'POWER_FLAG',symbol:'power:PWR_FLAG',footprint:'',pinMap:{1:flag.rail},pinGeometry:installed?.pinGeometry||null,at:{x:25.4+index*7.62,y:165.1},uuid:crypto.randomUUID(),componentUuid:null,bindingId:null,powerSource:flag.source,reason:flag.reason}})}

/**
 * PWR_FLAG is an electrical source assertion, not a cosmetic ERC suppressor.
 * Accept only plans that identify a real component already connected to the
 * asserted rail. Ground is allowed only as an explicit source return; it is
 * never inferred merely because a net happens to be named GND.
 */
function normalizeSourceBackedPowerFlags(flags=[],components=[],nets=[]){
  if(flags==null)return[]
  if(!Array.isArray(flags))throw new TypeError('powerFlags must be an array of source-backed rail assertions')
  const refs=new Map(components.map(component=>[component.ref,component]))
  const netNames=new Set(nets.map(net=>net.name))
  return flags.map((flag,index)=>{
    const rail=String(flag?.rail||''),sourceRef=String(flag?.source?.ref||''),kind=String(flag?.source?.kind||'')
    if(!rail)throw new Error(`Power flag ${index+1} must name a driven rail`)
    if(!netNames.has(rail))throw new Error(`Power flag ${index+1} references unknown rail ${rail}`)
    const source=refs.get(sourceRef)
    if(!source)throw new Error(`Power flag ${index+1} source component is missing: ${sourceRef||'empty'}`)
    if(!Object.values(source.pinMap||{}).includes(rail))throw new Error(`Power flag ${index+1} source ${sourceRef} is not connected to ${rail}`)
    if(!kind)throw new Error(`Power flag ${index+1} source kind is required`)
    return Object.freeze({...flag,rail,source:Object.freeze({...flag.source,ref:sourceRef,kind})})
  })
}

function authoritativeSymbol(libId){
  try{
    const resolved=resolveAuthoritativeKiCadSymbol(libId),library=resolved.library
    const definitions=[flattenForSchematicCache(resolved)]
    return {definitions,pinGeometry:Object.fromEntries(resolved.pins.map(pin=>[pin.number,pin]))}
  }catch{return null}
}

function embeddedMappedSymbol(libId, pinNumbers) {
  const pins = pinNumbers.length ? pinNumbers : ['1']
  const rows = pins.map((_, index) => round(((pins.length - 1) / 2 - index) * 2.54))
  const top = round(Math.max(...rows) + 2.54), bottom = round(Math.min(...rows) - 2.54)
  const bodyName=String(libId||'BoardForge:Unknown').split(':').at(-1)
  const pinText=pins.map((number,index)=>{const left=index%2===0,x=left?-5.08:5.08,rotation=left?0:180;return `\t\t\t\t(pin passive line (at ${x} ${rows[index]} ${rotation}) (length 2.54) (name "P${safe(number)}" (effects (font (size 1.0 1.0)))) (number "${safe(number)}" (effects (font (size 1.0 1.0)))))`}).join('\n')
  return `\t\t(symbol "${safe(libId)}"
\t\t\t(pin_names (offset 1.016))
\t\t\t(exclude_from_sim no)
\t\t\t(in_bom yes)
\t\t\t(on_board yes)
\t\t\t(property "Reference" "U" (at 0 ${round(top+2.54)} 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "${safe(bodyName)}" (at 0 ${round(bottom-2.54)} 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "${safe(bodyName)}_0_1"
\t\t\t\t(rectangle (start -5.08 ${top}) (end 5.08 ${bottom}) (stroke (width 0.254) (type default)) (fill (type background)))
${pinText}
\t\t\t)
\t\t)`
}

function embeddedConnectorSymbol(count, { libraryQualified = true } = {}) {
  const pinCount = Math.max(1, Math.min(40, Number(count) || 1))
  const rows = Array.from({ length: pinCount }, (_, index) => round(((pinCount - 1) / 2 - index) * 2.54))
  const top = round(Math.max(...rows) + 2.54)
  const bottom = round(Math.min(...rows) - 2.54)
  const pins = rows.map((y, index) => {
    const number = index + 1
    const onLeft = number % 2 === 1
    const x = onLeft ? -5.08 : 5.08
    const rotation = onLeft ? 0 : 180
    return `\t\t\t\t(pin passive line (at ${x} ${y} ${rotation}) (length 2.54) (name "P${number}" (effects (font (size 1.0 1.0)))) (number "${number}" (effects (font (size 1.0 1.0)))))`
  }).join('\n')
  return `\t\t(symbol "${libraryQualified ? 'BoardForge:' : ''}BF_CONN_${pinCount}"
\t\t\t(pin_names (offset 1.016))
\t\t\t(exclude_from_sim no)
\t\t\t(in_bom yes)
\t\t\t(on_board yes)
\t\t\t(property "Reference" "U" (at 0 ${round(top + 2.54)} 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "BF_CONN_${pinCount}" (at 0 ${round(bottom - 2.54)} 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "BF_CONN_${pinCount}_0_1"
\t\t\t\t(rectangle
\t\t\t\t\t(start -5.08 ${top})
\t\t\t\t\t(end 5.08 ${bottom})
\t\t\t\t\t(stroke (width 0.254) (type default))
\t\t\t\t\t(fill (type background))
\t\t\t\t)
${pins}
\t\t\t)
\t\t)`
}

export function boardforgeReviewSymbolLibrary(symbols = []) {
  const counts = [...new Set(symbols.map((symbol) => {
    const match = String(symbol.symbol || '').match(/BoardForge:BF_CONN_(\d+)/)
    return match ? Number(match[1]) : null
  }).filter(Boolean))].sort((a, b) => a - b)
  const definitions = counts.map((count) => embeddedConnectorSymbol(count, { libraryQualified: false }).replace(/^\t\t/gm, '\t')).join('\n')
  return `(kicad_symbol_lib\n\t(version 20231120)\n\t(generator "BoardForge Plugin CLI")\n${definitions}\n)\n`
}

function symbolObject(symbol, projectName) {
  const libId = symbol.symbol || 'Device:R'
  const pinInstances = Object.keys(symbol.pinMap || {}).map((pin) => `\t\t(pin "${safe(pin)}" (uuid "${crypto.randomUUID()}"))`).join('\n')
  return `\t(symbol
\t\t(lib_id "${safe(libId)}")
\t\t(at ${symbol.at.x} ${symbol.at.y} 0)
\t\t(unit 1)
\t\t(exclude_from_sim no)
\t\t(in_bom yes)
\t\t(on_board yes)
\t\t(dnp no)
\t\t(uuid "${symbol.uuid}")
\t\t(property "Reference" "${safe(symbol.ref)}"
\t\t\t(at ${symbol.at.x} ${symbol.at.y - 4} 0)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Value" "${safe(symbol.value)}"
\t\t\t(at ${symbol.at.x} ${symbol.at.y + 4} 0)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Footprint" "${safe(symbol.footprint || '')}"
\t\t\t(at ${symbol.at.x} ${symbol.at.y + 8} 0)
\t\t\t(effects (font (size 1.0 1.0)) hide)
\t\t)
\t\t(property "Datasheet" ""
\t\t\t(at ${symbol.at.x} ${symbol.at.y + 10} 0)
\t\t\t(effects (font (size 1.0 1.0)) hide)
\t\t)
\t\t(property "BoardForgeComponentUuid" "${safe(symbol.componentUuid || '')}"
\t\t\t(at ${symbol.at.x} ${symbol.at.y + 12} 0)
\t\t\t(effects (font (size 1.0 1.0)) hide)
\t\t)
\t\t(property "BoardForgeBindingId" "${safe(symbol.bindingId || '')}"
\t\t\t(at ${symbol.at.x} ${symbol.at.y + 14} 0)
\t\t\t(effects (font (size 1.0 1.0)) hide)
\t\t)
${pinInstances}
\t\t(instances
\t\t\t(project "${safe(projectName)}"
\t\t\t\t(path "/" (reference "${safe(symbol.ref)}") (unit 1))
\t\t\t)
\t\t)
\t)`
}

function netConnectivityObjects(symbols = []) {
  const pinsByNet = new Map()
  for (const symbol of symbols) {
    Object.entries(symbol.pinMap || {}).forEach(([pin, net], index) => {
      if (!net) return
      const pinAt = schematicPinCoordinate(symbol, pin, index)
      const entry = pinsByNet.get(net) || []
      entry.push({ ...pinAt, ref: symbol.ref, pin, net })
      pinsByNet.set(net, entry)
    })
  }
  const objects = []
  for (const [net, pins] of pinsByNet) {
    if (pins.length < 2) {
      objects.push(noConnectObject(pins[0].x, pins[0].y))
      objects.push(noteObject(`${net}: single mapped pin ${pins[0].ref}.${pins[0].pin}`, pins[0].x + 2.54, pins[0].y))
      continue
    }
    const anchor = pins[0]
    pins.slice(1).forEach((pin, index) => {
      objects.push(wireObject(anchor.x, anchor.y, pin.x, pin.y))
      if (index === 0) objects.push(noteObject(net, Math.min(anchor.x, pin.x) - 8, Math.min(anchor.y, pin.y) - 1.2))
    })
  }
  return objects
}

function netLabelConnectivityObjects(symbols = []) {
  const objects = []
  const emittedLabels = new Set()
  for (const symbol of symbols) {
    Object.entries(symbol.pinMap || {}).forEach(([pin, net], index) => {
      if (!net) return
      const pinAt = schematicPinCoordinate(symbol, pin, index)
      const labelKey=`${net}@${pinAt.x},${pinAt.y}`
      if(emittedLabels.has(labelKey))return
      emittedLabels.add(labelKey)
      if(symbol.group==='POWER_FLAG'){
        objects.push(wireObject(pinAt.x,pinAt.y,pinAt.x,round(pinAt.y-5.08)))
        objects.push(labelObject(net,pinAt.x,round(pinAt.y-5.08),true,90))
      }else objects.push(labelObject(net, pinAt.x, pinAt.y, isPowerNet(net), pinAt.rotation||0))
    })
    for(const pin of Object.keys(symbol.pinGeometry||{})){
      if(Object.prototype.hasOwnProperty.call(symbol.pinMap||{},pin))continue
      const at=schematicPinCoordinate(symbol,pin,0)
      if(Object.keys(symbol.pinMap||{}).some(mapped=>{const other=schematicPinCoordinate(symbol,mapped,0);return other.x===at.x&&other.y===at.y}))continue
      objects.push(noConnectObject(at.x,at.y))
    }
  }
  return objects
}

function wireObject(x1, y1, x2, y2) {
  return `\t(wire\n\t\t(pts\n\t\t\t(xy ${x1} ${y1})\n\t\t\t(xy ${x2} ${y2})\n\t\t)\n\t\t(stroke (width 0) (type default))\n\t\t(uuid "${crypto.randomUUID()}")\n\t)`
}

function noConnectObject(x, y) {
  return `\t(no_connect\n\t\t(at ${x} ${y})\n\t\t(uuid "${crypto.randomUUID()}")\n\t)`
}

function schematicPinCoordinate(symbol, pin, index) {
  const actual=symbol.pinGeometry?.[String(pin)]
  if(actual)return {x:round(symbol.at.x+actual.x),y:round(symbol.at.y-actual.y),rotation:actual.rotation||0}
  const offsets = pinOffsetsForSymbol(symbol)
  const offset = offsets[String(pin)] || { x: 18, y: index * 3, rotation: 0 }
  return { x: round(symbol.at.x + offset.x), y: round(symbol.at.y + offset.y), rotation: offset.rotation || 0 }
}

function labelCoordinateForPin(pinAt) {
  const length = 7.62
  const rotation=Number(pinAt.rotation||0)%360
  if(rotation===90)return{x:round(pinAt.x),y:round(pinAt.y+length),rotation:90}
  if(rotation===270)return{x:round(pinAt.x),y:round(pinAt.y-length),rotation:90}
  const pointsRight = rotation === 180
  return {
    x: round(pinAt.x + (pointsRight ? length : -length)),
    y: round(pinAt.y),
    rotation: pointsRight ? 0 : 180,
  }
}

function pinOffsetsForSymbol(symbol) {
  const lib = String(symbol.symbol || '')
  const connectorMatch = lib.match(/(?:Conn_01x|BF_CONN_)(\d+)/i)
  if (connectorMatch) return connectorPinOffsets(Number(connectorMatch[1]))
  if (/ESP32-S3/i.test(lib)) return esp32SchematicPinOffsets()
  if (/Device:[RC](_Small)?$/i.test(lib) || ['CAP', 'RES'].includes(symbol.group)) return {
    1: { x: 0, y: -5.08, rotation: 90 },
    2: { x: 0, y: 5.08, rotation: 270 },
  }
  if (/Conn_01x04/i.test(lib) || symbol.group === 'USB' || symbol.group === 'SENSOR_CONNECTOR') return {
    1: { x: -5.08, y: 2.54, rotation: 0 },
    2: { x: -5.08, y: 0, rotation: 0 },
    3: { x: -5.08, y: -2.54, rotation: 0 },
    4: { x: -5.08, y: -5.08, rotation: 0 },
    GND: { x: -5.08, y: 0, rotation: 0 },
    '3V3': { x: -5.08, y: 2.54, rotation: 0 },
    SCL: { x: -5.08, y: -2.54, rotation: 0 },
    SDA: { x: -5.08, y: -5.08, rotation: 0 },
  }
  if (/AP2112|Regulator_Linear/i.test(lib) || symbol.group === 'REGULATOR') return {
    1: { x: -7.62, y: 2.54, rotation: 0 },
    2: { x: -7.62, y: -2.54, rotation: 0 },
    3: { x: -7.62, y: 0, rotation: 0 },
    4: { x: 7.62, y: -2.54, rotation: 180 },
    5: { x: 7.62, y: 2.54, rotation: 180 },
    VIN: { x: -7.62, y: 2.54, rotation: 0 },
    IN: { x: -7.62, y: 2.54, rotation: 0 },
    GND: { x: -7.62, y: -2.54, rotation: 0 },
    EN: { x: -7.62, y: 0, rotation: 0 },
    VOUT: { x: 7.62, y: 2.54, rotation: 180 },
    OUT: { x: 7.62, y: 2.54, rotation: 180 },
  }
  return {}
}

function connectorPinOffsets(count) {
  const pinCount = Math.max(1, Math.min(40, Number(count) || 1))
  const topY = round(((pinCount - 1) / 2) * 2.54)
  return Object.fromEntries(Array.from({ length: pinCount }, (_, index) => [
    String(index + 1),
    {
      x: index % 2 === 0 ? -5.08 : 5.08,
      // KiCad symbol pin coordinates use a Y axis opposite the sheet placement
      // coordinate passed to labels/wires, so invert this local symbol offset.
      y: round(-(topY - index * 2.54)),
      rotation: index % 2 === 0 ? 0 : 180,
    },
  ]))
}

function esp32SchematicPinOffsets() {
  return {
    1: { x: 0, y: -27.94, rotation: 90 },
    2: { x: 0, y: 27.94, rotation: 270 },
    3: { x: -15.24, y: 22.86, rotation: 0 },
    13: { x: 15.24, y: 12.7, rotation: 180 },
    14: { x: 15.24, y: 10.16, rotation: 180 },
    27: { x: -15.24, y: 17.78, rotation: 0 },
    32: { x: 15.24, y: -5.08, rotation: 180 },
    33: { x: 15.24, y: -7.62, rotation: 180 },
    40: { x: 0, y: -27.94, rotation: 90 },
    41: { x: 0, y: -27.94, rotation: 90 },
  }
}

function labelObject(name, x, y, global = false, rotation = 0) {
  const tag = global ? 'global_label' : 'label'
  const shape = global ? '\n\t\t(shape input)' : ''
  return `\t(${tag} "${safe(name)}"${shape}\n\t\t(at ${x} ${y} ${rotation})\n\t\t(effects (font (size 1.0 1.0)))\n\t\t(uuid "${crypto.randomUUID()}")\n\t)`
}

function noteObject(text, x, y) {
  return `\t(text "${safe(text)}"\n\t\t(at ${x} ${y} 0)\n\t\t(effects (font (size 0.9 0.9)) (justify left bottom))\n\t\t(uuid "${crypto.randomUUID()}")\n\t)`
}

function normalizeNets(nets = [], components = []) {
  const fromPins = components.flatMap((component) => Object.values(component.pinMap || {}).filter(Boolean).map((name) => ({ name })))
  const base = nets.length ? nets : fromPins
  return [...new Map(base.map((net) => [net.name, net])).values()]
}

function placeSymbols(symbols) {
  const lanes = {
    connector_left: { x: 22, y: 36, count: 0 },
    power_top: { x: 78, y: 28, count: 0 },
    controller_center: { x: 88, y: 72, count: 0 },
    support_bottom: { x: 35, y: 116, count: 0 },
    sensor_right: { x: 144, y: 52, count: 0 },
    generic: { x: 122, y: 112, count: 0 },
  }
  return symbols.map((symbol) => {
    const lane = lanes[laneForSymbol(symbol)]
    const at = { x: snapGrid(lane.x + (lane.count % 2) * 33.02), y: snapGrid(lane.y + Math.floor(lane.count / 2) * 25.4) }
    lane.count += 1
    return { ...symbol, at }
  })
}

function laneForSymbol(symbol) {
  const text = `${symbol.group || ''} ${symbol.value || ''} ${symbol.ref || ''}`
  if (/(USB|RJ45|CONNECTOR|JST|SWD)/i.test(text)) return 'connector_left'
  if (/(REGULATOR|LDO|BUCK|PMIC|POWER|POE)/i.test(text)) return 'power_top'
  if (/(ESP32|STM32|MCU|PROCESSOR|FPGA|SOC)/i.test(text)) return 'controller_center'
  if (/(CAP|RES|TVS|ESD|CRYSTAL|OSCILLATOR)/i.test(text) || symbol.role === 'support_component') return 'support_bottom'
  if (/(SENSOR|IMU|BAROMETER|ADC|FLASH)/i.test(text)) return 'sensor_right'
  return 'generic'
}

function fallbackAssets(component) {
  const group = inferGroup(component)
  if (group === 'CAP') return assumedAsset('Device:C', /10uF|1uF/i.test(component.value || '') ? 'Capacitor_SMD:C_0805_2012Metric' : 'Capacitor_SMD:C_0603_1608Metric', 'Capacitor value/package default requires review.', /10uF|1uF/i.test(component.value || '') ? '0805' : '0603')
  if (group === 'RES') return assumedAsset('Device:R', 'Resistor_SMD:R_0603_1608Metric', 'Resistor value/package default requires review.', '0603')
  if (group === 'TVS') return assumedAsset('Connector_Generic:Conn_01x04', 'BoardForge:USB_ESD_Array_USB2_Routeable', 'BoardForge USB2 ESD abstraction keeps schematic pins aligned to a controlled routeable footprint.', 'USB2 ESD array routeable 4-pad')
  if (group === 'REGULATOR') return assumedAsset('Regulator_Linear:AP2112K-3.3', 'Package_TO_SOT_SMD:SOT-23-5', 'Regulator default is an assumption; verify current, thermal, and pinout.', 'SOT-23-5')
  if (group === 'USB') return assumedAsset('Connector:USB_C_Receptacle', 'Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12', 'USB-C receptacle requires footprint/package review against the selected vendor part before release.', 'USB-C receptacle')
  if (group === 'ESP32_S3') return assumedAsset('RF_Module:ESP32-S3-WROOM-1', 'RF_Module:ESP32-S3-WROOM-1', 'ESP32 module variant and antenna keepout must be verified.', 'module')
  if (group === 'RJ45') return assumedAsset('Connector:RJ45', 'Connector_RJ:RJ45_Amphenol_RJHSE538X', 'RJ45 magnetics and footprint must match selected part.', 'RJ45')
  return {}
}

function assumedAsset(symbol, footprint, reviewNotes, packageName) {
  return { symbol, footprint, reviewNotes, package: packageName, assumed: true, model3d: null }
}

function schematicWarnings(symbols, nets) {
  const warnings = [
    { severity: 'WARNING', code: 'ERC_REQUIRED', message: 'KiCad ERC must pass before PCB sync, placement signoff, or export.' },
  ]
  for (const symbol of symbols) {
    if (!symbol.symbol) warnings.push({ severity: 'WARNING', code: 'SYMBOL_UNRESOLVED', message: `${symbol.ref} has no KiCad symbol binding.`, ref: symbol.ref })
    if (!symbol.footprint) warnings.push({ severity: 'WARNING', code: 'FOOTPRINT_UNRESOLVED', message: `${symbol.ref} has no KiCad footprint binding.`, ref: symbol.ref })
    if (!symbol.pinCount) warnings.push({ severity: 'WARNING', code: 'PIN_MAP_EMPTY', message: `${symbol.ref} has no mapped schematic pins.`, ref: symbol.ref })
    if (/ASSUMED/i.test(symbol.assetConfidence || '')) warnings.push({ severity: 'WARNING', code: 'ASSET_ASSUMPTION_REVIEW', message: `${symbol.ref} uses a controlled default asset and needs part-number review.`, ref: symbol.ref })
  }
  for (const net of weakNets(nets, symbols)) warnings.push({ severity: 'WARNING', code: 'NET_HAS_FEWER_THAN_TWO_PINS', message: `${net.name} has ${net.pinCount} mapped pin(s).`, net: net.name })
  return warnings
}

function weakNets(nets, symbols) {
  return nets.map((net) => ({ ...net, pinCount: pinsForNet(net.name, symbols).length }))
    .filter((net) => net.pinCount < 2 && !isPowerNet(net.name) && !/^CHASSIS$/i.test(net.name))
}

function pinsForNet(name, symbols) {
  return symbols.flatMap((symbol) => Object.entries(symbol.pinMap || {})
    .filter(([, net]) => net === name)
    .map(([pin]) => ({ ref: symbol.ref, pin })))
}

function detectDiffPairs(nets) {
  const names = new Set(nets.map((net) => net.name))
  const pairs = [
    ['USB_DP', 'USB_DN', 'USB'],
    ['ETH_TX_P', 'ETH_TX_N', 'ETH_TX'],
    ['ETH_RX_P', 'ETH_RX_N', 'ETH_RX'],
    ['CAN_P', 'CAN_N', 'CAN'],
  ]
  return pairs.filter(([p, n]) => names.has(p) || names.has(n)).map(([positive, negative, name]) => ({
    name,
    positive,
    negative,
    status: names.has(positive) && names.has(negative) ? 'PAIR_COMPLETE_NEEDS_LENGTH_MATCH' : 'PAIR_INCOMPLETE',
  }))
}

function groupNets(nets) {
  return {
    power: nets.filter((net) => isPowerNet(net.name)).map((net) => net.name),
    differential: [...new Set(detectDiffPairs(nets).flatMap((pair) => [pair.positive, pair.negative]))],
    signal: nets.filter((net) => !isPowerNet(net.name)).map((net) => net.name),
  }
}

function gate(name, pass, message) {
  return { name, status: pass ? 'passed' : 'blocked', message }
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000
}

function snapGrid(value, grid = 2.54) {
  return round(Math.round(Number(value || 0) / grid) * grid)
}

function reviewObjects(schematicModel) {
  const lines = [
    `BoardForge generated schematic - review required`,
    `BoardForge connector abstraction: BoardForge:BF_CONN_ maps to KiCad Connector_Generic symbols for ERC-loadable output`,
    `Power rails: ${(schematicModel.powerSymbols || []).join(', ') || 'none mapped'}`,
    `Differential pairs: ${(schematicModel.differentialPairs || []).map((pair) => `${pair.positive}/${pair.negative}`).join(', ') || 'none'}`,
    `Required gates: ERC, schematic/PCB sync, DRC before manufacturing export`,
  ]
  return lines.map((line, index) => `\t(text "${safe(line)}"\n\t\t(at 25 ${18 + index * 5} 0)\n\t\t(effects (font (size 1.1 1.1)) (justify left bottom))\n\t\t(uuid "${crypto.randomUUID()}")\n\t)`).join('\n')
}

function inferGroup(component) {
  const text = `${component.group || ''} ${component.ref || ''} ${component.value || ''} ${component.mpn || ''}`
  if (/usb/i.test(text)) return 'USB'
  if (/rj45|ethernet/i.test(text)) return 'RJ45'
  if (/esp32/i.test(text)) return 'ESP32_S3'
  if (/regulator|ldo|buck/i.test(text)) return 'REGULATOR'
  if (/cap|uf|nf/i.test(text)) return 'CAP'
  if (/res|ohm|pull/i.test(text)) return 'RES'
  if (/tvs|esd/i.test(text)) return 'TVS'
  if (/sensor|imu|barometer/i.test(text)) return 'SENSOR_CONNECTOR'
  return component.group || 'GENERIC'
}

function isPowerNet(name) {
  return /^(GND|3V3|5V|VIN|VBAT|VBUS|VUSB|VCC|VDD|VDDA|CHASSIS)$/i.test(name || '')
}

function safe(value) {
  return String(value || '').replace(/"/g, "'")
}
