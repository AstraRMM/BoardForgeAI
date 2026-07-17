import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  usbHubProductionProposal,
  validateUsbHubProductionProposal,
} from "../lib/phase2c/templates/usb-hub.mjs";
import { approvedAssetFor } from "../lib/components/approved-production-assets.mjs";
import { resolveAuthoritativeKiCadSymbol } from "../lib/components/authoritative-kicad-symbol-resolver.mjs";
import { resolveAuthoritativeKiCadFootprint } from "../lib/components/authoritative-kicad-footprint-resolver.mjs";

test("Board011 legacy RP2040 instrument cannot pass as a four-port hub", () => {
  const d = catalogDefinition(manifest.boards[10], 10),
    g = validateCatalogSemanticTopology(d);
  assert.equal(d.topologyId, "rp2040-instrument");
  assert.equal(g.ok, false);
  for (const code of [
    "usb-hub-controller-missing",
    "usb-hub-upstream-port-missing",
    "usb-hub-four-downstream-ports-missing",
    "usb-hub-port-power-control-missing",
    "usb-hub-overcurrent-evidence-missing",
    "usb-hub-clock-evidence-missing",
    "usb-hub-category-mapped-to-mcu-instrument",
  ])
    assert.ok(g.errors.includes(code), code);
});

test("USB2514B installed identity freezes the authoritative 36-QFN plus exposed-pad map", () => {
  const h = usbHubProductionProposal.hubIdentity,
    a = approvedAssetFor("USB2514B_Bi");
  assert.equal(h.symbol, "Interface_USB:USB2514B_Bi");
  assert.equal(
    h.footprint,
    "Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm",
  );
  assert.equal(Object.keys(h.pinMap).length, 37);
  assert.equal(h.pinMap[12], "PORT_PWR1");
  assert.equal(h.pinMap[21], "OVERCURRENT4_N");
  assert.equal(h.pinMap[37], "GND");
  assert.equal(h.status, "APPROVED_EXACT_ASSET");
  assert.equal(a.symbol.libId, h.symbol);
  assert.equal(a.footprint.libId, h.footprint);
});

