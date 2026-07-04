import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeSupplierMatrix({ projectDir, rows = [] }) {
  const matrix = {
    status: 'BOARD_FORGE_SUPPLIER_MATRIX_WRITTEN',
    providers: {
      digikey: { rows: rows.length, verified: rows.filter((row) => String(row.provider).toLowerCase() === 'digikey' && String(row.sourcingStatus).startsWith('VERIFIED')).length },
      mouser: { status: 'NOT_CONFIGURED', reason: 'No Mouser product/search API configured.' },
      lcsc: { status: 'NOT_CONFIGURED' },
      jlcpcb: { status: 'NOT_CONFIGURED' },
    },
    rows: rows.map((row) => ({ mpn: row.MPN || row.manufacturerPartNumber, digikey: row.sourcingStatus, stock: row.stockStatus, risk: row.risk })),
    generatedAt: new Date().toISOString(),
  }
  const json = path.join(projectDir, 'BoardForge_Supplier_Matrix.json')
  await writeFile(json, JSON.stringify(matrix, null, 2), 'utf8')
  return { status: matrix.status, matrix, artifactPaths: [json] }
}
