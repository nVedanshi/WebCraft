/**
 * Generation API client for WebCraft.
 *
 * Wraps the axios-based `api` client with generation-specific endpoints:
 *   - POST /generation/generate        - synchronous generation
 *   - POST /generation/generate/async  - async job submission
 *   - GET  /generation/jobs/:jobId     - job status
 *   - GET  /generation/stream/:jobId   - SSE progress stream
 *   - POST /generation/modify          - incremental modification
 */
import { api } from './api.js'

export const generationApi = {
  generate: (payload) => api.post('/generation/generate', payload),
  generateAsync: (payload) => api.post('/generation/generate/async', payload),
  getJob: (jobId) => api.get(`/generation/jobs/${jobId}`),
  stream: (jobId, onEvent) => {
    const es = new EventSource(`/api/v1/generation/stream/${jobId}`)
    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onEvent(data)
    }
    es.onerror = () => {
      es.close()
    }
    return es
  },
  modify: (payload) => api.post('/generation/modify', payload),
}

export default generationApi
