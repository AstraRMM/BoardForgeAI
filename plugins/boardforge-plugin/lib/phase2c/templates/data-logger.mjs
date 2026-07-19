import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const DATA_LOGGER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.data-logger.v1";
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
export const dataLoggerProductionProposal = Object.freeze({
  schema: DATA_LOGGER_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CHANNELS_ACQUISITION_RATE_STORAGE_AND_SAFETY",
  boardId: "028_DATA_LOGGER",
  maximumAreaMm2: 1950,
  architecture:
    "Calibrated multi-channel acquisition logger with protected filtered inputs, precision conversion/reference, deterministic timestamps, removable media and power-fail-safe records",
  channelEnvelope: null,
  acquisitionEnvelope: null,
  timingEnvelope: null,
  storageEnvelope: null,
  recordIntegrityEnvelope: null,
  powerEnvelope: null,
  safetyEnvelope: null,
  environmentEnvelope: null,
  serviceEnvelope: null,
  primarySources: {
    adc: "https://www.ti.com/lit/ds/symlink/ads131m04.pdf",
    sd: "https://www.sdcard.org/downloads/pls/",
  },
  candidates: [
    {
      role: "PRECISION_ADC",
      family: "TI ADS131M04",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_TOPOLOGY_RATE_RANGE_NOISE_AND_PACKAGE",
    },
    {
      role: "SIMULTANEOUS_ADC",
      family: "Analog Devices AD7606B",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_TOPOLOGY_RATE_RANGE_NOISE_AND_PACKAGE",
    },
    {
      role: "LOGGING_CONTROLLER",
      family: "ST STM32G0",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_ACQUISITION_BUFFERING_INTERFACES_AND_LIFECYCLE",
    },
    {
      role: "ACQUISITION_BUFFER",
      family: "Winbond W25Q",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CAPACITY_ENDURANCE_RETENTION_AND_FLUSH_MODEL",
    },
    {
      role: "METADATA_STORAGE",
      family: "ST M24C",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CALIBRATION_RECORD_AND_ENDURANCE_MODEL",
    },
    {
      role: "LOGGER_POWER",
      family: "Microchip MCP1700",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_SOURCE_LOAD_TRANSIENT_NOISE_AND_THERMAL_BUDGET",
    },
  ],
  outline: {
    family: "probe-bank-storage-access",
    closed: true,
    maximumAreaMm2: 1950,
    points: [
      [3, 0],
      [55, 0],
      [55, 8],
      [60, 8],
      [60, 26],
      [55, 26],
      [55, 34],
      [3, 34],
      [3, 29],
      [0, 29],
      [0, 5],
      [3, 5],
    ],
    purposefulFeatures: {
      probeConnectorWing: { edge: "left", projectionMm: 3, spanMm: 24 },
      storageAccessWing: { edge: "right", projectionMm: 5, spanMm: 18 },
      portsOpposed: true,
      analogDigitalPartitionRequired: true,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "exact acquisition logging controller",
      "Freeze exact controller only after channel timing, buffering, storage interface, memory, firmware, safety and lifecycle requirements are declared.",
    ),
    blocked(
      "U_BUFFER",
      "nonvolatile acquisition buffer",
      "Freeze exact buffer only after sample/record volume, outage duration, capacity, endurance, retention and flush/recovery model are calculated.",
    ),
    blocked(
      "U_CAL",
      "calibration metadata storage",
      "Freeze exact metadata storage only after calibration record size, update count, integrity, endurance and retention are declared.",
    ),
    blocked(
      "U_PWR",
      "logger regulator",
      "Freeze exact regulator only after source, analog/digital loads, media transients, noise, dropout and thermal budgets are verified.",
    ),
    approved("C_DEC", "logger decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "U_ADC",
      "exact calibrated multi-channel ADC",
      "Freeze exact converter/package/pin map from channel count, topology, rate, skew, range, noise and linearity.",
    ),
    blocked(
      "P_AFE",
      "per-channel analog front end gain attenuation bias and isolation",
      "Freeze exact amplifiers/resistors/isolation from each source, common-mode, impedance, range and accuracy budget.",
    ),
    blocked(
      "P_PROTECT",
      "per-channel input fault surge and ESD protection",
      "Freeze exact current limiting/clamps/fuses/TVS from overvoltage category without degrading leakage/noise.",
    ),
    blocked(
      "P_FILTER",
      "per-channel anti-alias filters",
      "Freeze exact values/parts from bandwidth, sample rate, source impedance, ADC settling and alias rejection.",
    ),
    blocked(
      "U_REF",
      "exact precision ADC voltage reference and drive",
      "Freeze exact reference/buffer/filter from noise, drift, load, settling and temperature error budget.",
    ),
    blocked(
      "J_INPUT",
      "keyed multi-channel probe input connectors",
      "Freeze exact connectors, pin maps, cable/shield/return, rating and channel identity.",
    ),
    blocked(
      "J_SD",
      "exact removable storage socket and card detect",
      "Freeze exact socket/card, detect, hot-removal, mechanics, insertion life and pin map.",
    ),
    blocked(
      "P_SD",
      "removable media power control interface and ESD",
      "Freeze exact load switch, bulk, pullups/termination, ESD and back-power behavior from write transients.",
    ),
    blocked(
      "U_RTC",
      "exact RTC timestamp timebase and backup",
      "Freeze exact RTC/oscillator/backup, drift, synchronization and invalid-time behavior.",
    ),
    blocked(
      "U_FAIL",
      "power-fail supervisor hold-up and safe shutdown",
      "Freeze thresholds/timing/hold-up energy from worst-case buffered flush and media write completion.",
    ),
    blocked(
      "J_PWR",
      "protected logger power and service connector",
      "Freeze exact connector/source, reverse/fuse/surge, USB/service isolation and grounding.",
    ),
    blocked(
      "P_TEST",
      "channel calibration storage timing and power-fail fixture",
      "Freeze production fixture for stimulus, reference, crosstalk/skew, media, current and interrupted writes.",
    ),
  ],
  requiredTopology: [
    "Freeze each channel signal, range, impedance, common-mode, bandwidth, accuracy, rate, synchronization, isolation and fault category.",
    "Implement per-channel protection, conditioning and calculated anti-alias filtering compatible with the source and ADC settling.",
    "Build a complete error/noise budget over temperature including reference, ADC, amplifier and passive drift; store traceable calibration.",
    "Provide deterministic conversion-ready capture, timestamps, overflow detection and buffers sized so filesystem activity cannot drop samples.",
    "Radio/USB or filesystem activity must not silently drop samples; prove bounded buffering and explicit overflow records.",
    "Size removable media, sustained/worst write throughput, endurance, retention, reserve and flush time from the deployment record model.",
    "Use versioned records with sequence/timestamp/config/calibration/checksum and atomic recovery for reset, brownout, full/absent media and hot removal.",
    "Protect power and channels, prevent media/service back-power, and verify analog rail noise, write transients, hold-up and enclosure thermal gradients.",
    "Production-test every channel, ADC/reference noise/linearity, crosstalk/skew, timestamps, media, current and power-fail recovery.",
  ],
  mandatoryUnresolved: [
    "Freeze channel count and every channel signal, range, common-mode, bandwidth, accuracy, rate, synchronization and safety requirement.",
    "Freeze removable medium/form factor, capacity, throughput, deployment, record, endurance, retention and removal requirements.",
    "Freeze time, buffer, power/hold-up, temperature/EMC and safety requirements.",
    "Select all unresolved exact ADC/AFE/reference/protection/connectors/media/RTC/power-fail parts after calculations.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "channelRangesCommonModeSafetyVerified",
    "inputProtectionLeakageNoiseVerified",
    "antiAliasSettlingVerified",
    "adcLinearityNoiseThroughputVerified",
    "referenceDriftDriveVerified",
    "fullAccuracyErrorBudgetVerified",
    "calibrationTraceabilityVerified",
    "sampleTimingSkewOverflowVerified",
    "storageCapacityEnduranceThroughputVerified",
    "recordChecksumAtomicIntegrityVerified",
    "rtcDriftSyncBackupVerified",
    "powerFailHoldUpFlushVerified",
    "connectorShieldBackpowerVerified",
    "analogPowerThermalVerified",
    "productionCalibrationStoragePowerFailTestVerified",
  ],
});
export function validateDataLoggerArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [
      /channel.*connector|probe.*connector/,
      "data-logger-channel-connectors-missing",
    ],
    [/input.*protection/, "data-logger-input-protection-missing"],
    [
      /anti.?alias|analog front end/,
      "data-logger-channel-conditioning-missing",
    ],
    [
      /multi-channel adc|adc.*(?:data acquisition|converter)/,
      "data-logger-converter-missing",
    ],
    [/voltage reference/, "data-logger-reference-missing"],
    [/removable storage/, "data-logger-removable-storage-missing"],
    [/logging controller/, "data-logger-controller-missing"],
    [/rtc.*timebase/, "data-logger-timebase-missing"],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.dataLogger || {};
  for (const [k, c] of [
    ["channelRequirementsVerified", "channel-requirements-unverified"],
    ["inputSafetyVerified", "input-safety-unverified"],
    ["acquisitionPerformanceVerified", "acquisition-performance-unverified"],
    ["errorBudgetVerified", "error-budget-unverified"],
    ["timingSynchronizationVerified", "timing-unverified"],
    [
      "storageCapacityEnduranceVerified",
      "storage-capacity-endurance-unverified",
    ],
    ["mediaRemovalRecoveryVerified", "media-recovery-unverified"],
    ["powerIntegrityVerified", "power-integrity-unverified"],
    ["mechanicalMediaVerified", "media-mechanical-unverified"],
    ["productionCalibrationVerified", "production-calibration-unverified"],
  ])
    if (!e[k]) errors.push(`data-logger-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateDataLoggerProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["channelEnvelope", "channel-envelope-undeclared"],
    ["acquisitionEnvelope", "acquisition-envelope-undeclared"],
    ["timingEnvelope", "timing-envelope-undeclared"],
    ["storageEnvelope", "storage-envelope-undeclared"],
    ["recordIntegrityEnvelope", "record-integrity-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["safetyEnvelope", "safety-envelope-undeclared"],
    ["environmentEnvelope", "environment-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`data-logger-${code}`);
  for (const [p, c] of [
    [/multi-channel adc/, "data-acquisition-front-end-missing"],
    [/analog front end/, "data-acquisition-front-end-missing"],
    [/input fault.*protection/, "data-logger-input-protection-missing"],
    [/anti-alias filters/, "data-logger-antialias-filter-missing"],
    [/voltage reference/, "data-logger-voltage-reference-missing"],
    [/probe input connectors/, "multi-channel-input-missing"],
    [/removable storage socket/, "removable-storage-missing"],
    [/media power control/, "data-logger-card-power-control-missing"],
    [/rtc timestamp/, "data-logger-timebase-missing"],
    [/power-fail supervisor/, "data-logger-power-fail-integrity-missing"],
    [/logging controller/, "data-logger-controller-buffering-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("data-logger-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.portsOpposed !== true ||
    f.probeConnectorWing?.projectionMm < 3 ||
    f.storageAccessWing?.projectionMm < 5 ||
    f.analogDigitalPartitionRequired !== true
  )
    errors.push("data-logger-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `data-logger-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.data-logger-remediation-gate.v1",
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
