import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onUnauthorized, setAccessToken } from '@/services/api.js'
import * as authService from '@/services/auth.service.js'

const AuthContext = createContext(null)

const AUTH_QUERY_KEY = ['auth', 'me']

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY })
  }, [queryClient])

  const restoreSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await authService.getMe()
      const currentUser = response?.data?.user || null
      setUser(currentUser)
      if (currentUser) {
        queryClient.setQueryData(AUTH_QUERY_KEY, currentUser)
      }
      return currentUser
    } catch {
      clearSession()
      return null
    } finally {
      setIsLoading(false)
    }
  }, [clearSession, queryClient])

  // Restore session on application startup via GET /api/v1/auth/me
  useEffect(() => {
    let active = true

    authService
      .getMe()
      .then((response) => {
        if (!active) return
        const currentUser = response?.data?.user || null
        setUser(currentUser)
        if (currentUser) {
          queryClient.setQueryData(AUTH_QUERY_KEY, currentUser)
        }
      })
      .catch(() => {
        if (!active) return
        clearSession()
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [clearSession, queryClient])

  // Clear session state whenever a protected API call fails with 401
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null)
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY })
    })
  }, [queryClient])

  const login = useCallback(
    async (credentials) => {
      const response = await authService.login(credentials)
      const loggedInUser = response?.data?.user || null
      setUser(loggedInUser)
      if (loggedInUser) {
        queryClient.setQueryData(AUTH_QUERY_KEY, loggedInUser)
      }
      return response
    },
    [queryClient],
  )

  const register = useCallback(async (payload) => {
    return authService.register(payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      return await authService.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      restoreSession,
    }),
    [user, isLoading, login, register, logout, restoreSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
