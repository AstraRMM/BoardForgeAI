export const TRAINING_DESIGN_INTENT_SCHEMA = 'boardforge.phase2c.training-design-intent.v1'

/** Creates a conservative benchmark specification.  It is a proposal, never
 * acceptance evidence, and does not waive any symbol, sourcing, KiCad, or
 * manufacturing gate. */
export function createTrainingDesignIntent({ board, knowledgePatterns = [] } = {}) {
  if (!board?.id || !board?.purpose || !board?.architectureClass) throw new TypeError('A complete challenge board definition is required')
  const profile = profileFor(board)
  const decisions = [
    decision('purpose_and_use_case', `${board.purpose}; benchmark family ${board.architectureClass}.`, 'challenge manifest', 1, 'Functional scope is frozen by the benchmark.'),
    decision('input_voltage_range', profile.inputVoltage, profile.source, profile.confidence, profile.margin),
    decision('output_rails', profile.outputRails, profile.source, profile.confidence, profile.margin),
    decision('current_requirements', profile.current, profile.source, profile.confidence, profile.margin),
    decision('power_architecture', profile.powerArchitecture, profile.source, profile.confidence, profile.margin),
    decision('interface_standards', profile.interfaces, 'challenge purpose plus conservative interface profile', profile.confidence, 'Rate, voltage, and protection are bounded in the validation plan.'),
    decision('connector_types', profile.connectors, 'active-lifecycle serviceable connector policy', 0.96, 'Keying, current, and retention are checked against the selected MPN.'),
    decision('protection_strategy', profile.protection, 'conservative industry-standard protection policy', 0.95, 'Protection ratings must exceed the declared continuous and transient envelope.'),
    decision('thermal_limits', profile.thermal, 'benchmark ambient and derating policy', 0.95, '25% electrical derating and 20 C thermal margin before component limits.'),
    decision('environment', 'Indoor industrial/laboratory use; 0–50 C ambient; pollution degree 2 unless the board is explicitly isolated or rugged.', 'training benchmark environmental baseline', 0.95, 'No safety-standard compliance claim without board-specific evidence.'),
    decision('mechanical_outline', `${board.outline.family}; maximum ${board.maximumAreaMm2} mm²; purpose: ${board.outline.purpose}.`, 'challenge manifest custom-outline contract', 1, 'Outline must preserve connector, thermal, RF, or mounting access.'),
    decision('layer_count', profile.layers, profile.source, 0.96, 'Layer count is selected for routing, return paths, power, and isolation margin.'),
    decision('manufacturing_rules', 'Use selected manufacturer minimums as hard floors; require source-protected KiCad manufacturing outputs.', 'BoardForge strict production policy', 1, 'ERC/DRC warnings and errors must both be zero.'),
    decision('expected_loads', profile.load, profile.source, profile.confidence, 'Load test includes continuous operation plus a 25% current margin where applicable.'),
    decision('acceptance_tests', profile.tests, 'BoardForge strict production acceptance policy', 1, 'Requires independent KiCad ERC/DRC, sourcing, parity, thermal/current, and manufacturing artifacts.'),
  ]
  return {
    schema: TRAINING_DESIGN_INTENT_SCHEMA,
    boardId: board.id,
    mode: 'autonomous_training_benchmark',
    status: 'DESIGN_INTENT_GENERATED_REQUIRES_ENGINEERING_IMPLEMENTATION_AND_VALIDATION',
    generatedRequirementsPolicy: 'conservative-autonomous-no-customer-question',
    decisions,
    componentRequirements: profile.componentRequirements,
    knowledgePatterns: knowledgePatterns.map((pattern) => ({ id: pattern.id, sourceBoardId: pattern.sourceBoardId, evidenceDigest: pattern.evidenceDigest, reusePolicy: pattern.reusePolicy || 'proposal_only_requires_new_project_validation' })),
    requiredEvidence: ['exact-active-lifecycle-mpns','live-digikey','live-mouser','verified-symbol-footprint-pin-map','schematic-pcb-bom-cpl-parity','erc-zero','drc-zero','unconnected-zero','thermal-current-check','mechanical-outline-check','gerbers-drill-bom-cpl-zip','source-protected-manufacturing-evidence'],
  }
}

export function validateTrainingDesignIntent(intent = {}) {
  const errors = []
  if (intent.schema !== TRAINING_DESIGN_INTENT_SCHEMA) errors.push('schema')
  if (intent.mode !== 'autonomous_training_benchmark') errors.push('mode')
  if (!Array.isArray(intent.decisions) || intent.decisions.length < 15) errors.push('decision-count')
  for (const item of intent.decisions || []) for (const key of ['id', 'decision', 'rationale', 'source', 'confidence', 'safetyMargin', 'dependencies', 'verificationMethod']) if (item[key] === undefined || item[key] === '') errors.push(`decision-${item.id || 'unknown'}-${key}`)
  if (!Array.isArray(intent.componentRequirements) || !intent.componentRequirements.length) errors.push('component-requirements')
  return { ok: errors.length === 0, errors }
}

