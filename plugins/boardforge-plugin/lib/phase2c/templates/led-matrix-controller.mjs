import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const LED_MATRIX_CONTROLLER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.led-matrix-controller.v1";
const approved = (ref, role, mpn) => ({
  ref,
  role,
  mpn,
  status: approvedAssetFor(mpn)
    ? "APPROVED_EXACT_ASSET"
    : "BLOCKED_MISSING_APPROVED_EXACT_ASSET",
});
const blocked = (ref, role, requirement) => ({
  ref,
  role,
  mpn: null,
  status: "BLOCKED_MISSING_APPROVED_EXACT_ASSET",
  requirement,
});
export const ledMatrixControllerProductionProposal = Object.freeze({
  schema: LED_MATRIX_CONTROLLER_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_MATRIX_SCAN_CURRENT_POWER_AND_PANEL_PINOUT",
  boardId: "030_LED_MATRIX_CONTROLLER",
  maximumAreaMm2: 2650,
  architecture:
    "Deterministic high-current LED matrix controller with hardware scan timing, source-appropriate row/column drive, protected power, glitch-free blanking and verified thermal/EMI load behavior",
  panelEnvelope: null,
  opticalEnvelope: null,
  timingEnvelope: null,
  driveEnvelope: null,
  powerEnvelope: null,
  thermalEnvelope: null,
  controlEnvelope: null,
  mechanicalEnvelope: null,
  emcEnvelope: null,
  safetyEnvelope: null,
  serviceEnvelope: null,
  primarySources: { driver: "https://www.ti.com/lit/ds/symlink/tlc5957.pdf" },
  candidates: [
    {
      role: "CONSTANT_CURRENT_DRIVER",
      family: "TI TLC5957",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_MATRIX_CHANNELS_SCAN_CURRENT_PWM_AND_PACKAGE",
      verified: { constantCurrentSinkFamily: true },
    },
    {
      role: "LOGIC_BUFFER",
      family: "TI SN74AHCT245",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PANEL_LOGIC_DIRECTION_FANOUT_AND_EDGE_RATE",
      verified: { notAnLedCurrentDriver: true },
    },
    {
      role: "TIMING_CONTROLLER",
      family: "ST STM32G0",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_SCAN_PWM_DMA_MEMORY_AND_LIFECYCLE",
    },
    {
      role: "TIMING_REFERENCE",
      family: "Abracon ABM8",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_REFRESH_FLICKER_JITTER_DRIFT_AND_LOAD",
    },
    {
      role: "INPUT_PROTECTION",
      family: "Schurter 3413 / Littelfuse SMAJ",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_SOURCE_INRUSH_FAULT_SURGE_AND_COORDINATION",
    },
  ],
  outline: {
    family: "panel-edge-with-thermal-wing",
    closed: true,
    maximumAreaMm2: 2650,
    points: [
      [5, 0],
      [65, 0],
      [65, 10],
      [70, 10],
      [70, 30],
      [65, 30],
      [65, 40],
      [5, 40],
      [5, 30],
      [0, 30],
      [0, 10],
      [5, 10],
    ],
    purposefulFeatures: {
      panelConnectorWing: { edge: "right", projectionMm: 5, spanMm: 20 },
      thermalPowerWing: { edge: "left", projectionMm: 5, spanMm: 20 },
      highCurrentAndLogicEdgesOpposed: true,
      airflowCorridorRequired: true,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "exact LED matrix timing controller with DMA PWM timers",
      "Freeze exact controller only after matrix scan, PWM depth, refresh, channel count, memory, interfaces, fault behavior and lifecycle are declared.",
    ),
    blocked(
      "Y_TIME",
      "exact display timing clock",
      "Freeze exact clock only after refresh, PWM, flicker, frequency, jitter, startup, voltage, temperature and aging budgets are verified.",
    ),
    blocked(
      "F_IN",
      "matrix power input fuse",
      "Freeze exact fuse only after source voltage/current, worst pattern, inrush, ambient derating, fault energy and coordination are declared.",
    ),
    blocked(
      "D_IN",
      "matrix input transient clamp",
      "Freeze exact clamp only after source surge waveform, rail standoff, clamp voltage, energy and fuse coordination are declared.",
    ),
    blocked(
      "C_BULK",
      "matrix bulk decoupling",
      "Freeze exact capacitance, voltage, ESR, ripple and lifetime after worst-pattern transient, wiring impedance and inrush are calculated.",
    ),
    approved(
      "C_DEC",
      "matrix high-frequency decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    blocked(
      "U_COL",
      "exact constant-current column drivers or serial driver chain",
      "Freeze exact driver count/cascade/package/pin map from channels, colors, scan, peak current, compliance and PWM depth.",
    ),
    blocked(
      "Q_ROW",
      "exact high-current row source sink drivers",
      "Freeze exact switches/drivers, gate network and safe defaults from peak row current, voltage, duty and switching loss.",
    ),
    blocked(
      "U_LEVEL",
      "panel logic level shifting and buffering",
      "Freeze exact translators/buffers from direction, thresholds, fanout, cable, edge rate and off-state back-power.",
    ),
    blocked(
      "R_ISET",
      "exact LED current-programming and limiting network",
      "Freeze exact values/tolerance/power per color from LED Vf, target current, scan duty and driver equation.",
    ),
    blocked(
      "J_PANEL",
      "keyed matrix panel output connector",
      "Freeze exact panel revision/pin map, ground allocation, contact ampacity, retention and cable.",
    ),
    blocked(
      "J_PWR",
      "keyed high-current matrix power connector",
      "Freeze exact source connector/cable from voltage, worst pattern current, inrush, touch/fire and mating cycles.",
    ),
    blocked(
      "P_PWR",
      "reverse inrush overcurrent switching and distribution",
      "Freeze exact reverse switch/eFuse/inrush/load switch and copper/via distribution from fault and thermal calculations.",
    ),
    blocked(
      "U_TEMP",
      "matrix power-stage thermal monitor",
      "Freeze exact sensor/threshold/placement and hardware/firmware derating or shutdown response.",
    ),
    blocked(
      "P_BLANK",
      "hardware output-enable blanking and failsafe network",
      "Freeze exact pull/default/watchdog/undervoltage interlock guaranteeing LEDs off during boot/reset/fault.",
    ),
    blocked(
      "P_SI",
      "clock latch data damping termination network",
      "Freeze exact series/termination parts from measured cable/edge signal integrity and timing margin.",
    ),
    blocked(
      "P_TEST",
      "matrix production timing current thermal load fixture",
      "Freeze fixture for every row/color/data path, worst pattern current, blanking, refresh, temperature and faults.",
    ),
  ],
  requiredTopology: [
    "Freeze raw matrix/panel model, rows/columns/colors, scan, connector, logic, LED Vf/current, brightness, refresh, bit depth and camera flicker.",
    "Use constant-current sinks and row switches for raw matrices, or verified serial/panel buffers; logic buffers never substitute for LED current control.",
    "Generate data/latch/row/OE/PWM in deterministic hardware and blank around every row/latch transition.",
    "Calculate peak/average current, programming tolerance, droop, connector/copper/via rise, decoupling, inrush, fuse and worst-pattern power.",
    "Protect and key power/panel connectors; prevent logic-cable injection and data-line back-power.",
    "Reject any folklore connector pinout; verify the exact panel revision, connector mapping, ground allocation and cable assembly.",
    "Guarantee default-off startup/reset/watchdog/overtemperature/undervoltage behavior and bound maximum brightness/current.",
    "Separate switching loops from timing and verify ground bounce, crosstalk, conducted/radiated EMI and artifacts.",
    "Production-load every path and verify timing/blanking/refresh/flicker, current, thermal behavior, faults and pinout.",
  ],
  mandatoryUnresolved: [
    "Freeze the raw matrix or panel model/revision, electrical interface, scan topology and timing.",
    "Freeze source/current/inrush/thermal/EMC and safety envelope.",
    "Freeze host, update, blanking/fault and mechanical requirements.",
    "Select unresolved exact drivers, translators, connectors, current parts, thermal and failsafe parts after calculations.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "panelPinMapLogicVerified",
    "rowColumnDriveComplianceVerified",
    "levelTranslationBackpowerVerified",
    "currentProgrammingToleranceVerified",
    "scanSetupHoldSkewVerified",
    "refreshPwmCameraFlickerVerified",
    "blankingGhostingVerified",
    "worstPatternCurrentAmpacityVerified",
    "inrushProtectionVerified",
    "decouplingRailTransientVerified",
    "copperConnectorThermalVerified",
    "emiGroundBounceSignalIntegrityVerified",
    "startupResetWatchdogDefaultOffVerified",
    "overtemperatureFaultContainmentVerified",
    "productionWorstPatternTimingThermalLoadTestVerified",
  ],
});
export function validateLedMatrixControllerArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/matrix timing controller/, "led-matrix-timing-controller-missing"],
    [/row.*driver/, "led-matrix-row-drive-missing"],
    [
      /column driver|constant current sink/,
      "led-matrix-column-or-panel-drive-missing",
    ],
    [
      /panel output connector|panel matrix connector/,
      "led-matrix-panel-connector-missing",
    ],
    [
      /high-current.*power (?:connector|input)|high-current panel power input/,
      "led-matrix-power-input-missing",
    ],
    [/overcurrent/, "led-matrix-overcurrent-protection-missing"],
    [/bulk.*(?:decoupling|capacitor)/, "led-matrix-bulk-decoupling-missing"],
    [/thermal monitor/, "led-matrix-thermal-monitoring-missing"],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.ledMatrixController || {};
  for (const [k, c] of [
    ["matrixInterfaceVerified", "interface-unverified"],
    ["driveTopologyVerified", "drive-topology-unverified"],
    ["refreshBlankingTimingVerified", "refresh-blanking-unverified"],
    ["currentPowerBudgetVerified", "current-power-budget-unverified"],
    ["thermalVerified", "thermal-unverified"],
    ["signalEmcVerified", "signal-emc-unverified"],
    ["faultSafetyVerified", "fault-safety-unverified"],
    ["mechanicalPanelVerified", "mechanical-panel-unverified"],
    ["productionLoadTestVerified", "production-load-test-unverified"],
  ])
    if (!e[k]) errors.push(`led-matrix-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateLedMatrixControllerProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["panelEnvelope", "panel-envelope-undeclared"],
    ["opticalEnvelope", "optical-envelope-undeclared"],
    ["timingEnvelope", "timing-envelope-undeclared"],
    ["driveEnvelope", "drive-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["thermalEnvelope", "thermal-envelope-undeclared"],
    ["controlEnvelope", "control-envelope-undeclared"],
    ["mechanicalEnvelope", "mechanical-envelope-undeclared"],
    ["emcEnvelope", "emc-envelope-undeclared"],
    ["safetyEnvelope", "safety-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`led-matrix-${code}`);
  for (const [p, c] of [
    [/timing controller/, "led-matrix-timing-controller-missing"],
    [/column drivers/, "led-matrix-row-column-drive-missing"],
    [/row source sink drivers/, "led-matrix-row-column-drive-missing"],
    [/panel output connector/, "led-matrix-panel-interface-missing"],
    [/power input fuse/, "led-matrix-power-input-protection-missing"],
    [/bulk decoupling/, "led-matrix-bulk-decoupling-missing"],
    [/level shifting/, "led-matrix-level-shifting-missing"],
    [/current-programming/, "led-matrix-current-limiting-missing"],
    [/thermal monitor/, "led-matrix-thermal-monitoring-missing"],
    [/blanking.*failsafe/, "led-matrix-safe-blanking-missing"],
    [/production timing.*load/, "led-matrix-production-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("led-matrix-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.highCurrentAndLogicEdgesOpposed !== true ||
    f.panelConnectorWing?.projectionMm < 5 ||
    f.thermalPowerWing?.projectionMm < 5 ||
    f.airflowCorridorRequired !== true
  )
    errors.push("led-matrix-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `led-matrix-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.led-matrix-remediation-gate.v1",
    ok: errors.length === 0,
    errors,
    areaMm2: area,
    maximumAreaMm2: proposal.maximumAreaMm2,
    blockedRefs: blockedParts.map((x) => x.ref),
  };
}
function polygonArea(points = []) {
  if (points.length < 3) return NaN;
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
