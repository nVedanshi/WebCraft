/**
 * Deployment API client for WebCraft.
 *
 * Wraps the axios-based `api` client with deployment-specific endpoints:
 *   - POST   /deployments/:projectId/publish        - publish draft
 *   - POST   /deployments/:projectId/republish      - republish draft
 *   - POST   /deployments/:projectId/unpublish      - unpublish
 *   - GET    /deployments/:projectId/history        - deployment history
 *   - GET    /deployments/:projectId/status         - current live deployment
 *   - POST   /deployments/:projectId/rollback/:versionId - rollback
 *   - GET    /deployments/:projectId/versions       - list version snapshots
 */
import { api } from './api.js'

export const deploymentApi = {
  publish: (projectId, payload) =>
    api.post(`/deployments/${projectId}/publish`, payload),

  republish: (projectId, payload) =>
    api.post(`/deployments/${projectId}/republish`, payload),

  unpublish: (projectId) =>
    api.post(`/deployments/${projectId}/unpublish`),

  getHistory: (projectId) =>
    api.get(`/deployments/${projectId}/history`),

  getStatus: (projectId) =>
    api.get(`/deployments/${projectId}/status`),

  rollback: (projectId, versionId) =>
    api.post(`/deployments/${projectId}/rollback/${versionId}`),

  listVersions: (projectId) =>
    api.get(`/deployments/${projectId}/versions`),
}

export default deploymentApi
