import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const WIFI_GATEWAY_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.wifi-gateway.v1";
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
export const wifiGatewayProductionProposal = Object.freeze({
  schema: WIFI_GATEWAY_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CAN_TRAFFIC_SECURITY_AND_INSTALLATION",
  boardId: "026_WIFI_GATEWAY",
  maximumAreaMm2: 1250,
  architecture:
    "Wi-Fi to CAN gateway with an exact integrated-antenna module, protected CAN and power domains, bounded translation, secure provisioning/update, and autonomous recovery",
  gatewayEnvelope: null,
  wifiEnvelope: null,
  fieldInterfaceEnvelope: null,
  trafficEnvelope: null,
  powerEnvelope: null,
  securityEnvelope: null,
  installationEnvelope: null,
  regulatoryEnvelope: null,
  serviceEnvelope: null,
  primarySources: {
    esp32s3HardwareGuidelines:
      "https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/",
    canTransceiver: "https://www.ti.com/lit/ds/symlink/sn65hvd230.pdf",
  },
  candidates: [
    {
      role: "WIFI_MODULE",
      family: "Espressif ESP32-S3",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_REGION_ROLE_THROUGHPUT_MEMORY_AND_CERTIFICATION",
    },
    {
      role: "WIFI_MODULE",
      family: "TI CC3235MOD",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_REGION_ROLE_THROUGHPUT_SECURITY_AND_CERTIFICATION",
    },
    {
      role: "CAN_TRANSCEIVER",
      family: "TI SN65HVD230",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_BITRATE_COMMON_MODE_SURGE_AND_ISOLATION",
    },
    {
      role: "POWER_CONVERSION",
      family: "Microchip MCP1700",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_SOURCE_RADIO_BURST_AND_THERMAL_BUDGET",
    },
  ],
  outline: {
    family: "opposed-wifi-can-connector-wings",
    closed: true,
    maximumAreaMm2: 1250,
    points: [
      [5, 0],
      [37, 0],
      [37, 4],
      [42, 4],
      [42, 26],
      [37, 26],
      [37, 30],
      [5, 30],
      [5, 26],
      [0, 26],
      [0, 4],
      [5, 4],
    ],
    purposefulFeatures: {
      wifiAntennaEdge: "top",
      antennaCopperKeepoutRequired: true,
      canConnectorWing: { edge: "right", projectionMm: 5, spanMm: 22 },
      powerServiceWing: { edge: "left", projectionMm: 5, spanMm: 22 },
      connectorSidesOpposed: true,
    },
  },
  bom: [
    blocked(
      "U_WIFI",
      "exact WiFi controller module with integrated antenna",
      "Freeze exact module ordering code only after region, bands, role, throughput, memory, security, antenna/enclosure, lifecycle and certification are declared.",
    ),
    blocked(
      "U_CAN",
      "exact CAN secondary-protocol transceiver",
      "Freeze exact transceiver only after CAN standard/bitrate, node/cable topology, common-mode, fault, surge, grounding and isolation are declared.",
    ),
    blocked(
      "R_TERM",
      "exact CAN termination resistor",
      "Freeze termination value, tolerance, power, switchability and placement from the declared bus topology.",
    ),
    blocked(
      "D_CAN",
      "exact CAN interface ESD protection",
      "Freeze exact protection only after surge/ESD levels, capacitance, standoff, clamp coordination and return path are declared.",
    ),
    blocked(
      "F_IN",
      "gateway input fuse",
      "Freeze exact fuse only after source voltage/current, inrush, fault energy, ambient derating and coordination are declared.",
    ),
    blocked(
      "D_IN",
      "gateway input transient clamp",
      "Freeze exact clamp only after source surge waveform, standoff, clamp voltage, energy and fuse coordination are declared.",
    ),
    blocked(
      "U_PWR",
      "gateway 3.3 V regulator",
      "Freeze exact converter only after source range, Wi-Fi burst, CAN load, transient, dropout, efficiency and thermal budgets are verified.",
    ),
    approved("C_DEC", "gateway decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "U_KEYS",
      "hardware-backed credential storage",
      "Freeze exact secure element or protected internal key scheme only after threat model, key authority, secure boot/update, rollback and lifecycle policy are declared; generic flash is not hardware-backed identity.",
    ),
    blocked(
      "J_CAN",
      "keyed CAN field connector",
      "Freeze exact connector, CANH/CANL/ground/shield/power pin map, cable, current and mating system.",
    ),
    blocked(
      "J_PWR",
      "protected gateway power connector",
      "Freeze exact input connector and source envelope from installation voltage, surge, grounding and attached-load requirements.",
    ),
    blocked(
      "P_PWR",
      "radio-burst-capable protected power conversion",
      "Freeze exact converter, bulk network, reverse protection and supervisor from source range, Wi-Fi peaks and thermal calculations; MCP1700 is not pre-approved for the load.",
    ),
    blocked(
      "P_ISO",
      "CAN isolation and isolated power if installation requires",
      "Resolve grounding/common-mode/surge requirements, then freeze exact isolator and isolated converter or document why non-isolated CAN is safe.",
    ),
    blocked(
      "J_PROV",
      "protected provisioning debug and recovery interface",
      "Freeze exact connector/test pads, ESD/back-power isolation, bootstrap policy, debug lock and recovery fixture.",
    ),
    blocked(
      "P_SEC",
      "hardware-backed identity key and secure-boot provisioning",
      "Freeze exact secure-storage/efuse policy, key authority, authenticated update, rollback, renewal, reset and decommissioning.",
    ),
    blocked(
      "P_RF",
      "final module antenna keepout enclosure and EMC qualification",
      "Freeze enclosure/material/placement and compliance test plan; no copper or connector may violate the module antenna keepout.",
    ),
    blocked(
      "P_TEST",
      "gateway production RF CAN power and security fixture",
      "Freeze exact conducted/OTA, CAN traffic, protection continuity, current, credential and recovery test fixture.",
    ),
  ],
  requiredTopology: [
    "Freeze Wi-Fi region, bands, role, network/security, provisioning, antenna/enclosure, throughput and certification.",
    "Freeze CAN bitrate/FD policy, node count, topology, cable/connector, common-mode, termination, isolation, surge and attached power.",
    "Follow the exact module land pattern, supply, boot/straps, reset, flash, debug and antenna keepout requirements.",
    "Implement CAN transceiver, termination policy, ESD, connector, grounding and optional isolation from source-backed electrical limits.",
    "Bound queues and rate conversion; validate frames and define timestamps, retry/deduplication, backpressure, malformed traffic, outage and reboot behavior.",
    "A generic GPIO/I2C/UART header is not a protocol gateway; require an exact field physical layer and bounded translation behavior.",
    "Protect input and both external interfaces; prevent back-power and prove Wi-Fi burst transient and regulator/enclosure thermal margin.",
    "Provision unique identity and credentials with secure boot/update, rollback, locked debug, authenticated configuration, renewal, reset and transfer.",
    "Production-test supplies/current, Wi-Fi RF/packets, CAN transmit/receive and protection, pinout, watchdog/recovery, credentials and traceability.",
  ],
  mandatoryUnresolved: [
    "Freeze the non-Wi-Fi protocol, connector/cable, nodes, bitrate, common-mode, isolation, termination, protection and installation.",
    "Freeze Wi-Fi region/role/security, antenna enclosure, range, throughput, coexistence and certification.",
    "Freeze translation buffering/backpressure/outage/update, availability, source/load and thermal envelope.",
    "Select unresolved connectors, power, isolation, provisioning, security and fixture assets after requirements are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "wifiRegionBandCertificationVerified",
    "modulePinMapKeepoutVerified",
    "canPhysicalLayerTerminationVerified",
    "bothConnectorPinMapsProtectionVerified",
    "isolationGroundingDecisionVerified",
    "wifiAntennaEnclosureDetuningVerified",
    "trafficThroughputLatencyBackpressureVerified",
    "radioBurstPowerTransientVerified",
    "regulatorEnclosureThermalVerified",
    "emcEsdSurgeVerified",
    "credentialProvisionSecureBootUpdateVerified",
    "watchdogFailsafeRecoveryVerified",
    "productionWifiCanPowerSecurityTestVerified",
  ],
});
export function validateWifiGatewayArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  if (
    !has(
      /wi.?fi.*radio|wi.?fi.*module|wireless.*lan.*module|wifi.*controller.*module/,
    )
  )
    errors.push("wifi-gateway-radio-missing");
  if (!has(/wi.?fi.*antenna|integrated.*antenna/))
    errors.push("wifi-gateway-antenna-missing");
  if (
    !has(
      /field.*protocol.*transceiver|gateway.*physical.*layer|can.*transceiver/,
    )
  )
    errors.push("wifi-gateway-field-transceiver-missing");
  if (!has(/field.*connector|can.*connector/))
    errors.push("wifi-gateway-field-connector-missing");
  if (!has(/input.*protection|gateway.*power.*protection|input.*fuse/))
    errors.push("wifi-gateway-power-protection-missing");
  if (!has(/field.*protection|can.*esd/))
    errors.push("wifi-gateway-io-protection-missing");
  if (!has(/provisioning.*debug|secure.*(?:service|provisioning).*interface/))
    errors.push("wifi-gateway-provisioning-missing");
  const e = definition.semanticEvidence?.wifiGateway || {};
  for (const [k, c] of [
    ["gatewayProtocolsVerified", "protocols-unverified"],
    ["trafficEnvelopeVerified", "traffic-envelope-unverified"],
    ["wifiRegionBandVerified", "region-band-unverified"],
    ["antennaAssemblyVerified", "antenna-assembly-unverified"],
    ["fieldElectricalInterfaceVerified", "field-interface-unverified"],
    ["securityProvisioningVerified", "security-provisioning-unverified"],
    ["powerThermalVerified", "power-thermal-unverified"],
    ["faultRecoveryVerified", "fault-recovery-unverified"],
    ["regulatoryVerified", "regulatory-unverified"],
    ["productionTestVerified", "production-test-unverified"],
  ])
    if (!e[k]) errors.push(`wifi-gateway-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateWifiGatewayProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["gatewayEnvelope", "gateway-envelope-undeclared"],
    ["wifiEnvelope", "wifi-envelope-undeclared"],
    ["fieldInterfaceEnvelope", "field-interface-envelope-undeclared"],
    ["trafficEnvelope", "traffic-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["securityEnvelope", "security-envelope-undeclared"],
    ["installationEnvelope", "installation-envelope-undeclared"],
    ["regulatoryEnvelope", "regulatory-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`wifi-gateway-${code}`);
  for (const [p, c] of [
    [/wifi controller module/, "wifi-gateway-radio-missing"],
    [/integrated antenna/, "wifi-gateway-antenna-network-missing"],
    [
      /can secondary-protocol transceiver/,
      "wifi-gateway-secondary-protocol-missing",
    ],
    [/can field connector/, "wifi-gateway-field-connector-missing"],
    [/can interface esd/, "wifi-gateway-interface-protection-missing"],
    [/input fuse/, "wifi-gateway-power-protection-missing"],
    [/power connector/, "wifi-gateway-power-connector-missing"],
    [/power conversion/, "wifi-gateway-burst-power-missing"],
    [/can isolation/, "wifi-gateway-isolation-decision-missing"],
    [/provisioning debug/, "wifi-gateway-provisioning-recovery-missing"],
    [/identity key/, "wifi-gateway-security-storage-missing"],
    [/production rf can/, "wifi-gateway-production-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("wifi-gateway-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.connectorSidesOpposed !== true ||
    f.canConnectorWing?.projectionMm < 5 ||
    f.powerServiceWing?.projectionMm < 5 ||
    f.antennaCopperKeepoutRequired !== true
  )
    errors.push("wifi-gateway-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `wifi-gateway-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.wifi-gateway-remediation-gate.v1",
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
