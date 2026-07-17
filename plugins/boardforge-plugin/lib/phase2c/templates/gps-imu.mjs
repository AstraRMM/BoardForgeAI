import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const GPS_IMU_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.gps-imu.v1";
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
export const gpsImuProductionProposal = Object.freeze({
  schema: GPS_IMU_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_NAVIGATION_PERFORMANCE_RF_AND_HOST_INTERFACE",
  boardId: "022_GPS_IMU",
  maximumAreaMm2: 2650,
  architecture:
    "GNSS receiver and six-axis IMU with verified antenna/RF chain, low-noise power, backup supply, protected interfaces, deterministic PPS timing, declared axes, calibration and environmental evidence",
  navigationEnvelope: null,
  rfEnvelope: null,
  imuEnvelope: null,
  timingEnvelope: null,
  hostEnvelope: null,
  powerEnvelope: null,
  backupEnvelope: null,
  environmentEnvelope: null,
  primarySources: {
    gnssIntegration:
      "https://content.u-blox.com/sites/default/files/MAX-M10S_IntegrationManual_UBX-20053088.pdf",
    imuDatasheet:
      "https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmi088-ds001.pdf",
  },
  candidates: [
    {
      role: "GNSS_RECEIVER",
      family: "u-blox MAX-M10",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CONSTELLATION_BAND_ANTENNA_AND_PACKAGE",
      verified: {
        receiverClass: "multi-constellation GNSS",
        interfaces: ["UART", "I2C"],
        timePulse: true,
        antennaImplementationRequiresIntegrationEvidence: true,
      },
    },
    {
      role: "SIX_AXIS_IMU",
      family: "Bosch BMI088",
      exactMpn: null,
      status: "CAPABILITY_REFERENCE_PENDING_RANGE_ODR_NOISE_AND_LIFECYCLE",
      verified: {
        sensors: ["3-axis accelerometer", "3-axis gyroscope"],
        digitalInterfaces: ["SPI", "I2C"],
        interrupts: true,
        separateSensorDies: true,
      },
    },
    {
      role: "LOW_NOISE_NAVIGATION_POWER",
      family: "Microchip MCP1700",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_LOAD_NOISE_TRANSIENT_AND_THERMAL_ENVELOPE",
      verified: {
        regulatorClass: "low-quiescent-current LDO family",
        exactOrderingCodeRequiresSystemEvidence: true,
      },
    },
  ],
  outline: {
    family: "rf-keepout-nose-gps-imu",
    closed: true,
    maximumAreaMm2: 2650,
    points: [
      [0, 0],
      [56, 0],
      [56, 12],
      [62, 12],
      [62, 30],
      [56, 30],
      [56, 42],
      [0, 42],
    ],
    purposefulFeatures: {
      antennaNose: { projectionMm: 6, spanMm: 18 },
      antennaCopperKeepoutRequired: true,
      imuRigidBodyZone: "center",
      hostConnectorEdge: "left",
      mountingHoleCount: 4,
    },
  },
  bom: [
    blocked(
      "U_GNSS",
      "exact GNSS receiver",
      "Freeze exact MAX-M10 ordering code/package/pin map from constellation, band, update rate, dynamics, sensitivity, timing and lifecycle requirements.",
    ),
    blocked(
      "J_RF",
      "exact GNSS antenna or RF connector",
      "Freeze exact active/passive antenna or connector/cable MPN with gain, noise figure, polarization, enclosure and regulatory evidence.",
    ),
    blocked(
      "P_RF",
      "GNSS controlled-impedance RF matching filter and bias chain",
      "Freeze exact SAW/matching/bias-tee parts and values from selected receiver/antenna reference design and measured RF path.",
    ),
    blocked(
      "D_RF",
      "GNSS antenna low-capacitance ESD protection",
      "Freeze exact RF ESD MPN with capacitance, insertion loss, surge path and grounding evidence.",
    ),
    blocked(
      "U_IMU",
      "exact six-axis inertial IMU",
      "Freeze exact BMI088 ordering code/package and accel/gyro maps from range, noise, bandwidth, ODR, vibration, temperature and lifecycle requirements.",
    ),
    blocked(
      "P_IMU",
      "IMU low-noise filtered supply and interface network",
      "Freeze exact low-noise regulator/filter, decoupling, chip-select/address and data-ready interrupt parts.",
    ),
    blocked(
      "P_BACKUP",
      "GNSS backup supply and isolation",
      "Freeze exact battery/supercap, charge/current limiting and isolation parts for V_BCKP retention and main-power removal.",
    ),
    blocked(
      "P_PPS",
      "GNSS PPS time-pulse protection and level interface",
      "Freeze exact buffer/series/ESD parts, voltage domain, edge integrity and host timing path.",
    ),
    blocked(
      "J_HOST",
      "keyed GNSS IMU host interface",
      "Freeze exact connector MPN and supply/grounds/UART-I2C-SPI/PPS/interrupt pin map with cable and backpower evidence.",
    ),
    blocked(
      "U_PWR",
      "navigation low-noise 3.3 V regulator",
      "Freeze exact regulator MPN only after GNSS/IMU peak load, dropout, source transient, PSRR/noise, startup and thermal envelopes are verified.",
    ),
    approved(
      "C_DEC",
      "GNSS IMU digital decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    blocked(
      "P_CAL",
      "IMU orientation calibration and serialization support",
      "Define PCB/device/vehicle axes, calibration storage, temperature compensation, self-test and production serialization.",
    ),
  ],
  requiredTopology: [
    "Select GNSS constellations, bands, update rate, time-to-fix, sensitivity, dynamic model, accuracy, time-pulse behavior, and host protocol from mission and regulatory region.",
    "Implement selected receiver vendor power, reset, backup supply, interface, decoupling, and reserved-pin requirements from frozen ordering code.",
    "Use qualified antenna/module combination or calculated controlled-impedance RF path with matching, bias/feed, ESD, connector, ground clearance, keepout, and enclosure validation.",
    "Provide real accelerometer and gyroscope with decoupling, interface controls, data-ready interrupts, safe address selection, and acquisition rate that cannot alias motion/vibration spectrum.",
    "Define PCB coordinate axes, component axes, right-handed frame, vehicle-frame rotation, assembly side, and calibration data; silkscreen marks must agree with firmware.",
    "Separate/filter noisy digital/RF loads from sensor rails and verify regulator noise, transients, startup, backup behavior and source budget.",
    "Expose keyed host connector with verified supply, grounds, protocol, logic voltage, GNSS PPS, IMU interrupt, cable and back-power behavior.",
    "Place IMU near rigid-body reference away from flex, heat, inductors and switching loops; verify mounting stress, vibration, shock, thermal gradients and enclosure effects.",
  ],
  mandatoryUnresolved: [
    "Declare vehicle dynamics, position/velocity/timing accuracy, constellations/bands, update rates, antenna type/location, enclosure, cable, interference and region.",
    "Declare accel/gyro ranges, noise, bandwidth/ODR, latency, vibration/shock, temperature, axes, calibration and synchronization.",
    "Declare host model, connector/pinout, protocol, logic voltage, available power, cable, PPS/interrupt use and permitted backfeed.",
    "Select exact GNSS/IMU codes, packages, pin maps, antenna/RF, regulator/filter, backup, protection and connector only after requirements are frozen.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "gnssPerformanceVerified",
    "receiverPinMapReservedPinsVerified",
    "antennaRfLinkBudgetVerified",
    "rfImpedanceMatchLossVerified",
    "antennaEsdBiasVerified",
    "imuPerformanceAliasVerified",
    "imuOrientationCalibrationVerified",
    "lowNoisePowerIntegrityVerified",
    "backupSupplyRetentionVerified",
    "ppsTimingJitterVerified",
    "hostInterfaceBackfeedVerified",
    "antennaKeepoutEnclosureVerified",
    "vibrationShockThermalVerified",
    "productionRfPpsImuCalibrationTestVerified",
  ],
});
export function validateGpsImuArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  if (!has(/gnss.*receiver|gps.*receiver/))
    errors.push("gps-imu-gnss-receiver-missing");
  if (!has(/gnss.*antenna|gps.*antenna/))
    errors.push("gps-imu-antenna-missing");
  if (!has(/rf.*matching|antenna.*matching|gnss.*rf.*path/))
    errors.push("gps-imu-rf-network-missing");
  if (!has(/accelerometer|inertial.*accel/))
    errors.push("gps-imu-accelerometer-missing");
  if (!has(/gyroscope|inertial.*gyro/))
    errors.push("gps-imu-gyroscope-missing");
  if (!has(/sensor.*rail.*filter|imu.*power.*filter/))
    errors.push("gps-imu-sensor-power-filter-missing");
  if (!has(/flight.*stack.*connector|host.*navigation.*connector/))
    errors.push("gps-imu-host-connector-missing");
  if (!has(/time.*pulse|\bpps\b/)) errors.push("gps-imu-time-pulse-missing");
  const e = definition.semanticEvidence?.gpsImu || {};
  if (!e.gnssPerformanceVerified)
    errors.push("gps-imu-gnss-performance-unverified");
  if (!e.antennaRfVerified) errors.push("gps-imu-antenna-rf-unverified");
  if (!e.imuPerformanceVerified)
    errors.push("gps-imu-inertial-performance-unverified");
  if (!e.sensorOrientationVerified)
    errors.push("gps-imu-orientation-unverified");
  if (!e.timingVerified) errors.push("gps-imu-timing-unverified");
  if (!e.powerIntegrityVerified)
    errors.push("gps-imu-power-integrity-unverified");
  if (!e.hostInterfaceVerified)
    errors.push("gps-imu-host-interface-unverified");
  if (!e.mechanicalEnvironmentVerified)
    errors.push("gps-imu-mechanical-environment-unverified");
  if (!e.productionTestVerified)
    errors.push("gps-imu-production-test-unverified");
  return { ok: errors.length === 0, errors };
}
export function validateGpsImuProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["navigationEnvelope", "navigation-envelope-undeclared"],
    ["rfEnvelope", "rf-envelope-undeclared"],
    ["imuEnvelope", "imu-envelope-undeclared"],
    ["timingEnvelope", "timing-envelope-undeclared"],
    ["hostEnvelope", "host-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["backupEnvelope", "backup-envelope-undeclared"],
    ["environmentEnvelope", "environment-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`gps-imu-${code}`);
  for (const [p, c] of [
    [/exact gnss receiver/, "gnss-receiver-missing"],
    [/gnss antenna/, "gnss-antenna-path-missing"],
    [/rf matching filter/, "gnss-rf-protection-filter-missing"],
    [/antenna low-capacitance esd/, "gnss-rf-protection-filter-missing"],
    [/backup supply/, "gnss-backup-supply-missing"],
    [/pps time-pulse/, "gnss-pps-interface-missing"],
    [/six-axis inertial imu/, "imu-sensor-missing"],
    [/imu low-noise filtered supply/, "imu-low-noise-supply-missing"],
    [/data-ready interrupt/, "imu-interrupt-interface-missing"],
    [/orientation calibration/, "imu-orientation-evidence-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length) errors.push("gps-imu-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.antennaNose?.projectionMm < 6 ||
    f.antennaNose?.spanMm < 18 ||
    f.antennaCopperKeepoutRequired !== true
  )
    errors.push("gps-imu-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `gps-imu-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.gps-imu-remediation-gate.v1",
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
