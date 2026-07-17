import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  relayControllerProductionProposal,
  validateRelayControllerProductionProposal,
} from "../lib/phase2c/templates/relay-controller.mjs";
import { approvedAssetFor } from "../lib/components/approved-production-assets.mjs";
import { resolveAuthoritativeKiCadSymbol } from "../lib/components/authoritative-kicad-symbol-resolver.mjs";
import { resolveAuthoritativeKiCadFootprint } from "../lib/components/authoritative-kicad-footprint-resolver.mjs";

test("Board013 generic controller shell cannot pass as protected relay hardware", () => {
  const d = catalogDefinition(manifest.boards[12], 12),
    g = validateCatalogSemanticTopology(d);
  assert.equal(g.ok, false);
  for (const code of [
    "relay-output-devices-missing",
    "relay-coil-drivers-missing",
    "relay-flyback-protection-missing",
    "relay-contact-connectors-missing",
    "relay-output-protection-missing",
    "relay-input-isolation-or-protection-missing",
  ])
    assert.ok(g.errors.includes(code), code);
});

test("Board013 contract counts four channels and fails closed on undeclared load coil power and exact parts", () => {
  const p = relayControllerProductionProposal,
    g = validateRelayControllerProductionProposal(p);
  assert.equal(p.channelCount, 4);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("relay-load-envelope-undeclared"));
  assert.ok(g.errors.includes("relay-coil-power-envelope-undeclared"));
  assert.ok(g.errors.includes("relay-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "K",
    "D_FLY",
    "J_CONTACT",
    "P_OUT",
    "U_LOGIC",
    "P_COIL",
  ]);
  for (const ref of ["U_DRV", "U_IN", "F_IN", "D_IN", "D_COIL", "C_LOGIC"])
    assert.equal(
      p.bom.find((x) => x.ref === ref).status,
      "APPROVED_EXACT_ASSET",
      ref,
    );
});

test("Board013 resolves exact ULN2803CDWR without laundering the installed 18-pin A symbol", () => {
  const d = relayControllerProductionProposal.candidates.find(
      (x) => x.role === "MULTICHANNEL_RELAY_DRIVER",
    ),
    a = approvedAssetFor("ULN2803CDWR"),
    s = resolveAuthoritativeKiCadSymbol(a.symbol.libId),
    f = resolveAuthoritativeKiCadFootprint(a.footprint.libId);
  assert.equal(d.mpn, "ULN2803CDWR");
  assert.equal(d.verified.package, "DW0020A SOIC-20");
  assert.equal(Object.keys(d.verified.pinMap).length, 20);
  assert.match(d.verified.installedKiCadSymbolConflict, /18-pin/);
  assert.equal(s.pins.length, 20);
  assert.equal(f.padNumbers.length, 20);
  assert.equal(s.pinMap["12"], "COM");
  assert.equal(a.symbolPinMap["17"], "RELAY_COIL4_N");
  assert.equal(a.footprintPadMap["20"], "RELAY_COIL1_N");
  assert.equal(
    relayControllerProductionProposal.bom.find((x) => x.ref === "U_DRV").status,
    "APPROVED_EXACT_ASSET",
  );
});

test("Board013 requires isolated/protected inputs and declared load evidence", () => {
  const p = structuredClone(relayControllerProductionProposal);
  p.bom = p.bom.filter((x) => x.ref !== "U_IN");
  assert.ok(
    validateRelayControllerProductionProposal(p).errors.includes(
      "relay-input-isolation-or-protection-missing",
    ),
  );
  for (const key of [
    "loadEnvelopeDeclared",
    "relayContactRatingVerified",
    "coilPickupDropoutBudgetVerified",
    "simultaneousCoilThermalBudgetVerified",
    "contactLogicClearanceVerified",
  ])
    assert.ok(
      relayControllerProductionProposal.evidenceRequired.includes(key),
      key,
    );
});

test("Board013 terminal-ear outline is purposeful and within 2300 mm2", () => {
  const g = validateRelayControllerProductionProposal(
    relayControllerProductionProposal,
  );
  assert.equal(g.areaMm2, 2096);
  assert.ok(g.areaMm2 <= 2300);
  assert.equal(
    relayControllerProductionProposal.outline.purposefulFeatures
      .terminalEarCount,
    2,
  );
  assert.equal(
    relayControllerProductionProposal.outline.purposefulFeatures
      .contactLogicPartitionRequired,
    true,
  );
});

test("Board013 does not misrepresent ULN2803C absolute maxima as a safe four-channel load envelope", () => {
  const a = relayControllerProductionProposal.lowVoltageEnvelopeAssessment;
  assert.equal(a.manifestChannelCount, 4);
  assert.equal(a.driverAbsoluteMaximumOutputV, 50);
  assert.equal(a.driverAbsoluteMaximumSingleChannelA, 0.5);
  assert.equal(a.simultaneousFourChannelCurrentA, null);
  assert.equal(a.defensibleSystemVoltageV, null);
  assert.equal(a.defensibleSteadyLoadCurrentA, null);
  assert.match(a.conclusion, /absolute maxima do not establish/i);
  for (const item of [
    "AC or DC contact voltage",
    "steady current",
    "coil voltage current tolerance and duty cycle",
    "source fault energy and upstream protection",
  ])
    assert.ok(a.missingDeclarations.includes(item), item);
});
