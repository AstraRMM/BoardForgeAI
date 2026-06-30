export default function NewBoardPage() {
  return <LocalActionPage title="New Board" command="npm run boardforge:create -- --project <safe-folder> --name <board-name>" />
}

function LocalActionPage({ title, command }: { title: string; command: string }) {
  return <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100"><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-3 text-slate-400">This UI prepares local-engine commands. Cloud execution is not enabled.</p><pre className="mt-6 rounded-lg bg-slate-900 p-4 text-sm">{command}</pre></main>
}