function profileFor(board) {
  const text = `${board.id} ${board.architectureClass} ${board.purpose}`.toLowerCase()
  const base = { inputVoltage: '9–24 V DC protected input.', outputRails: '3.3 V logic plus 5 V protected peripheral rail.', current: '0.5 A logic budget; 1.0 A protected field/peripheral budget.', powerArchitecture: 'Reverse-polarity protection, fuse/current limit, surge clamp, buck to 5 V and low-noise 3.3 V regulator.', interfaces: 'Protected digital interfaces appropriate to the board family.', connectors: 'Keyed locking field connector plus service/debug header where relevant.', protection: 'Input fuse/current limiting, reverse protection, TVS at exposed conductors, local ESD, bulk plus local decoupling.', thermal: '0–50 C ambient; parts derated to 75% of voltage/current/power ratings.', layers: 4, load: 'Continuous nominal benchmark load with 25% current margin.', tests: 'Electrical bring-up, protection continuity, nominal-load thermal rise, interface loopback, KiCad ERC/DRC, sourcing and manufacturing exports.', componentRequirements: ['Active-lifecycle MCU/controller', 'verified protection devices', 'verified regulator/power path', 'verified connectors', 'manufacturer-recommended decoupling'], source: 'BoardForge conservative training profile', confidence: 0.95, margin: '25% electrical derating and 20 C thermal margin before component limits.' }
  if (/poe/.test(text)) return { ...base, inputVoltage: 'IEEE 802.3af/at PoE input; Class 0 budget capped at 6 W for this benchmark.', outputRails: 'Isolated 5 V / 1 A maximum and 3.3 V / 0.35 A logic rail.', current: 'Maximum 4.5 W load after conversion and 25% thermal margin.', powerArchitecture: 'PoE PD controller plus certified isolated module, Ethernet magnetics, isolation barrier and secondary regulation.', interfaces: '10/100 Ethernet plus local environmental sensor bus.', connectors: 'PoE-capable 10/100 MagJack and non-user-service sensor connector.', protection: 'PoE input protection, Ethernet ESD, isolation creepage/clearance and secondary current limiting.', layers: 4, load: '4.5 W maximum protected load.', componentRequirements: ['PoE-capable MagJack', 'isolated PoE module with published ratings', 'Ethernet controller/PHY and clock', 'environmental sensor', 'isolation-compliant protection'], source: 'IEEE PoE conservative training profile', confidence: 0.9 }
  if (/battery|bms|charger|solar/.test(text)) return { ...base, inputVoltage: '4-cell LiFePO4 benchmark pack: 10.0–14.6 V; solar board adds 18 V nominal panel input.', outputRails: 'Protected pack rail, 5 V / 1 A service rail, and 3.3 V / 0.3 A logic rail.', current: '5 A continuous / 10 A transient pack-path benchmark; 25% current margin.', powerArchitecture: 'Fuse, reverse protection, monitored power path, controlled charging/balancing where applicable, and protected service conversion.', interfaces: 'I2C/SPI telemetry and protected service interface.', connectors: 'Keyed battery, balance, and service connectors.', protection: 'Fuse coordination, reverse-polarity protection, cell voltage/temperature monitoring, controlled fault disconnect.', layers: 4, load: '5 A continuous pack-path or 10 W solar charge benchmark.', componentRequirements: ['battery monitor/charger family', 'cell-rated MOSFETs', 'current shunt', 'temperature input', 'pack-rated connectors and fuse'], source: 'LiFePO4 conservative training profile', confidence: 0.88 }
  if (/usb/.test(text)) return { ...base, inputVoltage: 'USB-C 5 V input or 12 V DC input where downstream power requires it.', outputRails: '5 V USB rail with per-port protection plus 3.3 V logic rail.', current: 'USB hub: 3 A aggregate downstream budget; other USB boards: 1.5 A protected 5 V budget.', powerArchitecture: 'USB-C compliant CC policy, current-limited port power and low-noise logic regulator.', interfaces: 'USB 2.0 high-speed/full-speed as selected by exact controller.', connectors: 'USB-C connectors with ESD adjacent to each exposed port.', protection: 'VBUS current limit, reverse-current control, USB ESD, CC resistors/configuration and surge-tolerant input.', layers: 4, load: 'Aggregate USB load at 75% of declared source capacity.', componentRequirements: ['USB controller/hub or PD controller', 'USB-C connector', 'USB ESD', 'current-limited switch', 'logic regulator'], source: 'USB conservative training profile', confidence: 0.92 }
  if (/motor|servo|mosfet|relay|power-switch/.test(text)) return { ...base, inputVoltage: '12 V nominal / 9–16 V protected input.', outputRails: 'Protected load rail, 5 V service rail and 3.3 V logic rail.', current: '3 A continuous / 6 A transient per power channel unless a lower benchmark limit is declared.', powerArchitecture: 'Input fuse, reverse protection, transient suppression, protected switching stage and separate logic rail.', interfaces: 'PWM, enable/fault, protected feedback and debug.', connectors: 'Locking power/load terminals and keyed signal headers.', protection: 'Per-channel current/fault limit, flyback or snubber as topology requires, TVS and thermal derating.', layers: 4, load: 'Resistive/inductive training load at 75% channel rating.', componentRequirements: ['rated switching device or driver', 'flyback/snubbers', 'current/fault sensing', 'load connectors', 'power input protection'], source: 'motion/power conservative training profile', confidence: 0.9 }
  return base
}

function decision(id, value, source, confidence, safetyMargin) {
  return { id, decision: value, rationale: 'Selected autonomously for a bounded, conservative training benchmark rather than a customer-specific product.', source, confidence, safetyMargin, dependencies: [], verificationMethod: 'Validate against exact selected component datasheets, live sourcing, KiCad checks, and the strict manufacturing acceptance gate.' }
}
