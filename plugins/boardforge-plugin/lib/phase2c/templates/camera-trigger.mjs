import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const CAMERA_TRIGGER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.camera-trigger.v1";
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
export const cameraTriggerProductionProposal = Object.freeze({
  schema: CAMERA_TRIGGER_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CAMERA_INTERFACES_TIMING_AND_ISOLATION",
  boardId: "029_CAMERA_TRIGGER",
  maximumAreaMm2: 2300,
  channelCount: 4,
  architecture:
    "Four-channel deterministic camera trigger with protected sync input, hardware timing, independent galvanic isolation and camera-compatible output stages",
  cameraInterfaceEnvelope: null,
  timingEnvelope: null,
  channelEnvelope: null,
  isolationEnvelope: null,
  syncEnvelope: null,
  powerEnvelope: null,
  environmentEnvelope: null,
  safetyEnvelope: null,
  serviceEnvelope: null,
  primarySources: {
    isolation: "https://www.ti.com/lit/ds/symlink/iso7721.pdf",
  },
  candidates: [
    {
      role: "DIGITAL_ISOLATION",
      family: "TI ISO77xx",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CAMERA_LEVELS_TIMING_INSULATION_AND_POWER",
    },
    {
      role: "ISOLATED_POWER_AND_DATA",
      family: "Analog Devices ADuM540x",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_POWER_INSULATION_EMISSIONS_AND_THERMAL",
    },
    {
      role: "TIMING_CONTROLLER",
      family: "ST STM32G0",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_COUNT_TIMER_TIMING_AND_LIFECYCLE",
    },
    {
      role: "TIMING_REFERENCE",
      family: "Abracon ABM8",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_FREQUENCY_ACCURACY_JITTER_DRIFT_AND_LOAD",
    },
  ],
  outline: {
    family: "four-bay-camera-edge",
    closed: true,
    maximumAreaMm2: 2300,
    points: [
      [0, 0],
      [56, 0],
      [56, 2],
      [63, 2],
      [63, 34],
      [56, 34],
      [56, 36],
      [0, 36],
    ],
    purposefulFeatures: {
      cameraConnectorEdge: {
        edge: "right",
        projectionMm: 7,
        spanMm: 32,
        bayCount: 4,
      },
      syncInputEdge: "left",
      barrierSlotRequiredPerChannel: true,
      channelsPhysicallySeparated: true,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "exact deterministic trigger controller with hardware timers",
      "Freeze exact controller only after channel count, trigger patterns, timer resolution, latency, firmware contribution, interfaces, fault behavior and lifecycle are declared.",
    ),
    blocked(
      "Y_TIME",
      "exact trigger timing reference",
      "Freeze exact reference only after frequency, load, accuracy, jitter, startup, voltage, temperature and aging budgets are verified.",
    ),
    approved(
      "C_DEC",
      "trigger controller decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      blocked(
        `U_ISO${i + 1}`,
        `camera trigger isolation channel ${i + 1}`,
        "Freeze exact isolator/photorelay from camera circuit, propagation/skew, fail state, insulation and power requirements.",
      ),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      blocked(
        `Q_OUT${i + 1}`,
        `camera trigger output driver channel ${i + 1}`,
        "Freeze exact dry-contact/open-drain/push-pull driver, voltage/current/polarity/leakage/on-resistance and inactive state.",
      ),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      blocked(
        `J_CAM${i + 1}`,
        `camera trigger output connector channel ${i + 1}`,
        "Freeze exact keyed camera connector and camera-model pin map, shield, cable, retention and rating.",
      ),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      blocked(
        `P_OUT${i + 1}`,
        `camera trigger output protection channel ${i + 1}`,
        "Freeze exact current limit, clamp/TVS and return path without degrading timing or isolation.",
      ),
    ),
    blocked(
      "J_SYNC",
      "protected external sync input connector",
      "Freeze exact connector, input voltage/polarity/threshold/cable/shield and isolation policy.",
    ),
    blocked(
      "P_SYNC",
      "sync input conditioning isolation and protection",
      "Freeze exact receiver, debounce/filter, hysteresis, ESD/surge and timeout behavior.",
    ),
    blocked(
      "P_ISOPWR",
      "isolated camera-side power domains",
      "Freeze exact shared/per-channel isolated converters, sequencing, capacitance, emissions, thermal and fault containment.",
    ),
    blocked(
      "J_PWR",
      "protected trigger-system power connector",
      "Freeze source connector, fuse/reverse/surge/conversion and domain back-power rules.",
    ),
    blocked(
      "P_TEST",
      "multi-channel production timing and isolation fixture",
      "Freeze fixture for levels, leakage, pulse width, latency, skew, jitter, barriers, faults and pinout.",
    ),
  ],
  requiredTopology: [
    "Freeze every camera model, connector/circuit, voltage/current/polarity, pulse limits, cable/shield and allowed grounds.",
    "Freeze sync source, patterns/rate, maximum latency/skew/jitter/drift, missed/extra policy and reset/fault state.",
    "Use one independent isolation barrier, driver, protection network and keyed connector per camera channel.",
    "Select isolation and isolated power from working/transient voltage, insulation, propagation, leakage, fault containment, creepage and clearance.",
    "Generate pulses in hardware timers/compare logic from a characterized clock with bounded firmware contribution.",
    "Condition and protect sync input without bridging galvanic domains through service, shield or power paths.",
    "Never parallel unknown camera trigger supplies or grounds; treat every camera channel as an independently qualified electrical domain.",
    "Prove inactive startup/reset/brownout state and no extra pulse during power-domain sequencing or watchdog recovery.",
    "Production-measure each channel level, polarity, pulse, latency, skew, jitter, leakage, isolation state and connector pinout.",
  ],
  mandatoryUnresolved: [
    "Freeze exact camera models, electrical/mechanical interfaces and four-channel grouping.",
    "Freeze sync source, maximum latency/skew/jitter, pulse/error and fault requirements.",
    "Freeze insulation, isolated power, grounding, EMC and installation requirements.",
    "Select unresolved exact isolators, drivers, connectors, protection and power only after requirements are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "cameraVoltageCurrentPolarityVerified",
    "fourIndependentChannelsVerified",
    "isolationWorkingTransientCreepageVerified",
    "isolatedPowerFaultContainmentVerified",
    "clockAccuracyDriftVerified",
    "hardwareTimingLatencyBudgetVerified",
    "interChannelSkewJitterVerified",
    "pulseWidthRetriggerVerified",
    "syncInputQualificationVerified",
    "startupResetBrownoutNoPulseVerified",
    "groundShieldDomainSeparationVerified",
    "cableEsdSurgeEmcVerified",
    "thermalMechanicalVerified",
    "productionFourChannelTimingIsolationTestVerified",
  ],
});
export function validateCameraTriggerArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/sync input connector/, "camera-trigger-sync-input-missing"],
    [
      /trigger controller|trigger timer/,
      "camera-trigger-timing-controller-missing",
    ],
    [
      /trigger isolation channel|isolated trigger channel/,
      "camera-trigger-isolation-missing",
    ],
    [
      /trigger output driver|camera trigger driver/,
      "camera-trigger-output-stage-missing",
    ],
    [
      /trigger output connector|camera output connector/,
      "camera-trigger-output-connectors-missing",
    ],
    [/output protection/, "camera-trigger-output-protection-missing"],
    [/timing reference/, "camera-trigger-clock-reference-missing"],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.cameraTrigger || {};
  if (!e.cameraElectricalInterfaceVerified)
    errors.push("camera-trigger-camera-interface-unverified");
  if (!(e.outputChannelCount >= 1))
    errors.push("camera-trigger-channel-count-undeclared");
  if (!e.isolationSafetyVerified)
    errors.push("camera-trigger-isolation-safety-unverified");
  if (!e.timingBudgetVerified)
    errors.push("camera-trigger-timing-budget-unverified");
  if (!e.pulseBehaviorVerified)
    errors.push("camera-trigger-pulse-behavior-unverified");
  if (!e.powerFaultBehaviorVerified)
    errors.push("camera-trigger-power-fault-behavior-unverified");
  if (!e.productionTimingTestVerified)
    errors.push("camera-trigger-production-timing-test-unverified");
  return { ok: errors.length === 0, errors };
}
export function validateCameraTriggerProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    count = (p) => roles.filter((x) => p.test(x)).length;
  for (const [key, code] of [
    ["cameraInterfaceEnvelope", "camera-interface-envelope-undeclared"],
    ["timingEnvelope", "timing-envelope-undeclared"],
    ["channelEnvelope", "channel-envelope-undeclared"],
    ["isolationEnvelope", "isolation-envelope-undeclared"],
    ["syncEnvelope", "sync-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["environmentEnvelope", "environment-envelope-undeclared"],
    ["safetyEnvelope", "safety-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`camera-trigger-${code}`);
  for (const [p, n, c] of [
    [/trigger isolation channel/, 4, "camera-trigger-isolation-missing"],
    [
      /trigger output driver channel/,
      4,
      "camera-trigger-output-drivers-missing",
    ],
    [
      /trigger output connector channel/,
      4,
      "camera-trigger-output-connectors-missing",
    ],
    [
      /output protection channel/,
      4,
      "camera-trigger-output-protection-missing",
    ],
  ])
    if (count(p) < n) errors.push(c);
  for (const [p, c] of [
    [/hardware timers/, "camera-trigger-timing-source-missing"],
    [/timing reference/, "camera-trigger-timing-source-missing"],
    [/sync input connector/, "camera-trigger-sync-input-missing"],
    [/sync input conditioning/, "camera-trigger-sync-input-protection-missing"],
    [/isolated camera-side power/, "camera-trigger-isolated-power-missing"],
    [/system power connector/, "camera-trigger-power-missing"],
    [/production timing/, "camera-trigger-production-test-missing"],
  ])
    if (count(p) < 1) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("camera-trigger-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.cameraConnectorEdge?.bayCount !== 4 ||
    f.cameraConnectorEdge?.projectionMm < 7 ||
    f.barrierSlotRequiredPerChannel !== true ||
    f.channelsPhysicallySeparated !== true
  )
    errors.push("camera-trigger-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `camera-trigger-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.camera-trigger-remediation-gate.v1",
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
