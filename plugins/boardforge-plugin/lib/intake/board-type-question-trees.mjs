export const BOARD_TYPE_QUESTION_TREES = Object.freeze({
  robotics_controller: {
    boardType: 'robotics_controller',
    requiredQuestions: ['controller_preference', 'power_input', 'interfaces_needed', 'board_shape', 'manufacturing_target'],
    conditionalQuestions: ['can_interface', 'usb_c_mode', 'battery_power', 'custom_outline'],
    defaultAssumptions: ['4_layer_stackup', 'jlcpcb_fab_target', 'stm32_recommended_if_unspecified'],
    riskQuestions: ['motor_current', 'connector_access', 'mounting_constraints'],
    briefSections: ['purpose', 'controller', 'power', 'interfaces', 'outline', 'routing_risk', 'manufacturing'],
  },
  usb_c_mcu_board: {
    boardType: 'usb_c_mcu_board',
    requiredQuestions: ['controller_preference', 'usb_c_power_or_data', 'debug_interface', 'manufacturing_target'],
    conditionalQuestions: ['usb_c_mode', 'bootloader_mode'],
    defaultAssumptions: ['usb2_only', 'esd_protection_candidate', '4_layer_stackup'],
    riskQuestions: ['usb_impedance_requirement'],
    briefSections: ['purpose', 'usb', 'controller', 'debug', 'manufacturing'],
  },
  can_sensor_node: {
    boardType: 'can_sensor_node',
    requiredQuestions: ['sensor_type', 'can_connector', 'power_input', 'manufacturing_target'],
    conditionalQuestions: ['can_interface', 'termination_option', 'industrial_power'],
    defaultAssumptions: ['120_ohm_termination_optional', '3v3_logic'],
    riskQuestions: ['cable_environment', 'surge_protection'],
    briefSections: ['purpose', 'sensor', 'can', 'power', 'protection'],
  },
  poe_environment_sensor: {
    boardType: 'poe_environment_sensor',
    requiredQuestions: ['ethernet_mode', 'sensor_type', 'poe_power_level', 'manufacturing_target'],
    conditionalQuestions: ['poe_isolation', 'ethernet_magnetics', 'compliance_review'],
    defaultAssumptions: ['poe_compliance_not_certified', 'sourcing_not_api_verified_without_keys'],
    riskQuestions: ['isolation_creepage', 'thermal_budget'],
    briefSections: ['purpose', 'poe', 'ethernet', 'sensors', 'compliance'],
  },
  industrial_io_board: {
    boardType: 'industrial_io_board',
    requiredQuestions: ['io_count', 'field_voltage', 'isolation_required', 'fieldbus', 'manufacturing_target'],
    conditionalQuestions: ['industrial_power', 'isolation_strategy', 'rs485_or_can'],
    defaultAssumptions: ['compliance_not_certified', 'terminal_blocks_on_edges'],
    riskQuestions: ['creepage_clearance', 'surge_environment'],
    briefSections: ['purpose', 'io', 'power', 'isolation', 'fieldbus', 'compliance'],
  },
  custom_outline_board: {
    boardType: 'custom_outline_board',
    requiredQuestions: ['shape_family', 'max_dimensions', 'mounting_scheme', 'connector_edges', 'manufacturing_target'],
    conditionalQuestions: ['custom_outline', 'mounting_ears', 'cable_notch'],
    defaultAssumptions: ['routeability_score_before_commit', 'rounded_corners'],
    riskQuestions: ['connector_access', 'routing_corridors'],
    briefSections: ['purpose', 'mechanical', 'connectors', 'routeability', 'manufacturing'],
  },
  tiny_2layer_sensor: {
    boardType: 'tiny_2layer_sensor',
    requiredQuestions: ['sensor_type', 'power_input', 'connector_style', 'manufacturing_target'],
    conditionalQuestions: ['battery_power'],
    defaultAssumptions: ['2_layer_low_cost', 'single_sensor', 'simple_header'],
    riskQuestions: ['size_limit', 'analog_noise'],
    briefSections: ['purpose', 'sensor', 'power', 'connector', 'cost'],
  },
  wearable_sensor_puck: {
    boardType: 'wearable_sensor_puck',
    requiredQuestions: ['diameter', 'power_source', 'sensor_type', 'wireless_required', 'manufacturing_target'],
    conditionalQuestions: ['battery_power', 'custom_outline'],
    defaultAssumptions: ['circular_outline', 'low_power_bias'],
    riskQuestions: ['antenna_clearance', 'battery_clearance'],
    briefSections: ['purpose', 'mechanical', 'power', 'sensors', 'wireless'],
  },
  connector_heavy_robot_board: {
    boardType: 'connector_heavy_robot_board',
    requiredQuestions: ['connector_count', 'interfaces_needed', 'power_input', 'board_shape', 'manufacturing_target'],
    conditionalQuestions: ['can_interface', 'custom_outline', 'battery_power'],
    defaultAssumptions: ['edge_connector_placement', '4_layer_stackup'],
    riskQuestions: ['edge_access', 'ratsnest_crossings'],
    briefSections: ['purpose', 'connectors', 'interfaces', 'power', 'routeability'],
  },
})

export function getQuestionTree(boardType) {
  return BOARD_TYPE_QUESTION_TREES[boardType] || BOARD_TYPE_QUESTION_TREES.robotics_controller
}
