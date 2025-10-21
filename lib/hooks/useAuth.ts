'use client'

import { useUserData, useAccessToken, useSignOut } from '@nhost/nextjs'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const user = useUserData()
  const accessToken = useAccessToken()
  const { signOut } = useSignOut()
  const router = useRouter()

  const logout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  const isAdmin = user?.metadata?.role === 'admin' || user?.defaultRole === 'admin'
  const isAuthenticated = !!user

  return {
    user,
    isAuthenticated,
    isAdmin,
    accessToken,
    logout,
  }
}