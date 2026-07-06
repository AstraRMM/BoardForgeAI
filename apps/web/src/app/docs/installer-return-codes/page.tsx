const standardCodes = [
  ['Installation canceled by user', '1', 'The installer did not complete. The user or calling process cancelled installation.'],
  ['Application already exists', '0', 'The installed version is already present or the install target is already current.'],
  ['Installation already in progress', '1', 'Another installer operation is running. Retry after the active install completes.'],
  ['Disk space is full', '1', 'The installer could not write the local BoardForge payload. Free disk space and retry.'],
  ['Reboot required', '0', 'BoardForge does not require a reboot for normal install. If Windows requests one externally, the app is still installed.'],
  ['Network failure', '1', 'The installer is offline and does not download payloads. A network failure usually means the package URL could not be downloaded before launch.'],
  ['Package rejected during installation', '1', 'Windows or device policy blocked the unsigned or untrusted package. Use a signed installer for production distribution.'],
  ['Installation successful', '0', 'BoardForge AI installed successfully.'],
]

const packageFacts = [
  ['Current package', 'BoardForgeAI-Setup-0.1.0-alpha.1-x64.exe'],
  ['Architecture', 'x64'],
  ['Silent install', 'BoardForgeAI-Setup-0.1.0-alpha.1-x64.exe /S'],
  ['Silent uninstall', 'BoardForgeAI-Setup-0.1.0-alpha.1-x64.exe /S /uninstall'],
  ['SHA256', '0248270A648E81A4056C000A3334B53C226DB88B771B9FACE1798494F9128A29'],
  ['Signing status', 'Unsigned controlled-release package; production release requires Authenticode or Microsoft Trusted Signing.'],
]

export default function InstallerReturnCodesPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">BoardForge AI installer handling</p>
      <h1 className="mt-2 text-3xl font-semibold">Installer Return Codes</h1>
      <p className="mt-3 max-w-3xl text-slate-400">
        This page documents the BoardForge AI standalone EXE installer behavior used for Microsoft Store package validation.
        The installer supports silent installation with <code className="rounded bg-slate-900 px-1 py-0.5 text-cyan-200">/S</code> and does not require sign-in during installation.
      </p>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Package details</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {packageFacts.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-800 bg-slate-950 p-3">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 break-words font-mono text-sm text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Standard install scenarios</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-300">
                <th className="py-3 pr-4">Scenario</th>
                <th className="py-3 pr-4">EXE return code</th>
                <th className="py-3">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {standardCodes.map(([scenario, code, meaning]) => (
                <tr key={scenario} className="border-b border-slate-800/70">
                  <td className="py-3 pr-4 font-medium text-slate-100">{scenario}</td>
                  <td className="py-3 pr-4 font-mono text-cyan-200">{code}</td>
                  <td className="py-3 text-slate-400">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Miscellaneous failures</h2>
        <p className="mt-3 max-w-3xl text-slate-400">
          Any unclassified install failure returns <code className="rounded bg-slate-950 px-1 py-0.5 text-cyan-200">1</code>.
          Review Windows security policy, disk permissions, package integrity, and Authenticode signing status before retrying.
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-amber-400/30 bg-amber-400/10 p-5">
        <h2 className="text-xl font-semibold text-amber-100">Installer signing note</h2>
        <p className="mt-3 max-w-3xl text-amber-100/80">
          The current package is installer-ready but unsigned. A production Microsoft Store submission should use a CA-trusted Authenticode certificate
          or Microsoft Trusted Signing before final validation.
        </p>
      </section>
    </main>
  )
}
