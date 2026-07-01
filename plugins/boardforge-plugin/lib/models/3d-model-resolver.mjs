import { existsSync } from 'node:fs'
import path from 'node:path'
import { expectedModelForFootprint } from './footprint-model-map.mjs'

export function resolve3dModel({ ref = '', footprint = '', explicitModel = '' } = {}, env = process.env) {
  const expectedModel = explicitModel || expectedModelForFootprint(footprint)
  const resolvedPath = expandKiCadModelPath(expectedModel, env)
  const modelExists = Boolean(resolvedPath && existsSync(resolvedPath))
  let source = explicitModel && modelExists ? 'local model' : expectedModel ? 'KiCad library' : 'missing'
  let status = modelExists ? 'PASS' : expectedModel ? 'WARNING' : 'FAIL'
  let risk = modelExists ? 'verified model path exists' : expectedModel ? 'expected KiCad model path not present on this machine; model is disclosed but not verified' : 'no model mapping available'
  if (/placeholder/i.test(explicitModel)) {
    source = 'placeholder'
    status = 'WARNING'
    risk = 'placeholder model disclosed; mechanical preview needs review'
  }
  return {
    ref,
    footprint,
    expectedModel,
    resolvedModel: resolvedPath,
    modelExists,
    source,
    risk,
    status,
  }
}

export function expandKiCadModelPath(model = '', env = process.env) {
  if (!model) return ''
  return model.replace(/\$\{([^}]+)\}/g, (_, key) => env[key] || env.KICAD8_3DMODEL_DIR || env.KICAD7_3DMODEL_DIR || '').replace(/\//g, path.sep)
}
