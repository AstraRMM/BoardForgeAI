import { getQuestionTree } from './board-type-question-trees.mjs'

export function defaultAssumptionsFor(boardType, answers = {}) {
  const tree = getQuestionTree(boardType)
  const assumptions = [...tree.defaultAssumptions]
  if (!answers.manufacturing_target) assumptions.push('generic_gerber_and_jlcpcb_candidate')
  if (!answers.controller_preference) assumptions.push('boardforge_recommends_common_routable_controller')
  if (!answers.board_shape && !answers.shape_family) assumptions.push('compact_rounded_rectangle_default')
  return [...new Set(assumptions)]
}
