import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  audioAmplifierProductionProposal as p,
  validateAudioAmplifierArchitecture as validate,
} from "../lib/phase2c/templates/audio-amplifier.mjs";
test("Board036 requests power amplification but catalog maps only a PD supply", () => {
  const b = manifest.boards[35],
    d = catalogDefinition(b, 35),
    g = validate(d);
  assert.equal(b.id, "036_AUDIO_AMPLIFIER");
  assert.equal(b.purpose, "low-distortion power amplification");
  assert.equal(d.topologyId, "usb-c-pd-sink");
  assert.equal(g.ok, false);
  for (const code of [
    "audio-amplifier-power-stage-missing",
    "audio-amplifier-input-connector-missing",
    "audio-amplifier-input-stage-missing",
    "audio-amplifier-speaker-connector-missing",
    "audio-amplifier-power-input-missing",
    "audio-amplifier-bulk-storage-missing",
    "audio-amplifier-load-protection-missing",
    "audio-amplifier-heatsink-missing",
    "audio-amplifier-channel-load-power-unverified",
    "audio-amplifier-thermal-soa-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board036 proposal preserves Class D and Class AB alternatives", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "TI TPA3255",
      "TI LM3886",
      "Schurter 3413 / Littelfuse SMAJ",
      "Nichicon UWT",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /continuous\/burst power/i.test(x)),
  );
  assert.ok(p.mandatoryUnresolved.some((x) => /heatsink geometry/i.test(x)));
  assert.ok(
    p.requiredTopology.some((x) =>
      /no unsafe ground-referenced connection to bridged outputs/i.test(x),
    ),
  );
});
test("audio amplifier gate accepts explicit load stability thermal and test evidence", () => {
  const roles = [
    "Class D audio power amplifier",
    "audio input connector",
    "balanced receiver input conditioning",
    "speaker connector",
    "amplifier power input",
    "amplifier bulk capacitor power reservoir",
    "speaker DC protection",
    "heatsink thermal interface",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      audioAmplifier: {
        channelLoadPowerVerified: true,
        gainNoiseDistortionVerified: true,
        stabilityOutputNetworkVerified: true,
        supplyEnergyVerified: true,
        thermalSoaVerified: true,
        muteFaultSafetyVerified: true,
        groundingEmcVerified: true,
        heatsinkMechanicalVerified: true,
        productionLoadTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
