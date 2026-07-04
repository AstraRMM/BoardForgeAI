import { AlternativePartsPanel } from './AlternativePartsPanel'
import { BomVerificationTable } from './BomVerificationTable'
import { MakeSourcableButton } from './MakeSourcableButton'
import { MakeSourcableReportPanel } from './MakeSourcableReportPanel'
import { QuoteReadinessPanel } from './QuoteReadinessPanel'
import { SupplierMatrixPanel } from './SupplierMatrixPanel'

export function SourcingCommandCenter({ project }: { project?: any }) {
  const sourcing = project?.sourcing || {}
  return (
    <section className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-cyan-100">Sourcing Command Center</h2>
          <p className="mt-1 text-sm text-cyan-100/80">Local engine backed. No fake stock, no browser-exposed supplier secrets.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded border border-cyan-300 px-3 py-2 text-sm text-cyan-100" type="button">Run DigiKey Verification</button>
          <MakeSourcableButton />
          <span className="sr-only">Make Sourcable</span>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 text-xs md:grid-cols-4">
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">DigiKey</dt><dd className="font-mono">{sourcing.digikeyStatus || 'CONFIGURED_IF_LOCAL_ENV_PRESENT'}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Mouser</dt><dd className="font-mono">NOT_CONFIGURED</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Quote</dt><dd className="font-mono">{sourcing.quoteReadiness || 'NOT_CHECKED'}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Assembly</dt><dd className="font-mono">{sourcing.state || 'ASSEMBLY_READY_NOT_VERIFIED'}</dd></div>
      </dl>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-cyan-100">BOM Verification</h3>
          <BomVerificationTable rows={sourcing.rows || []} />
        </div>
        <SupplierMatrixPanel matrix={sourcing.supplierMatrix} />
        <QuoteReadinessPanel report={sourcing.quoteReport} />
        <AlternativePartsPanel alternatives={sourcing.alternatives || []} />
        <MakeSourcableReportPanel report={sourcing.makeSourcableReport} />
      </div>
    </section>
  )
}
