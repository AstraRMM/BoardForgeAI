import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const LOGIC_ANALYZER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.logic-analyzer.v1";
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
export const logicAnalyzerProductionProposal = Object.freeze({
  schema: LOGIC_ANALYZER_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CHANNELS_THRESHOLDS_RATE_DEPTH_AND_PROBE",
  boardId: "041_LOGIC_ANALYZER",
  maximumAreaMm2: 900,
  architecture:
    "Eight-channel digital acquisition instrument with protected threshold-compatible inputs, deterministic capture/trigger, calibrated clock, bounded memory and verified USB streaming",
  channelThresholdEnvelope: null,
  frontEndEnvelope: null,
  captureEnvelope: null,
  timingEnvelope: null,
  usbEnvelope: null,
  powerEnvelope: null,
  signalIntegrityEnvelope: null,
  calibrationEnvelope: null,
  testEnvelope: null,
  candidates: [
    {
      role: "CAPTURE_CONTROLLER",
      family: "Raspberry Pi RP2040",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_RATE_TRIGGER_DEPTH_USB_AND_PACKAGE",
    },
    {
      role: "LEVEL_TRANSLATOR",
      family: "TI SN74AXC8T245",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_THRESHOLDS_DIRECTION_BANDWIDTH_SKEW_AND_RAILS",
      verified: { notOvervoltageTolerantBeyondSelectedRailLimits: true },
    },
    {
      role: "FIRMWARE_STORAGE",
      family: "Winbond W25Q",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_FIRMWARE_CAPACITY_UPDATE_SECURITY_AND_LIFECYCLE",
    },
    {
      role: "USB_CONNECTOR",
      family: "Amphenol 10118194",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_USB_VERSION_MECHANICS_CURRENT_AND_LIFECYCLE",
    },
    {
      role: "USB_PROTECTION",
      family: "ST USBLC6",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_USB_RATE_ESD_LEVEL_PARASITICS_AND_RETURN_PATH",
    },
  ],
  outline: {
    family: "eight-channel-probe-comb",
    closed: true,
    maximumAreaMm2: 900,
    points: [
      [0, 0],
      [28, 0],
      [28, 8],
      [32, 8],
      [32, 20],
      [28, 20],
      [28, 28],
      [0, 28],
    ],
    purposefulFeatures: {
      probeComb: {
        edge: "right",
        projectionMm: 4,
        spanMm: 12,
        channelCount: 8,
        interleavedGroundRequired: true,
      },
      usbEdge: "left",
      analogFrontEndKeepoutRequired: true,
    },
  },
  bom: [
    blocked(
      "U_CAP",
      "exact programmable capture controller",
      "Freeze exact controller only after channel count, thresholds, simultaneous rate, trigger, capture depth, USB throughput, timing and lifecycle are declared.",
    ),
    blocked(
      "U_FLASH",
      "exact capture firmware storage",
      "Freeze exact storage only after firmware capacity, update/recovery, security, endurance and lifecycle are declared.",
    ),
    blocked(
      "J_USB",
      "exact USB host data connector",
      "Freeze exact connector only after USB version/rate, current role, enclosure, retention, insertion life and cable requirements are declared.",
    ),
    blocked(
      "D_USB",
      "exact USB host ESD protection",
      "Freeze exact protection only after USB rate, ESD standard, capacitance/insertion loss, standoff, clamp behavior and return path are verified.",
    ),
    approved("C_DEC", "capture decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "J_PROBE",
      "exact eight-channel interleaved-ground probe connector",
      "Freeze exact connector/pod/cable pin map, grounds, impedance, retention and target-use category.",
    ),
    blocked(
      "P_PROTECT",
      "per-channel high-speed input ESD overvoltage protection",
      "Freeze exact resistors/clamps/TVS from input/survival range, leakage, capacitance, recovery and energy path.",
    ),
    blocked(
      "U_LEVEL",
      "exact high-speed digital input level translation or comparators",
      "Freeze exact threshold architecture, rails, direction/OE, bandwidth, skew, fail state and unpowered tolerance.",
    ),
    blocked(
      "P_TERM",
      "probe input series termination bias and filtering",
      "Freeze exact values from source loading, cable impedance, edge rate, thresholds and ringing/crosstalk measurements.",
    ),
    blocked(
      "Y_SAMPLE",
      "exact low-jitter analyzer sample clock and external clock input",
      "Freeze exact oscillator/buffer/termination/protection from sample rate, accuracy, jitter and temperature.",
    ),
    blocked(
      "P_TRIGGER",
      "deterministic hardware edge pattern protocol trigger logic",
      "Freeze exact FPGA/PIO/timer logic, trigger depth/latency/pretrigger and CDC implementation.",
    ),
    blocked(
      "U_MEM",
      "exact acquisition capture memory and buffering",
      "Freeze exact memory/interface/package from channels, sample rate, depth, pre/post trigger and host-outage budget.",
    ),
    blocked(
      "P_USB",
      "USB data path power switching and backfeed control",
      "Freeze exact USB power/current/reverse blocking and throughput-compatible interface support.",
    ),
    blocked(
      "J_EXTCLK",
      "protected external sample-clock connector",
      "Freeze exact connector/level/termination/ESD/common-ground policy and frequency range.",
    ),
    blocked(
      "P_PWR",
      "protected analyzer power and target-ground policy",
      "Freeze source regulation, probe/target/USB ground-current/back-power limits and isolation decision.",
    ),
    blocked(
      "P_TEST",
      "production known-pattern threshold timing fixture",
      "Freeze per-channel threshold/loading/survival, skew/crosstalk, jitter, trigger, rate/depth, USB overflow and calibration fixture.",
    ),
  ],
  requiredTopology: [
    "Freeze channels, input/survival ranges, thresholds, impedance/capacitance/bandwidth, probe cable and common-ground/isolation policy.",
    "Protect each input with bounded leakage/capacitance and safe energy path without rail back-power.",
    "Select comparator/buffer/translator from threshold, voltage, direction, bandwidth, skew and fail-state requirements.",
    "A guessed direction is not a universal analyzer front end; define each channel direction, threshold domain, overvoltage behavior and unpowered state.",
    "Use interleaved probe grounds, matched short routes and quantify source loading, ringing, crosstalk and ground bounce.",
    "Prove simultaneous sample rate, deterministic trigger, memory depth and sustained host throughput with explicit overflow policy.",
    "Use calibrated low-jitter internal/external sample clock and constrain CDC/aperture/channel skew.",
    "Protect USB/power and prevent destructive target/probe/host ground or back-power paths.",
    "Production-capture known patterns at full rate/depth and verify threshold, loading, protection, timing, trigger and transfer.",
  ],
  mandatoryUnresolved: [
    "Freeze channel count, electrical thresholds, survival range, probe, loading and common-mode requirements.",
    "Freeze simultaneous sample rate, clock accuracy/jitter, trigger, depth and streaming requirements.",
    "Freeze grounding/backpower/ESD/enclosure/temperature/EMC.",
    "Select unresolved exact input/clock/memory/connectors/power/test assets after SI/timing/throughput analysis.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "channelVoltageThresholdVerified",
    "inputImpedanceCapacitanceVerified",
    "protectionLeakageSurvivalVerified",
    "translatorBandwidthSkewVerified",
    "probeCableRingingCrosstalkVerified",
    "sampleClockAccuracyJitterVerified",
    "channelApertureSkewVerified",
    "triggerLatencyPositionVerified",
    "captureDepthMemoryBandwidthVerified",
    "usbSustainedThroughputVerified",
    "overflowDropReportingVerified",
    "groundingBackpowerIsolationPolicyVerified",
    "esdEmcVerified",
    "productionKnownPatternRateDepthVerified",
  ],
});
export function validateLogicAnalyzerArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/capture controller/, "logic-analyzer-capture-engine-missing"],
    [/probe connector/, "logic-analyzer-probe-connector-missing"],
    [/input (?:esd|protection)/, "logic-analyzer-input-protection-missing"],
    [
      /level translat|input buffer.*translator/,
      "logic-analyzer-input-buffer-missing",
    ],
    [/sample clock/, "logic-analyzer-sample-clock-missing"],
    [/hardware.*trigger/, "logic-analyzer-trigger-missing"],
    [/capture memory/, "logic-analyzer-capture-memory-missing"],
    [/usb host data/, "logic-analyzer-host-interface-missing"],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.logicAnalyzer || {};
  for (const [k, c] of [
    ["channelElectricalVerified", "channel-electrical-unverified"],
    ["inputLoadingProtectionVerified", "loading-protection-unverified"],
    ["sampleTimingVerified", "sample-timing-unverified"],
    ["triggerPerformanceVerified", "trigger-performance-unverified"],
    ["captureDepthStreamingVerified", "depth-streaming-unverified"],
    ["probeSignalIntegrityVerified", "probe-si-unverified"],
    ["groundingIsolationPolicyVerified", "grounding-policy-unverified"],
    ["hostThroughputVerified", "host-throughput-unverified"],
    ["productionCalibrationVerified", "production-calibration-unverified"],
  ])
    if (!e[k]) errors.push(`logic-analyzer-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateLogicAnalyzerProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["channelThresholdEnvelope", "channel-threshold-envelope-undeclared"],
    ["frontEndEnvelope", "front-end-envelope-undeclared"],
    ["captureEnvelope", "capture-envelope-undeclared"],
    ["timingEnvelope", "timing-envelope-undeclared"],
    ["usbEnvelope", "usb-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["signalIntegrityEnvelope", "signal-integrity-envelope-undeclared"],
    ["calibrationEnvelope", "calibration-envelope-undeclared"],
    ["testEnvelope", "test-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`logic-analyzer-${code}`);
  for (const [p, c] of [
    [/probe connector/, "logic-analyzer-probe-connectors-missing"],
    [/eight-channel/, "logic-analyzer-input-channels-missing"],
    [/input esd/, "logic-analyzer-input-protection-missing"],
    [/level translation/, "logic-analyzer-level-translation-missing"],
    [/capture controller/, "logic-analyzer-capture-controller-missing"],
    [/sample clock/, "logic-analyzer-sample-clock-missing"],
    [/hardware.*trigger/, "logic-analyzer-trigger-missing"],
    [/capture memory/, "logic-analyzer-memory-missing"],
    [/usb host data/, "logic-analyzer-host-interface-missing"],
    [/known-pattern/, "logic-analyzer-production-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("logic-analyzer-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.probeComb?.channelCount !== 8 ||
    f.probeComb?.projectionMm < 4 ||
    f.probeComb?.interleavedGroundRequired !== true ||
    f.analogFrontEndKeepoutRequired !== true
  )
    errors.push("logic-analyzer-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `logic-analyzer-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.logic-analyzer-remediation-gate.v1",
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
