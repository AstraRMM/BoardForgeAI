import { EnvironmentCheckCard } from './EnvironmentCheckCard'
import { PairingStep } from './PairingStep'
import { DemoProjectStep } from './DemoProjectStep'

const checks = [
  ['Local engine', 'OK', 'Start with npm run boardforge:start or npm run boardforge:local-server.'],
  ['Pairing', 'Required', 'Enter one-time code from installed local engine.'],
  ['KiCad CLI', 'Missing/Warning', 'Required for real KiCad validation on this machine.'],
  ['Java/FreeRouting', 'Missing/Warning', 'Required for FreeRouting runs.'],
  ['Protected path guard', 'OK', 'ESC/FC paths are refused.'],
  ['Supplier API keys', 'Optional', 'Missing keys keep sourcing NOT_CHECKED.'],
]

export function FirstRunSetupWizard() {
  return (
    <div className="grid gap-4">
      <PairingStep />
      <div className="grid gap-3 md:grid-cols-2">
        {checks.map(([name, status, detail]) => <EnvironmentCheckCard key={name} name={name} status={status} detail={detail} />)}
      </div>
      <DemoProjectStep />
    </div>
  )
}
