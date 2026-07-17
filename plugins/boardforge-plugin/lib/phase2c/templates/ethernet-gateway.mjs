import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const ETHERNET_GATEWAY_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.ethernet-gateway.v1";
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
export const ethernetGatewayProductionProposal = Object.freeze({
  schema: ETHERNET_GATEWAY_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CAN_INSTALLATION_TRAFFIC_SECURITY_AND_POWER",
  boardId: "027_ETHERNET_GATEWAY",
  maximumAreaMm2: 1600,
  architecture:
    "Non-PoE 100BASE-TX to CAN gateway with exact MAC/PHY, MagJack, clock and protection, protected field interface, bounded translation, secure management and recovery",
  ethernetEnvelope: null,
  fieldInterfaceEnvelope: null,
  trafficEnvelope: null,
  powerEnvelope: null,
  poeEnvelope: null,
  securityEnvelope: null,
  installationEnvelope: null,
  emcEnvelope: null,
  thermalEnvelope: null,
  serviceEnvelope: null,
  primarySources: {
    ethernet:
      "https://docs.wiznet.io/assets/files/W5500_ds_v110e-226ffec190c588b69f88d629789585e1.pdf",
    magjack:
      "https://www.we-online.com/components/products/datasheet/7499010121A.pdf",
    can: "https://www.ti.com/lit/ds/symlink/sn65hvd230.pdf",
  },
  candidates: [
    {
      role: "ETHERNET_PHY",
      family: "TI DP83825",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_RATE_MAC_INTERFACE_MEDIA_AND_PACKAGE",
    },
    {
      role: "ETHERNET_MAC_PHY",
      family: "WIZnet W5500",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_NETWORK_THROUGHPUT_SPI_AND_PACKAGE",
    },
    {
      role: "GATEWAY_CONTROLLER",
      family: "ST STM32F1",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_TRAFFIC_MEMORY_SECURITY_AND_LIFECYCLE",
    },
    {
      role: "FIELD_TRANSCEIVER",
      family: "TI SN65HVD230",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_FIELD_PROTOCOL_COMMON_MODE_SURGE_AND_ISOLATION",
    },
  ],
  outline: {
    family: "asymmetric-rj45-can-dual-port",
    closed: true,
    maximumAreaMm2: 1600,
    points: [
      [4, 0],
      [40, 0],
      [40, 5],
      [47, 5],
      [47, 27],
      [40, 27],
      [40, 32],
      [4, 32],
      [4, 24],
      [0, 24],
      [0, 8],
      [4, 8],
    ],
    purposefulFeatures: {
      ethernetPortWing: { edge: "right", projectionMm: 7, spanMm: 22 },
      canPortWing: { edge: "left", projectionMm: 4, spanMm: 16 },
      portsOpposed: true,
      asymmetric: true,
      chassisBondZone: "ethernet-right",
    },
  },
  bom: [
    blocked(
      "U_ETH",
      "exact Ethernet MAC PHY controller",
      "Freeze exact controller only after rate, duplex, network behavior, throughput, host interface, memory, lifecycle and package are declared.",
    ),
    blocked(
      "J_ETH",
      "exact non-PoE Ethernet MagJack connector and isolation magnetics",
      "Freeze exact MagJack only after media, pair mapping, magnetics, shield/chassis, creepage, PoE policy, enclosure and lifecycle are declared.",
    ),
    blocked(
      "Y_ETH",
      "exact Ethernet PHY reference clock",
      "Freeze exact clock only after selected PHY/MAC frequency, tolerance, jitter, startup, load, voltage, temperature and aging requirements are known.",
    ),
    blocked(
      "D_ETH",
      "exact Ethernet cable ESD protection",
      "Freeze exact cable protection from surge/ESD standards, capacitance, standoff, clamp coordination and chassis return path.",
    ),
    blocked(
      "R_BIAS",
      "exact Ethernet PHY bias resistor",
      "Freeze exact bias only from the selected PHY authoritative reference and tolerance/temperature analysis.",
    ),
    blocked(
      "R_TERM",
      "exact Ethernet line termination",
      "Freeze exact termination values and topology only from the selected PHY and magnetics reference design plus SI analysis.",
    ),
    blocked(
      "U_CTRL",
      "exact gateway controller",
      "Freeze exact controller only after traffic, buffering, interfaces, security, firmware, memory and lifecycle are declared.",
    ),
    blocked(
      "U_CAN",
      "exact second-protocol transceiver",
      "Freeze the non-Ethernet protocol and its voltage, bitrate, common-mode, fault, surge, grounding and isolation requirements first.",
    ),
    blocked(
      "R_CAN",
      "exact field-bus termination",
      "Freeze exact termination only after the non-Ethernet bus topology, impedance and node position are declared.",
    ),
    blocked(
      "D_CAN",
      "exact field-port ESD protection",
      "Freeze exact protection only after the field protocol and surge/ESD/common-mode envelope are declared.",
    ),
    blocked(
      "F_IN",
      "gateway input fuse",
      "Freeze exact fuse only after source, load, inrush, ambient derating, fault energy and protection coordination are declared.",
    ),
    blocked(
      "D_IN",
      "gateway input surge clamp",
      "Freeze exact clamp only after source surge waveform, standoff, clamp voltage, energy and fuse coordination are declared.",
    ),
    blocked(
      "U_KEYS",
      "hardware-backed gateway credential storage",
      "Freeze exact secure element or protected internal key scheme after the threat model and lifecycle policy; generic flash is not hardware-backed identity.",
    ),
    approved("C_DEC", "gateway decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "P_ETH",
      "Ethernet reset straps analog supply and center-tap network",
      "Freeze exact reset/strap values, clock loads, analog decoupling, center-tap and chassis network from W5500 and MagJack reference evidence.",
    ),
    blocked(
      "J_CAN",
      "keyed CAN second-port connector",
      "Freeze exact connector/cable/pin map including CANH CANL return shield and any field power.",
    ),
    blocked(
      "P_ISO",
      "CAN isolation isolated power and grounding decision",
      "Freeze installation common-mode/surge/grounding, then exact isolator/converter or documented non-isolated safety case.",
    ),
    blocked(
      "J_PWR",
      "protected gateway power connector",
      "Freeze exact source connector and voltage/current/surge/ground envelope; Ethernet MagJack is explicitly non-PoE.",
    ),
    blocked(
      "P_PWR",
      "gateway regulated power and brownout supervision",
      "Freeze exact conversion, sequencing, bulk and supervisor from traffic peaks, source and thermal calculations.",
    ),
    blocked(
      "J_PROV",
      "protected provisioning debug and recovery interface",
      "Freeze exact interface, ESD/back-power isolation, debug lock, secure recovery and fixture.",
    ),
    blocked(
      "P_SEC",
      "hardware-backed gateway identity and update security",
      "Freeze key authority/storage, secure boot, authenticated update, rollback, renewal, reset and decommissioning.",
    ),
    blocked(
      "P_TEST",
      "Ethernet CAN power protection security production fixture",
      "Freeze exact link/packet/pair, CAN, surge-path continuity, current, credentials and recovery test fixture.",
    ),
  ],
  requiredTopology: [
    "Freeze Ethernet rate/duplex, IP/network behavior, cable/shield, throughput, EMC/surge, isolation/chassis and explicitly non-PoE policy.",
    "Freeze CAN bitrate, topology, nodes, connector/cable, common-mode, isolation, termination, surge and grounding.",
    "Implement W5500 supplies, clock, reset, straps, analog bias, decoupling and SPI timing from authoritative references.",
    "Route controlled-impedance matched Ethernet pairs between controller and MagJack with short cable-side ESD returns to chassis.",
    "Implement CAN transceiver, termination policy, protection, keyed port and isolation decision without mislabeling SN65HVD230 as isolated.",
    "Bound queues, validate frames and define rate conversion, timestamps, retry/deduplication, backpressure, malformed traffic, link loss and reboot.",
    "A generic logic header is not a gateway field port; require an exact non-Ethernet physical layer, connector and bounded translation contract.",
    "Protect input and both cable ports, prevent back-power, and verify power, thermal, grounding, EMC and surge behavior.",
    "Provision unique identity with authenticated configuration/update, rollback, locked debug, watchdog/brownout recovery and production traceability.",
  ],
  mandatoryUnresolved: [
    "Freeze Ethernet network/cable/chassis/EMC and explicit PoE policy requirements.",
    "Freeze the non-Ethernet protocol, electrical interface, connector, isolation and installation requirements.",
    "Freeze traffic, security, recovery, source/load and thermal requirements.",
    "Select every unresolved support, connector, isolation, power, security and fixture asset only after requirements are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "ethernetControllerPinMapSupportVerified",
    "clockResetStrapsTimingVerified",
    "pairImpedanceReturnLossVerified",
    "magjackCenterTapChassisGroundingVerified",
    "ethernetCableEsdSurgeVerified",
    "nonPoePolicyVerified",
    "canElectricalTerminationProtectionVerified",
    "canIsolationGroundingDecisionVerified",
    "bothConnectorPinMapsVerified",
    "throughputLatencyBackpressureVerified",
    "malformedTrafficOutageFailsafeVerified",
    "powerBrownoutThermalVerified",
    "credentialProvisionSecureUpdateVerified",
    "emcSurgeSafetyVerified",
    "productionEthernetCanSecurityRecoveryTestVerified",
  ],
});
export function validateEthernetGatewayArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/ethernet.*mac/, "ethernet-gateway-mac-controller-missing"],
    [/ethernet.*phy/, "ethernet-gateway-phy-missing"],
    [/reference clock/, "ethernet-gateway-clock-missing"],
    [
      /isolation magnetics|ethernet.*magnetics/,
      "ethernet-gateway-magnetics-missing",
    ],
    [
      /magjack connector|rj45.*ethernet.*connector/,
      "ethernet-gateway-cable-connector-missing",
    ],
    [
      /cable.*esd|ethernet.*(?:esd|surge).*protection/,
      "ethernet-gateway-cable-protection-missing",
    ],
    [
      /can.*transceiver|field.*protocol.*transceiver/,
      "ethernet-gateway-field-transceiver-missing",
    ],
    [
      /can.*connector|field.*connector/,
      "ethernet-gateway-field-connector-missing",
    ],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.ethernetGateway || {};
  for (const [k, c] of [
    ["ethernetInterfaceVerified", "interface-unverified"],
    ["signalIntegrityVerified", "signal-integrity-unverified"],
    ["magneticsGroundingVerified", "magnetics-grounding-unverified"],
    ["fieldElectricalInterfaceVerified", "field-interface-unverified"],
    ["trafficEnvelopeVerified", "traffic-envelope-unverified"],
    ["powerPoePolicyVerified", "power-poe-policy-unverified"],
    ["securityRecoveryVerified", "security-recovery-unverified"],
    ["emcSafetyVerified", "emc-safety-unverified"],
    ["productionTestVerified", "production-test-unverified"],
  ])
    if (!e[k]) errors.push(`ethernet-gateway-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateEthernetGatewayProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["ethernetEnvelope", "ethernet-envelope-undeclared"],
    ["fieldInterfaceEnvelope", "field-interface-envelope-undeclared"],
    ["trafficEnvelope", "traffic-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["poeEnvelope", "poe-envelope-undeclared"],
    ["securityEnvelope", "security-envelope-undeclared"],
    ["installationEnvelope", "installation-envelope-undeclared"],
    ["emcEnvelope", "emc-envelope-undeclared"],
    ["thermalEnvelope", "thermal-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`ethernet-gateway-${code}`);
  for (const [p, c] of [
    [/ethernet mac phy/, "ethernet-mac-controller-missing"],
    [/magjack connector.*magnetics/, "ethernet-magnetics-missing"],
    [/reference clock/, "ethernet-reference-clock-missing"],
    [/cable esd/, "ethernet-line-protection-missing"],
    [/reset straps/, "ethernet-phy-reset-network-missing"],
    [
      /can second-protocol transceiver/,
      "ethernet-gateway-second-protocol-missing",
    ],
    [/can second-port connector/, "ethernet-gateway-second-port-missing"],
    [/can field esd/, "ethernet-gateway-second-port-protection-missing"],
    [
      /isolation.*grounding decision/,
      "ethernet-gateway-isolation-decision-missing",
    ],
    [/power connector/, "ethernet-gateway-power-connector-missing"],
    [/regulated power/, "ethernet-gateway-power-missing"],
    [/provisioning debug/, "ethernet-gateway-recovery-update-missing"],
    [/identity.*security/, "ethernet-gateway-security-storage-missing"],
    [/production fixture/, "ethernet-gateway-production-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("ethernet-gateway-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.portsOpposed !== true ||
    f.asymmetric !== true ||
    f.ethernetPortWing?.projectionMm < 7 ||
    f.canPortWing?.projectionMm < 4
  )
    errors.push("ethernet-gateway-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `ethernet-gateway-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.ethernet-gateway-remediation-gate.v1",
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
