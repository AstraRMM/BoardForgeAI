import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const AGRICULTURE_NODE_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.agriculture-node.v1";
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
export const agricultureNodeProductionProposal = Object.freeze({
  schema: AGRICULTURE_NODE_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_SOIL_RADIO_SITE_AND_SEASONAL_ENERGY",
  boardId: "032_AGRICULTURE_NODE",
  maximumAreaMm2: 3350,
  architecture:
    "Weatherproof soil and climate node with protected probes, region-qualified telemetry, solar/battery energy management, outage logging and condensation-controlled mechanics",
  siteEnvelope: null,
  soilEnvelope: null,
  radioEnvelope: null,
  seasonalEnergyEnvelope: null,
  environmentEnvelope: null,
  dataEnvelope: null,
  serviceEnvelope: null,
  candidates: [
    {
      role: "CLIMATE_SENSOR",
      family: "TI HDC302x",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_QUANTITIES_ACCURACY_EXPOSURE_AND_CALIBRATION",
    },
    {
      role: "CAPACITIVE_SOIL_FRONT_END",
      family: "Analog Devices AD7745/AD7746",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PROBE_GEOMETRY_EXCITATION_RANGE_AND_CALIBRATION",
    },
    {
      role: "NODE_CONTROLLER",
      family: "Raspberry Pi RP2040",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_RADIO_DATA_ENERGY_SECURITY_AND_LIFECYCLE",
    },
    {
      role: "OUTAGE_STORAGE",
      family: "Winbond W25Q",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_OUTAGE_RECORD_CAPACITY_ENDURANCE_AND_RETENTION",
    },
    {
      role: "METADATA_STORAGE",
      family: "ST M24C",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CALIBRATION_RECORD_AND_ENDURANCE_MODEL",
    },
    {
      role: "LOW_POWER_REGULATOR",
      family: "Microchip MCP1700",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_SEASONAL_SOURCE_LOAD_TRANSIENT_AND_THERMAL_BUDGET",
    },
  ],
  outline: {
    family: "weatherproof-gland-and-antenna-wings",
    closed: true,
    maximumAreaMm2: 3350,
    points: [
      [6, 0],
      [74, 0],
      [74, 13],
      [81, 13],
      [81, 31],
      [74, 31],
      [74, 44],
      [6, 44],
      [6, 35],
      [0, 35],
      [0, 9],
      [6, 9],
    ],
    purposefulFeatures: {
      antennaNose: { edge: "right", projectionMm: 7, spanMm: 18 },
      sealedGlandBank: { edge: "left", projectionMm: 6, spanMm: 26 },
      antennaCopperKeepoutRequired: true,
      drainageAndVentRequired: true,
    },
  },
  bom: [
    blocked(
      "U_CTRL",
      "exact low-power agriculture controller",
      "Freeze exact controller only after sensing, radio, logging, energy, security, interfaces and lifecycle requirements are declared.",
    ),
    blocked(
      "U_CLIMATE",
      "exact climate sensor",
      "Freeze exact sensor only after quantities, ranges, accuracy, calibration, vent exposure, contamination, self-heating and lifetime are declared.",
    ),
    blocked(
      "U_LOG",
      "local outage log storage",
      "Freeze exact storage only after record size, outage duration, capacity, endurance, retention and recovery are calculated.",
    ),
    blocked(
      "U_META",
      "calibration configuration storage",
      "Freeze exact metadata storage only after record format, update count, integrity, endurance and retention are declared.",
    ),
    blocked(
      "U_PWR",
      "low-power regulator",
      "Freeze exact regulator only after seasonal source, state loads, radio transients, dropout, quiescent current and thermal budgets are verified.",
    ),
    approved("C_DEC", "node decoupling candidate", "CL10B104KB8NNNC"),
    blocked(
      "S_SOIL",
      "exact soil probe and cable",
      "Freeze technology, geometry, range, soil/salinity/temperature response, calibration, burial, corrosion and service life.",
    ),
    blocked(
      "P_SOIL",
      "soil probe excitation guarded interface and diagnostics",
      "Freeze exact excitation/polarity reversal/switching, AFE, filter, guard and open/short diagnostics.",
    ),
    blocked(
      "D_FIELD",
      "probe cable surge EFT ESD common-mode protection",
      "Freeze exact protection, chassis return and cable shield network for outdoor induced transients.",
    ),
    blocked(
      "U_RADIO",
      "region-qualified exact LoRa or cellular radio",
      "Freeze country/network/band/range/payload and exact ordering code/package/pin map.",
    ),
    blocked(
      "J_ANT",
      "qualified field antenna RF network and ESD",
      "Freeze exact antenna/connector/match/filter/ESD from enclosure, vegetation, wet-soil and regulatory evidence.",
    ),
    blocked(
      "P_SOLAR",
      "exact solar source connector and protection",
      "Freeze panel/source, connector, reverse/overcurrent/surge and seasonal irradiance.",
    ),
    blocked(
      "U_CHG",
      "exact chemistry-qualified solar battery charger",
      "Freeze chemistry/cell, MPPT/charge profile, temperature qualification, power path and package.",
    ),
    blocked(
      "BT1",
      "protected battery energy storage and holder",
      "Freeze exact cell/pack, capacity, aging, temperature, holder/BMS/fuse and maintenance policy.",
    ),
    blocked(
      "P_SLEEP",
      "sensor radio load switching and wake scheduling",
      "Freeze exact load switches, leakage, stabilization, wake sources and brownout sequencing.",
    ),
    blocked(
      "U_RTC",
      "field logger RTC and backup timebase",
      "Freeze exact RTC/backup, drift, sync, reset detection and outage timestamp policy.",
    ),
    blocked(
      "J_FIELD",
      "sealed probe solar and service glands connectors",
      "Freeze exact IP-rated glands/connectors, pin maps, strain relief, sealing and mating cycles.",
    ),
    blocked(
      "P_VENT",
      "qualified membrane vent drainage and condensation system",
      "Freeze exact vent/membrane/adhesive/enclosure stack, pressure equalization, insects and drainage.",
    ),
    blocked(
      "P_TEST",
      "agriculture production and seasonal field fixture",
      "Freeze soil/climate/radio/power/charge/storage/seal/credential test and serialization fixture.",
    ),
  ],
  requiredTopology: [
    "Freeze soil/climate measurements, probes, calibration, placement and corrosion/fouling life.",
    "Control probe excitation to prevent electrolysis and protect outdoor cables with explicit chassis discharge paths.",
    "Place climate sensor behind a qualified vent away from self-heating, sun, standing water and coating.",
    "Freeze region/network and validate radio antenna/link in wet soil, vegetation, enclosure, mast and cable environment.",
    "Calculate worst-season solar balance and autonomy including sleep, sensing, logging, joins/retries, leakage, self-discharge and aging.",
    "Produce a month-by-month or worst-season energy budget from site irradiance, temperature, shading, radio retries, aging and required autonomy.",
    "Protect solar/battery interfaces and supervise charge temperature, state of charge, end of life and service back-power.",
    "Buffer checksummed timestamped records through outages with brownout-safe writes, retry/deduplication and full-storage behavior.",
    "Qualify enclosure/glands/vent for ingress, condensation, UV, chemicals, fertilizer, corrosion, insects, vibration and service.",
  ],
  mandatoryUnresolved: [
    "Freeze soil quantities, probe technology, deployment depth, site soil/climate and calibration.",
    "Freeze deployment country/site, region/network/link/antenna and credentials.",
    "Freeze solar/battery/seasonal autonomy/temperature/outage.",
    "Select all unresolved exact field/radio/energy/mechanical assets after calculations.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "soilCalibrationSalinityTemperatureVerified",
    "probeExcitationCorrosionVerified",
    "fieldCableSurgePathVerified",
    "climateExposureSelfHeatingVerified",
    "radioRegionLinkBudgetVerified",
    "antennaWetVegetationDetuningVerified",
    "seasonalSolarEnergyBalanceVerified",
    "batteryChargeTemperatureAgingVerified",
    "sleepWakeLeakageScheduleVerified",
    "outageStorageTimebaseIntegrityVerified",
    "credentialProvisionSecurityVerified",
    "ingressVentCondensationVerified",
    "uvChemicalFertilizerCorrosionVerified",
    "productionFieldSealEnergyRadioTestVerified",
  ],
});
export function validateAgricultureNodeArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [/soil probe/, "agriculture-soil-probe-missing"],
    [
      /probe excitation|soil.*front end.*probe interface/,
      "agriculture-soil-interface-missing",
    ],
    [/climate sensor/, "agriculture-climate-sensor-missing"],
    [
      /exact lora|cellular radio|remote telemetry radio/,
      "agriculture-telemetry-radio-missing",
    ],
    [/field antenna|remote telemetry antenna/, "agriculture-antenna-missing"],
    [
      /solar battery charger|seasonal battery power management/,
      "agriculture-power-management-missing",
    ],
    [/local outage log|outage local log/, "agriculture-local-storage-missing"],
    [
      /cable surge|field surge protection/,
      "agriculture-field-protection-missing",
    ],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.agricultureNode || {};
  for (const [k, c] of [
    ["soilMeasurementCalibrationVerified", "soil-calibration-unverified"],
    ["climateExposureVerified", "climate-exposure-unverified"],
    ["radioRegionLinkVerified", "radio-link-unverified"],
    ["antennaAssemblyVerified", "antenna-assembly-unverified"],
    ["seasonalEnergyBudgetVerified", "seasonal-energy-unverified"],
    ["corrosionSurgeVerified", "corrosion-surge-unverified"],
    ["dataRecoverySecurityVerified", "data-security-recovery-unverified"],
    ["weatherproofMechanicalVerified", "weatherproof-mechanical-unverified"],
    ["productionFieldTestVerified", "production-field-test-unverified"],
  ])
    if (!e[k]) errors.push(`agriculture-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateAgricultureNodeProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["siteEnvelope", "site-envelope-undeclared"],
    ["soilEnvelope", "soil-envelope-undeclared"],
    ["radioEnvelope", "radio-envelope-undeclared"],
    ["seasonalEnergyEnvelope", "seasonal-energy-envelope-undeclared"],
    ["environmentEnvelope", "environment-envelope-undeclared"],
    ["dataEnvelope", "data-envelope-undeclared"],
    ["serviceEnvelope", "service-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`agriculture-node-${code}`);
  for (const [p, c] of [
    [/soil probe and cable/, "soil-sensor-interface-missing"],
    [/climate sensor/, "climate-sensor-missing"],
    [/exact lora|cellular radio/, "agriculture-radio-missing"],
    [/probe excitation/, "agriculture-probe-excitation-missing"],
    [/cable surge/, "agriculture-cable-surge-path-missing"],
    [/field antenna/, "agriculture-antenna-network-missing"],
    [/solar battery charger/, "agriculture-energy-source-missing"],
    [/battery energy storage/, "agriculture-energy-source-missing"],
    [/local outage log/, "agriculture-local-storage-timebase-missing"],
    [/logger rtc/, "agriculture-local-storage-timebase-missing"],
    [/membrane vent/, "agriculture-ingress-condensation-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("agriculture-node-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.antennaNose?.projectionMm < 7 ||
    f.sealedGlandBank?.projectionMm < 6 ||
    f.antennaCopperKeepoutRequired !== true ||
    f.drainageAndVentRequired !== true
  )
    errors.push("agriculture-node-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `agriculture-node-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.agriculture-node-remediation-gate.v1",
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
