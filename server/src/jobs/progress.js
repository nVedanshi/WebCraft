/**
 * Progress pub/sub for SSE-based real-time updates.
 *
 * Maps jobId -> Set of SSE response objects. When a job emits progress,
 * we broadcast to all subscribers. In production this would be replaced
 * by Redis pub/sub for multi-server deployments.
 */
const progressSubscribers = new Map()

/**
 * Subscribe an SSE response to progress events for a job.
 */
export function subscribeToProgress(jobId, res) {
  if (!progressSubscribers.has(jobId)) {
    progressSubscribers.set(jobId, new Set())
  }
  progressSubscribers.get(jobId).add(res)

  res.on('close', () => {
    const subs = progressSubscribers.get(jobId)
    if (subs) {
      subs.delete(res)
      if (subs.size === 0) {
        progressSubscribers.delete(jobId)
      }
    }
  })
}

/**
 * Publish a progress event to all subscribers of a job.
 */
export function publishProgress(jobId, data) {
  const subs = progressSubscribers.get(jobId)
  if (!subs) return
  const payload = `data: ${JSON.stringify(data)}\n\n`
  for (const res of subs) {
    try {
      res.write(payload)
    } catch {
      // Subscriber gone; cleanup happens on 'close' event
    }
  }
}

/**
 * Mark a job's stream as complete and close all subscriber connections.
 */
export function completeProgress(jobId) {
  const subs = progressSubscribers.get(jobId)
  if (!subs) return
  for (const res of subs) {
    try {
      res.write('data: [DONE]\n\n')
      res.end()
    } catch {}
  }
  progressSubscribers.delete(jobId)
}
