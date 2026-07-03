import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function createJobStore({ rootDir }) {
  const jobDir = path.join(rootDir, '.boardforge', 'jobs')

  async function ensure() {
    await mkdir(jobDir, { recursive: true })
  }

  function fileFor(jobId) {
    return path.join(jobDir, `${jobId}.json`)
  }

  return {
    jobDir,
    async write(job) {
      await ensure()
      await writeFile(fileFor(job.jobId), JSON.stringify(job, null, 2), 'utf8')
      return job
    },
    async read(jobId) {
      return JSON.parse(await readFile(fileFor(jobId), 'utf8'))
    },
    async listForProject(projectId) {
      await ensure()
      const files = await readdir(jobDir)
      const jobs = []
      for (const file of files.filter((name) => name.endsWith('.json'))) {
        const job = JSON.parse(await readFile(path.join(jobDir, file), 'utf8'))
        if (job.projectId === projectId) jobs.push(job)
      }
      return jobs.sort((a, b) => String(b.startedAt || b.createdAt || '').localeCompare(String(a.startedAt || a.createdAt || '')))
    },
  }
}
