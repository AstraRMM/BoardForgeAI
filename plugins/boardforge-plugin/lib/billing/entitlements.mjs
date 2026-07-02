export const PREMIUM_ACTIONS = Object.freeze([
  'create_project',
  'generate_schematic',
  'generate_outline',
  'place_components',
  'route_board',
  'repair_drc',
  'run_sourcing_verification',
  'export_manufacturing',
  'ai_command_execution',
  'sync_project_to_dashboard',
])

export const PLAN_ENTITLEMENTS = Object.freeze({
  free: [],
  dev: PREMIUM_ACTIONS,
  pro: PREMIUM_ACTIONS,
  team: PREMIUM_ACTIONS,
})

export function entitlementsForPlan(plan = 'free') {
  return [...(PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free)]
}

export function isPremiumAction(action) {
  return PREMIUM_ACTIONS.includes(action)
}
