import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas protegidas
  const protectedRoutes = ['/profile', '/admin', '/bookings']
  const adminRoutes = ['/admin']

  // Verificar se é rota protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Verificar se tem tokens nos cookies
    const refreshToken = request.cookies.get('nhostRefreshToken')
    
    if (!refreshToken) {
      // Não autenticado, redirecionar para login
      const url = new URL('/auth/signin', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // TODO: Verificar se é admin quando for rota admin
    // Por enquanto, apenas verifica se está autenticado
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/admin/:path*',
    '/bookings/:path*',
  ],
}