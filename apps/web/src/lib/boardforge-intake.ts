export type BoardForgeIntakeSummary = {
  prompt: string
  boardType: string
  questionsToAsk: string[]
  assumptions: string[]
  risks: string[]
  localArtifactCommand: string
}

export const roboticsControllerIntake: BoardForgeIntakeSummary = {
  prompt: 'Make a compact odd-shaped robotics controller with CAN, USB-C, I2C, UART/GPS, SWD, PWM, mounting ears, and JLCPCB manufacturing.',
  boardType: 'robotics_controller',
  questionsToAsk: [
    'controller_preference',
    'usb_c_mode',
    'can_interface',
    'swd_debug_header',
    'pwm_servo_outputs',
    'power_input',
    'board_shape',
    'manufacturing_target',
  ],
  assumptions: ['4_layer_stackup', 'jlcpcb_fab_target', 'boardforge_recommends_common_routable_controller'],
  risks: ['usb_differential_pair_if_data_enabled', 'connector_escape_corridors', 'servo_power_current_must_be_confirmed_if_powered_outputs'],
  localArtifactCommand:
    'npm run boardforge:intake -- --prompt "Make a compact odd-shaped robotics controller with CAN, USB-C, I2C, UART/GPS, SWD, PWM, mounting ears, and JLCPCB manufacturing." --output <safe-folder>',
}
