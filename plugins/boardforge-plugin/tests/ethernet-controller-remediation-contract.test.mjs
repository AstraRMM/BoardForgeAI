import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  ETHERNET_CONTROLLER_IMPLEMENTATION_SCHEMA,
  ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS,
  ethernetControllerProductionProposal,
  validateEthernetControllerImplementation,
  validateEthernetControllerProposal,
} from "../lib/phase2c/templates/ethernet-controller.mjs";
import { approvedAssetFor } from "../lib/components/approved-production-assets.mjs";
import { resolveAuthoritativeKiCadSymbol } from "../lib/components/authoritative-kicad-symbol-resolver.mjs";
import { resolveAuthoritativeKiCadFootprint } from "../lib/components/authoritative-kicad-footprint-resolver.mjs";
import { placeAuthoritativeProductionFootprints } from "../lib/placement/authoritative-production-placement.mjs";
import {
  categorySchematicPinMaps,
  ethernetControllerCategoryPcbEvidence,
} from "../lib/real-board-proof.mjs";

test("Board010 catalog selects the exact RP2040 W5500 topology", () => {
  const definition = catalogDefinition(manifest.boards[9], 9),
    gate = validateCatalogSemanticTopology(definition);
  assert.equal(definition.topologyId, "ethernet-controller");
  assert.equal(gate.ok, true, gate.errors.join("; "));
  assert.deepEqual(
    definition.semanticEvidence.ethernetController.pmodeBits,
    [1, 1, 1],
  );
  assert.equal(
    definition.semanticEvidence.ethernetController.pmodeMeaning,
    "All capable, auto-negotiation enabled",
  );
});

test("Board010 remediation proposal uses approved exact core and support assets but remains evidence blocked", () => {
  const gate = validateEthernetControllerProposal(
    ethernetControllerProductionProposal,
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.areaMm2 <= 1250, true);
  assert.ok(!gate.errors.includes("ethernet-exact-assets-unapproved"));
  assert.deepEqual(gate.blockedRefs, []);
  for (const row of ethernetControllerProductionProposal.bom) {
    assert.equal(row.status, "APPROVED_EXACT_ASSET", row.ref);
    assert.ok(approvedAssetFor(row.mpn), row.mpn);
  }
});

test("Board010 support assets resolve to authoritative installed KiCad identities", () => {
  for (const mpn of [
    "RC0603FR-0712K4L",
    "RC0603FR-0749R9L",
    "GRM1885C1H120JA01D",
    "GRM188R71H103KA01D",
    "GRM188R60J475KE19D",
    "MPZ1608S601ATA00",
    "TPD4E05U06DQAR",
  ]) {
    const a = approvedAssetFor(mpn);
    assert.ok(resolveAuthoritativeKiCadSymbol(a.symbol.libId).pins.length, mpn);
    assert.ok(
      resolveAuthoritativeKiCadFootprint(a.footprint.libId).pads.length,
      mpn,
    );
  }
  const esd = approvedAssetFor("TPD4E05U06DQAR");
  assert.equal(esd.symbol.libId, "Power_Protection:TPD4E05U06DQA");
  assert.equal(esd.footprint.libId, "Package_SON:USON-10_2.5x1.0mm_P0.5mm");
  assert.deepEqual(esd.symbolPinMap, {
    1: "ETH_TXP_CABLE",
    2: "ETH_TXN_CABLE",
    3: "CHASSIS",
    4: "ETH_RXP_CABLE",
    5: "ETH_RXN_CABLE",
    8: "CHASSIS",
  });
});

test("Board010 source values and crystal-load calculation are frozen without claiming board evidence", () => {
  const s = ethernetControllerProductionProposal.supportDesign;
  assert.equal(s.exres.resistanceOhm, 12400);
  assert.equal(s.lineTermination.resistanceOhm, 49.9);
  assert.equal(s.crystalLoad.crystalLoadPf, 8);
  assert.equal(
    s.crystalLoad.capacitorEachPf / 2 + s.crystalLoad.assumedTotalParasiticPf,
    8,
  );
  assert.equal(s.connectedCentreTap.txCentreTapFeedOhm, 10);
  assert.equal(s.connectedCentreTap.rxSeriesCapacitanceNf, 6.8);
  assert.equal(s.connectedCentreTap.rxMatchingBypassNf, 10);
  assert.equal(s.analogSupply.ratedCurrentA, 1);
  assert.match(ethernetControllerProductionProposal.status, /BLOCKED/);
  assert.ok(
    validateEthernetControllerProposal(
      ethernetControllerProductionProposal,
    ).errors.some((x) => /ethernet-evidence-/.test(x)),
  );
});

