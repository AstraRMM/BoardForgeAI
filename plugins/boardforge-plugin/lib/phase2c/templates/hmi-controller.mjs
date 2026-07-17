import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
export const HMI_CONTROLLER_PROPOSAL_SCHEMA =
  "boardforge.phase2c.production-proposal.hmi-controller.v1";
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
export const hmiControllerProductionProposal = Object.freeze({
  schema: HMI_CONTROLLER_PROPOSAL_SCHEMA,
  status: "BLOCKED_PENDING_DISPLAY_TIMING_HOST_AND_MECHANICS",
  boardId: "038_HMI_CONTROLLER",
  maximumAreaMm2: 2650,
  architecture:
    "Display-matched interface controller with exact panel/connector/timing, regulated backlight and rails, protected level domains, host recovery and verified fascia/window mechanics",
  displayAssemblyEnvelope: null,
  interfaceEnvelope: null,
  timingEnvelope: null,
  powerEnvelope: null,
  thermalEnvelope: null,
  hostEnvelope: null,
  recoveryEnvelope: null,
  mechanicalEnvelope: null,
  testEnvelope: null,
  candidates: [
    {
      role: "INTEGRATED_GRAPHICS_MCU",
      family: "ST STM32H7",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PANEL_TIMING_RENDERING_MEMORY_HOST_AND_PACKAGE",
    },
    {
      role: "EXTERNAL_GRAPHICS_ENGINE",
      family: "Bridgetek BT81x EVE",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_PANEL_TIMING_CONTENT_HOST_AND_PACKAGE",
    },
    {
      role: "APPLICATION_CONTROLLER",
      family: "Raspberry Pi RP2040",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_UI_HOST_RECOVERY_POWER_AND_LIFECYCLE",
    },
    {
      role: "DISPLAY_ASSET_STORAGE",
      family: "Winbond W25Q",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_ASSET_CAPACITY_BANDWIDTH_UPDATE_AND_LIFECYCLE",
    },
    {
      role: "DISPLAY_CONFIGURATION",
      family: "ST M24C",
      exactMpn: null,
      status:
        "CAPABILITY_REFERENCE_PENDING_CONFIG_RECORD_ADDRESS_ENDURANCE_AND_COMPATIBILITY",
    },
  ],
  outline: {
    family: "display-window-fascia-wing",
    closed: true,
    maximumAreaMm2: 2650,
    points: [
      [0, 0],
      [60, 0],
      [60, 5],
      [66, 5],
      [66, 35],
      [60, 35],
      [60, 40],
      [0, 40],
    ],
    purposefulFeatures: {
      displayWindowWing: { edge: "right", projectionMm: 6, spanMm: 30 },
      windowDatumCount: 4,
      flexBendKeepoutRequired: true,
      backlightThermalEdge: "top",
    },
  },
  bom: [
    blocked(
      "U_APP",
      "exact HMI application controller",
      "Freeze exact controller only after panel, rendering, controls, host, memory, recovery, power, software and lifecycle requirements are declared.",
    ),
    blocked(
      "U_ASSET",
      "exact display asset storage",
      "Freeze exact storage only after graphics content, capacity, bandwidth, boot latency, update/recovery, endurance and lifecycle are declared.",
    ),
    blocked(
      "U_CFG",
      "exact display configuration storage",
      "Freeze exact configuration storage only after record format, address, power, compatibility, update count, endurance and retention are declared.",
    ),
    approved(
      "C_DEC",
      "display digital decoupling candidate",
      "CL10B104KB8NNNC",
    ),
    blocked(
      "DS1",
      "exact display panel assembly",
      "Freeze manufacturer/model/revision, active area, resolution, pixel interface, rails, reset, environmental grade and lifecycle.",
    ),
    blocked(
      "U_DISP",
      "exact display timing graphics controller",
      "Freeze exact controller/package/pin map from resolution, frame rate, color depth, rendering, memory bandwidth and boot latency.",
    ),
    blocked(
      "J_PANEL",
      "exact display flex or panel connector",
      "Freeze exact mating connector, pin numbering, flex orientation, retention, current and panel pin map.",
    ),
    blocked(
      "P_LEVEL",
      "display bus level translation buffering and series damping",
      "Freeze exact translators/buffers/series parts from voltage domains, direction, edge, skew, loading and unpowered state.",
    ),
    blocked(
      "D_PANEL",
      "display flex operator and host ESD protection",
      "Freeze exact low-capacitance ESD parts and short discharge return paths.",
    ),
    blocked(
      "U_BL",
      "exact constant-current backlight driver",
      "Freeze exact driver/inductor/diode/current set from LED strings, compliance, PWM/analog dimming, inrush and faults.",
    ),
    blocked(
      "P_RAIL",
      "panel analog digital rail sequencing and power control",
      "Freeze exact converters/load switches/reset timing/discharge from panel sequence, transient and back-power.",
    ),
    blocked(
      "U_TOUCH",
      "exact touch controller and interface if panel requires",
      "Freeze exact touch controller/connector/protection/calibration or explicitly prove no touch requirement.",
    ),
    blocked(
      "J_HOST",
      "protected keyed host communication connector",
      "Freeze exact protocol/transceiver/connector/pin map, cable, ESD, isolation/back-power, heartbeat and ownership.",
    ),
    blocked(
      "J_DEBUG",
      "protected programming debug and recovery interface",
      "Freeze exact interface, boot straps, ESD/back-power, debug lock, recovery and production fixture.",
    ),
    blocked(
      "U_WDOG",
      "HMI watchdog brownout reset supervisor",
      "Freeze exact supervisor/timing and deterministic fault/host-loss presentation plus backlight state.",
    ),
    blocked(
      "P_FASCIA",
      "exact display fascia window gasket and mounting stack",
      "Freeze aperture, viewing/touch stack, tolerance, flex bend, gasket, sunlight, ingress, cleaning and fasteners.",
    ),
    blocked(
      "P_TEST",
      "production display pixel backlight touch host fixture",
      "Freeze test for pixels/colors/timing, rails/backlight, touch/controls, host, faults, thermal and assets.",
    ),
  ],
  requiredTopology: [
    "Freeze exact panel/touch assembly, resolution/interface/timing/rails/reset/backlight/flex/mechanics.",
    "Select graphics controller and memory from frame/color/rendering/load/bandwidth/latency calculations.",
    "Implement connector, level shifting, ESD and bus routing with verified impedance/skew/returns and no unpowered backfeed.",
    "Sequence panel rails/reset and regulate backlight current with inrush/open/short/thermal handling.",
    "Freeze host protocol/connector, state ownership, heartbeat/timeouts, compatibility, recovery and malformed/lost data behavior.",
    "Use watchdog/brownout and deterministic startup/update/fault presentation that cannot falsely show normal state.",
    "Treat the HMI as status and control only, not a safety-rated emergency stop or independent protective function.",
    "Verify fascia/window aperture, viewing, flex bend, retention, touch stack, ingress, sunlight, vibration and service access.",
    "Production-test pixel/color patterns, timing, backlight, touch, buses, host, faults, current, thermal and firmware/assets.",
  ],
  mandatoryUnresolved: [
    "Freeze the exact panel/touch model/revision, connector, timing, rails, backlight and mechanics.",
    "Freeze graphics content/complexity, UI/rendering/frame/memory/latency requirements.",
    "Freeze host/power/enclosure/EMC/recovery requirements.",
    "Select unresolved exact display/controller/power/interface/mechanical/test assets after budgets.",
  ],
  evidenceRequired: [
    "exactAssetsApproved",
    "displayModelRevisionPinMapVerified",
    "pixelClockTimingBandwidthVerified",
    "controllerRenderingMemoryMarginVerified",
    "connectorFlexOrientationVerified",
    "busImpedanceSkewSignalIntegrityVerified",
    "levelTranslationUnpoweredStateVerified",
    "panelEsdEmcVerified",
    "railSequenceResetBackpowerVerified",
    "backlightCurrentDimmingFaultVerified",
    "touchCalibrationVerified",
    "hostProtocolHeartbeatRecoveryVerified",
    "watchdogSafeFaultPresentationVerified",
    "fasciaWindowFlexKeepoutVerified",
    "powerThermalSunlightVerified",
    "productionPixelColorBacklightHostTestVerified",
  ],
});
export function validateHmiControllerArchitecture(definition = {}) {
  const roles = (definition.bom || []).map((x) =>
      String(x.role || "").toLowerCase(),
    ),
    has = (p) => roles.some((x) => p.test(x)),
    errors = [];
  for (const [p, c] of [
    [
      /display timing graphics controller|hmi graphics controller/,
      "hmi-controller-graphics-engine-missing",
    ],
    [
      /display flex.*connector|display panel connector/,
      "hmi-controller-panel-connector-missing",
    ],
    [/backlight driver/, "hmi-controller-backlight-driver-missing"],
    [
      /touch controller|operator control/,
      "hmi-controller-operator-controls-missing",
    ],
    [
      /display flex.*esd|display esd.*protection/,
      "hmi-controller-interface-protection-missing",
    ],
    [
      /host communication connector|host interface connector/,
      "hmi-controller-host-interface-missing",
    ],
    [
      /rail sequencing|display power sequencing/,
      "hmi-controller-panel-power-missing",
    ],
    [
      /watchdog (?:brownout|reset supervisor)/,
      "hmi-controller-supervision-missing",
    ],
  ])
    if (!has(p)) errors.push(c);
  const e = definition.semanticEvidence?.hmiController || {};
  for (const [k, c] of [
    ["panelInterfaceTimingVerified", "panel-interface-unverified"],
    ["renderingMemoryBudgetVerified", "rendering-memory-unverified"],
    ["operatorControlVerified", "controls-unverified"],
    ["hostProtocolVerified", "host-protocol-unverified"],
    ["powerBacklightThermalVerified", "power-backlight-unverified"],
    ["signalIntegrityEmcVerified", "signal-emc-unverified"],
    ["safePresentationVerified", "safe-presentation-unverified"],
    ["displayMechanicalVerified", "display-mechanical-unverified"],
    ["productionUiTestVerified", "production-ui-test-unverified"],
  ])
    if (!e[k]) errors.push(`hmi-controller-${c}`);
  return { ok: errors.length === 0, errors };
}
export function validateHmiControllerProductionProposal(proposal = {}) {
  const errors = [],
    bom = Array.isArray(proposal.bom) ? proposal.bom : [],
    roles = bom.map((x) => String(x.role || "").toLowerCase()),
    has = (p) => roles.some((x) => p.test(x));
  for (const [key, code] of [
    ["displayAssemblyEnvelope", "display-assembly-envelope-undeclared"],
    ["interfaceEnvelope", "interface-envelope-undeclared"],
    ["timingEnvelope", "timing-envelope-undeclared"],
    ["powerEnvelope", "power-envelope-undeclared"],
    ["thermalEnvelope", "thermal-envelope-undeclared"],
    ["hostEnvelope", "host-envelope-undeclared"],
    ["recoveryEnvelope", "recovery-envelope-undeclared"],
    ["mechanicalEnvelope", "mechanical-envelope-undeclared"],
    ["testEnvelope", "test-envelope-undeclared"],
  ])
    if (proposal[key] == null) errors.push(`hmi-controller-${code}`);
  for (const [p, c] of [
    [/display panel assembly/, "hmi-display-interface-missing"],
    [/display timing graphics/, "hmi-application-controller-missing"],
    [/display flex.*connector/, "hmi-display-interface-missing"],
    [/backlight driver/, "hmi-display-power-backlight-missing"],
    [/rail sequencing/, "hmi-display-power-backlight-missing"],
    [/display flex.*esd/, "hmi-control-protection-missing"],
    [/host communication connector/, "hmi-host-interface-missing"],
    [/watchdog brownout/, "hmi-watchdog-recovery-missing"],
    [/display asset storage/, "hmi-ui-storage-missing"],
    [/production display pixel/, "hmi-production-test-missing"],
  ])
    if (!has(p)) errors.push(c);
  const blockedParts = bom.filter((x) => x.status !== "APPROVED_EXACT_ASSET");
  if (blockedParts.length)
    errors.push("hmi-controller-exact-assets-unapproved");
  const f = proposal.outline?.purposefulFeatures || {},
    area = polygonArea(proposal.outline?.points);
  if (
    proposal.outline?.closed !== true ||
    !Number.isFinite(area) ||
    area > (proposal.maximumAreaMm2 || 0) ||
    f.displayWindowWing?.projectionMm < 6 ||
    f.windowDatumCount < 4 ||
    f.flexBendKeepoutRequired !== true
  )
    errors.push("hmi-controller-purposeful-outline-invalid");
  for (const key of proposal.evidenceRequired || [])
    if (proposal.semanticEvidence?.[key] !== true)
      errors.push(
        `hmi-controller-evidence-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-missing`,
      );
  return {
    schema: "boardforge.phase2c.hmi-controller-remediation-gate.v1",
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
