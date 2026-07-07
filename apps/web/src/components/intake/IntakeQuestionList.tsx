import type { BoardForgeIntakeSummary } from '../../lib/boardforge-intake'

const questionLabels: Record<string, string> = {
  controller_preference: 'Preferred controller or MCU family',
  usb_c_mode: 'USB-C power only, data, or debug mode',
  can_interface: 'CAN transceiver and connector requirement',
  swd_debug_header: 'Programming/debug access',
  pwm_servo_outputs: 'PWM outputs and current expectation',
  power_input: 'Input voltage and power budget',
  board_shape: 'Board shape, mounting, and keepout intent',
  manufacturing_target: 'Fabrication and assembly target',
}

export function IntakeQuestionList({ intake }: { intake: BoardForgeIntakeSummary }) {
  return (
    <section className="bf-intake-panel">
      <p className="bf-panel-kicker">Requirement intake</p>
      <h2>Only the questions that change the board.</h2>
      <p>BoardForge turns open-ended PCB requests into a short engineering brief before any KiCad files are created.</p>
      <ol className="bf-intake-question-grid">
        {intake.questionsToAsk.map((question) => (
          <li key={question}>
            <span>{questionLabels[question] || question.replaceAll('_', ' ')}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
