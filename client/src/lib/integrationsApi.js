import { api } from './api.js'

export const integrationsApi = {
  getProviders: () => api.get('/integrations/providers'),
  saveKey: (provider, apiKey) => api.post(`/integrations/providers/${provider}/key`, { apiKey }),
  testProvider: (provider) => api.post(`/integrations/providers/${provider}/test`),
  setDefault: (provider) => api.post(`/integrations/providers/${provider}/default`),
  setBillingMode: (provider, billingMode) => api.post(`/integrations/providers/${provider}/billing-mode`, { billingMode }),
  disconnectProvider: (provider) => api.delete(`/integrations/providers/${provider}`),

  githubStatus: () => api.get('/integrations/github/status'),
  githubAuthorize: () => api.get('/integrations/github/authorize'),
  githubDisconnect: () => api.delete('/integrations/github'),
  githubRepos: () => api.get('/integrations/github/repos'),
  githubBranches: (owner, repo) => api.get(`/integrations/github/repos/${owner}/${repo}/branches`),

  // GitHub project linking
  githubConnectProject: (projectId, { owner, repo, branch }) =>
    api.post('/integrations/github/connect', { projectId, owner, repo, branch }),
  githubDisconnectProject: (projectId) => api.delete('/integrations/github/project', { data: { projectId } }),
  githubProjectInfo: (projectId) => api.get(`/integrations/github/project/${projectId}`),

  // Repository creation
  githubCreateRepo: ({ name, description, private: isPrivate }) =>
    api.post('/integrations/github/create-repo', { name, description, private: isPrivate }),

  // Push / Pull / Sync
  githubPublish: (projectId, { commitMessage } = {}) =>
    api.post('/integrations/github/publish', { projectId, commitMessage }),
  githubPull: (projectId, { commitMessage } = {}) =>
    api.post('/integrations/github/pull', { projectId, commitMessage }),
  githubSync: (projectId, { commitMessage } = {}) =>
    api.post('/integrations/github/sync', { projectId, commitMessage }),
  githubResolveConflict: (projectId, { path, resolution }) =>
    api.post('/integrations/github/sync/resolve', { projectId, path, resolution }),
  githubSyncStatus: (projectId) => api.get(`/integrations/github/sync-status/${projectId}`),
}

export default integrationsApi
