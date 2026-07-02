import { getQuestionTree } from './board-type-question-trees.mjs'

export function defaultAssumptionsFor(boardType, answers = {}) {
  const tree = getQuestionTree(boardType)
  const assumptions = [...tree.defaultAssumptions]
  if (!answers.manufacturing_target) assumptions.push('generic_gerber_and_jlcpcb_candidate')
  if (!answers.controller_preference) assumptions.push('boardforge_recommends_common_routable_controller')
  if (!answers.board_shape && !answers.shape_family) assumptions.push('compact_rounded_rectangle_default')
  if (boardType === 'poe_environment_sensor') assumptions.push('poe_safety_compliance_requires_engineering_review')
  if (boardType === 'imported_project_repair') assumptions.push('source_project_is_never_mutated_before_sandbox_copy')
  return [...new Set(assumptions)]
}
