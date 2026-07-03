'use client'

import { useCallback, useState } from 'react'
import { getBoardForgeJob, startBoardForgeJob, type BoardForgeJobStatus } from '../lib/boardforge-job-client'
import { useBoardForgePolling } from './useBoardForgePolling'

export function useBoardForgeJob(projectId: string) {
  const [jobId, setJobId] = useState<string | null>(null)
  const start = useCallback(async (type: string, projectDir?: string) => {
    const response = await startBoardForgeJob({ type, projectId, projectDir })
    setJobId(response.data.jobId)
    return response.data as BoardForgeJobStatus
  }, [projectId])
  const poller = useCallback(() => jobId ? getBoardForgeJob(jobId).then((response) => response.data as BoardForgeJobStatus) : Promise.resolve(null as unknown as BoardForgeJobStatus), [jobId])
  const { data, error } = useBoardForgePolling(poller, { enabled: Boolean(jobId) })
  return { start, job: data, error, jobId }
}
