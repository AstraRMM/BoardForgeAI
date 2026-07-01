import { previewImportSandbox } from '../../lib/import-sandbox'

const example = previewImportSandbox('C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-ODD-SHAPE-ROBOT-01_REV_A')

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
          <Field label="Source path" value={example.sourcePath} />
          <Field label="Sandbox path" value={example.sandboxPath} />
          <Field label="Protected-path status" value={example.protectedPathStatus} />
          <Field label="Mutation policy" value={example.originalMutationPolicy} />
        </div>
        <p className="mt-5 text-sm text-slate-400">CLI action: npm run boardforge:import-sandbox</p>
        <pre className="mt-5 overflow-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">{example.command}</pre>
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Import Result Fields</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {['source path', 'sandbox path', 'protected-path status', 'project files copied', 'baseline DRC/ERC', 'baseline unconnected', 'original hash before/after', 'next actions'].map((item) => (
            <div key={item} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">{item}</div>
          ))}
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
