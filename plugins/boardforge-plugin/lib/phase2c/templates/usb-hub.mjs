import { approvedAssetFor } from "../../components/approved-production-assets.mjs";

export const USB_HUB_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.usb-hub.v1";
const approved = (ref, role, mpn, quantity = 1) => ({
  ref,
  role,
  mpn,
  quantity,
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

export const usbHubProductionProposal = Object.freeze({
  schema: USB_HUB_PROPOSAL_SCHEMA,
  boardId: "011_USB_HUB",
  status:
    "BLOCKED_PENDING_HUB_POWER_CLOCK_CONFIGURATION_AND_CONNECTOR_POLICY_ASSETS",
  maximumAreaMm2: 1600,
  architecture:
    "USB 2.0 high-speed four-port hub with exactly one upstream USB-C UFP and four independently protected and current-limited downstream ports",
  primarySources: {
    hub: "https://www.microchip.com/en-us/product/usb2514b",
    datasheet: "https://ww1.microchip.com/downloads/en/DeviceDoc/00001692C.pdf",
  },
  hubIdentity: {
    exactFamilyIdentity: "USB2514B_Bi",
    symbol: "Interface_USB:USB2514B_Bi",
    footprint: "Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm",
    package: "36-pin QFN 6x6 mm plus exposed VSS pad 37",
    status: approvedAssetFor("USB2514B_Bi")
      ? "APPROVED_EXACT_ASSET"
      : "BLOCKED_NOT_IN_APPROVED_PRODUCTION_REGISTRY",
    pinMap: {
      1: "USB_DN1_N",
      2: "USB_DN1_P",
      3: "USB_DN2_N",
      4: "USB_DN2_P",
      5: "3V3A",
      6: "USB_DN3_N",
      7: "USB_DN3_P",
      8: "USB_DN4_N",
      9: "USB_DN4_P",
      10: "3V3A",
      11: "TEST",
      12: "PORT_PWR1",
      13: "OVERCURRENT1_N",
      14: "CRFILT",
      15: "3V3",
      16: "PORT_PWR2",
      17: "OVERCURRENT2_N",
      18: "PORT_PWR3",
      19: "OVERCURRENT3_N",
      20: "PORT_PWR4",
      21: "OVERCURRENT4_N",
      22: "SMB_DATA_NONREM1",
      23: "3V3",
      24: "SMB_CLK_CFG0",
      25: "HS_IND_CFG1",
      26: "RESET_N",
      27: "VBUS_DETECT",
      28: "SUSP_LOCAL_PWR_NONREM0",
      29: "3V3A",
      30: "USB_UP_N",
      31: "USB_UP_P",
      32: "XTAL_OUT",
      33: "XTAL_IN",
      34: "PLLFILT",
      35: "RBIAS",
      36: "3V3A",
      37: "GND",
    },
  },
  outline: {
    family: "port-scallops-usb-hub",
    closed: true,
    maximumAreaMm2: 1600,
    points: [
      [0, 0],
      [48, 0],
      [48, 30],
      [46, 30],
      [46, 28],
      [42, 28],
      [42, 30],
      [36, 30],
      [36, 28],
      [32, 28],
      [32, 30],
      [26, 30],
      [26, 28],
      [22, 28],
      [22, 30],
      [16, 30],
      [16, 28],
      [12, 28],
      [12, 30],
      [0, 30],
    ],
    purposefulFeatures: {
      downstreamPortScallops: 4,
      upstreamPortEdge: "left",
      mountingHoleCount: 4,
    },
  },
  bom: [
    approved("U1", "USB hub controller", "USB2514B_Bi"),
    approved("J_UP", "upstream USB-C UFP connector", "USB4105-GF-A"),
    approved(
      "J_DN",
      "four downstream USB-C connector physical identities",
      "USB4105-GF-A",
      4,
    ),
    approved(
      "D_USB",
      "upstream and four downstream USB ESD protection",
      "USBLC6-2SC6",
      5,
    ),
    approved("U_3V3", "3.3 V hub regulator candidate", "MCP1700T-3302E/TT"),
    approved(
      "C_DEC",
      "hub analog digital and regulator decoupling population",
      "CL10B104KB8NNNC",
    ),
    approved("Y1", "24 MHz hub crystal", "Q22FA2380119417"),
    approved(
      "U_DFP",
      "four independent Type-C DFP controllers with integrated current-limited power switches and fault reporting",
      "TPS25810RVCR",
      4,
    ),
    approved("R_RESET", "10 kOhm hub reset pull-up", "RC0603FR-0710KL"),
    approved("C_RESET", "1 uF hub reset capacitor", "GRM188R61A105KA61D"),
    approved("R_RBIAS", "12 kOhm 1% hub RBIAS resistor", "RC0603FR-0712KL"),
    approved(
      "R_CFG0",
      "100 kOhm CFG_SEL0 pull-down enabling strap mode",
      "RC0603FR-07100KL",
    ),
    approved(
      "R_CFG1",
      "100 kOhm CFG_SEL1 pull-down selecting self-powered individual switching",
      "RC0603FR-07100KL",
    ),
    approved(
      "R_NONREM0",
      "100 kOhm removable-port strap pull-down",
      "RC0603FR-07100KL",
    ),
    approved(
      "R_NONREM1",
      "100 kOhm removable-port strap pull-down",
      "RC0603FR-07100KL",
    ),
    approved(
      "R_CC_UP",
      "two upstream USB-C UFP 5.1 kOhm Rd resistors",
      "RC0603FR-075K1L",
      2,
    ),
    blocked(
      "U_5V",
      "protected 5 V downstream power source",
      "Freeze exact input connector/source, fuse/reverse/surge protection and 5 V regulator sized for the declared aggregate downstream current.",
    ),
  ],
  fiveVoltArchitecture: {
    status: "BLOCKED_PENDING_DECLARED_INPUT_LOAD_THERMAL_AND_FAULT_ENVELOPES",
    downstreamPortCount: 4,
    declaredAdvertisement: "USB default",
    minimumUsb2UnitLoadMaPerPort: 500,
    minimumSimultaneousPortLoadMa: 2000,
    additionalLoadsRequired: [
      "USB2514B 5 V/3.3 V conversion input budget",
      "four TPS25810 operating-current budget",
      "indicator and configuration loads",
      "startup and cable-capacitance inrush margin",
    ],
    aggregateDesignCurrentA: null,
    fiveVoltToleranceAtEveryConnector: null,
    inputEnvelope: {
      connectorMpn: null,
      nominalVoltageV: null,
      minimumVoltageV: null,
      maximumVoltageV: null,
      transientMaximumV: null,
      sourceCurrentLimitA: null,
      prospectiveShortCircuitCurrentA: null,
      hotPlugSourceImpedance: null,
    },
    conversionEnvelope: {
      topology: null,
      regulatorMpn: null,
      minimumEfficiencyPercent: null,
      switchingFrequencyHz: null,
      inductorMpn: null,
      inputCapacitorMpns: null,
      outputCapacitorMpns: null,
      compensationVerified: false,
    },
    protectionEnvelope: {
      inputFuseMpn: null,
      reverseBlockingMpn: null,
      surgeClampMpn: null,
      inrushLimitMpn: null,
      interruptRatingVerified: false,
      backfeedBlockedWhenInputOff: false,
      upstreamVbusIsolationVerified: false,
    },
    distributionEnvelope: {
      copperWeightOz: null,
      minimumBusWidthMm: null,
      minimumReturnWidthMm: null,
      viaField: null,
      connectorCurrentDeratingVerified: false,
      simultaneousPortDropVerified: false,
    },
    thermalEnvelope: {
      ambientMaximumC: null,
      enclosure: null,
      regulatorLossW: null,
      portSwitchLossW: null,
      copperLossW: null,
      junctionMaximumC: null,
      measuredOrSimulated: false,
    },
    faultEnvelope: {
      singlePortShortA: null,
      allPortsShortBehavior: null,
      sourceFaultEnergyJ: null,
      perPortFaultIsolationVerified: false,
      hubLogicSurvivalVerified: false,
      automaticRetryPolicy: null,
    },
    releaseRule:
      "Do not choose or approve U_5V or its connector/protection/magnetics/capacitors until every envelope is declared, exact assets are live-stocked and authoritative, worst-case current/drop/loss/SOA calculations pass, and the complete placement fits the existing 1600 mm2 outline.",
  },
  supportDesign: {
    configuration: {
      cfgSel: [0, 0],
      meaning:
        "Strap options, self-powered, individual power switching and overcurrent sensing",
      nonRem: [0, 0],
      portPolicy: "all four downstream ports removable",
    },
    clock: {
      frequencyMHz: 24,
      tolerancePpm: 350,
      mpn: "Q22FA2380119417",
      loadCapacitancePf: 18,
      loadNetwork: "blocked pending measured PCB stray-capacitance budget",
    },
    reset: { pullupOhm: 10000, capacitanceUf: 1 },
    rbias: { ohm: 12000, tolerancePercent: 1 },
    upstreamTypeC: {
      role: "UFP",
      rdOhm: 5100,
      vbusPolicy: "detect only; no upstream-to-downstream VBUS backfeed",
    },
    downstreamTypeC: {
      role: "DFP",
      controller: "TPS25810RVCR",
      count: 4,
      advertisement: "USB default",
      integratedFault: true,
      integratedPowerSwitch: true,
    },
  },
  // This is an autonomous training *candidate*, not manufacturing evidence.
  // It explicitly separates a coherent, source-attributed power selection from
  // live provider, physical-layout, thermal, and KiCad acceptance evidence.
  trainingPowerArchitecture: Object.freeze({
    schema: "boardforge.phase2c.usb-hub-training-power-candidate.v1",
    status:
      "CANDIDATE_PENDING_LIVE_PROVIDER_PHYSICAL_LAYOUT_THERMAL_AND_KICAD_VALIDATION",
    purpose:
      "Self-powered four-port USB 2.0 hub benchmark with a 12 V SELV wall input and USB-default downstream power.",
    input: {
      source: "center-positive SELV Class 2 12 V DC adapter",
      connectorMpn: "PJ-102AH",
      nominalVoltageV: 12,
      continuousVoltageRangeV: [10.8, 13.2],
      adapterCurrentLimitA: 2.5,
      upstreamUsbVbusPolicy: "detect only; electrically isolated from the downstream 5 V rail",
    },
    output: {
      voltageV: 5,
      validAtPortRangeV: [4.75, 5.25],
      portCount: 4,
      perPortCurrentLimitA: 0.5,
      aggregateDesignCurrentA: 2.4,
      budgetA: {
        fourUsbDefaultPorts: 2,
        hubAndPortControllers: 0.18,
        startupAndCableCapacitanceReserve: 0.22,
      },
    },
    parts: [
      { ref: "J_PWR", mpn: "PJ-102AH", role: "12 V SELV power entry" },
      { ref: "F_IN", mpn: "MF-RG300-0", role: "input resettable overcurrent protection" },
      { ref: "D_IN", mpn: "SMAJ15A", role: "input transient clamp" },
      { ref: "Q_REV", mpn: "SI7465DP-T1-GE3", role: "reverse-polarity PMOS" },
      { ref: "D_GS", mpn: "BZT52B12", role: "PMOS gate-source clamp" },
      { ref: "R_GATE", mpn: "RC0603FR-07100KL", role: "PMOS gate bias" },
      { ref: "U_5V", mpn: "LMR33640ADDA", role: "4 A synchronous 5 V buck" },
      { ref: "L_5V", mpn: "SRN6045TA-6R8M", role: "buck power inductor" },
      { ref: "C_IN", mpn: "UWT1H100MCL1GB", role: "buck input bulk capacitance" },
      { ref: "C_IN_HF", mpn: "GRM31CR61H106KA12L", quantity: 1, role: "buck input ceramic capacitance" },
      { ref: "C_IN_HF2", mpn: "GRM188R71H224KA93D", quantity: 1, role: "buck input high-frequency ceramic capacitance" },
      { ref: "C_OUT", mpn: "GRM31CR61E226KE15L", quantity: 3, role: "buck output ceramic capacitance" },
      { ref: "C_OUT_BULK", mpn: "UWT1E220MCL1GB", role: "port-bank bulk capacitance" },
      { ref: "C_BOOT", mpn: "CL10B104KB8NNNC", role: "buck bootstrap capacitor" },
      { ref: "C_VCC", mpn: "GRM188R61A105KA61D", role: "buck VCC bypass" },
      { ref: "R_FB_TOP", mpn: "RC0603FR-07100KL", role: "buck feedback upper resistor" },
      { ref: "R_FB_BOTTOM", mpn: "RC0603FR-0724K9L", role: "buck feedback lower resistor" },
    ],
    calculations: {
      buckRatingA: 4,
      minimumEfficiency: 0.88,
      feedbackReferenceV: 1,
      feedbackTopOhm: 100000,
      feedbackBottomOhm: 24900,
      outputDesignCurrentA: 2.4,
      minimumInputVoltageV: 10.8,
      outputVoltageFromFeedbackV: 5.01606,
      worstCaseInputCurrentA: 1.263,
      inputCurrentWith25PercentMarginA: 1.579,
      mainBus: {
        copperWeightOz: 1,
        layersInParallel: 2,
        widthMm: 2,
        maximumLengthMm: 30,
        computedVoltageDropV: 0.033,
      },
      inputProtection: {
        tpsClampVoltageV: 24.4,
        PMOSVdsRatingV: 30,
        requiredPMOSVdsMarginPercent: 10,
      },
    },
    implementationContract: {
      stackup: "four-layer, 1 oz outer copper; continuous ground reference plane",
      buckPlacement:
        "Place input ceramic/bulk, bootstrap capacitor, inductor, output capacitors, and PowerPAD thermal vias to the exact TI layout constraints before routing unrelated signals.",
      powerDistribution:
        "Use the two-layer 2 mm 5 V trunk and short per-port branches; each TPS25810 remains the only downstream-port current limiter and fault isolator.",
      faultPolicy:
        "A single downstream short must be isolated by its TPS25810 without collapsing hub logic; upstream adapter current limit plus the input PPTC define the input-fault boundary.",
      environmentalLimit:
        "Indoor laboratory/office use, 0 to 50 C ambient; no automotive load-dump, wet-location, mains, or safety-certification claim.",
    },
    verification: {
      supplierApiLiveDigiKey: false,
      supplierApiLiveMouser: false,
      exactPassiveAndInductorRatingsChecked: false,
      compensationAndStabilityChecked: false,
      buckThermalAndCopperSimulationChecked: false,
      actualPortVoltageDropChecked: false,
      actualFaultIsolationChecked: false,
      upstreamVbusIsolationChecked: false,
      boardLevelKiCadErcDrcAndParityChecked: false,
    },
    releaseRule:
      "This candidate may only replace the blocked U_5V architecture after each verification field is backed by current supplier-provider results, exact-datasheet design calculations, physical KiCad implementation, and the normal manufacturing acceptance pipeline.",
  }),
  evidenceRequired: [
    "exactAssetsApproved",
    "oneUpstreamFourDownstreamVerified",
    "usbDifferentialRoutingVerified",
    "clockVerified",
    "resetStrapsConfigVerified",
    "perPortPowerLimitVerified",
    "perPortOvercurrentVerified",
    "typeCAttachPolicyVerified",
    "fiveVoltBudgetThermalVerified",
    "threeVoltPdnVerified",
    "esdDischargeVerified",
    "mechanicalEnvelopeVerified",
    "productionTestVerified",
  ],
});

export function validateUsbHubTrainingPowerCandidate(candidate = {}) {
  const errors = [],
    output = candidate.output || {},
    calculations = candidate.calculations || {},
    input = candidate.input || {},
    parts = Array.isArray(candidate.parts) ? candidate.parts : [];
  if (candidate.schema !== "boardforge.phase2c.usb-hub-training-power-candidate.v1")
    errors.push("usb-hub-training-power-schema-invalid");
  if (output.portCount !== 4 || output.perPortCurrentLimitA !== 0.5)
    errors.push("usb-hub-training-port-current-contract-invalid");
  const budget = output.budgetA || {};
  const budgetTotal = Object.values(budget).reduce((sum, value) => sum + Number(value || 0), 0);
  if (Math.abs(budgetTotal - Number(output.aggregateDesignCurrentA)) > 0.001)
    errors.push("usb-hub-training-current-budget-inconsistent");
  if (!(Number(output.aggregateDesignCurrentA) >= output.portCount * output.perPortCurrentLimitA + 0.2))
    errors.push("usb-hub-training-current-margin-insufficient");
  if (!(Number(calculations.buckRatingA) >= Number(output.aggregateDesignCurrentA) * 1.25))
    errors.push("usb-hub-training-buck-current-margin-insufficient");
  const computedVout = Number(calculations.feedbackReferenceV) * (1 + Number(calculations.feedbackTopOhm) / Number(calculations.feedbackBottomOhm));
  if (Math.abs(computedVout - Number(calculations.outputVoltageFromFeedbackV)) > 0.001)
    errors.push("usb-hub-training-feedback-calculation-inconsistent");
  const [minimumPortV, maximumPortV] = output.validAtPortRangeV || [];
  if (!(computedVout > minimumPortV && computedVout < maximumPortV))
    errors.push("usb-hub-training-feedback-outside-usb-port-window");
  const computedInputCurrent = output.voltageV * Number(output.aggregateDesignCurrentA) /
    (Number(calculations.minimumInputVoltageV) * Number(calculations.minimumEfficiency));
  if (Math.abs(computedInputCurrent - Number(calculations.worstCaseInputCurrentA)) > 0.002)
    errors.push("usb-hub-training-input-current-calculation-inconsistent");
  if (!(Number(input.adapterCurrentLimitA) > Number(calculations.inputCurrentWith25PercentMarginA)))
    errors.push("usb-hub-training-input-source-margin-insufficient");
  const protection = calculations.inputProtection || {};
  if (!(Number(protection.tpsClampVoltageV) < Number(protection.PMOSVdsRatingV) * (1 - Number(protection.requiredPMOSVdsMarginPercent) / 100)))
    errors.push("usb-hub-training-input-transient-margin-insufficient");
  if (!(Number(calculations.mainBus?.computedVoltageDropV) < 0.1))
    errors.push("usb-hub-training-power-distribution-drop-excessive");
  const requiredMpns = ["PJ-102AH", "MF-RG300-0", "SMAJ15A", "SI7465DP-T1-GE3", "BZT52B12", "LMR33640ADDA", "SRN6045TA-6R8M", "UWT1H100MCL1GB", "GRM31CR61H106KA12L", "GRM188R71H224KA93D", "GRM31CR61E226KE15L", "RC0603FR-0724K9L"];
  for (const mpn of requiredMpns)
    if (!parts.some((part) => part.mpn === mpn) || !approvedAssetFor(mpn))
      errors.push(`usb-hub-training-exact-asset-missing-${mpn}`);
  const pending = Object.entries(candidate.verification || {})
    .filter(([, value]) => value !== true)
    .map(([key]) => `usb-hub-training-verification-pending-${key}`);
  return {
    schema: "boardforge.phase2c.usb-hub-training-power-candidate-gate.v1",
    contractOk: errors.length === 0,
    ok: errors.length === 0 && pending.length === 0,
    errors: [...errors, ...pending],
    pending,
  };
}

export function validateUsbHubProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    count = (p) =>
      bom
        .filter((x) => p.test(String(x.role || "").toLowerCase()))
        .reduce((n, x) => n + (x.quantity || 1), 0);
  if (count(/hub controller/) !== 1) errors.push("usb-hub-controller-missing");
  if (count(/upstream.*connector/) !== 1)
    errors.push("usb-hub-upstream-port-missing");
  if (count(/downstream.*connector/) !== 4)
    errors.push("usb-hub-four-downstream-ports-missing");
  for (const [p, code] of [
    [/current-limited power switch/, "usb-hub-port-power-control-missing"],
    [/overcurrent/, "usb-hub-overcurrent-evidence-missing"],
    [/24.*mhz.*(clock|crystal)|hub.*clock/, "usb-hub-clock-evidence-missing"],
    [
      /reset.*strap.*config|configuration.*reset/,
      "usb-hub-reset-straps-config-missing",
    ],
    [/usb esd/, "usb-hub-esd-missing"],
    [/decoupling/, "usb-hub-decoupling-missing"],
    [/5 v.*power|five.*volt/, "usb-hub-5v-power-missing"],
    [/3\.3 v.*regulator/, "usb-hub-3v3-power-missing"],
  ])
    if (!roles.some((x) => p.test(x))) errors.push(code);
  if (
    proposal.hubIdentity?.symbol !== "Interface_USB:USB2514B_Bi" ||
    proposal.hubIdentity?.footprint !==
      "Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm" ||
    Object.keys(proposal.hubIdentity?.pinMap || {}).length !== 37
  )
    errors.push("usb-hub-authoritative-controller-identity-invalid");
  const p = proposal.fiveVoltArchitecture || {};
  if (
    p.downstreamPortCount !== 4 ||
    p.minimumUsb2UnitLoadMaPerPort !== 500 ||
    p.minimumSimultaneousPortLoadMa !== 2000
  )
    errors.push("usb-hub-aggregate-5v-load-contract-invalid");
  if (!(Number(p.aggregateDesignCurrentA) > 2))
    errors.push("usb-hub-aggregate-5v-design-current-undeclared");
  for (const [key, fields] of Object.entries({
    inputEnvelope: [
      "connectorMpn",
      "nominalVoltageV",
      "minimumVoltageV",
      "maximumVoltageV",
      "transientMaximumV",
      "sourceCurrentLimitA",
      "prospectiveShortCircuitCurrentA",
      "hotPlugSourceImpedance",
    ],
    conversionEnvelope: [
      "topology",
      "regulatorMpn",
      "minimumEfficiencyPercent",
      "switchingFrequencyHz",
      "inductorMpn",
      "inputCapacitorMpns",
      "outputCapacitorMpns",
      "compensationVerified",
    ],
    protectionEnvelope: [
      "inputFuseMpn",
      "reverseBlockingMpn",
      "surgeClampMpn",
      "inrushLimitMpn",
      "interruptRatingVerified",
      "backfeedBlockedWhenInputOff",
      "upstreamVbusIsolationVerified",
    ],
    distributionEnvelope: [
      "copperWeightOz",
      "minimumBusWidthMm",
      "minimumReturnWidthMm",
      "viaField",
      "connectorCurrentDeratingVerified",
      "simultaneousPortDropVerified",
    ],
    thermalEnvelope: [
      "ambientMaximumC",
      "enclosure",
      "regulatorLossW",
      "portSwitchLossW",
      "copperLossW",
      "junctionMaximumC",
      "measuredOrSimulated",
    ],
    faultEnvelope: [
      "singlePortShortA",
      "allPortsShortBehavior",
      "sourceFaultEnergyJ",
      "perPortFaultIsolationVerified",
      "hubLogicSurvivalVerified",
      "automaticRetryPolicy",
    ],
  }))
    if (
      fields.some(
        (field) =>
          p[key]?.[field] === null ||
          p[key]?.[field] === false ||
          p[key]?.[field] === undefined,
      )
    )
      errors.push(`usb-hub-5v-${key.replace("Envelope", "")}-undeclared`);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("usb-hub-exact-assets-unapproved");
  const area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    proposal.outline?.purposefulFeatures?.downstreamPortScallops !== 4
  )
    errors.push("usb-hub-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `usb-hub-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.usb-hub-remediation-gate.v1",
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
