import { Queue, Worker } from 'bullmq'
import { generationPipeline } from '../services/generation/pipeline.js'
import { publishProgress, completeProgress } from './progress.js'

/**
 * BullMQ Queue for asynchronous generation jobs.
 *
 * Jobs:
 *   - 'generate': Run the full generation pipeline for a new project
 *   - 'modify': Run an incremental modification on an existing project
 *
 * The queue is backed by Redis. Workers process jobs and report progress
 * via publishProgress() which SSE clients can subscribe to.
 *
 * Note: BullMQ requires maxRetriesPerRequest to be null on its Redis
 * connections, so we use a dedicated connection config here.
 *
 * Queue and Worker are created lazily (on first use) so the module can
 * be imported in environments where Redis is unavailable (e.g. tests).
 */

const BULLMQ_REDIS_CONFIG = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true,
}

let _queue = null
let _worker = null

/**
 * Get (or create) the BullMQ Queue instance.
 */
export function getGenerationJobQueue() {
  if (!_queue) {
    _queue = new Queue('webcraft-generation', {
      connection: BULLMQ_REDIS_CONFIG,
    })
  }
  return _queue
}

/**
 * Get (or create) the BullMQ Worker instance.
 */
export function getGenerationWorker() {
  if (!_worker) {
    _worker = new Worker(
      'webcraft-generation',
      async (job) => {
        switch (job.name) {
          case 'generate':
            return processGenerateJob(job)
          case 'modify':
            return processModifyJob(job)
          default:
            throw new Error(`Unknown job type: ${job.name}`)
        }
      },
      {
        connection: BULLMQ_REDIS_CONFIG,
        concurrency: 1,
      }
    )

    _worker.on('completed', (job) => {
      // eslint-disable-next-line no-console
      console.log('[BULLMQ] Job completed:', job.id)
    })

    _worker.on('failed', (job, err) => {
      // eslint-disable-next-line no-console
      console.error('[BULLMQ] Job failed:', job?.id, err.message)
      if (job) {
        publishProgress(job.id, { type: 'failed', error: err.message })
        completeProgress(job.id)
      }
    })

    _worker.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[BULLMQ] Worker error:', err.message)
    })
  }
  return _worker
}

/**
 * Process a 'generate' job: run the full generation pipeline.
 */
async function processGenerateJob(job) {
  const { userId, prompt, projectName, provider, model, framework, database, byokMode, apiKey } = job.data

  // Report progress through BullMQ's built-in progress AND SSE
  await job.updateProgress(5)
  publishProgress(job.id, { type: 'stage', stage: 'queued', status: 'in_progress', message: 'Job started' })

  const result = await generationPipeline.generate({
    userId,
    prompt,
    projectName,
    provider,
    model,
    framework,
    database,
    byokMode,
    apiKey,
    progressCallback: ({ stage, status, message }) => {
      publishProgress(job.id, { type: 'stage', stage, status, message })
    },
  })

  await job.updateProgress(100)
  publishProgress(job.id, { type: 'completed', result })
  completeProgress(job.id)

  return result
}

/**
 * Process a 'modify' job: run an incremental modification.
 */
async function processModifyJob(job) {
  const { projectId, userId, instruction, expectedRevisionId } = job.data

  await job.updateProgress(5)
  publishProgress(job.id, { type: 'stage', stage: 'queued', status: 'in_progress', message: 'Modification started' })

  const result = await generationPipeline.modify({
    projectId,
    userId,
    instruction,
    expectedRevisionId,
    progressCallback: ({ stage, status, message }) => {
      publishProgress(job.id, { type: 'stage', stage, status, message })
    },
  })

  await job.updateProgress(100)
  publishProgress(job.id, { type: 'completed', result })
  completeProgress(job.id)

  return result
}

export async function shutdownWorker() {
  if (_worker) {
    await _worker.close()
    _worker = null
  }
  if (_queue) {
    await _queue.close()
    _queue = null
  }
}

export default { getGenerationJobQueue, getGenerationWorker, shutdownWorker }
