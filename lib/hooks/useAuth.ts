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

  const logout = async () => {
    // Cookies httpOnly só podem ser apagados pelo servidor.
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    } catch (error) {
      console.error('[useAuth] Erro ao sair:', error)
    }
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
