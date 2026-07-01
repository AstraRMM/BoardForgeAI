#!/usr/bin/env node
import { generatePoeRevDProof } from '../lib/poe/poe-rev-d-workflow.mjs'

const proof = await generatePoeRevDProof()
console.log(JSON.stringify({
  status: 'POE_REV_D_PROOF_GENERATED',
  fixture: proof.fixture,
  selectedParts: proof.selectedParts.length,
  schematicConfidence: proof.schematicConfidence.overallConfidence,
  manufacturingState: proof.manufacturingState,
  exactApiKeyBlocker: proof.exactApiKeyBlocker,
  manufacturingZip: proof.manufacturingZip,
}, null, 2))
