import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function loadLocalCandidateService() {
  // KiCad mutation is intentionally local-first. Keep this module out of the
  // hosted bundle because Vercel does not ship the paired local engine/plugin.
  const specifier = '../../../../../plugins/boardforge-plugin/lib/platform/kicad/candidate-transaction-service.mjs'
  const load = new Function('specifier', 'return import(specifier)') as (value: string) => Promise<{ createKiCadCandidateService: (options: { rootDir: string; cliPath: string }) => { apply: Function; validate: Function } }>
  return load(specifier)
}

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL) return NextResponse.json({ error: 'KiCad candidate operations require the paired local BoardForge engine.' }, { status: 501 })
    const body = await request.json() as { schema?: string; source?: string; operations?: unknown[] }
    if (body.schema !== 'boardforge.pcb-candidate-request/v1' || typeof body.source !== 'string' || !Array.isArray(body.operations)) return NextResponse.json({ error: 'Invalid PCB candidate request' }, { status: 400 })
    const rootDir = path.join(os.tmpdir(), 'boardforge-browser-pcb', crypto.randomUUID()); await mkdir(rootDir, { recursive: true })
    const sourcePath = path.join(rootDir, 'browser-source.kicad_pcb'); await writeFile(sourcePath, body.source)
    const sourceHash = crypto.createHash('sha256').update(body.source).digest('hex')
    const { createKiCadCandidateService } = await loadLocalCandidateService()
    const service = createKiCadCandidateService({ rootDir, cliPath: path.resolve('rust/target/debug/boardforge-kicad.exe') })
    const written = await service.apply({ id: 'browser-pcb', sourcePath, sourceHash, transaction: { version: 1, expected_source_sha256: sourceHash, operations: body.operations } })
    const validation = await service.validate('browser-pcb')
    return NextResponse.json({ candidatePath: written.candidatePath, validationStatus: validation.status, sourceUnchanged: written.sourceUnchanged, reportPaths: written.reports })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Candidate pipeline failed' }, { status: 422 })
  }
}
