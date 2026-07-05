export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Docs</h1>
      <p className="mt-3 max-w-3xl text-slate-400">
        BoardForge is a local-first KiCad engineering platform. Codex, ChatGPT, Claude, the web app, CLI, and KiCad plugin are control surfaces over the same engine and project manifests.
      </p>
      <section className="mt-8 max-w-3xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Installer documentation</h2>
        <p className="mt-2 text-slate-400">
          Microsoft Store package validation uses the BoardForge installer return-code page for EXE handling notes.
        </p>
        <a className="mt-4 inline-flex rounded-md border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10" href="/docs/installer-return-codes">
          Installer return codes
        </a>
      </section>
    </main>
  )
}
