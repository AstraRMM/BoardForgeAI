import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
// @ts-expect-error The local engine is an ESM JavaScript package shared with the plugin.
import { createKiCadCandidateService } from '../../../../../plugins/boardforge-plugin/lib/platform/kicad/candidate-transaction-service.mjs'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { schema?: string; source?: string; operations?: unknown[] }
    if (body.schema !== 'boardforge.pcb-candidate-request/v1' || typeof body.source !== 'string' || !Array.isArray(body.operations)) return NextResponse.json({ error: 'Invalid PCB candidate request' }, { status: 400 })
    const rootDir = path.join(os.tmpdir(), 'boardforge-browser-pcb', crypto.randomUUID()); await mkdir(rootDir, { recursive: true })
    const sourcePath = path.join(rootDir, 'browser-source.kicad_pcb'); await writeFile(sourcePath, body.source)
    const sourceHash = crypto.createHash('sha256').update(body.source).digest('hex')
    const service = createKiCadCandidateService({ rootDir, cliPath: path.resolve('rust/target/debug/boardforge-kicad.exe') })
    const written = await service.apply({ id: 'browser-pcb', sourcePath, sourceHash, transaction: { version: 1, expected_source_sha256: sourceHash, operations: body.operations } })
    const validation = await service.validate('browser-pcb')
    return NextResponse.json({ candidatePath: written.candidatePath, validationStatus: validation.status, sourceUnchanged: written.sourceUnchanged, reportPaths: written.reports })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Candidate pipeline failed' }, { status: 422 })
  }
}
