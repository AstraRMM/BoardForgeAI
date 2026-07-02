import { readSubscriptionStatus } from '../billing/subscription-status.mjs'

export function readLocalAuthContext(env = process.env) {
  const subscription = readSubscriptionStatus(env)
  return {
    schema: 'boardforge.auth-context.v1',
    accountId: env.BOARDFORGE_ACCOUNT_ID || (subscription.devMode ? 'local-dev-account' : null),
    deviceId: env.BOARDFORGE_DEVICE_ID || null,
    authenticated: subscription.active,
    subscription,
  }
}
