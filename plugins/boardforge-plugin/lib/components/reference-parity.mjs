export function verifyReferenceParity({ bindings = [], schematic = [], pcb = [], bom = [], cpl = [] } = {}) {
  const normalized = Object.fromEntries(Object.entries({ bindings, schematic, pcb, bom, cpl }).map(([name, rows]) => [name, index(rows, name)]))
  const canonical = new Set(normalized.bindings.keys())
  const blockers = []
  for (const [surface, rows] of Object.entries(normalized)) {
    for (const ref of canonical) if (!rows.has(ref)) blockers.push({ code: 'REFERENCE_MISSING', surface, ref })
    for (const ref of rows.keys()) if (!canonical.has(ref)) blockers.push({ code: 'REFERENCE_EXTRA', surface, ref })
  }
  for (const ref of canonical) {
    const expected = normalized.bindings.get(ref)
    for (const [surface, rows] of Object.entries(normalized)) {
      const row = rows.get(ref)
      if (!row) continue
      if (!expected.componentUuid || row.componentUuid !== expected.componentUuid) blockers.push({ code: 'COMPONENT_UUID_MISMATCH', surface, ref })
      if (expected.bindingId && row.bindingId !== expected.bindingId) blockers.push({ code: 'BINDING_ID_MISMATCH', surface, ref })
    }
  }
  return { schema: 'boardforge.reference-parity.v1', status: blockers.length ? 'REFERENCE_PARITY_BLOCKED' : 'REFERENCE_PARITY_PASSED', passed: blockers.length === 0, referenceCount: canonical.size, blockers }
}

function index(rows, surface) {
  const result = new Map()
  for (const row of rows || []) {
    const ref = String(row.ref || row.refs || row.Reference || '').trim()
    if (!ref) continue
    if (result.has(ref)) throw new Error(`duplicate reference ${ref} on ${surface}`)
    result.set(ref, row)
  }
  return result
}
