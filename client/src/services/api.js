import axios from 'axios'

let accessToken = null
let refreshPromise = null
const unauthorizedListeners = new Set()

export const setAccessToken = (token) => {
  accessToken = token || null
}

export const getAccessToken = () => accessToken

export const onUnauthorized = (listener) => {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

// Only public, non-secret values belong in VITE_* variables.
const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

const shouldSkipRefresh = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout')

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const originalConfig = error?.config
    const requestUrl = originalConfig?.url || ''

    if (status === 401 && originalConfig && !originalConfig._retry && !shouldSkipRefresh(requestUrl)) {
      originalConfig._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post('/auth/refresh')
            .then((res) => {
              const newToken = res?.data?.data?.accessToken || null
              setAccessToken(newToken)
              return newToken
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        const newToken = await refreshPromise
        if (newToken) {
          originalConfig.headers = originalConfig.headers || {}
          originalConfig.headers.Authorization = `Bearer ${newToken}`
          return api(originalConfig)
        }
      } catch {
        setAccessToken(null)
        unauthorizedListeners.forEach((listener) => listener())
        return Promise.reject(error)
      }
    }

    if (
      status === 401 &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/register')
    ) {
      setAccessToken(null)
      unauthorizedListeners.forEach((listener) => listener())
    }

    return Promise.reject(error)
  },
)

export default api
