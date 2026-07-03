export type BoardForgeJobStatus = {
  jobId: string
  projectId: string
  type: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  progress: number
  stage: string
  logs: Array<{ timestamp: string; message: string }>
  artifactPaths: string[]
  error: { message: string } | null
}

export const localJobRoutes = {
  start: 'POST /jobs/start',
  status: 'GET /jobs/:id',
  log: 'GET /jobs/:id/log',
  cancel: 'POST /jobs/:id/cancel',
  projectJobs: 'GET /projects/:id/jobs',
}

export function demoJobStatus(type = 'run_board_review'): BoardForgeJobStatus {
  return {
    jobId: 'local-artifact-demo-job',
    projectId: 'local-project',
    type,
    status: 'succeeded',
    progress: 100,
    stage: 'complete',
    logs: [
      { timestamp: 'local', message: 'Job is executed by BoardForge Local Engine Service on localhost.' },
      { timestamp: 'local', message: 'Web UI polls job status instead of faking cloud execution.' },
    ],
    artifactPaths: ['BoardForge_Board_Review_Report.md', 'BoardForge_Project_Health_Score.json'],
    error: null,
  }
}
