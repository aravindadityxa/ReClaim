import { useState, useEffect, useCallback } from 'react'
import { authAPI, getAuthToken, setAuthToken, clearAuthToken } from '../api'
import { CurrentUserResponse } from '../types'

export interface UseAuthReturn {
  isAuthenticated: boolean
  currentUser: CurrentUserResponse | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    const token = getAuthToken()
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const user = await authAPI.getCurrentUser()
      setCurrentUser(user)
      setIsAuthenticated(true)
      setError(null)
    } catch (err) {
      // Token is invalid or expired
      clearAuthToken()
      setIsAuthenticated(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await authAPI.login({ username, password })
      setAuthToken(response.access_token)

      // Get current user info
      const user = await authAPI.getCurrentUser()
      setCurrentUser(user)
      setIsAuthenticated(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      setIsAuthenticated(false)
      setCurrentUser(null)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      // Even if logout fails, clear local state
      console.error('Logout error:', err)
    } finally {
      clearAuthToken()
      setIsAuthenticated(false)
      setCurrentUser(null)
      setError(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const user = await authAPI.getCurrentUser()
      setCurrentUser(user)
      setIsAuthenticated(true)
    } catch (err) {
      clearAuthToken()
      setIsAuthenticated(false)
      setCurrentUser(null)
    }
  }, [])

  return {
    isAuthenticated,
    currentUser,
    loading,
    error,
    login,
    logout,
    refreshUser,
  }
}

// Helper to check if user has a specific permission
export function useHasPermission(permission: string): boolean {
  const { currentUser } = useAuth()
  if (!currentUser) return false
  return currentUser.permissions.includes(permission)
}

// Helper to check if user has a specific role
export function useHasRole(role: string): boolean {
  const { currentUser } = useAuth()
  if (!currentUser) return false
  return currentUser.role === role
}
