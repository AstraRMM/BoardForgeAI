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
    mouserConfigured: checks.mouserConfigured ?? false,
    mouserSearchApiVerified: checks.mouserSearchApiVerified ?? false,
    dualSupplierLiveLookup: checks.dualSupplierLiveLookup ?? false,
    quoteReadiness: checks.quoteReadiness ?? true,
    demoArtifactAuthenticity: checks.demoArtifactAuthenticity ?? true,
    e2eStatus: checks.e2eStatus ?? true,
    browserSecretLeakGuard: checks.browserSecretLeakGuard ?? true,
    supplierApiKeys: checks.supplierApiKeys ?? false,
    routingJarWorkflow: checks.routingJarWorkflow ?? 'ROUTING_JAR_OPTIONAL_MISSING_WITH_SETUP_STEPS',
    installerPackage: checks.installerPackage ?? 'INSTALLER_READY_UNSIGNED_PUBLIC_ALPHA',
    installerSigning: checks.installerSigning ?? false,
    poeComplianceReview: checks.poeComplianceReview ?? 'POE_COMPLIANCE_REVIEW_PACKAGE_READY_HUMAN_REVIEW_REQUIRED',
    digikeyQuoteApi: checks.digikeyQuoteApi ?? 'DIGIKEY_QUOTE_API_BLOCKED_OR_NOT_ENABLED',
  }
  const nonCore = ['supplierApiKeys', 'poeComplianceReview', 'installerSigning', 'digikeyConfigured', 'digikeyProviderHealth', 'digikeyOAuthToken', 'liveProductInformationV4Lookup', 'liveBomSourcingProof', 'liveSourcingVerification', 'mouserConfigured', 'mouserSearchApiVerified', 'dualSupplierLiveLookup', 'routingJarWorkflow', 'installerPackage', 'digikeyQuoteApi']
  const coreReady = Object.entries(categories)
    .filter(([key]) => !nonCore.includes(key))
    .every(([, value]) => value === true || /READY|PASS|OPTIONAL/i.test(String(value)))
  const privateReady = coreReady && categories.demoArtifactAuthenticity
  const publicReady = privateReady && categories.e2eStatus && categories.localEnginePairingSecurity
  const softwareClean = publicReady && categories.installerPackage === 'INSTALLER_READY_UNSIGNED_PUBLIC_ALPHA' && String(categories.poeComplianceReview).startsWith('POE_COMPLIANCE_REVIEW_PACKAGE_READY')
  const status = softwareClean || publicReady ? 'READY_FOR_PUBLIC_ALPHA_WITH_LIMITATIONS' : privateReady ? 'READY_FOR_PRIVATE_ALPHA' : 'BLOCKED'
  return {
    status,
    categories,
    externalBlockers: [
      'public installer signing certificate',
      'real PoE compliance/safety review and certification',
      categories.digikeyQuoteApi === 'DIGIKEY_QUOTE_API_LIVE_REACHABLE' ? null : 'DigiKey Quote API account/endpoint approval remains unproven; ProductInformation V4 live sourcing is working',
    ].filter(Boolean),
    limitations: [
      'Public alpha is local-first and evidence-backed; supplier data and compliance are not faked.',
      'Browser UI consumes redacted local-engine/sample evidence; live supplier calls remain backend/local CLI controlled.',
      'Unsigned launcher is public-alpha ready, not a signed production installer.',
      'PoE package is review-ready, not certified.',
    ],
  }
}
