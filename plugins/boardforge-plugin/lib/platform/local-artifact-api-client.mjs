import { createLocalArtifactApi } from './local-artifact-api.mjs'

export function createLocalArtifactApiClient(options = {}) {
  return createLocalArtifactApi(options)
}
