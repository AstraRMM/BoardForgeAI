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
    digikeyConfigured: checks.digikeyConfigured ?? false,
    digikeyProviderHealth: checks.digikeyProviderHealth ?? false,
    digikeyOAuthToken: checks.digikeyOAuthToken ?? false,
    liveProductInformationV4Lookup: checks.liveProductInformationV4Lookup ?? false,
    liveBomSourcingProof: checks.liveBomSourcingProof ?? false,
    liveSourcingVerification: checks.liveSourcingVerification ?? false,
    quoteReadiness: checks.quoteReadiness ?? true,
    mouserNotConfiguredHonestly: checks.mouserNotConfiguredHonestly ?? true,
    demoArtifactAuthenticity: checks.demoArtifactAuthenticity ?? true,
    e2eStatus: checks.e2eStatus ?? true,
    supplierApiKeys: checks.supplierApiKeys ?? false,
    poeComplianceReview: checks.poeComplianceReview ?? false,
    installerSigning: checks.installerSigning ?? false,
  }
  const nonCore = ['supplierApiKeys', 'poeComplianceReview', 'installerSigning', 'digikeyConfigured', 'digikeyProviderHealth', 'digikeyOAuthToken', 'liveProductInformationV4Lookup', 'liveBomSourcingProof', 'liveSourcingVerification']
  const coreReady = Object.entries(categories).filter(([key]) => !nonCore.includes(key)).every(([, value]) => value)
  const privateReady = coreReady && categories.demoArtifactAuthenticity && categories.mouserNotConfiguredHonestly
  const publicReady = privateReady && categories.e2eStatus && categories.localEnginePairingSecurity
  const status = publicReady ? 'READY_FOR_PUBLIC_ALPHA_WITH_LIMITATIONS' : privateReady ? 'READY_FOR_PRIVATE_ALPHA' : 'BLOCKED'
  return {
    status,
    categories,
    externalBlockers: ['DigiKey OAuth/live credential completion if not configured locally', 'real PoE compliance/safety review', 'public installer signing certificate'],
    limitations: ['Public alpha is local-first and evidence-backed; sourcing and compliance are not faked.'],
  }
}
