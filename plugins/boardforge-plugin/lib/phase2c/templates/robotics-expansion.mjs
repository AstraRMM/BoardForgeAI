import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const ROBOTICS_EXPANSION_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.robotics-expansion.v1";
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
export const roboticsExpansionProductionProposal = Object.freeze({
  schema: ROBOTICS_EXPANSION_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_PARENT_CONNECTOR_IO_POWER_AND_STACK",
  boardId: "034_ROBOTICS_EXPANSION",
  maximumAreaMm2: 1250,
  architecture:
    "Parent-matched robot I/O mezzanine with exact mating connectors and pin map, protected external ports, explicit rail ownership, module identity, safe outputs and verified stack mechanics",
  parentEnvelope: null,
  connectorEnvelope: null,
  pinMapEnvelope: null,
  ioEnvelope: null,
  railOwnershipEnvelope: null,
  mechanicalEnvelope: null,
  safetyEnvelope: null,
  serviceEnvelope: null,
  candidates: [
    {
      role: "LOCAL_CONTROLLER",
      family: "Raspberry Pi RP2040",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PARENT_IO_TIMING_POWER_AND_LIFECYCLE",
    },
    {
      role: "IO_EXPANDER",
      family: "TI TCA9539",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_IO_COUNT_VOLTAGE_TIMING_ADDRESS_AND_SAFE_STATE",
    },
    {
      role: "PROGRAM_STORAGE",
      family: "Winbond W25Q",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_FIRMWARE_CAPACITY_SECURITY_AND_LIFECYCLE",
    },
    {
      role: "MODULE_IDENTITY",
      family: "ST M24C",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PARENT_IDENTITY_ADDRESS_POWER_AND_COMPATIBILITY",
    },
    {
      role: "LOCAL_POWER",
      family: "Microchip MCP1700",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_RAIL_OWNERSHIP_LOAD_TRANSIENT_AND_THERMAL_BUDGET",
    },
  ],
  outline: {
    family: "parent-matched-keyed-mezzanine",
    closed: true,
    maximumAreaMm2: 1250,
    points: [
      [0, 0],
      [38, 0],
      [38, 6],
      [42, 6],
      [42, 22],
      [38, 22],
      [38, 28],
      [0, 28],
    ],
    purposefulFeatures: {
      parentKeyEar: { edge: "right", projectionMm: 4, spanMm: 16 },
      parentDatum: "lower-left",
      mountingHoleCount: 2,
      mezzanineKeepoutRequired: true,
      heightEnvelopeRequired: true,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "exact local expansion controller",
      "Freeze exact controller only after parent buses, I/O matrix, timing/loading, power, safety, firmware and lifecycle are declared.",
    ),
    blocked(
      "U_FLASH",
      "exact controller program storage",
      "Freeze exact storage only after firmware capacity, update/recovery, security, endurance and lifecycle are declared.",
    ),
    blocked(
      "U_ID",
      "exact module identity revision EEPROM",
      "Freeze exact identity storage only after parent enumeration, address, rail, pullups, record format, compatibility and endurance are declared.",
    ),
    blocked(
      "U_PWR",
      "mezzanine local regulator",
      "Freeze exact regulator only after parent rail ownership, voltage/current, sequence, inrush, backfeed, transient and thermal budgets are verified.",
    ),
    approved("C_DEC", "mezzanine decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "J_MEZZ_A",
      "exact parent-matched board-to-board connector A",
      "Freeze manufacturer mating pair, stack height, pin numbering, XY/rotation, insertion cycles and parent revision.",
    ),
    blocked(
      "J_MEZZ_B",
      "exact parent-matched board-to-board connector B",
      "Freeze manufacturer mating pair, stack height, pin numbering, XY/rotation, insertion cycles and parent revision.",
    ),
    blocked(
      "P_PINMAP",
      "authoritative parent mezzanine pin map and reserved-pin contract",
      "Freeze every rail/ground/signal/reserved pin, direction, voltage/current, ownership, sequence, bus address and revision compatibility.",
    ),
    blocked(
      "J_IO1",
      "keyed robot expansion I/O connector 1",
      "Freeze exact port type, pin map, cable, voltage/current/rate, safe state and retention.",
    ),
    blocked(
      "J_IO2",
      "keyed robot expansion I/O connector 2",
      "Freeze exact port type, pin map, cable, voltage/current/rate, safe state and retention.",
    ),
    blocked(
      "P_IO",
      "external I/O ESD EFT surge miswire protection",
      "Freeze exact protection/filter/isolation for each frozen external interface.",
    ),
    blocked(
      "U_LEVEL",
      "mezzanine and I/O level translation bus conditioning",
      "Freeze exact translator/buffer/transceiver from voltage domains, direction, loading, timing and unpowered state.",
    ),
    blocked(
      "P_PWR",
      "rail ownership inrush current limit and backfeed protection",
      "Freeze exact switches/eFuses/reverse blocking, sequencing, host/module/external priority and total stack budget.",
    ),
    blocked(
      "P_SAFE",
      "hardware expansion output-enable safe-state gate",
      "Freeze exact gate/pulls/supervisor guaranteeing inactive outputs for insertion/reset/update/incompatible parent.",
    ),
    blocked(
      "J_SERVICE",
      "protected module programming and recovery interface",
      "Freeze exact test pads/connector, ESD/back-power, debug lock and recovery fixture.",
    ),
    blocked(
      "P_MECH",
      "parent stack spacers supports and height-control hardware",
      "Freeze exact standoffs/fasteners, connector mating height, component height map, tolerance and chassis keepouts.",
    ),
    blocked(
      "P_TEST",
      "production parent-mate compatibility and vibration fixture",
      "Freeze every pin/rail/identity/IO, repeated mate, misalignment, stack load, hot-plug, thermal and vibration test fixture.",
    ),
  ],
  requiredTopology: [
    "Freeze exact parent revision, connector mating pair, XY/rotation/height and authoritative pin map.",
    "A generic header is insufficient: require authoritative parent connector ordering codes, mating halves, contact numbering and reserved-pin behavior.",
    "Freeze each I/O connector, signal, voltage/current, timing, protection and safe state.",
    "Implement identity/revision/capability data with collision-free enumeration and incompatible-parent behavior.",
    "Condition buses and level domains with aggregate loading/address allocation over maximum supported stack.",
    "Protect/limit external ports and define rail ownership, sequencing, inrush, backfeed and contact ampacity.",
    "Guarantee hardware-safe outputs during insertion, reset, update, unpowered states and incompatible host.",
    "Verify outline, keepouts, component heights, stack tolerances, supports, retention, mating cycles, shock/vibration and cable strain.",
    "Production-test every mated pin/rail, enumeration, I/O/protection, backfeed, thermal, repeated mating and stack compatibility.",
  ],
  mandatoryUnresolved: [
    "Freeze the exact host board/revision, connector pair, pin map and stack mechanics.",
    "Freeze external I/O types/counts, electrical limits, safe states and protection requirements.",
    "Freeze rail ownership/current/hotplug/backfeed and safe states.",
    "Select unresolved exact connectors/conditioning/power/mechanics/test parts after parent contract.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "parentConnectorPairMatchedVerified",
    "parentPinMapReservedPinsVerified",
    "connectorXyRotationStackHeightVerified",
    "ioElectricalPinMapsVerified",
    "ioProtectionVerified",
    "levelTranslationBusLoadingVerified",
    "railOwnershipSequenceBackpowerVerified",
    "connectorAmpacityTemperatureRiseVerified",
    "identityRevisionCompatibilityVerified",
    "safeOutputInsertionResetVerified",
    "hotplugMatingSequenceVerified",
    "componentKeepoutHeightToleranceVerified",
    "shockVibrationRetentionVerified",
    "productionRepeatedMateStackCompatibilityVerified",
  ],
});
export function validateRoboticsExpansionArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [
      /board-to-board connector|host mezzanine connector/,
      "robotics-expansion-mezzanine-connector-missing",
    ],
    [/identity revision eeprom/, "robotics-expansion-module-identity-missing"],
    [/expansion controller/, "robotics-expansion-io-controller-missing"],
    [
      /expansion i\/o connector|external io connector/,
      "robotics-expansion-external-ports-missing",
    ],
    [
      /i\/o esd|external io port protection/,
      "robotics-expansion-port-protection-missing",
    ],
    [/current limit/, "robotics-expansion-port-power-control-missing"],
    [
      /level translation|level translator/,
      "robotics-expansion-interface-conditioning-missing",
    ],
    [
      /output-enable|output enable/,
      "robotics-expansion-safe-output-gate-missing",
    ],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.roboticsExpansion || {};
  for (const [k, c] of [
    ["hostPinoutMechanicalVerified", "host-interface-unverified"],
    ["ioMatrixVerified", "io-matrix-unverified"],
    ["portElectricalVerified", "port-electrical-unverified"],
    ["timingBusLoadingVerified", "timing-loading-unverified"],
    ["powerHotplugBackfeedVerified", "power-hotplug-unverified"],
    ["safeStateVerified", "safe-state-unverified"],
    ["identityCompatibilityVerified", "identity-compatibility-unverified"],
    ["stackMechanicalVerified", "stack-mechanical-unverified"],
    [
      "productionCompatibilityTestVerified",
      "production-compatibility-unverified",
    ],
  ])
    if (!e[k]) errors.push(`robotics-expansion-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateRoboticsExpansionProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    count = (p) => roles.filter((x) => p.test(x)).length;
  for (const [key, code] of [
    ["parentEnvelope", "parent-envelope-undeclared"],
    ["connectorEnvelope", "connector-envelope-undeclared"],
    ["pinMapEnvelope", "pin-map-envelope-undeclared"],
    ["ioEnvelope", "io-envelope-undeclared"],
    ["railOwnershipEnvelope", "rail-ownership-envelope-undeclared"],
    ["mechanicalEnvelope", "mechanical-envelope-undeclared"],
    ["safetyEnvelope", "safety-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`robotics-expansion-${code}`);
  if (count(/board-to-board connector/) < 2)
    errors.push("robotics-expansion-mezzanine-connectors-missing");
  if (count(/expansion i\/o connector/) < 2)
    errors.push("robotics-expansion-io-connectors-missing");
  for (const [p, c] of [
    [/parent mezzanine pin map/, "robotics-expansion-pin-map-evidence-missing"],
    [/i\/o esd/, "robotics-expansion-io-protection-missing"],
    [/level translation/, "robotics-expansion-level-translation-missing"],
    [/rail ownership/, "robotics-expansion-rail-ownership-missing"],
    [/identity revision eeprom/, "robotics-expansion-identification-missing"],
    [/output-enable safe-state/, "robotics-expansion-default-state-missing"],
    [/stack spacers/, "robotics-expansion-mechanical-stack-missing"],
    [/parent-mate compatibility/, "robotics-expansion-production-test-missing"],
  ])
    if (count(p) < 1) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("robotics-expansion-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.parentKeyEar?.projectionMm < 4 ||
    f.mezzanineKeepoutRequired !== true ||
    f.heightEnvelopeRequired !== true
  )
    errors.push("robotics-expansion-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `robotics-expansion-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.robotics-expansion-remediation-gate.v1",
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
