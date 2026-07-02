export default function NewBoardPage() {
  return <LocalActionPage title="New Board" command="npm run boardforge:brief -- --prompt &quot;Make a compact robotics controller with CAN and USB-C.&quot; --output <safe-folder>" />
}

function LocalActionPage({ title, command }: { title: string; command: string }) {
  return <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100"><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-3 text-slate-400">This UI prepares local-engine commands. Cloud execution is not enabled.</p><section className="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4"><p className="text-sm uppercase tracking-wide text-cyan-300">Premium intake flow</p><p className="mt-2 text-sm text-cyan-100">Prompt intake creates a board brief first. Build is blocked until the brief is approved, and the result starts as a local candidate.</p></section><pre className="mt-6 rounded-lg bg-slate-900 p-4 text-sm">{command}</pre></main>
}
