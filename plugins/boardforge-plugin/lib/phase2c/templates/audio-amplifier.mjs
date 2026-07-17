import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const AUDIO_AMPLIFIER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.audio-amplifier.v1";
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
export const audioAmplifierProductionProposal = Object.freeze({
  schema: AUDIO_AMPLIFIER_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_CHANNEL_LOAD_POWER_DISTORTION_AND_THERMAL",
  boardId: "036_AUDIO_AMPLIFIER",
  maximumAreaMm2: 1950,
  architecture:
    "Low-distortion audio power amplifier with conditioned input, complete feedback/output network, protected energy supply, deterministic mute/fault response and verified heatsink",
  loadEnvelope: null,
  inputEnvelope: null,
  powerEnvelope: null,
  gainEnvelope: null,
  stabilityEnvelope: null,
  thermalEnvelope: null,
  emcEnvelope: null,
  safetyEnvelope: null,
  mechanicalEnvelope: null,
  serviceEnvelope: null,
  candidates: [
    {
      role: "CLASS_D_AMPLIFIER",
      family: "TI TPA3255",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_LOAD_POWER_SUPPLY_DISTORTION_AND_PACKAGE",
    },
    {
      role: "CLASS_AB_AMPLIFIER",
      family: "TI LM3886",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CHANNEL_LOAD_POWER_SUPPLY_SOA_AND_PACKAGE",
    },
    {
      role: "INPUT_PROTECTION",
      family: "Schurter 3413 / Littelfuse SMAJ",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_SOURCE_INRUSH_FAULT_SURGE_AND_COORDINATION",
    },
    {
      role: "BULK_RESERVOIR",
      family: "Nichicon UWT",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_RAIL_RIPPLE_DROOP_ESR_RIPPLE_CURRENT_AND_LIFETIME",
    },
  ],
  outline: {
    family: "heatsink-wing-audio-amplifier",
    closed: true,
    maximumAreaMm2: 1950,
    points: [
      [0, 0],
      [52, 0],
      [52, 7],
      [60, 7],
      [60, 27],
      [52, 27],
      [52, 34],
      [0, 34],
    ],
    purposefulFeatures: {
      heatsinkWing: { edge: "right", projectionMm: 8, spanMm: 20 },
      inputOutputEdgesSeparated: true,
      highCurrentLoopKeepoutRequired: true,
      heatsinkMountHoleCount: 2,
    },
  },
  bom: [
    blocked(
      "F_IN",
      "amplifier supply fuse",
      "Freeze exact fuse only after source voltage/current, inrush, program/continuous load, ambient derating, fault energy and coordination are declared.",
    ),
    blocked(
      "D_IN",
      "amplifier supply transient clamp",
      "Freeze exact clamp only after source surge waveform, rail standoff, clamp voltage, energy and fuse coordination are declared.",
    ),
    blocked(
      "C_BULK",
      "amplifier bulk reservoir",
      "Freeze exact capacitance, voltage, ESR, ripple-current and lifetime only after rail impedance, multichannel droop, ripple and inrush are calculated.",
    ),
    approved(
      "C_DEC",
      "amplifier high-frequency decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    blocked(
      "U_AMP",
      "exact audio power amplifier topology device",
      "Freeze Class D/AB, exact ordering code/package/pin map from channels, power, load, supply, distortion, efficiency and lifecycle.",
    ),
    blocked(
      "J_IN",
      "exact audio input connector",
      "Freeze exact balanced/unbalanced connector, pinout, level, impedance, shield and mechanics.",
    ),
    blocked(
      "P_IN",
      "audio input conditioning protection and RF filter",
      "Freeze exact ESD/coupling/bias/receiver/gain network from source, noise, headroom and common-mode.",
    ),
    blocked(
      "P_FB",
      "amplifier feedback gain compensation bootstrap network",
      "Freeze exact values/tolerances/power from selected device, gain, stability, bandwidth and distortion.",
    ),
    blocked(
      "P_OUT",
      "amplifier output filter damping Zobel snubber network",
      "Freeze exact LC/reconstruction/stability network across speaker impedance, cable and modulation.",
    ),
    blocked(
      "J_SPK",
      "retention-rated speaker output connector",
      "Freeze exact connector/cable/pinout/current; explicitly mark bridged outputs as floating where applicable.",
    ),
    blocked(
      "P_PROTECT",
      "speaker DC short open and fault protection",
      "Freeze exact relay/disconnect/current limit/DC detect/flyback and fault thresholds from hazard analysis.",
    ),
    blocked(
      "J_PWR",
      "keyed high-current amplifier supply connector",
      "Freeze exact source connector/cable/voltage/current/retention and discharge policy.",
    ),
    blocked(
      "P_PWR",
      "reverse inrush sequencing discharge and power distribution",
      "Freeze exact reverse switch/eFuse/inrush/soft-start/discharge and copper from peak-energy calculations.",
    ),
    blocked(
      "P_MUTE",
      "hardware mute shutdown pop suppression and fault latch",
      "Freeze exact default state, timing ramps, clock/source loss, undervoltage, overtemperature and reset behavior.",
    ),
    blocked(
      "U_MON",
      "amplifier current voltage and temperature monitoring",
      "Freeze exact monitors, thresholds, placement, accuracy and reporting.",
    ),
    blocked(
      "HS1",
      "exact amplifier heatsink and thermal interface",
      "Freeze exact extrusion/interface/insulator/fasteners from junction-case-sink-ambient model and SOA.",
    ),
    blocked(
      "P_TEST",
      "production resistive reactive load audio thermal fixture",
      "Freeze gain/response/noise/THD+N/crosstalk/power/clipping/mute/short/thermal/heatsink test fixture.",
    ),
  ],
  requiredTopology: [
    "Freeze channels, configuration, continuous/burst power, speaker impedance/reactance/cable, input, gain, bandwidth, noise, THD+N and clipping.",
    "Select exact topology/device from efficiency, stability, distortion, supply, load, enclosure, EMC and thermal requirements.",
    "Condition/protect input and implement complete source-backed feedback, compensation, bootstrap and decoupling.",
    "Calculate output filter/stability for reactive loads and cables; protect outputs and label bridged terminals correctly.",
    "Permit no unsafe ground-referenced connection to bridged outputs; qualify instruments, connectors, shields and service procedures for floating speaker terminals.",
    "Protect/fuse supply with reverse/transient/inrush control, bulk energy, sequencing and discharge sized for worst multichannel load.",
    "Guarantee hardware mute/shutdown and safe DC/short/overtemperature/undervoltage behavior.",
    "Prove junction/case/heatsink/interface/ambient thermal chain and SOA under worst program and sine loads.",
    "Verify grounding, high-di/dt loops, hum, crosstalk, emissions/immunity and production audio/load/fault performance.",
  ],
  mandatoryUnresolved: [
    "Freeze channels, load impedance/reactance/cable, continuous/burst power, input, gain and performance.",
    "Freeze source/topology/thermal/heatsink geometry/interface/enclosure.",
    "Freeze protection/mute/grounding/EMC/safety.",
    "Select all unresolved exact amplifier/analog/output/power/connectors/heatsink/test assets after calculations.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "channelLoadContinuousBurstPowerVerified",
    "inputImpedanceNoiseHeadroomVerified",
    "feedbackGainToleranceVerified",
    "outputFilterReactiveLoadStabilityVerified",
    "supplyPeakEnergyDroopVerified",
    "connectorCopperAmpacityVerified",
    "gainBandwidthNoiseThdnVerified",
    "crosstalkDampingClippingVerified",
    "mutePopDcFaultVerified",
    "shortOpenOvercurrentVerified",
    "junctionCaseSinkAmbientSoaVerified",
    "heatsinkMechanicalInterfaceVerified",
    "groundingHumEmcVerified",
    "productionResistiveReactiveLoadThermalTestVerified",
  ],
});
export function validateAudioAmplifierArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/audio power amplifier/, "audio-amplifier-power-stage-missing"],
    [/audio input connector/, "audio-amplifier-input-connector-missing"],
    [/input conditioning/, "audio-amplifier-input-stage-missing"],
    [
      /speaker (?:output )?connector/,
      "audio-amplifier-speaker-connector-missing",
    ],
    [
      /amplifier (?:supply connector|power input)/,
      "audio-amplifier-power-input-missing",
    ],
    [/bulk.*(?:reservoir|capacitor)/, "audio-amplifier-bulk-storage-missing"],
    [
      /speaker dc.*(?:short|protection)/,
      "audio-amplifier-load-protection-missing",
    ],
    [/heatsink/, "audio-amplifier-heatsink-missing"],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.audioAmplifier || {};
  for (const [k, c] of [
    ["channelLoadPowerVerified", "channel-load-power-unverified"],
    ["gainNoiseDistortionVerified", "performance-unverified"],
    ["stabilityOutputNetworkVerified", "stability-unverified"],
    ["supplyEnergyVerified", "supply-energy-unverified"],
    ["thermalSoaVerified", "thermal-soa-unverified"],
    ["muteFaultSafetyVerified", "mute-fault-unverified"],
    ["groundingEmcVerified", "grounding-emc-unverified"],
    ["heatsinkMechanicalVerified", "heatsink-mechanical-unverified"],
    ["productionLoadTestVerified", "production-load-test-unverified"],
  ])
    if (!e[k]) errors.push(`audio-amplifier-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateAudioAmplifierProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["loadEnvelope", "load-envelope-undeclared"],
    ["inputEnvelope", "input-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["gainEnvelope", "gain-envelope-undeclared"],
    ["stabilityEnvelope", "stability-envelope-undeclared"],
    ["thermalEnvelope", "thermal-envelope-undeclared"],
    ["emcEnvelope", "emc-envelope-undeclared"],
    ["safetyEnvelope", "safety-envelope-undeclared"],
    ["mechanicalEnvelope", "mechanical-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`audio-amplifier-${code}`);
  for (const [p, c] of [
    [/audio power amplifier/, "audio-amplifier-power-stage-missing"],
    [/input conditioning/, "audio-amplifier-input-stage-missing"],
    [/feedback gain/, "audio-amplifier-feedback-missing"],
    [/output filter/, "audio-amplifier-output-network-missing"],
    [/speaker output connector/, "audio-amplifier-speaker-connector-missing"],
    [/speaker dc short/, "audio-amplifier-load-protection-missing"],
    [/supply fuse/, "audio-amplifier-power-protection-missing"],
    [/bulk reservoir/, "audio-amplifier-bulk-storage-missing"],
    [/hardware mute/, "audio-amplifier-mute-fault-missing"],
    [/current voltage and temperature/, "audio-amplifier-monitoring-missing"],
    [/heatsink and thermal/, "audio-amplifier-heatsink-missing"],
    [
      /production resistive reactive/,
      "audio-amplifier-production-test-missing",
    ],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("audio-amplifier-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.heatsinkWing?.projectionMm < 8 ||
    f.inputOutputEdgesSeparated !== true ||
    f.highCurrentLoopKeepoutRequired !== true ||
    f.heatsinkMountHoleCount < 2
  )
    errors.push("audio-amplifier-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `audio-amplifier-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.audio-amplifier-remediation-gate.v1",
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
