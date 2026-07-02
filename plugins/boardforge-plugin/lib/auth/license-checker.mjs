import { readLocalAuthContext } from './boardforge-auth-client.mjs'
import { isPremiumAction } from '../billing/entitlements.mjs'

export function checkBoardForgeLicense({ env = process.env, action = null } = {}) {
  const auth = readLocalAuthContext(env)
  const blockers = []
  if (!auth.subscription.active) blockers.push('missing_active_license')
  if (action && isPremiumAction(action) && !auth.subscription.entitlements.includes(action)) blockers.push(`missing_entitlement_${action}`)
  return {
    schema: 'boardforge.license-check.v1',
    licensed: blockers.length === 0,
    action,
    blockers,
    auth,
  }
}
