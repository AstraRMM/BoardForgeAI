import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const DRONE_PERIPHERAL_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.drone-peripheral.v1";
const approved = (ref, role, mpn) => ({
  ref,
  role,
  mpn,
  status: approvedAssetFor(mpn)
    ? "APPROVED_EXACT_ASSET"
    : "BLOCKED_MISSING_APPROVED_EXACT_ASSET",
});
const blocked = (ref, role, requirement, quantity = 1) => ({
  ref,
  role,
  mpn: null,
  quantity,
  status: "BLOCKED_MISSING_APPROVED_EXACT_ASSET",
  requirement,
});
export const dronePeripheralProductionProposal = Object.freeze({
  schema: DRONE_PERIPHERAL_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_FLIGHT_STACK_STANDARD_PINOUT_AND_PORT_BUDGETS",
  boardId: "021_DRONE_PERIPHERAL",
  maximumAreaMm2: 2300,
  architecture:
    "Flight-controller stack with deterministic flight MCU, low-noise IMU and barometer, protected monitored power, mapped motor/receiver/GNSS/telemetry/debug interfaces, and hardware failsafe/watchdog behavior",
  performanceEnvelope: null,
  interfaceEnvelopes: null,
  powerEnvelope: null,
  sensorEnvelope: null,
  failsafeEnvelope: null,
  primarySources: {
    pixhawkStandards: "https://github.com/pixhawk/Pixhawk-Standards",
    canPhysicalLayer: "https://www.ti.com/lit/ds/symlink/tcan332.pdf",
    i2cHotSwapBuffer: "https://www.ti.com/lit/ds/symlink/tca4307.pdf",
  },
  candidates: [
    { role: "FLIGHT_MCU", family: "STM32F103C8T6", exactMpn: null, status: "CAPABILITY_REFERENCE_PENDING_LOOP_RATE_MEMORY_TIMERS_AND_SAFETY" },
    { role: "BAROMETER", family: "BME280", exactMpn: null, status: "CAPABILITY_REFERENCE_PENDING_NOISE_RESPONSE_ENVIRONMENT_AND_PORTING" },
    {
      role: "CAN_PHYSICAL_LAYER_IF_REQUIRED",
      family: "TCAN33x",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_BUS_STANDARD_AND_VOLTAGE",
      verified: {
        supplyV: 3.3,
        interfaces: [
          "Classical CAN",
          "CAN FD dependent on selected family member",
        ],
        integratedProtectionMustBeSuffixVerified: true,
      },
    },
    {
      role: "I2C_SEGMENT_BUFFER_IF_LOADING_OR_HOT_PLUG_REQUIRES",
      family: "TCA4307",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_CAPACITANCE_AND_HOT_PLUG_ANALYSIS",
      verified: { hotSwap: true, stuckBusRecovery: true, bidirectional: true },
    },
  ],
  outline: {
    family: "drone-stack-flight-controller",
    closed: true,
    maximumAreaMm2: 2300,
    points: [
      [4, 0],
      [41, 0],
      [45, 4],
      [45, 41],
      [41, 45],
      [4, 45],
      [0, 41],
      [0, 4],
    ],
    purposefulFeatures: {
      stackHolePatternMm: 30.5,
      mountingHoleCount: 4,
      imuCenterKeepoutRequired: true,
      connectorEdges: ["front", "rear", "left", "right"],
      vibrationIsolationEvidenceRequired: true,
    },
  },
  bom: [
    blocked("U_MCU", "flight MCU controller candidate", "Freeze exact MCU only after loop-rate, compute, memory, timer, bus, watchdog and safety budgets."),
    blocked(
      "U_IMU",
      "flight inertial IMU sensor",
      "Freeze exact gyro/accelerometer MPN/package, ranges, noise, ODR, orientation and interrupt/SPI pin map.",
    ),
    blocked("U_BARO", "flight barometer candidate", "Freeze exact barometer only after noise, bandwidth, altitude response and environmental requirements."),
    blocked(
      "P_BARO",
      "barometer low-noise supply and pressure-port environment",
      "Freeze exact filter/regulator/vent/foam parts and prove prop-wash, light, self-heating and condensation behavior.",
    ),
    blocked(
      "J_MOTOR",
      "four mapped motor or ESC output interfaces",
      "Freeze exact connector MPN/pin map/voltage domain and timer channel for each motor; prove default-low/disarmed state.",
      4,
    ),
    blocked(
      "J_RX",
      "mapped receiver interface",
      "Freeze exact connector and SBUS/CRSF/DSM protocol, inversion/level, power and failsafe pin map.",
    ),
    blocked(
      "J_GNSS",
      "mapped GNSS interface",
      "Freeze exact connector and UART/I2C/PPS/power pin map, voltage levels and backup-power policy.",
    ),
    blocked(
      "J_TELEM",
      "mapped telemetry interface",
      "Freeze exact connector and UART/CAN protocol, level, direction, baud, termination and power pin map.",
    ),
    blocked(
      "J_DEBUG",
      "mapped SWD debug and recovery interface",
      "Freeze exact keyed/debug connector and SWDIO/SWCLK/NRST/BOOT/power pin map without backpower.",
    ),
    blocked(
      "P_SIG",
      "external interface level translation and ESD protection",
      "Select exact translator/series/ESD parts per exposed motor, receiver, GNSS, telemetry and debug signal.",
    ),
    blocked(
      "U_CURRENT",
      "flight input voltage and current sensing",
      "Freeze exact current/voltage monitor, Kelvin shunt, range, filter, calibration and telemetry path.",
    ),
    approved("F_IN", "flight power input fuse candidate", "3413.0218.22"),
    approved(
      "Q_REV",
      "flight power reverse-polarity candidate",
      "SI7465DP-T1-GE3",
    ),
    approved("D_IN", "flight power surge TVS candidate", "SMAJ24A"),
    blocked(
      "P_POWER",
      "protected flight power regulators and rail distribution",
      "Freeze exact regulators/load switches for MCU, IMU, barometer, receivers and peripherals from transient/current/noise budgets.",
    ),
    blocked(
      "U_SAFE",
      "flight hardware watchdog brownout and failsafe supervisor",
      "Freeze exact supervisor/watchdog and prove motor outputs disarmed on reset, brownout, firmware loss and sensor fault.",
    ),
    approved("C_DEC", "flight digital decoupling candidate", "CL10B104KB8NNNC"),
  ],
  requiredTopology: [
    "Name flight-stack standard/version, mating connectors, pin numbering, every signal, voltage domain, direction, current limit, and reserved pin.",
    "Use keyed retention-rated connectors with explicit motor, receiver, GNSS, telemetry and debug maps; never tie push-pull transmitters together.",
    "Protect and filter flight power and every externally exposed signal; prevent back-powering between stack, peripherals, USB/debug, and independently powered devices.",
    "Budget each peripheral rail for steady, startup, and fault current, with per-port current limiting/fault reporting where flight safety requires.",
    "Place IMU at verified orientation near rotation center with vibration/thermal/noise isolation; place barometer in a pressure-qualified environment.",
    "Document boot, reset, brownout, missing-sensor, shorted-port, stuck-bus, watchdog and firmware-loss behavior; no single aggregator fault may arm motors.",
  ],
  mandatoryUnresolved: [
    "Declare exact airframe, stack standard/hole pattern, motor count/protocol, receiver, GNSS, telemetry, debug, cable assemblies and vibration environment.",
    "Declare every port pinout, protocol, direction, voltage, rate, cable length, address/node role, termination and hot-plug expectation.",
    "Declare source power, allowed backfeed, per-port startup/steady/fault current and total thermal/noise budget.",
    "Select exact flight MCU suitability, IMU, power/current monitor, regulators, connectors, translators, protection and supervisors only after requirements are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "flightMcuPerformanceVerified",
    "imuNoiseOrientationVerified",
    "barometerEnvironmentVerified",
    "stackStandardPinMapVerified",
    "motorMappingsVerified",
    "receiverMappingFailsafeVerified",
    "gnssTelemetryDebugMappingsVerified",
    "voltageDomainsLevelProtectionVerified",
    "powerCurrentSensingVerified",
    "railNoiseTransientBudgetVerified",
    "backfeedFaultContainmentVerified",
    "watchdogBrownoutFailsafeVerified",
    "motorDisarmedDefaultVerified",
    "stackMountVibrationVerified",
    "connectorStrainClearanceVerified",
    "productionSensorMotorFailsafeTestVerified",
  ],
});
export function validateDronePeripheralArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  if (!has(/flight.*stack.*connector|autopilot.*connector/))
    errors.push("drone-flight-stack-connector-missing");
  if (!has(/peripheral.*connector|sensor.*port/))
    errors.push("drone-peripheral-ports-missing");
  if (!has(/input.*protection|power.*backfeed.*protection/))
    errors.push("drone-power-input-protection-missing");
  if (!has(/per.port.*current|port.*power.*limit/))
    errors.push("drone-port-power-limiting-missing");
  if (!has(/bus.*protection|signal.*esd/))
    errors.push("drone-external-signal-protection-missing");
  if (!has(/bus.*buffer|interface.*transceiver|level.*translat/))
    errors.push("drone-interface-conditioning-missing");
  if (!has(/fault.*status|port.*fault/))
    errors.push("drone-port-fault-reporting-missing");
  const e = definition.semanticEvidence?.dronePeripheral || {};
  if (!e.flightStackStandardVerified)
    errors.push("drone-flight-stack-standard-unverified");
  if (!e.pinoutVerified) errors.push("drone-pinout-unverified");
  if (!e.voltageDomainsVerified)
    errors.push("drone-voltage-domains-unverified");
  if (!e.busLoadingVerified) errors.push("drone-bus-loading-unverified");
  if (!e.terminationPolicyVerified)
    errors.push("drone-termination-policy-unverified");
  if (!e.powerBudgetVerified) errors.push("drone-power-budget-unverified");
  if (!e.faultContainmentVerified)
    errors.push("drone-fault-containment-unverified");
  if (!e.mechanicalVerified)
    errors.push("drone-mechanical-interface-unverified");
  return { ok: errors.length === 0, errors };
}
export function validateFlightControllerStackProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    count = (p) =>
      bom
        .filter((x) => p.test(String(x.role || "").toLowerCase()))
        .reduce((n, x) => n + (x.quantity || 1), 0);
  for (const key of ["performanceEnvelope", "interfaceEnvelopes", "powerEnvelope", "sensorEnvelope", "failsafeEnvelope"])
    if (!proposal[key]) errors.push(`flight-controller-${key.replace(/Envelope(s)?$/, "").replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-envelope-undeclared`);
  for (const [p, c, n = 1] of [
    [/flight mcu/, "flight-mcu-missing"],
    [/inertial imu/, "flight-imu-missing"],
    [/barometer candidate/, "flight-barometer-missing"],
    [/motor.*interfaces/, "flight-motor-interfaces-missing", 4],
    [/receiver interface/, "flight-receiver-interface-missing"],
    [/gnss interface/, "flight-gnss-interface-missing"],
    [/telemetry interface/, "flight-telemetry-interface-missing"],
    [/debug.*interface/, "flight-debug-interface-missing"],
    [/level translation and esd/, "flight-interface-protection-missing"],
    [/voltage and current sensing/, "flight-current-sensing-missing"],
    [/power input fuse/, "flight-power-protection-missing"],
    [/watchdog brownout and failsafe/, "flight-failsafe-missing"],
  ])
    if (count(p) < n) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("flight-controller-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.stackHolePatternMm !== 30.5 ||
    f.mountingHoleCount !== 4 ||
    f.imuCenterKeepoutRequired !== true
  )
    errors.push("flight-controller-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `flight-controller-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.flight-controller-stack-remediation-gate.v1",
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
