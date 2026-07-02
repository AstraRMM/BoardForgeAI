#!/usr/bin/env node
import { createProjectFromPrompt } from '../lib/engine/create-project-from-prompt.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

async function main() {
  const prompt = argValue('--prompt', '')
  const outputDir = argValue('--output', argValue('--project', ''))
  const answers = argValue('--answers', '{}')
  const result = await createProjectFromPrompt({
    prompt,
    outputDir,
    answers,
    approveBrief: hasArg('--approve-brief'),
    devBypass: hasArg('--dev'),
  })
  console.log(JSON.stringify(result, null, 2))
  if (!result.projectCreated) process.exitCode = 2
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'BOARD_FORGE_CREATE_FAILED', error: error.message }, null, 2))
  process.exit(1)
})