test("Board010 authoritative writer maps RP2040 host and source-backed PMODE 111", () => {
  const d = catalogDefinition(manifest.boards[9], 9),
    m = categorySchematicPinMaps(d),
    pcb = ethernetControllerCategoryPcbEvidence();
  assert.deepEqual(
    [m.U2[43], m.U2[44], m.U2[45]],
    ["PMODE2", "PMODE1", "PMODE0"],
  );
  for (const ref of ["R_MODE0", "R_MODE1", "R_MODE2"])
    assert.equal(m[ref][1], "3V3");
  assert.deepEqual(
    {
      sclk: m.U1[6],
      mosi: m.U1[7],
      miso: m.U1[8],
      cs: m.U1[9],
      iovdd: m.U1[10],
      reset: m.U1[11],
      interrupt: m.U1[12],
    },
    {
      sclk: "SPI_SCLK",
      mosi: "SPI_MOSI",
      miso: "SPI_MISO",
      cs: "ETH_CS_N",
      iovdd: "3V3",
      reset: "ETH_RESET_N",
      interrupt: "ETH_INT_N",
    },
  );
  assert.deepEqual(
    pcb.footprints.map((x) => x.ref),
    d.bom.map((x) => x.ref),
  );
});

test("Board010 writer clusters W5500 timing, analog and Ethernet support around the PHY", () => {
  const byRef = Object.fromEntries(
    ethernetControllerCategoryPcbEvidence().footprints.map((x) => [x.ref, x]),
  );
  const distance = (a, b) => Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y);
  for (const ref of ["Y1", "C_XI", "C_XO", "R_EXRES", "FB_AVDD", "C_AVDD", "C_TOCAP", "C_1V2"])
    assert.ok(distance(byRef.U2, byRef[ref]) < 8, `${ref} must stay local to U2`);
  for (const ref of ["R_TXP", "R_TXN", "R_RXP", "R_RXN", "R_TX_CT", "C_RXP", "C_RXN", "C_RX_MATCH"])
    assert.ok(distance(byRef.J1, byRef[ref]) < 9, `${ref} must stay local to J1`);
});

test("Board010 proposal records the exact non-PoE MagJack limitation and purposeful area-bounded notch", () => {
  assert.ok(
    ethernetControllerProductionProposal.limitations.some((x) =>
      /7499010121A.*non-PoE/i.test(x),
    ),
  );
  assert.ok(
    ethernetControllerProductionProposal.limitations.some((x) =>
      /Adding PoE requires/i.test(x),
    ),
  );
  assert.equal(
    ethernetControllerProductionProposal.outline.family,
    "magnetics-notch-ethernet-controller",
  );
  assert.ok(
    ethernetControllerProductionProposal.outline.purposefulFeatures.rj45Notch,
  );
  assert.equal(
    validateEthernetControllerProposal({
      ...ethernetControllerProductionProposal,
      limitations: [],
    }).errors.includes("ethernet-non-poe-limitation-missing"),
    true,
  );
});

test("Board010 complete exact BOM resolves to authoritative installed symbol and footprint assets", () => {
  for (const row of ethernetControllerProductionProposal.bom) {
    const a = approvedAssetFor(row.mpn);
    assert.ok(a, row.mpn);
    assert.ok(
      resolveAuthoritativeKiCadSymbol(a.symbol.libId).pins.length,
      `${row.ref} symbol`,
    );
    assert.ok(
      resolveAuthoritativeKiCadFootprint(a.footprint.libId).pads.length,
      `${row.ref} footprint`,
    );
  }
});

