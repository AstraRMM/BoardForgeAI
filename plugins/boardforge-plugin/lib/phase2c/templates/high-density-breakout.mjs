import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const HIGH_DENSITY_BREAKOUT_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.high-density-breakout.v1";
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
export const highDensityBreakoutProductionProposal = Object.freeze({
  schema: HIGH_DENSITY_BREAKOUT_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CONNECTOR_PAIR_PIN_MAP_STACKUP_AND_CHANNELS",
  boardId: "048_HIGH_DENSITY_BREAKOUT",
  maximumAreaMm2: 3350,
  architecture:
    "Connector-matched high-density adapter with exact mating connectors, bijective pin map, preserved pairs/returns, controlled-impedance stackup, power/contact allocation, identity and full continuity/isolation test",
  sourceConnectorEnvelope: null,
  destinationConnectorEnvelope: null,
  pinMapEnvelope: null,
  signalIntegrityEnvelope: null,
  powerEnvelope: null,
  protectionEnvelope: null,
  mechanicalEnvelope: null,
  identityEnvelope: null,
  testEnvelope: null,
  candidates: [
    {
      role: "MEZZANINE_CONNECTOR_PAIR",
      family: "Samtec QSH/QTH",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CONTACT_COUNT_STACK_HEIGHT_PIN_MAP_RATING_AND_MATES",
    },
    {
      role: "MEZZANINE_CONNECTOR_PAIR",
      family: "Hirose DF40",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CONTACT_COUNT_STACK_HEIGHT_PIN_MAP_RATING_AND_MATES",
    },
    {
      role: "ADAPTER_IDENTITY",
      family: "ST M24C",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_IDENTITY_ADDRESS_POWER_COMPATIBILITY_AND_ENDURANCE",
    },
    {
      role: "POWER_PROTECTION",
      family: "Schurter 3413",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_RAIL_CURRENT_INRUSH_FAULT_HOTPLUG_AND_COORDINATION",
    },
  ],
  outline: {
    family: "opposed-connector-matched-adapter",
    closed: true,
    maximumAreaMm2: 3350,
    points: [
      [7, 0],
      [75, 0],
      [75, 12],
      [82, 12],
      [82, 32],
      [75, 32],
      [75, 44],
      [7, 44],
      [7, 32],
      [0, 32],
      [0, 12],
      [7, 12],
    ],
    purposefulFeatures: {
      sourceConnectorEar: { edge: "left", projectionMm: 7, spanMm: 20 },
      destinationConnectorEar: { edge: "right", projectionMm: 7, spanMm: 20 },
      pinOneDatumsOpposed: true,
      connectorKeepoutsRequired: true,
    },
  },
  bom: [
    blocked(
      "U_ID",
      "exact adapter identity revision EEPROM",
      "Freeze exact identity storage only after host compatibility, address, rail, pullups, record format, update count, endurance and retention are declared.",
    ),
    blocked(
      "F_PWR",
      "adapter power fuse",
      "Freeze exact fuse only after rail allocation, current, contact ampacity, inrush, hot-plug, ambient derating, fault energy and protection coordination are declared.",
    ),
    approved("C_ID", "adapter ID decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "J_SRC",
      "exact source high-density mezzanine connector",
      "Freeze manufacturer ordering code, mating half/cable, contacts/numbering, orientation, stack, plating, keying, rating and land pattern.",
    ),
    blocked(
      "J_DST",
      "exact destination high-density breakout connector",
      "Freeze manufacturer ordering code, mating half/cable, contacts/numbering, orientation, stack, plating, keying, rating and land pattern.",
    ),
    blocked(
      "P_PINMAP",
      "authoritative bijective source-to-destination pin map",
      "Freeze every contact signal/direction/voltage/standard/pair/polarity/return/power/ground/reserved/shield and intentional exception.",
    ),
    blocked(
      "P_PWRMAP",
      "power ground contact allocation and return-path map",
      "Freeze per-contact derating, simultaneous current, mating resistance, temperature rise, return current, sequence and hot-plug.",
    ),
    blocked(
      "P_PAIR",
      "differential pair lane polarity and reference map",
      "Freeze pair membership/polarity/permitted swaps/adjacent grounds, data rates, rise times and topology.",
    ),
    blocked(
      "P_STACK",
      "fabrication stackup controlled-impedance channel contract",
      "Freeze materials/geometry/reference/impedance/loss/via/coupling/length/skew including both connectors and cable.",
    ),
    blocked(
      "P_SIGPROT",
      "interface-specific connector ESD common-mode signal protection",
      "Freeze exact parts only after pin interfaces are known; forbid generic clamps on RF/analog/HV/reserved/high-speed pins.",
    ),
    blocked(
      "P_PWRPROT",
      "connector power current-limit reverse and backpower protection",
      "Freeze exact fuse/eFuse/reverse/surge parts for declared rails, inrush, faults and hot-plug.",
    ),
    blocked(
      "P_SHIELD",
      "connector shields chassis and ground bond network",
      "Freeze shield contacts/chassis bond/ground allocation/discharge paths and enclosure relationship.",
    ),
    blocked(
      "P_IDCFG",
      "adapter ID address straps pullups and compatibility contract",
      "Freeze immutable identity/revision/capabilities, address/power/pullups and incompatible-host behavior.",
    ),
    blocked(
      "P_MECH",
      "connector guide key retention mounting and stack hardware",
      "Freeze exact guides/keys/standoffs/fasteners, XY/rotation/coplanarity/height/tolerance/force/cycles/vibration.",
    ),
    blocked(
      "P_TEST",
      "stubless full continuity isolation lane fixture",
      "Freeze mating fixtures and map for every net/short/pair polarity/power resistance/ID/loopback/channel without high-speed stubs.",
    ),
  ],
  requiredTopology: [
    "Freeze exact source/destination connector ordering codes, mating parts, numbering/orientation, stack/cable, keying and land patterns.",
    "Create reviewable bijective contact map including signals, direction, voltage, standards, pair polarity/returns, power/ground and reserved/shield.",
    "Prove one-to-one connectivity for every mapped contact and explicitly document every intentional split, merge, no-connect or reserved pin.",
    "Preserve differential pairs/returns and avoid stubs/test pads/protection that violate channels.",
    "Freeze stackup and route each class to calculated impedance, reference, length/skew, vias and connector/cable loss budget.",
    "Allocate power/ground contacts from derated current/contact resistance/temperature and analyze sequence/hot-plug/inrush/backfeed.",
    "Apply only interface-proven signal and power protection with parasitics included in channel analysis.",
    "Freeze identity/compatibility and exact connector mechanics, stack height, supports, force, cycles, strain and vibration.",
    "Production-test every net for continuity/shorts, polarity, power resistance/current, identity and high-speed channel as required.",
  ],
  mandatoryUnresolved: [
    "Freeze exact source and destination connector/order codes, mates, revisions and mechanics.",
    "Freeze authoritative source pinout and destination pinout with complete interfaces and reserved-pin behavior.",
    "Freeze rails/faults/ground/shield/ESD/stackup/SI/test.",
    "Select unresolved exact connectors/protection/hardware/fixture only after pin-map/SI/power/mechanical analyses.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "connectorOrderingMatingVerified",
    "pinMapBijectionVerified",
    "reservedNoConnectRationaleVerified",
    "differentialPairPolarityVerified",
    "powerGroundContactBudgetVerified",
    "connectorVoltageCurrentCycleVerified",
    "stackupImpedanceVerified",
    "channelInsertionLossVerified",
    "lengthSkewTimingVerified",
    "protectionParasiticsVerified",
    "hotplugInrushBackpowerVerified",
    "shieldChassisGroundVerified",
    "identityCompatibilityVerified",
    "connectorXyHeightToleranceVerified",
    "productionContinuityIsolationChannelVerified",
  ],
});
export function validateHighDensityBreakoutArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/source high-density/, "high-density-source-connector-missing"],
    [
      /destination high-density|destination breakout connector/,
      "high-density-destination-connector-missing",
    ],
    [
      /power current-limit|connector power fuse protection/,
      "high-density-power-protection-missing",
    ],
    [/connector esd/, "high-density-signal-protection-missing"],
    [
      /identity revision eeprom|adapter id eeprom.*identity/,
      "high-density-module-identity-missing",
    ],
    [
      /continuity isolation|continuity fixture test pad/,
      "high-density-test-access-missing",
    ],
    [/retention mounting/, "high-density-retention-missing"],
    [
      /shields chassis|shield bond chassis/,
      "high-density-shield-grounding-missing",
    ],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.highDensityBreakout || {};
  for (const [k, c] of [
    ["connectorOrderingMatingVerified", "connectors-unverified"],
    ["pinMapBijectionVerified", "pin-map-unverified"],
    ["differentialPairPolarityVerified", "differential-pairs-unverified"],
    ["stackupImpedanceChannelVerified", "channel-si-unverified"],
    ["powerGroundContactBudgetVerified", "power-ground-budget-unverified"],
    ["protectionParasiticsVerified", "protection-unverified"],
    ["identityCompatibilityVerified", "identity-unverified"],
    ["mechanicalMatingVerified", "mechanical-mating-unverified"],
    ["productionContinuityIsolationVerified", "production-test-unverified"],
  ])
    if (!e[k]) errors.push(`high-density-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateHighDensityBreakoutProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    count = (p) => roles.filter((x) => p.test(x)).length;
  for (const [key, code] of [
    ["sourceConnectorEnvelope", "source-connector-envelope-undeclared"],
    [
      "destinationConnectorEnvelope",
      "destination-connector-envelope-undeclared",
    ],
    ["pinMapEnvelope", "pin-map-envelope-undeclared"],
    ["signalIntegrityEnvelope", "signal-integrity-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["protectionEnvelope", "protection-envelope-undeclared"],
    ["mechanicalEnvelope", "mechanical-envelope-undeclared"],
    ["identityEnvelope", "identity-envelope-undeclared"],
    ["testEnvelope", "test-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`high-density-breakout-${code}`);
  if (count(/high-density.*connector/) < 2)
    errors.push("high-density-connectors-missing");
  for (const [p, c] of [
    [/bijective.*pin map/, "breakout-pin-map-evidence-missing"],
    [/power ground contact/, "breakout-power-ground-map-missing"],
    [/differential pair lane/, "breakout-differential-pair-map-missing"],
    [/connector esd/, "breakout-protection-missing"],
    [/power current-limit/, "breakout-power-protection-missing"],
    [
      /stackup controlled-impedance/,
      "breakout-impedance-stackup-evidence-missing",
    ],
    [/identity revision eeprom/, "breakout-identification-missing"],
    [
      /continuity isolation lane/,
      "breakout-continuity-production-test-missing",
    ],
  ])
    if (count(p) < 1) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("high-density-breakout-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.sourceConnectorEar?.projectionMm < 7 ||
    f.destinationConnectorEar?.projectionMm < 7 ||
    f.pinOneDatumsOpposed !== true ||
    f.connectorKeepoutsRequired !== true
  )
    errors.push("high-density-breakout-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `high-density-breakout-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.high-density-breakout-remediation-gate.v1",
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
