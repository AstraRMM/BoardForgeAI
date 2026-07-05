export const sourcingProviderEnvSpec = [
  { id: 'digikey', name: 'DigiKey', env: ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET'], callbackEnv: 'DIGIKEY_CALLBACK_URL' },
  { id: 'mouser', name: 'Mouser', env: ['MOUSER_API_KEY'], aliases: ['MOUSER_SEARCH_API_KEY', 'MOUSER_PRODUCT_API_KEY'] },
  { id: 'lcsc', name: 'LCSC', env: ['LCSC_API_KEY'] },
  { id: 'jlcpcb', name: 'JLCPCB Assembly', env: ['JLCPCB_API_KEY'] },
]

export function detectSourcingProviderEnv(env = process.env) {
  return sourcingProviderEnvSpec.map((provider) => {
    const aliases = [...provider.env, ...(provider.aliases || [])]
    const present = aliases.filter((name) => Boolean(env[name]))
    const configured = provider.id === 'mouser' ? present.length > 0 : provider.env.every((name) => Boolean(env[name]))
    const missing = configured ? [] : provider.env.filter((name) => !env[name])
    return {
      provider: provider.id,
      name: provider.name,
      requiredEnv: provider.env,
      acceptedEnvAliases: aliases,
      envKeysPresent: present,
      missingEnv: missing,
      apiCallable: provider.forcedStatus ? false : configured,
      verificationAvailable: provider.forcedStatus ? 'not_configured' : configured ? 'configured_not_called' : 'not_configured',
      limitation: provider.limitation || null,
      fallbackBehavior: {
        sourcingStatus: 'NOT_CHECKED',
        stockStatus: 'UNKNOWN',
        assemblyAvailability: 'UNKNOWN',
        fakeStockAllowed: false,
      },
    }
  })
}

export function writeSourcingApiStatusMarkdown(rows = []) {
  return [
    '# BoardForge Sourcing API Status Report',
    '',
    'BoardForge does not fake stock or assembly availability. Missing API keys produce NOT_CHECKED / UNKNOWN status.',
    '',
    '| Provider | Required env | Missing env | Env keys present | API callable | Verification available | Fallback behavior |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.name} | ${row.requiredEnv.join(', ')} | ${row.missingEnv.join(', ') || 'none'} | ${row.envKeysPresent.join(', ') || 'none'} | ${row.apiCallable ? 'yes' : 'no'} | ${row.verificationAvailable} | ${row.fallbackBehavior.sourcingStatus}/${row.fallbackBehavior.stockStatus}/${row.fallbackBehavior.assemblyAvailability} |`),
    '',
  ].join('\n')
}
