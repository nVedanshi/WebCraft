import { api } from './api.js'

export const templatesApi = {
  list: (params) => api.get('/templates', { params }),
  get: (id) => api.get(`/templates/${id}`),
  use: (templateId, body) => api.post(`/templates/${templateId}/use`, body),
}

export default templatesApi
