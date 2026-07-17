import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const LORA_NODE_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.lora-node.v1";
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

export const loraNodeProductionProposal = Object.freeze({
  schema: LORA_NODE_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_REGION_NETWORK_LINK_AND_ENERGY_BUDGETS",
  boardId: "024_LORA_NODE",
  maximumAreaMm2: 3350,
  architecture:
    "Region-qualified low-power LoRa sensor node with a verified radio and antenna chain, protected autonomous supply, secure provisioning, deterministic sleep/wake, and production RF test",
  regionalEnvelope: null,
  networkEnvelope: null,
  linkEnvelope: null,
  rfEnvelope: null,
  sensingEnvelope: null,
  energyEnvelope: null,
  securityEnvelope: null,
  environmentEnvelope: null,
  serviceEnvelope: null,
  primarySources: {
    radio: "https://www.semtech.com/uploads/documents/sx1261-2.pdf",
    regionalParameters:
      "https://resources.lora-alliance.org/technical-specifications/rp002-1-0-4-regional-parameters",
  },
  candidates: [
    {
      role: "LORA_RADIO",
      family: "Semtech SX1261/SX1262",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_REGION_LINK_AND_PACKAGE",
    },
    {
      role: "INTEGRATED_RADIO_MCU",
      family: "ST STM32WL",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_REGION_NETWORK_FIRMWARE_AND_PACKAGE",
    },
    {
      role: "HOST_CONTROLLER",
      family: "Raspberry Pi RP2040",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_ENERGY_INTERFACE_AND_LIFECYCLE",
    },
    {
      role: "ENVIRONMENTAL_SENSOR",
      family: "Bosch BME280",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_MEASURANDS_ACCURACY_AND_EXPOSURE",
    },
    {
      role: "LOW_QUIESCENT_POWER",
      family: "Microchip MCP1700",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_SOURCE_TX_TRANSIENT_AND_THERMAL_BUDGET",
    },
  ],
  outline: {
    family: "sub-ghz-antenna-clearance-nose",
    closed: true,
    maximumAreaMm2: 3350,
    points: [
      [0, 0],
      [68, 0],
      [68, 12],
      [75, 12],
      [75, 32],
      [68, 32],
      [68, 44],
      [0, 44],
    ],
    purposefulFeatures: {
      antennaNose: { projectionMm: 7, spanMm: 20 },
      antennaCopperKeepoutRequired: true,
      rfFeedEdge: "right",
      sensorExposureZone: "top-left",
      batteryZone: "body",
      mountingHoleCount: 4,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "low-power LoRa host controller",
      "Freeze exact controller only after network stack, interfaces, memory, sleep/wake, security, firmware and lifecycle requirements are declared.",
    ),
    blocked(
      "U_SENSOR",
      "exact environmental sensor",
      "Freeze exact sensor only after measurands, accuracy, calibration, duty cycle, self-heating and exposure requirements are declared.",
    ),
    blocked(
      "U_PWR",
      "low-quiescent-current 3.3 V regulator",
      "Freeze exact regulator only after source, radio TX transient, dropout, quiescent current, noise, startup and thermal budgets are verified.",
    ),
    approved(
      "C_DEC",
      "radio and controller decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    blocked(
      "U_RADIO",
      "region-qualified exact LoRa transceiver or module",
      "Freeze country, regional plan, legal channels, output/EIRP and exact ordering code, package and pin map.",
    ),
    blocked(
      "J_ANT",
      "qualified LoRa antenna or exact RF connector",
      "Freeze exact antenna/connector/cable from band, ground plane, enclosure, gain and certification.",
    ),
    blocked(
      "P_RF",
      "LoRa RF matching harmonic filter and switch network",
      "Freeze exact values and parts from the selected radio reference design, antenna impedance and conducted measurements.",
    ),
    blocked(
      "D_RF",
      "low-capacitance antenna RF ESD protection",
      "Freeze exact RF ESD MPN with capacitance, insertion loss, surge return and antenna match evidence.",
    ),
    blocked(
      "Y_RF",
      "radio TCXO crystal or frequency reference",
      "Freeze exact reference, load/control, startup and accuracy across voltage, aging and temperature.",
    ),
    blocked(
      "P_SOURCE",
      "protected deployment energy source",
      "Freeze exact battery/source, holder, fuse/reverse protection and temperature-derated capacity.",
    ),
    blocked(
      "P_SLEEP",
      "radio and sensor sleep wake power control",
      "Freeze exact switches, wake lines, leakage, state sequencing and brownout behavior.",
    ),
    blocked(
      "J_PROV",
      "protected provisioning and service interface",
      "Freeze exact keyed connector, ESD, debug lock, back-power behavior and credential injection flow.",
    ),
    blocked(
      "P_SEC",
      "credential protection and persistent frame-counter storage",
      "Freeze exact secure-storage/protection implementation, key ownership, rollback and decommissioning policy.",
    ),
    blocked(
      "P_TEST",
      "conducted RF production test interface",
      "Freeze exact RF test connector/coupler and isolation approach or qualify a repeatable OTA fixture.",
    ),
  ],
  requiredTopology: [
    "Declare deployment countries and applicable LoRa regional parameters, channels, bandwidth, data rate, dwell/duty limits, conducted power, EIRP and certification.",
    "Declare LoRa or LoRaWAN version/class, join method, network, payload/rate, downlink, retry and outage behavior.",
    "Implement the frozen radio reference supply, reset/busy/DIO/SPI, clock, matching, harmonic filtering, RF switching, controlled impedance and ground-via structure.",
    "Qualify antenna impedance, efficiency, polarization and detuning with final ground plane, enclosure, battery, sensor, cable and installation.",
    "Calculate link margin from legal power, path, fading, interference, gains/losses and receiver sensitivity.",
    "Maximum data-sheet range is not a link budget or deployment guarantee; treat it only as a capability claim.",
    "Budget sleep, sensing, processing, transmit, receive windows, joins/retries, quiescent current, self-discharge and temperature for mission life.",
    "Persist frame counters and unique keys safely through reset/brownout; lock readout/debug and define update, commissioning and decommissioning.",
    "Verify wake sources, interrupt levels, startup timing, sensor stabilization and no floating/back-powered state.",
    "Production-test frequency error, output power, harmonics/match, packets/sensitivity, antenna continuity, current states, identity and credentials.",
  ],
  mandatoryUnresolved: [
    "Freeze country/region, band, network, payload schedule, legal limits and certification strategy.",
    "Freeze path, enclosure, antenna installation, coexistence, required link margin and environmental exposure.",
    "Freeze power source, runtime, temperature, sensing loads, retry model and service/security policy.",
    "Select all unresolved exact radio/RF/power/security/test assets only after those requirements are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "regionFrequencyDutyCycleVerified",
    "networkJoinRetryProtocolVerified",
    "radioPinMapReferenceTopologyVerified",
    "rfMatchHarmonicEsdVerified",
    "antennaImpedanceEfficiencyDetuningVerified",
    "linkBudgetFadeMarginVerified",
    "eirpRegulatoryCertificationVerified",
    "energyBudgetTemperatureRetryVerified",
    "sleepWakeLeakageTimingVerified",
    "sensorAccuracySelfHeatingVerified",
    "provisioningKeyFrameCounterSecurityVerified",
    "enclosureThermalEnvironmentalVerified",
    "productionRfCurrentCredentialTestVerified",
  ],
});