test("Board010's exact MagJack has a legal authoritative placement in the revised notched envelope", () => {
  const definition = catalogDefinition(manifest.boards[9], 9);
  const magJack = approvedAssetFor("7499010121A");
  const placement = placeAuthoritativeProductionFootprints({
      components: [{
        ref: "J1",
        value: "7499010121A",
        mpn: "7499010121A",
        footprint: magJack.footprint.libId,
      }],
      outline: definition.outlinePoints.map(([x, y]) => ({ x, y })),
      topology: "ethernet-controller",
  });
  assert.deepEqual(placement.placements[0].at, {
    x: 23.5, y: 14, rotation: 0, side: "front",
  });
});

test("Board010 resolver-validates the complete fixed-coordinate Ethernet placement baseline", () => {
  const definition = catalogDefinition(manifest.boards[9], 9);
  const components = definition.bom.map((row) => ({
    ref: row.ref, value: row.value, mpn: row.mpn,
    footprint: approvedAssetFor(row.mpn).footprint.libId,
  }));
  const placement = placeAuthoritativeProductionFootprints({
    components,
    outline: definition.outlinePoints.map(([x, y]) => ({ x, y })),
    topology: "ethernet-controller",
  });
  assert.equal(placement.placements.length, definition.bom.length);
  assert.deepEqual(placement.placements.find((row) => row.ref === "U2").at, {
    x: 10.75, y: 6.5, rotation: 0, side: "front",
  });
});

const completeImplementation = () => {
  const refs = ethernetControllerProductionProposal.bom.map((x) => x.ref);
  return {
    schema: ETHERNET_CONTROLLER_IMPLEMENTATION_SCHEMA,
    schematicRefs: refs,
    pcbRefs: refs,
    authoritativeSymbolProjectionVerified: true,
    authoritativeFootprintProjectionVerified: true,
    trackSegmentCount: 96,
    routedNetCount: ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS.length,
    routedNetNames: [...ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS],
    copperLayerCount: 4,
    groundReturnStructureVerified: true,
    ethernetDifferentialGeometryVerified: true,
    ercErrorCount: 0,
    drcViolationCount: 0,
    unconnectedItemCount: 0,
    manufacturingExportsVerified: true,
    productionTestVerified: true,
  };
};

test("Board010 copperless or incomplete topology cannot be accepted as production evidence", () => {
  const x = completeImplementation();
  x.trackSegmentCount = 0;
  x.routedNetCount = 0;
  x.routedNetNames = [];
  x.drcViolationCount = undefined;
  x.unconnectedItemCount = 27;
  x.manufacturingExportsVerified = false;
  const g = validateEthernetControllerImplementation(x);
  for (const code of [
    "ethernet-copperless-topology-rejected",
    "ethernet-required-net-unrouted-eth_txp",
    "ethernet-clean-electrical-validation-unverified",
    "ethernet-manufacturing-and-production-test-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
  assert.equal(g.ok, false);
});

test("Board010 production gate covers exact projection copper stackup clean validation and manufacturing evidence", () => {
  const g = validateEthernetControllerImplementation(completeImplementation());
  assert.equal(g.ok, true, g.errors.join("; "));
  assert.equal(
    g.requiredRefCount,
    ethernetControllerProductionProposal.bom.length,
  );
  assert.equal(
    g.requiredRoutedNetCount,
    ETHERNET_CONTROLLER_REQUIRED_ROUTED_NETS.length,
  );
});

test("Board010 purposeful outline fails closed on excess area missing notch or open geometry", () => {
  const open = structuredClone(ethernetControllerProductionProposal);
  open.outline.closed = false;
  assert.ok(
    validateEthernetControllerProposal(open).errors.includes(
      "ethernet-purposeful-outline-invalid",
    ),
  );
  const notch = structuredClone(ethernetControllerProductionProposal);
  delete notch.outline.purposefulFeatures.rj45Notch;
  assert.ok(
    validateEthernetControllerProposal(notch).errors.includes(
      "ethernet-rj45-notch-missing",
    ),
  );
  const huge = structuredClone(ethernetControllerProductionProposal);
  huge.outline.points = [
    [0, 0],
    [50, 0],
    [50, 30],
    [0, 30],
  ];
  assert.ok(
    validateEthernetControllerProposal(huge).errors.includes(
      "ethernet-purposeful-outline-invalid",
    ),
  );
});
