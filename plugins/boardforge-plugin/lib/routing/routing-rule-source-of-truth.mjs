export const DEFAULT_ROUTING_RULE_SOURCE = Object.freeze({
  default: {
    trackWidthMm: 0.20,
    clearanceMm: 0.20,
    viaDrillMm: 0.30,
    viaDiameterMm: 0.60,
  },
  power: {
    trackWidthMm: 0.30,
    clearanceMm: 0.20,
    viaDrillMm: 0.35,
    viaDiameterMm: 0.70,
  },
  usb: {
    trackWidthMm: 0.20,
    clearanceMm: 0.20,
    diffPairGapMm: 0.15,
  },
  can: {
    trackWidthMm: 0.20,
    clearanceMm: 0.20,
  },
  i2c: {
    trackWidthMm: 0.20,
    clearanceMm: 0.20,
  },
  uart: {
    trackWidthMm: 0.20,
    clearanceMm: 0.20,
  },
  swd: {
    trackWidthMm: 0.20,
    clearanceMm: 0.20,
  },
});

export function mmToDsnUnit(mm) {
  return Math.round(Number(mm) * 1000);
}

export function normalizeRoutingRules(rules = DEFAULT_ROUTING_RULE_SOURCE) {
  const normalized = structuredClone(rules);
  for (const [name, rule] of Object.entries(normalized)) {
    for (const key of ["trackWidthMm", "clearanceMm", "viaDrillMm", "viaDiameterMm", "diffPairGapMm"]) {
      if (rule[key] !== undefined) {
        const value = Number(rule[key]);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`Invalid routing rule ${name}.${key}: ${rule[key]}`);
        }
        rule[key] = value;
      }
    }
  }
  return normalized;
}

export function buildKiCadNetClasses(rules = DEFAULT_ROUTING_RULE_SOURCE) {
  const source = normalizeRoutingRules(rules);
  return {
    defaultClass: {
      name: "Default",
      clearance: source.default.clearanceMm,
      track_width: source.default.trackWidthMm,
      via_diameter: source.default.viaDiameterMm,
      via_drill: source.default.viaDrillMm,
    },
    powerClass: {
      name: "Power",
      clearance: source.power.clearanceMm,
      track_width: source.power.trackWidthMm,
      via_diameter: source.power.viaDiameterMm,
      via_drill: source.power.viaDrillMm,
    },
  };
}

export function buildDsnRuleValues(rules = DEFAULT_ROUTING_RULE_SOURCE) {
  const source = normalizeRoutingRules(rules);
  return {
    defaultWidth: mmToDsnUnit(source.default.trackWidthMm),
    defaultClearance: mmToDsnUnit(source.default.clearanceMm),
    defaultViaDiameter: mmToDsnUnit(source.default.viaDiameterMm),
    defaultViaDrill: mmToDsnUnit(source.default.viaDrillMm),
    powerWidth: mmToDsnUnit(source.power.trackWidthMm),
    powerClearance: mmToDsnUnit(source.power.clearanceMm),
  };
}

export function assertKiCadDsnRuleParity(rules = DEFAULT_ROUTING_RULE_SOURCE) {
  const source = normalizeRoutingRules(rules);
  const kicad = buildKiCadNetClasses(source);
  const dsn = buildDsnRuleValues(source);
  const mismatches = [];
  const checks = [
    ["default.trackWidthMm", kicad.defaultClass.track_width, dsn.defaultWidth / 1000],
    ["default.clearanceMm", kicad.defaultClass.clearance, dsn.defaultClearance / 1000],
    ["power.trackWidthMm", kicad.powerClass.track_width, dsn.powerWidth / 1000],
    ["power.clearanceMm", kicad.powerClass.clearance, dsn.powerClearance / 1000],
  ];
  for (const [name, a, b] of checks) {
    if (Math.abs(a - b) > 1e-9) mismatches.push({ name, kicad: a, dsn: b });
  }
  return { ok: mismatches.length === 0, mismatches, kicad, dsn };
}
