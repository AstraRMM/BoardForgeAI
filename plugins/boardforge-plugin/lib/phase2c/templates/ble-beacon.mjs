import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const BLE_BEACON_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.ble-beacon.v1";
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
export const bleBeaconProductionProposal = Object.freeze({
  schema: BLE_BEACON_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_BEACON_FORMAT_RANGE_LIFETIME_AND_WEARABLE_ENVELOPE",
  boardId: "025_BLE_BEACON",
  maximumAreaMm2: 900,
  architecture:
    "Compact autonomous BLE advertising beacon with qualified 2.4 GHz RF, protected pulse-capable battery, deterministic clocks, secure identity provisioning, and production RF/current test",
  protocolEnvelope: null,
  rfEnvelope: null,
  detectionEnvelope: null,
  energyEnvelope: null,
  securityEnvelope: null,
  sensingEnvelope: null,
  wearableEnvelope: null,
  regulatoryEnvelope: null,
  serviceEnvelope: null,
  primarySources: {
    bluetoothCore:
      "https://www.bluetooth.com/specifications/specs/core-specification-5-4/",
    nordicSoc: "https://www.nordicsemi.com/Products/nRF52811",
  },
  candidates: [
    {
      role: "BLE_RADIO_SOC",
      family: "Nordic nRF52",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PROTOCOL_MEMORY_SECURITY_PACKAGE_AND_CERTIFICATION",
    },
    {
      role: "BLE_RADIO_SOC",
      family: "TI CC2340R5",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PROTOCOL_MEMORY_SECURITY_PACKAGE_AND_CERTIFICATION",
    },
    {
      role: "ENVIRONMENTAL_SENSOR",
      family: "Bosch BME280",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_MEASURANDS_ACCURACY_DUTY_AND_EXPOSURE",
    },
  ],
  outline: {
    family: "compact-beacon-antenna-tab",
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
      antennaTab: { projectionMm: 4, spanMm: 12 },
      antennaCopperKeepoutRequired: true,
      batteryPocket: "center",
      programmingEdge: "left",
      attachmentHoleCount: 1,
    },
  },
  bom: [
    blocked(
      "U_SENSOR",
      "optional exact environmental sensor if mission requires",
      "Freeze exact sensor only if measurands, accuracy, calibration, sampling duty, self-heating, exposure and lifetime requirements justify it.",
    ),
    approved("C_DEC", "BLE supply decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "U_BLE",
      "exact BLE radio SoC or certified module",
      "Freeze exact ordering code, package, pin map, Bluetooth feature set, memory, security, lifecycle and certification.",
    ),
    blocked(
      "J_ANT",
      "qualified 2.4 GHz antenna or RF connector",
      "Freeze exact antenna/connector from ground plane, enclosure, body placement, gain and certification.",
    ),
    blocked(
      "P_RF",
      "BLE RF matching balun and harmonic filter",
      "Freeze exact topology, values and parts from selected radio reference design and measured final antenna impedance.",
    ),
    blocked(
      "D_RF",
      "low-capacitance antenna ESD protection",
      "Freeze exact RF ESD MPN with capacitance, insertion loss, surge return and match evidence.",
    ),
    blocked(
      "Y_HF",
      "BLE high-frequency radio reference",
      "Freeze exact crystal/TCXO, load network and accuracy across startup, voltage, aging and temperature if module does not integrate it.",
    ),
    blocked(
      "Y_LF",
      "low-power sleep clock",
      "Freeze exact 32.768 kHz crystal or calibrated RC policy, load, accuracy and wake scheduling error.",
    ),
    blocked(
      "BT1",
      "protected pulse-capable beacon battery and holder",
      "Freeze exact chemistry, cell, holder, ingestion controls, pulse impedance, fuse/reverse protection and derated capacity.",
    ),
    blocked(
      "P_PWR",
      "battery brownout bulk and low-leakage power network",
      "Freeze exact bulk capacitor, supervisor/load switch/regulator as required from radio pulses, leakage and end-of-life voltage.",
    ),
    blocked(
      "J_PROG",
      "protected programming provisioning and debug interface",
      "Freeze exact SWD/test-pad geometry, ESD/back-power isolation, debug lock and fixture.",
    ),
    blocked(
      "P_ID",
      "secure unique identity key and address storage",
      "Freeze provisioning authority, protected storage, privacy/address rotation, ownership transfer and decommissioning.",
    ),
    blocked(
      "P_TEST",
      "BLE conducted or qualified OTA production RF interface",
      "Freeze exact test connector/coupler or repeatable fixture for frequency, power, harmonics, packets and antenna continuity.",
    ),
  ],
  requiredTopology: [
    "Declare Bluetooth version, beacon format, advertising PHY/channels, payload, interval, transmit power, connectability, commissioning and receiver ecosystem.",
    "Implement selected radio reference supplies, decoupling, clocks, reset/debug, RF match/filter, controlled impedance, ground vias and antenna keepout.",
    "Qualify antenna match, efficiency, polarization and detuning in the final PCB, cell, enclosure, attachment and body-worn orientations.",
    "Include body absorption and orientation loss explicitly in the wearable detection and link analysis.",
    "Calculate detection latency and missed-detection probability from advertising and scanner schedules, interference, orientation, absorption and fading.",
    "Calculate life from sleep, all advertising channel events, startup, sensors, commissioning, leakage, self-discharge, pulse impedance and temperature derating.",
    "Protect cell and prevent debug/service back-power; prove safe brownout without corrupt identity, counters or advertising configuration.",
    "Provision unique identity/keys with privacy, consent, authenticated configuration/update, locked debug, reset, transfer and decommission policies.",
    "Production-test identity/configuration, clocks, payload/interval/power, frequency error, harmonics, packet reception, antenna continuity and current states.",
  ],
  mandatoryUnresolved: [
    "Freeze beacon protocol, payload, advertising interval/power, receiver, range, latency and missed-detection requirements.",
    "Freeze region/certification, antenna, enclosure/body placement, battery chemistry and cell, life, temperature, moisture and safety requirements.",
    "Freeze identity/privacy, key ownership, provisioning/update, debug, reset and decommission policy.",
    "Select unresolved exact radio, clocks, RF, battery/protection, provisioning and test assets after requirements and budgets are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "bleProtocolAdvertisingVerified",
    "radioPinMapReferenceTopologyVerified",
    "hfLfClockAccuracyVerified",
    "rfMatchHarmonicEsdVerified",
    "antennaEfficiencyEnclosureBodyDetuningVerified",
    "rangeLatencyMissProbabilityVerified",
    "advertisingEventCurrentVerified",
    "batteryPulseEnergyTemperatureLifeVerified",
    "brownoutLeakageBackpowerVerified",
    "sensorRequirementAccuracyVerified",
    "identityKeysPrivacyProvisioningVerified",
    "debugUpdateResetDecommissionVerified",
    "wearableIngressThermalMechanicalVerified",
    "productionRfClockCurrentIdentityTestVerified",
  ],
});
export function validateBleBeaconArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  if (!has(/ble.*radio|bluetooth.*soc|ble.*module/))
    errors.push("ble-beacon-radio-missing");
  if (!has(/2\.4.*antenna|ble.*antenna/))
    errors.push("ble-beacon-antenna-missing");
  if (!has(/rf.*matching|balun|harmonic.*filter/))
    errors.push("ble-beacon-rf-network-missing");
  if (!has(/frequency.*reference|radio.*clock|ble.*clock|32\.768/))
    errors.push("ble-beacon-frequency-reference-missing");
  if (!has(/battery.*holder|beacon.*battery|battery.*energy.*source/))
    errors.push("ble-beacon-energy-source-missing");
  if (
    !has(/programming.*provisioning|provisioning.*programming|debug.*interface/)
  )
    errors.push("ble-beacon-provisioning-missing");
  const e = definition.semanticEvidence?.bleBeacon || {};
  for (const [k, c] of [
    ["beaconFormatVerified", "format-unverified"],
    ["rangeDetectionVerified", "range-detection-unverified"],
    ["antennaAssemblyVerified", "antenna-assembly-unverified"],
    ["regulatoryVerified", "regulatory-unverified"],
    ["energyLifetimeVerified", "energy-lifetime-unverified"],
    ["identityPrivacyVerified", "identity-privacy-unverified"],
    ["wearableMechanicalVerified", "wearable-mechanical-unverified"],
    ["productionRfTestVerified", "production-rf-test-unverified"],
  ])
    if (!e[k]) errors.push(`ble-beacon-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateBleBeaconProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["protocolEnvelope", "protocol-envelope-undeclared"],
    ["rfEnvelope", "rf-envelope-undeclared"],
    ["detectionEnvelope", "detection-envelope-undeclared"],
    ["energyEnvelope", "energy-envelope-undeclared"],
    ["securityEnvelope", "security-envelope-undeclared"],
    ["sensingEnvelope", "sensing-envelope-undeclared"],
    ["wearableEnvelope", "wearable-envelope-undeclared"],
    ["regulatoryEnvelope", "regulatory-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`ble-beacon-${code}`);
  for (const [p, c] of [
    [/exact ble radio/, "ble-beacon-radio-missing"],
    [/2\.4 ghz antenna/, "ble-beacon-antenna-missing"],
    [/rf matching balun/, "ble-beacon-rf-network-missing"],
    [/antenna esd/, "ble-beacon-rf-esd-missing"],
    [/high-frequency radio reference/, "ble-beacon-hf-clock-missing"],
    [/sleep clock/, "ble-beacon-lf-clock-missing"],
    [/beacon battery/, "ble-beacon-battery-source-missing"],
    [/brownout.*power network/, "ble-beacon-low-iq-power-missing"],
    [/programming provisioning/, "ble-beacon-programming-interface-missing"],
    [/secure unique identity/, "ble-beacon-identity-provisioning-missing"],
    [/production rf interface/, "ble-beacon-production-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("ble-beacon-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.antennaTab?.projectionMm < 4 ||
    f.antennaTab?.spanMm < 12 ||
    f.antennaCopperKeepoutRequired !== true
  )
    errors.push("ble-beacon-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `ble-beacon-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.ble-beacon-remediation-gate.v1",
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
