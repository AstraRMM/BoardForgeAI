import assert from 'node:assert/strict'
import { execFileSync, execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fixturePath = resolve(root, 'fixtures/rust-geometry-parity.json')
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'))
const cargoArgs = ['run', '--quiet', '--manifest-path', resolve(root, 'rust/Cargo.toml'), '-p', 'boardforge-geometry', '--bin', 'geometry-parity', '--', fixturePath]
let rustOutput
if (process.platform === 'win32') {
  const cargo = resolve(process.env.USERPROFILE, '.cargo/bin/cargo.exe')
  const devCommand = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\Common7\\Tools\\VsDevCmd.bat'
  rustOutput = execSync(`call "${devCommand}" -arch=x64 && "${cargo}" ${cargoArgs.map(value => `"${value}"`).join(' ')}`, { encoding: 'utf8', shell: 'cmd.exe' })
} else rustOutput = execFileSync('cargo', cargoArgs, { encoding: 'utf8' })
const rustJson = rustOutput.split(/\r?\n/).findLast(line => line.trim().startsWith('['))
if (!rustJson) throw new Error(`Rust parity output was missing JSON: ${rustOutput}`)
const rust = JSON.parse(rustJson)

function nodeMetrics(points) {
  let twiceArea = 0; let perimeter = 0
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]; const b = points[(index + 1) % points.length]
    twiceArea += a.x * b.y - b.x * a.y; perimeter += Math.hypot(b.x - a.x, b.y - a.y)
  }
  const intersects = points.some((a, i) => points.some((c, j) => {
    if (i === j || (i + 1) % points.length === j || (j + 1) % points.length === i) return false
    const b = points[(i + 1) % points.length]; const d = points[(j + 1) % points.length]
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
    return cross(a,b,c) * cross(a,b,d) < 0 && cross(c,d,a) * cross(c,d,b) < 0
  }))
  return intersects || Math.abs(twiceArea) < 1e-9 ? { valid: false, area: null, perimeter: null } : { valid: true, area: Math.abs(twiceArea) / 2, perimeter }
}

const comparisons = fixtures.map((fixture) => {
  const node = nodeMetrics(fixture.points); const native = rust.find((row) => row.id === fixture.id)
  assert(native, `missing Rust result for ${fixture.id}`)
  const equal = node.valid === native.valid && (!node.valid || (Math.abs(node.area - native.area) < 1e-8 && Math.abs(node.perimeter - native.perimeter) < 1e-8))
  return { id: fixture.id, status: equal ? 'PARITY' : node.valid && !native.valid ? 'NODE_BETTER' : 'RUST_BETTER', node, rust: native }
})
assert(comparisons.every((row) => row.status === 'PARITY'), JSON.stringify(comparisons, null, 2))
const report = { schema: 'boardforge.rust-parity.v1', generatedAt: new Date().toISOString(), overall: 'PARITY', comparisons }
writeFileSync(resolve(root, 'BoardForge_Rust_Parity_Report.json'), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(resolve(root, 'BoardForge_Rust_Parity_Report.md'), `# BoardForge Rust parity report\n\nOverall: **PARITY**\n\n${comparisons.map(row => `- ${row.id}: ${row.status}`).join('\n')}\n`)
console.log(`Rust geometry parity: ${comparisons.length}/${comparisons.length} PARITY`)
