import { headers } from 'next/headers'

export async function getClientIP(): Promise<string> {
  const headersList = await headers()
  
  const forwarded = headersList.get('x-forwarded-for')
  const real = headersList.get('x-real-ip')
  const cfConnecting = headersList.get('cf-connecting-ip')
  
  // x-real-ip é definido pela plataforma (Vercel); x-forwarded-for pode
  // trazer valores enviados pelo próprio cliente, então vem depois.
  if (real) {
    return real
  }

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (cfConnecting) {
    return cfConnecting
  }
  
  return '0.0.0.0'
}

export async function getUserAgent(): Promise<string> {
  const headersList = await headers()
  return headersList.get('user-agent') || 'Unknown'
}