import { approvedAssetFor } from "../../components/approved-production-assets.mjs";

export const ETHERNET_CONTROLLER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.ethernet-controller.v1";
export const ETHERNET_CONTROLLER_IMPLEMENTATION_SCHEMA =
  "boardforge.phase2c.production-evidence.ethernet-controller.v1";
export const ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS = Object.freeze([
  "ETH_TXP",
  "ETH_TXN",
  "ETH_RXP",
  "ETH_RXN",
  "SPI_SCLK",
  "SPI_MOSI",
  "SPI_MISO",
  "ETH_CS_N",
  "ETH_RESET_N",
  "ETH_INT_N",
  "XTAL_IN",
  "XTAL_OUT",
  "3V3",
  "GND",
]);

const approved = (ref, role, mpn) => ({
  ref,
  role,
  mpn,
  status: approvedAssetFor(mpn)
    ? "APPROVED_EXACT_ASSET"
    : "BLOCKED_MISSING_APPROVED_EXACT_ASSET",
});
const unresolved = (ref, role, requirement) => ({
  ref,
  role,
  mpn: null,
  status: "BLOCKED_MISSING_APPROVED_EXACT_ASSET",
  requirement,
});

export const ethernetControllerProductionProposal = Object.freeze({
  schema: ETHERNET_CONTROLLER_PROPOSAL_SCHEMA,
  boardId: "010_ETHERNET_CONTROLLER",
  status: "BLOCKED_PENDING_EXACT_SUPPORT_ASSETS_AND_BOARD_LEVEL_EVIDENCE",
  maximumAreaMm2: 1250,
  architecture:
    "RP2040 SPI host with W5500 integrated 10/100BASE-T MAC/PHY and a non-PoE integrated-magnetics RJ45",
  limitations: [
    "7499010121A is a non-PoE part approved only as a 100BASE-TX data connector/magnetics assembly and must never be credited as a PoE power-path component.",
    "This proposal is non-PoE. Adding PoE requires a separately verified PD input, isolation, power conversion, safety spacing, thermal and compliance architecture.",
  ],
  outline: {
    family: "magnetics-notch-ethernet-controller",
    closed: true,
    maximumAreaMm2: 1250,
    points: [
      [0, 0],
      [42, 0],
      [42, 8],
      [39, 8],
      [39, 20],
      [42, 20],
      [42, 28],
      [0, 28],
    ],
    purposefulFeatures: {
      rj45Notch: { edge: "right", depthMm: 3, spanMm: 12 },
      mountingHoleCount: 4,
    },
  },
  bom: [
    approved("U1", "RP2040 host controller", "SC0914(13)"),
    approved(
      "U2",
      "Ethernet MAC PHY controller with SPI host interface",
      "W5500",
    ),
    approved("Y1", "25 MHz Ethernet clock crystal", "Q22FA2380184517"),
    approved(
      "J1",
      "RJ45 integrated Ethernet magnetics non-PoE connector",
      "7499010121A",
    ),
    approved("U3", "3.3 V Ethernet PHY supply regulator", "MCP1700T-3302E/TT"),
    approved("U4", "RP2040 QSPI program flash", "W25Q128JVSIQ"),
    approved("J_PWR", "External regulated 5 V power input", "M20-9990245"),
    approved(
      "C_DEC",
      "Ethernet PHY and host decoupling capacitor population",
      "CL10B104KB8NNNC",
    ),
    approved("R_RST", "10 kOhm Ethernet reset pull-up", "RC0603FR-0710KL"),
    approved("C_RST", "100 nF Ethernet reset RC capacitor", "CL10B104KB8NNNC"),
    approved("R_MODE0", "10 kOhm Ethernet PHY PMODE0 strap", "RC0603FR-0710KL"),
    approved("R_MODE1", "10 kOhm Ethernet PHY PMODE1 strap", "RC0603FR-0710KL"),
    approved("R_MODE2", "10 kOhm Ethernet PHY PMODE2 strap", "RC0603FR-0710KL"),
    approved("R_EXRES", "12.4 kOhm 1% W5500 EXRES1 bias", "RC0603FR-0712K4L"),
    ...["R_TXP", "R_TXN", "R_RXP", "R_RXN"].map((ref) =>
      approved(
        ref,
        "49.9 Ohm 1% Ethernet PHY line termination",
        "RC0603FR-0749R9L",
      ),
    ),
    approved("C_XI", "12 pF C0G crystal load capacitor", "GRM1885C1H120JA01D"),
    approved("C_XO", "12 pF C0G crystal load capacitor", "GRM1885C1H120JA01D"),
    approved(
      "D_ETH",
      "Four-channel 0.5 pF Ethernet cable-line ESD protector",
      "TPD4E05U06DQAR",
    ),
    approved(
      "FB_AVDD",
      "600 Ohm at 100 MHz 1 A analog-supply ferrite bead",
      "MPZ1608S601ATA00",
    ),
    approved(
      "C_AVDD",
      "4.7 uF analog-supply bulk capacitor",
      "GRM188R60J475KE19D",
    ),
    approved(
      "C_TOCAP",
      "4.7 uF W5500 TOCAP stabilizing capacitor",
      "GRM188R60J475KE19D",
    ),
    approved(
      "C_1V2",
      "10 nF W5500 1V2O stabilizing capacitor",
      "GRM188R71H103KA01D",
    ),
  ],
  supportDesign: {
    reset: {
      pullupOhm: 10000,
      capacitanceF: 100e-9,
      timeConstantS: 1e-3,
      source: "W5500 EVB reference schematic",
    },
    pmode: {
      resistanceOhm: 10000,
      pins: [43, 44, 45],
      startupState: "freeze in board schematic before evidence acceptance",
    },
    exres: { resistanceOhm: 12400, tolerancePercent: 1 },
    lineTermination: { resistanceOhm: 49.9, tolerancePercent: 1, count: 4 },
    crystalLoad: {
      crystalLoadPf: 8,
      assumedTotalParasiticPf: 2,
      capacitorEachPf: 12,
      calculation:
        "CL=(C1*C2)/(C1+C2)+Cstray; equal 12 pF capacitors plus 2 pF parasitic gives 8 pF",
    },
    esd: {
      mpn: "TPD4E05U06DQAR",
      channelCapacitancePf: 0.5,
      iec61000_4_2ContactKv: 12,
      dischargeReference: "CHASSIS",
    },
    analogSupply: { ferriteOhmAt100MHz: 600, ratedCurrentA: 1, bulkUf: 4.7 },
  },
  evidenceRequired: [
    "exactAssetsApproved",
    "clockLoadAndStartupVerified",
    "resetTimingVerified",
    "strapStatesVerified",
    "lineTerminationVerified",
    "cableProtectionVerified",
    "supplyPdnVerified",
    "ethernetSignalIntegrityVerified",
    "nonPoeLimitationRecorded",
    "mechanicalEnvelopeVerified",
    "productionTestVerified",
  ],
});

