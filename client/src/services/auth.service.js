import api, { setAccessToken } from './api.js'

export const login = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password })
  if (data?.data?.accessToken) {
    setAccessToken(data.data.accessToken)
  }
  return data
}

export const register = async ({ name, email, password }) => {
  const { data } = await api.post('/auth/register', { name, email, password })
  return data
}

export const getMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}

export const logout = async () => {
  try {
    const { data } = await api.post('/auth/logout')
    return data
  } finally {
    setAccessToken(null)
  }
}

