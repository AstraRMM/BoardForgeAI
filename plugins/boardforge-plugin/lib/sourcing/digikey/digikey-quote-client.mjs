import { writeDigiKeyQuoteDepthReport } from './digikey-quote-normalizer.mjs'
export async function probeDigiKeyQuoteDepth({ projectDir = process.cwd(), rows = [], quoteFetch = null } = {}) {
  try { if (quoteFetch) return writeDigiKeyQuoteDepthReport({ projectDir, quoteApiResponse: await quoteFetch(rows) }) } catch (error) { return writeDigiKeyQuoteDepthReport({ projectDir, productInfoRows: rows, error }) }
  return writeDigiKeyQuoteDepthReport({ projectDir, productInfoRows: rows })
}