test("Board011 proposal has exactly one upstream and four downstream ports and fails only on unresolved protected 5V architecture", () => {
  const g = validateUsbHubProductionProposal(usbHubProductionProposal);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("usb-hub-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, ["U_5V"]);
  assert.equal(
    usbHubProductionProposal.bom.find((x) => x.ref === "J_UP").quantity,
    1,
  );
  assert.equal(
    usbHubProductionProposal.bom.find((x) => x.ref === "J_DN").quantity,
    4,
  );
});

test("Board011 hub clock and four combined Type-C DFP power controllers resolve authoritatively", () => {
  for (const mpn of ["USB2514B_Bi", "Q22FA2380119417", "TPS25810RVCR"]) {
    const a = approvedAssetFor(mpn);
    assert.ok(resolveAuthoritativeKiCadSymbol(a.symbol.libId).pins.length);
    assert.ok(
      resolveAuthoritativeKiCadFootprint(a.footprint.libId).pads.length,
    );
  }
  const s = usbHubProductionProposal.supportDesign;
  assert.deepEqual(s.configuration.cfgSel, [0, 0]);
  assert.deepEqual(s.configuration.nonRem, [0, 0]);
  assert.equal(s.downstreamTypeC.count, 4);
  assert.equal(s.downstreamTypeC.role, "DFP");
  assert.equal(s.upstreamTypeC.role, "UFP");
});

test("Board011 four-scallop outline remains within the 1600 mm2 manifest limit", () => {
  const g = validateUsbHubProductionProposal(usbHubProductionProposal);
  assert.equal(g.areaMm2, 1408);
  assert.ok(g.areaMm2 <= 1600);
  assert.equal(
    usbHubProductionProposal.outline.purposefulFeatures.downstreamPortScallops,
    4,
  );
});

test("Board011 protected aggregate 5V source remains quantitatively blocked instead of selecting an unsupported regulator", () => {
  const p = usbHubProductionProposal.fiveVoltArchitecture,
    g = validateUsbHubProductionProposal(usbHubProductionProposal);
  assert.equal(p.minimumSimultaneousPortLoadMa, 4 * 500);
  assert.equal(p.aggregateDesignCurrentA, null);
  assert.equal(p.inputEnvelope.nominalVoltageV, null);
  assert.equal(p.conversionEnvelope.regulatorMpn, null);
  assert.equal(p.protectionEnvelope.backfeedBlockedWhenInputOff, false);
  assert.equal(p.thermalEnvelope.measuredOrSimulated, false);
  assert.equal(p.faultEnvelope.perPortFaultIsolationVerified, false);
  for (const code of [
    "usb-hub-aggregate-5v-design-current-undeclared",
    "usb-hub-5v-input-undeclared",
    "usb-hub-5v-conversion-undeclared",
    "usb-hub-5v-protection-undeclared",
    "usb-hub-5v-distribution-undeclared",
    "usb-hub-5v-thermal-undeclared",
    "usb-hub-5v-fault-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
  assert.match(p.releaseRule, /1600 mm2 outline/);
});

test("Board011 exact hub and four-port power topology preserves authoritative pin and pad identities", () => {
  const hub = approvedAssetFor("USB2514B_Bi"),
    dfp = approvedAssetFor("TPS25810RVCR"),
    hubSymbol = resolveAuthoritativeKiCadSymbol(hub.symbol.libId),
    hubFootprint = resolveAuthoritativeKiCadFootprint(hub.footprint.libId),
    dfpSymbol = resolveAuthoritativeKiCadSymbol(dfp.symbol.libId),
    dfpFootprint = resolveAuthoritativeKiCadFootprint(dfp.footprint.libId);
  assert.equal(
    usbHubProductionProposal.bom.find((x) => x.ref === "U1").quantity,
    1,
  );
  assert.equal(
    usbHubProductionProposal.bom.find((x) => x.ref === "U_DFP").quantity,
    4,
  );
  assert.equal(hub.symbolPinMap[37], "GND");
  assert.equal(hub.footprintPadMap[37], "GND");
  assert.equal(
    hubSymbol.pins.some((x) => String(x.number) === "37"),
    true,
  );
  assert.equal(
    hubFootprint.pads.some((x) => String(x.number) === "37"),
    true,
  );
  assert.deepEqual(
    Object.fromEntries(
      ["1", "2", "3", "4", "5", "6", "10", "11", "13", "14", "15", "21"].map(
        (k) => [k, dfp.symbolPinMap[k]],
      ),
    ),
    {
      1: "FAULT_N",
      2: "5V_PROTECTED",
      3: "5V_PROTECTED",
      4: "5V_PROTECTED",
      5: "3V3",
      6: "PORT_ENABLE",
      10: "REF",
      11: "CC1",
      13: "CC2",
      14: "PORT_VBUS",
      15: "PORT_VBUS",
      21: "GND",
    },
  );
  for (const pad of [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "10",
    "11",
    "13",
    "14",
    "15",
    "21",
  ]) {
    assert.equal(
      dfpSymbol.pins.some((x) => String(x.number) === pad),
      true,
      `TPS25810 symbol pin ${pad}`,
    );
    assert.equal(
      dfpFootprint.pads.some((x) => String(x.number) === pad),
      true,
      `TPS25810 footprint pad ${pad}`,
    );
  }
});

test("Board011 5V architecture cannot release at exactly 2A before hub loss and inrush margin", () => {
  const x = structuredClone(usbHubProductionProposal);
  x.fiveVoltArchitecture.aggregateDesignCurrentA = 2;
  const g = validateUsbHubProductionProposal(x);
  assert.ok(
    g.errors.includes("usb-hub-aggregate-5v-design-current-undeclared"),
  );
  assert.equal(g.ok, false);
});

test("Board011 four-scallop mechanics fail closed on open excess-area or wrong-port geometry", () => {
  const open = structuredClone(usbHubProductionProposal);
  open.outline.closed = false;
  assert.ok(
    validateUsbHubProductionProposal(open).errors.includes(
      "usb-hub-purposeful-outline-invalid",
    ),
  );
  const count = structuredClone(usbHubProductionProposal);
  count.outline.purposefulFeatures.downstreamPortScallops = 3;
  assert.ok(
    validateUsbHubProductionProposal(count).errors.includes(
      "usb-hub-purposeful-outline-invalid",
    ),
  );
  const huge = structuredClone(usbHubProductionProposal);
  huge.outline.points = [
    [0, 0],
    [60, 0],
    [60, 30],
    [0, 30],
  ];
  assert.ok(
    validateUsbHubProductionProposal(huge).errors.includes(
      "usb-hub-purposeful-outline-invalid",
    ),
  );
});
