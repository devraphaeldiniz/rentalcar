import { NhostClient } from '@nhost/nextjs'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()
  
  const nhost = new NhostClient({
    subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN!,
    region: process.env.NEXT_PUBLIC_NHOST_REGION!,
  })

  const refreshToken = cookieStore.get('nhostRefreshToken')?.value
  if (refreshToken) {
    await nhost.auth.refreshSession(refreshToken)
  }

  return nhost
}