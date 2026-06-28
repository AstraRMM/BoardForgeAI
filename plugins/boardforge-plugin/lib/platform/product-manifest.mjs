export const BOARDFORGE_PRODUCT_CAPABILITIES = Object.freeze([
  'new_project_generation',
  'real_kicad_schematic_generation',
  'symbol_footprint_assignment',
  'outline_and_mounting_generation',
  'placement_planning',
  'routeability_scoring',
  'router_backend_ensemble',
  'freerouting_bulk_route',
  'ses_import_validation',
  'postroute_drc_cleanup',
  'exact_ratsnest_finishing',
  'blocker_manifest_generation',
  'solution_library_learning',
  'manufacturing_readiness_gate',
  'gerber_drill_bom_cpl_export',
])

export const BOARDFORGE_SURFACES = Object.freeze([
  'web_dashboard',
  'kicad_plugin',
  'cli_engine',
  'ai_control_layer',
  'local_reports',
])

export function buildBoardForgeProductManifest(options = {}) {
  return {
    product: 'BoardForge',
    version: options.version || 'productization-dev',
    generatedAt: options.generatedAt || new Date().toISOString(),
    surfaces: [...BOARDFORGE_SURFACES],
    capabilities: [...BOARDFORGE_PRODUCT_CAPABILITIES],
    goldenProofs: options.goldenProofs || ['REV_D', 'REV_E', 'REV_F'],
    hardClaims: [
      'No manufacturing-ready claim without DRC/ERC/connectivity evidence.',
      'No protected user project mutation without explicit approval.',
      'No fake part sourcing, fake routing, or fake validation.',
    ],
  }
}

export function validateProductManifest(manifest = {}) {
  const missing = []
  for (const capability of BOARDFORGE_PRODUCT_CAPABILITIES) {
    if (!manifest.capabilities?.includes(capability)) missing.push(capability)
  }
  return {
    valid: missing.length === 0 && Array.isArray(manifest.surfaces) && manifest.surfaces.length >= 3,
    missingCapabilities: missing,
  }
}
