'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  email: string
  displayName?: string
  emailVerified: boolean
  role?: string
  avatarUrl?: string
  phoneNumber?: string
  createdAt: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[useAuth] User data received:', data.user)
        console.log('[useAuth] User role:', data.user?.role)
        console.log('[useAuth] Is admin:', data.user?.role === 'admin')
        
        setUser(data.user)
        setIsAuthenticated(true)
        setIsAdmin(data.user?.role === 'admin')
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('[useAuth] Error:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'nhostRefreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    setUser(null)
    setIsAuthenticated(false)
    setIsAdmin(false)
    router.push('/auth/signin')
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    logout,
    refetch: checkAuth
  }
}
