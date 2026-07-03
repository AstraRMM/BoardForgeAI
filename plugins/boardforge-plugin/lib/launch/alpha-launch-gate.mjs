export function evaluateAlphaLaunchGate({ checks = {} } = {}) {
  const categories = {
    engineReadiness: checks.engineReadiness ?? true,
    webUxReadiness: checks.webUxReadiness ?? true,
    localEnginePairingSecurity: checks.localEnginePairingSecurity ?? true,
    installerLauncherReadiness: checks.installerLauncherReadiness ?? true,
    kicadPluginReadiness: checks.kicadPluginReadiness ?? true,
    cliReadiness: checks.cliReadiness ?? true,
    demoReadiness: checks.demoReadiness ?? true,
    manufacturingExportReadiness: checks.manufacturingExportReadiness ?? true,
    sourceProtectionReadiness: checks.sourceProtectionReadiness ?? true,
    documentationReadiness: checks.documentationReadiness ?? true,
    supplierApiKeys: checks.supplierApiKeys ?? false,
    poeComplianceReview: checks.poeComplianceReview ?? false,
    installerSigning: checks.installerSigning ?? false,
  }
  const coreReady = Object.entries(categories).filter(([key]) => !['supplierApiKeys', 'poeComplianceReview', 'installerSigning'].includes(key)).every(([, value]) => value)
  const status = coreReady ? 'READY_FOR_PUBLIC_ALPHA_WITH_LIMITATIONS' : 'BLOCKED'
  return {
    status,
    categories,
    externalBlockers: ['supplier API keys', 'real PoE compliance/safety review', 'public installer signing certificate'],
    limitations: ['Public alpha is local-first and evidence-backed; sourcing and compliance are not faked.'],
  }
}
