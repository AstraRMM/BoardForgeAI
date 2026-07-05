import { detectDigiKeyApiCapabilities } from './digikey-api-capability-detector.mjs'
export async function checkDigiKeySupplyChainCapability(options = {}) { return detectDigiKeyApiCapabilities(options) }
