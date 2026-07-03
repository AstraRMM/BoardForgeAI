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
    async listForProject(projectId) {
      return (await store.listForProject(projectId)).map(publicJobRecord)
    },
  }
}
