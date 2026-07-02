import { checkBoardForgeLicense } from './license-checker.mjs'

export function canRunPremiumAction(action, options = {}) {
  const check = checkBoardForgeLicense({ ...options, action })
  return {
    allowed: check.licensed,
    action,
    blockers: check.blockers,
    license: check,
  }
}

export function requireEntitlement(action, options = {}) {
  const gate = canRunPremiumAction(action, options)
  if (!gate.allowed) {
    const error = new Error(`BoardForge entitlement required for ${action}: ${gate.blockers.join(', ')}`)
    error.gate = gate
    throw error
  }
  return gate
}
