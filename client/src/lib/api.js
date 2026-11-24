import axios from 'axios'

/**
 * Axios API client for WebCraft.
 *
 * Attaches the stored access token to every request, and on a 401 response
 * attempts to refresh the token via /auth/refresh. If refresh fails, it
 * clears the session and redirects to login.
 *
 * All API calls go through this instance so auth handling is centralized.
 */
export function createApiClient({ onSignout = () => {} } = {}) {
  const api = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
  })

  let accessToken = null

  api.interceptors.request.use((config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  })

  let isRefreshing = false
  let refreshSubscribers = []

  const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb)
  const onRefreshed = (token) => {
    refreshSubscribers.forEach((cb) => cb(token))
    refreshSubscribers = []
  }

  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        if (!isRefreshing) {
          isRefreshing = true
          try {
            const refreshToken = localStorage.getItem('wc_refresh_token')
            const { data } = await axios.post('/api/v1/auth/refresh', {
              refreshToken,
            })
            accessToken = data.data.accessToken
            localStorage.setItem('wc_access_token', accessToken)
            onRefreshed(accessToken)
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          } catch (refreshErr) {
            onSignout?.()
            return Promise.reject(refreshErr)
          } finally {
            isRefreshing = false
          }
        }

        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      return Promise.reject(error)
    }
  )

  return {
    setToken: (token) => {
      accessToken = token
    },
    get: api.get.bind(api),
    post: api.post.bind(api),
    put: api.put.bind(api),
    patch: api.patch.bind(api),
    delete: api.delete.bind(api),
  }
}

export const api = createApiClient()