export function validateLoraNodeArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  if (!has(/lora.*radio|lora.*transceiver|sub.?ghz.*radio/))
    errors.push("lora-radio-missing");
  if (!has(/lora.*antenna|sub.?ghz.*antenna/))
    errors.push("lora-antenna-missing");
  if (!has(/rf.*matching|harmonic.*filter|lora.*rf.*network/))
    errors.push("lora-rf-network-missing");
  if (!has(/frequency.*reference|tcxo|radio.*crystal/))
    errors.push("lora-frequency-reference-missing");
  if (
    !has(
      /low.*power.*controller|telemetry.*controller|integrated.*radio.*mcu|lora.*host.*controller/,
    )
  )
    errors.push("lora-controller-missing");
  if (!has(/battery.*management|node.*power.*management|deployment.*energy/))
    errors.push("lora-power-management-missing");
  if (!has(/provisioning.*interface|secure.*service.*interface/))
    errors.push("lora-provisioning-interface-missing");
  const e = definition.semanticEvidence?.loraNode || {};
  if (!e.regionFrequencyPlanVerified)
    errors.push("lora-region-frequency-plan-unverified");
  if (!e.networkProtocolVerified)
    errors.push("lora-network-protocol-unverified");
  if (!e.linkBudgetVerified) errors.push("lora-link-budget-unverified");
  if (!e.rfMatchingVerified) errors.push("lora-rf-matching-unverified");
  if (!e.antennaAssemblyVerified)
    errors.push("lora-antenna-assembly-unverified");
  if (!e.regulatoryVerified) errors.push("lora-regulatory-unverified");
  if (!e.energyBudgetVerified) errors.push("lora-energy-budget-unverified");
  if (!e.securityProvisioningVerified)
    errors.push("lora-security-provisioning-unverified");
  if (!e.productionRfTestVerified)
    errors.push("lora-production-rf-test-unverified");
  return { ok: errors.length === 0, errors };
}
export function validateLoraNodeProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["regionalEnvelope", "regional-envelope-undeclared"],
    ["networkEnvelope", "network-envelope-undeclared"],
    ["linkEnvelope", "link-envelope-undeclared"],
    ["rfEnvelope", "rf-envelope-undeclared"],
    ["sensingEnvelope", "sensing-envelope-undeclared"],
    ["energyEnvelope", "energy-envelope-undeclared"],
    ["securityEnvelope", "security-envelope-undeclared"],
    ["environmentEnvelope", "environment-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`lora-node-${code}`);
  for (const [p, c] of [
    [/exact lora transceiver/, "lora-radio-missing"],
    [/lora antenna/, "lora-antenna-network-missing"],
    [/rf matching harmonic filter/, "lora-rf-filter-match-missing"],
    [/antenna rf esd/, "lora-rf-esd-missing"],
    [/tcxo crystal|frequency reference/, "lora-reference-clock-missing"],
    [/host controller/, "lora-controller-missing"],
    [/environmental sensor/, "lora-sensor-missing"],
    [/deployment energy source/, "low-power-supply-control-missing"],
    [/sleep wake power control/, "low-power-supply-control-missing"],
    [/provisioning.*interface/, "lora-provisioning-interface-missing"],
    [/credential protection/, "lora-security-storage-missing"],
    [/rf production test/, "lora-production-test-interface-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("lora-node-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.antennaNose?.projectionMm < 7 ||
    f.antennaNose?.spanMm < 20 ||
    f.antennaCopperKeepoutRequired !== true
  )
    errors.push("lora-node-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `lora-node-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.lora-node-remediation-gate.v1",
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
