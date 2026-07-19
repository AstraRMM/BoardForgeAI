import { createJobStore } from './job-store.mjs'
import { publicJobRecord } from './job-status-schema.mjs'
import { runJob } from './job-runner.mjs'

export function createJobQueue({ rootDir, api }) {
  const store = createJobStore({ rootDir })
  return {
    store,
    async start({ type, projectId, payload = {} }) {
      const job = await runJob({ store, api, type, projectId, payload })
      return publicJobRecord(job)
    },
    async get(jobId) {
      return publicJobRecord(await store.read(jobId))
    },
    async log(jobId) {
      const job = await store.read(jobId)
      return { jobId, logs: job.logs || [] }
    },
    async cancel(jobId) {
      const job = await store.read(jobId)
      const canceled = { ...job, status: 'canceled', stage: 'canceled', finishedAt: new Date().toISOString(), progress: 100 }
      await store.write(canceled)
      return publicJobRecord(canceled)
    },
    async retry(jobId) {
      const job = await store.read(jobId)
      return this.start({ type: job.type, projectId: job.projectId, payload: job.payload || {} })
    },
    async listForProject(projectId) {
      return (await store.listForProject(projectId)).map(publicJobRecord)
    },
    async dashboard() {
      const jobs = (await store.listRecent()).map(publicJobRecord)
      const summary = { total: jobs.length, queued: 0, running: 0, succeeded: 0, failed: 0, canceled: 0 }
      for (const job of jobs) {
        if (Object.hasOwn(summary, job.status)) summary[job.status] += 1
      }
      // Paths are meaningful only on the helper's filesystem. The browser
      // dashboard needs job state, never local artifact locations.
      return {
        schema: 'boardforge.job-dashboard.v1',
        generatedAt: new Date().toISOString(),
        summary,
        jobs: jobs.map(({ artifactPaths, logs, error, ...job }) => ({
          ...job,
          logs: logs.map(({ timestamp, message }) => ({ timestamp, message })),
          error: error ? { message: error.message } : null,
        })),
      }
    },
  }
}
