import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const SOLAR_MPPT_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.solar-mppt.v1";
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
export const solarMpptProductionProposal = Object.freeze({
  schema: SOLAR_MPPT_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_PANEL_IV_BATTERY_CHEMISTRY_POWER_AND_MPPT_POLICY",
  boardId: "050_SOLAR_MPPT",
  maximumAreaMm2: 1250,
  architecture:
    "Solar harvester/charger with frozen panel I-V envelope, chemistry-correct battery profile, compatible MPPT power stage, protected ports, calibrated sensing, thermal-loss proof and safe BMS/load interaction",
  pvEnvelope: null,
  batteryEnvelope: null,
  chemistryEnvelope: null,
  topologyEnvelope: null,
  powerStageEnvelope: null,
  controlEnvelope: null,
  stabilityEnvelope: null,
  protectionEnvelope: null,
  thermalEnvelope: null,
  calibrationEnvelope: null,
  testEnvelope: null,
  candidates: [
    {
      role: "BUCK_MPPT_CHARGER",
      family: "TI BQ24650",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PV_BATTERY_OVERLAY_CHEMISTRY_POWER_AND_PACKAGE",
    },
    {
      role: "BUCK_BOOST_MPPT_CHARGER",
      family: "Analog Devices LT8490",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PV_BATTERY_OVERLAY_CHEMISTRY_POWER_AND_PACKAGE",
    },
    {
      role: "TELEMETRY_CONTROLLER",
      family: "ST STM32G0",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CONTROL_TELEMETRY_CALIBRATION_SAFETY_AND_LIFECYCLE",
    },
    {
      role: "PANEL_PROTECTION",
      family: "Schurter 3413 / Littelfuse SMAJ",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PV_FAULT_SURGE_INRUSH_HOTPLUG_AND_COORDINATION",
    },
    {
      role: "BULK_CAPACITOR",
      family: "Nichicon UWT",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_RIPPLE_RMS_ESR_VOLTAGE_THERMAL_AND_LIFETIME",
    },
    {
      role: "CALIBRATION_STORAGE",
      family: "ST M24C",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CALIBRATION_RECORD_ADDRESS_ENDURANCE_AND_RETENTION",
    },
  ],
  outline: {
    family: "dual-thermal-ear-solar-mppt",
    closed: true,
    maximumAreaMm2: 1250,
    points: [
      [4, 0],
      [42, 0],
      [42, 10],
      [46, 10],
      [46, 20],
      [42, 20],
      [42, 30],
      [4, 30],
      [4, 20],
      [0, 20],
      [0, 10],
      [4, 10],
    ],
    purposefulFeatures: {
      leftThermalEar: { projectionMm: 4, spanMm: 10 },
      rightThermalEar: { projectionMm: 4, spanMm: 10 },
      mountHoleCount: 2,
      powerStageAirflowCorridorRequired: true,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "exact solar telemetry controller",
      "Freeze exact controller only after MPPT policy, telemetry, calibration, supervision, interfaces, firmware and lifecycle requirements are declared.",
    ),
    blocked(
      "F_PANEL",
      "solar panel input fuse",
      "Freeze exact fuse only after PV voltage/current, backfeed, inrush, ambient derating, fault energy and protection coordination are declared.",
    ),
    blocked(
      "D_PANEL",
      "solar panel surge clamp",
      "Freeze exact clamp only after PV Voc temperature extremes, surge waveform, standoff, clamp voltage, energy and fuse coordination are declared.",
    ),
    blocked(
      "C_BULK",
      "solar converter bulk capacitor",
      "Freeze exact capacitance, voltage, ESR, ripple-current, temperature and lifetime after converter ripple, transients and stability are calculated.",
    ),
    approved(
      "C_DEC",
      "solar controller decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    blocked(
      "U_CFG",
      "solar calibration configuration storage",
      "Freeze exact storage only after calibration/configuration record, address, update count, integrity, endurance and retention are declared.",
    ),
    blocked(
      "J_PANEL",
      "exact solar panel input connector",
      "Freeze panel model/array/cable, Voc/Vmp/Isc/Imp/temp/irradiance, current, retention and surge environment.",
    ),
    blocked(
      "P_PANEL",
      "solar reverse current polarity surge hotplug protection",
      "Freeze exact reverse switch/TVS/fuse/current limit/inrush and battery-to-panel blocking from source/fault energy.",
    ),
    blocked(
      "U_MPPT",
      "exact chemistry-compatible MPPT charger controller",
      "Freeze buck/boost/buck-boost and exact ordering code/package/pin map from panel/battery overlay, profile, power and policy.",
    ),
    blocked(
      "P_STAGE",
      "MPPT switching power stage MOSFET diode inductor compensation",
      "Freeze exact switches/magnetics/caps/snubber/compensation from ripple, stress, saturation, SOA and loop stability.",
    ),
    blocked(
      "J_BAT",
      "exact keyed battery pack connector and protection",
      "Freeze chemistry/cells/pack/BMS/fuse/reverse/short/connector/pin map, current, maintenance and absent-pack behavior.",
    ),
    blocked(
      "TH_BAT",
      "exact pack NTC temperature qualification network",
      "Freeze NTC/bias/placement/hot-cold thresholds/open-short and chemistry charge-inhibit policy.",
    ),
    blocked(
      "R_PV",
      "exact solar panel current shunt and voltage sense",
      "Freeze shunt/divider/filter/Kelvin parts from panel range, accuracy, loss, pulse and MPPT bandwidth.",
    ),
    blocked(
      "R_BAT",
      "exact battery charge current shunt and voltage sense",
      "Freeze shunt/divider/filter/Kelvin parts from battery range, accuracy, loss, pulse and safety bandwidth.",
    ),
    blocked(
      "P_PATH",
      "battery system-load power-path and BMS interaction",
      "Freeze source priority, simultaneous load, depleted/absent battery, reverse current, shutdown and pack-protection relationship.",
    ),
    blocked(
      "P_SAFE",
      "charger watchdog fault-state inhibit and safe defaults",
      "Freeze hardware defaults, thermistor faults, over/undervoltage, overcurrent, no-panel/no-pack and host-loss behavior.",
    ),
    blocked(
      "U_TEMP",
      "converter power-stage thermal monitoring",
      "Freeze exact sensors/placement/thresholds and derating/shutdown for switches, inductor, caps, connectors and battery.",
    ),
    blocked(
      "J_SERVICE",
      "protected solar telemetry service interface",
      "Freeze exact connector/protocol/pin map, ESD/back-power, calibration, update and fault reporting.",
    ),
    blocked(
      "P_TEST",
      "solar array battery emulator sweep thermal fixture",
      "Freeze programmable panel/battery/load test for startup/corners/MPPT/shading/charge/thermistor/reverse/short/efficiency/thermal.",
    ),
  ],
  requiredTopology: [
    "Freeze panel model/array and Voc/Vmp/Isc/Imp tolerances across irradiance/temp, shading, cable and surge.",
    "Freeze battery chemistry/pack/cells/capacity/limits/profile/C-rate/temp/BMS and simultaneous load.",
    "Select buck/boost/buck-boost only after worst panel/battery overlay including startup/dropout.",
    "A buck-only solar charger cannot charge when the panel operating voltage falls below the required battery charge voltage and headroom.",
    "Define MPPT algorithm/dynamics for temperature/shading/update/settling/minimum power and recovery.",
    "A fixed heuristic is not universally optimal MPPT; validate the selected policy against the declared array, shading and dynamic conditions.",
    "Protect panel and battery ports against reverse/overcurrent/surge/hotplug/short and block battery energy into panel faults.",
    "Build complete calculated power stage and verify saturation/RMS/peak/ripple/stress/SOA/compensation stability.",
    "Calibrate panel/battery voltage/current/temperature sensing and define sensor fault behavior.",
    "Production-test with programmable solar/battery/load emulators for all corners, MPPT/shading, charge safety, efficiency and thermal.",
  ],
  mandatoryUnresolved: [
    "Freeze the exact panel/module and array, I-V envelope, shading, surge and MPPT target.",
    "Freeze battery chemistry/cells, pack profile, BMS, load and autonomy.",
    "Freeze power/topology/faults/thermal/EMC/telemetry.",
    "Select unresolved exact controller/power-stage/sensing/connectors/protection/test assets after stability/loss/safety analyses.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "panelVocVmpIscImpTemperatureVerified",
    "batteryChemistryCellsProfileVerified",
    "converterRangeTopologyVerified",
    "mpptAlgorithmShadingDynamicsVerified",
    "panelReverseSurgeHotplugVerified",
    "batteryBmsProtectionVerified",
    "switchMagneticStressSoaVerified",
    "loopStabilityCompensationVerified",
    "panelBatterySensingAccuracyVerified",
    "thermistorChargeInhibitVerified",
    "systemLoadPowerPathVerified",
    "watchdogFaultSafeStateVerified",
    "efficiencyLossThermalVerified",
    "emcVerified",
    "productionSolarBatterySweepVerified",
  ],
});
export function validateSolarMpptArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/solar panel (?:input )?connector/, "solar-mppt-panel-input-missing"],
    [
      /solar reverse|pv reverse.*protection/,
      "solar-mppt-panel-protection-missing",
    ],
    [/mppt charger controller/, "solar-mppt-controller-missing"],
    [
      /switching power stage|mppt power stage/,
      "solar-mppt-power-stage-missing",
    ],
    [/battery pack connector/, "solar-mppt-battery-connector-missing"],
    [/battery.*protection/, "solar-mppt-battery-protection-missing"],
    [
      /panel current shunt|pv shunt panel current sense/,
      "solar-mppt-panel-current-sense-missing",
    ],
    [
      /battery charge current shunt|charge shunt battery current sense/,
      "solar-mppt-battery-current-sense-missing",
    ],
    [/pack ntc|battery thermistor/, "solar-mppt-battery-temperature-missing"],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.solarMppt || {};
  for (const [k, c] of [
    ["panelIvTemperatureVerified", "panel-envelope-unverified"],
    ["batteryChemistryChargeProfileVerified", "battery-profile-unverified"],
    ["converterRangeTopologyVerified", "converter-topology-unverified"],
    ["mpptPolicyDynamicsVerified", "policy-unverified"],
    ["protectionFaultEnergyVerified", "protection-unverified"],
    ["powerStageStabilityVerified", "power-stage-stability-unverified"],
    ["sensingCalibrationVerified", "sensing-calibration-unverified"],
    ["thermalEfficiencyVerified", "thermal-efficiency-unverified"],
    ["bmsSystemLoadSafetyVerified", "bms-load-safety-unverified"],
    ["productionSolarBatteryTestVerified", "production-test-unverified"],
  ])
    if (!e[k]) errors.push(`solar-mppt-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateSolarMpptProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["pvEnvelope", "pv-envelope-undeclared"],
    ["batteryEnvelope", "battery-envelope-undeclared"],
    ["chemistryEnvelope", "chemistry-envelope-undeclared"],
    ["topologyEnvelope", "topology-envelope-undeclared"],
    ["powerStageEnvelope", "power-stage-envelope-undeclared"],
    ["controlEnvelope", "control-envelope-undeclared"],
    ["stabilityEnvelope", "stability-envelope-undeclared"],
    ["protectionEnvelope", "protection-envelope-undeclared"],
    ["thermalEnvelope", "thermal-envelope-undeclared"],
    ["calibrationEnvelope", "calibration-envelope-undeclared"],
    ["testEnvelope", "test-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`solar-mppt-${code}`);
  for (const [p, c] of [
    [/solar panel input connector/, "solar-panel-input-missing"],
    [/solar reverse/, "solar-input-protection-missing"],
    [/mppt charger controller/, "solar-mppt-converter-missing"],
    [/switching power stage/, "solar-inductor-power-stage-missing"],
    [/battery pack connector/, "solar-battery-connector-protection-missing"],
    [/panel current shunt/, "solar-charge-current-voltage-sense-missing"],
    [
      /battery charge current shunt/,
      "solar-charge-current-voltage-sense-missing",
    ],
    [/pack ntc/, "solar-battery-temperature-missing"],
    [/watchdog fault-state/, "solar-charge-safety-state-missing"],
    [/solar array battery emulator/, "solar-production-load-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("solar-mppt-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.leftThermalEar?.projectionMm < 4 ||
    f.rightThermalEar?.projectionMm < 4 ||
    f.mountHoleCount !== 2 ||
    f.powerStageAirflowCorridorRequired !== true
  )
    errors.push("solar-mppt-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `solar-mppt-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.solar-mppt-remediation-gate.v1",
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
