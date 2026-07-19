import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  audioAmplifierProductionProposal,
  validateAudioAmplifierProductionProposal,
} from "../lib/phase2c/templates/audio-amplifier.mjs";
test("Board036 PD sink cannot pass as audio power amplifier", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[35], 35),
  );
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("audio-amplifier-category-mapped-to-pd-sink"));
  assert.equal(g.ok, false);
});
test("Board036 reuses approved protection and blocks unresolved amplifier chain", () => {
  const p = audioAmplifierProductionProposal,
    g = validateAudioAmplifierProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("audio-amplifier-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "F_IN",
    "D_IN",
    "C_BULK",
    "U_AMP",
    "J_IN",
    "P_IN",
    "P_FB",
    "P_OUT",
    "J_SPK",
    "P_PROTECT",
    "J_PWR",
    "P_PWR",
    "P_MUTE",
    "U_MON",
    "HS1",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "audio-amplifier-load-envelope-undeclared",
    "audio-amplifier-input-envelope-undeclared",
    "audio-amplifier-power-envelope-undeclared",
    "audio-amplifier-gain-envelope-undeclared",
    "audio-amplifier-stability-envelope-undeclared",
    "audio-amplifier-thermal-envelope-undeclared",
    "audio-amplifier-emc-envelope-undeclared",
    "audio-amplifier-safety-envelope-undeclared",
    "audio-amplifier-mechanical-envelope-undeclared",
    "audio-amplifier-service-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board036 requires stability load noise distortion EMC thermal and production evidence", () => {
  for (const k of [
    "outputFilterReactiveLoadStabilityVerified",
    "supplyPeakEnergyDroopVerified",
    "gainBandwidthNoiseThdnVerified",
    "crosstalkDampingClippingVerified",
    "mutePopDcFaultVerified",
    "shortOpenOvercurrentVerified",
    "junctionCaseSinkAmbientSoaVerified",
    "groundingHumEmcVerified",
    "productionResistiveReactiveLoadThermalTestVerified",
  ])
    assert.ok(audioAmplifierProductionProposal.evidenceRequired.includes(k), k);
});
test("Board036 heatsink-wing outline stays inside 1950 mm2", () => {
  const p = audioAmplifierProductionProposal,
    g = validateAudioAmplifierProductionProposal(p);
  assert.equal(g.areaMm2, 1928);
  assert.ok(g.areaMm2 <= 1950);
  assert.equal(p.outline.purposefulFeatures.heatsinkWing.projectionMm, 8);
  assert.equal(
    p.outline.purposefulFeatures.highCurrentLoopKeepoutRequired,
    true,
  );
});
