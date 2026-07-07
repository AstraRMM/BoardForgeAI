import { previewImportedRepairProof } from '../../lib/import-sandbox'

const repairProof = previewImportedRepairProof()

export default function UploadKicadPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase text-cyan-300">Local-only import</p>
        <h1 className="mt-2 text-3xl font-semibold">Import KiCad Project Into A Sandbox</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          BoardForge never modifies the selected source project. The local engine hashes the original files,
          copies the project into a BoardForge sandbox, scans the copy, and only routes or repairs inside that sandbox.
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
        <Guard label="Source protection" value="Original project is never modified" />
        <Guard label="Protected paths" value="ESC/FC/flight projects are blocked" />
        <Guard label="Execution" value="Run locally with BoardForge CLI" />
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Sandbox Import Preview</h2>
        <p className="mt-2 text-sm text-slate-400">Protected paths are refused before copying or scanning begins.</p>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Field label="Source project" value="selected by the user" />
          <Field label="Sandbox copy" value="created in a protected BoardForge workspace" />
          <Field label="Protected-path status" value="checked before import" />
          <Field label="Mutation policy" value="source files stay untouched" />
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Import Result Fields</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {['source path', 'sandbox path', 'protected-path status', 'project files copied', 'baseline DRC/ERC', 'baseline unconnected', 'original hash before/after', 'next actions'].map((item) => (
            <div key={item} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">{item}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-5">
        <p className="text-sm uppercase text-emerald-300">Sandboxed imported-board repair proof</p>
        <h2 className="mt-2 text-xl font-semibold">{repairProof.proofId}</h2>
        <p className="mt-2 text-sm text-emerald-100/80">
          This proof repairs only the copied sandbox project. The source project is hash-checked before and after repair.
        </p>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Field label="Source project" value="hash-checked before and after repair" />
          <Field label="Sandbox project" value="all repair work happens on the copy" />
          <Field label="Source untouched" value={repairProof.sourceUntouched ? 'yes, hash guard passed' : 'no'} />
          <Field label="Repair result" value={`DRC ${repairProof.dirtyDrc} -> ${repairProof.cleanDrc}, shorts ${repairProof.dirtyShorts} -> ${repairProof.cleanShorts}`} />
          <Field label="Status" value={repairProof.status} />
          <Field label="Manufacturing package" value={repairProof.manufacturingZip ? 'available after evidence checks' : 'blocked until evidence passes'} />
        </div>
      </section>
    </main>
  )
}

function Guard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-medium">{value}</p></div>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-slate-500">{label}</p><p className="mt-1 break-words font-mono text-slate-200">{value}</p></div>
}