export function validateEthernetControllerProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  const need = (p, code) => {
    if (!has(p)) errors.push(code);
  };
  need(/rp2040.*host/, "ethernet-rp2040-host-missing");
  need(/ethernet.*mac.*phy/, "ethernet-mac-phy-missing");
  need(
    /25.*mhz.*(clock|crystal)|reference.*crystal/,
    "ethernet-reference-clock-missing",
  );
  need(
    /rj45.*magnetics|integrated.*ethernet.*magnetics/,
    "ethernet-magjack-missing",
  );
  for (const [p, code] of [
    [/reset/, "ethernet-reset-network-missing"],
    [/strap|pmode/, "ethernet-strap-network-missing"],
    [/termination|exres/, "ethernet-termination-missing"],
    [/esd|surge|cable.*protection/, "ethernet-line-protection-missing"],
    [/supply.*filter|analog.*supply/, "ethernet-phy-supply-filter-missing"],
    [/decoupling/, "ethernet-decoupling-missing"],
  ])
    need(p, code);
  const exactBlocked = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (exactBlocked.length) errors.push("ethernet-exact-assets-unapproved");
  const area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0)
  )
    errors.push("ethernet-purposeful-outline-invalid");
  if (!proposal.outline?.purposefulFeatures?.rj45Notch)
    errors.push("ethernet-rj45-notch-missing");
  if (
    !proposal.limitations?.some((x) => /non-poe/i.test(x)) ||
    !proposal.limitations?.some((x) => /poe requires/i.test(x))
  )
    errors.push("ethernet-non-poe-limitation-missing");
  const evidence = proposal.semanticEvidence || {};
  for (const key of proposal.evidenceRequired || [])
    if (evidence[key] !== true)
      errors.push(
        `ethernet-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.ethernet-controller-remediation-gate.v1",
    ok: errors.length === 0,
    errors,
    areaMm2: area,
    maximumAreaMm2: proposal.maximumAreaMm2,
    blockedRefs: exactBlocked.map((x) => x.ref),
  };
}

export function validateEthernetControllerImplementation(
  evidence = {},
  proposal = ethernetControllerProductionProposal,
) {
  const errors = [],
    requiredRefs = (proposal.bom || []).map((x) => x.ref).sort(),
    schematicRefs = [...(evidence.schematicRefs || [])].sort(),
    pcbRefs = [...(evidence.pcbRefs || [])].sort(),
    routed = new Set(evidence.routedNetNames || []);
  if (evidence.schema !== ETHERNET_CONTROLLER_IMPLEMENTATION_SCHEMA)
    errors.push("ethernet-implementation-schema-invalid");
  if (
    evidence.authoritativeSymbolProjectionVerified !== true ||
    JSON.stringify(schematicRefs) !== JSON.stringify(requiredRefs)
  )
    errors.push("ethernet-authoritative-schematic-projection-unverified");
  if (
    evidence.authoritativeFootprintProjectionVerified !== true ||
    JSON.stringify(pcbRefs) !== JSON.stringify(requiredRefs)
  )
    errors.push("ethernet-authoritative-pcb-projection-unverified");
  if (
    !(Number(evidence.trackSegmentCount) > 0) ||
    !(Number(evidence.routedNetCount) > 0)
  )
    errors.push("ethernet-copperless-topology-rejected");
  for (const net of ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS)
    if (!routed.has(net))
      errors.push(`ethernet-required-net-unrouted-${net.toLowerCase()}`);
  if (
    (evidence.copperLayerCount || 0) < 4 ||
    evidence.groundReturnStructureVerified !== true ||
    evidence.ethernetDifferentialGeometryVerified !== true
  )
    errors.push("ethernet-copper-stackup-and-signal-integrity-unverified");
  if (
    evidence.ercErrorCount !== 0 ||
    evidence.drcViolationCount !== 0 ||
    evidence.unconnectedItemCount !== 0
  )
    errors.push("ethernet-clean-electrical-validation-unverified");
  if (
    evidence.manufacturingExportsVerified !== true ||
    evidence.productionTestVerified !== true
  )
    errors.push("ethernet-manufacturing-and-production-test-unverified");
  return {
    schema: "boardforge.phase2c.ethernet-controller-implementation-gate.v1",
    ok: errors.length === 0,
    errors,
    requiredRefCount: requiredRefs.length,
    requiredRoutedNetCount: ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS.length,
  };
}

function polygonArea(points = []) {
  if (points.length < 3) return NaN;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}
