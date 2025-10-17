import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('nhostRefreshToken')?.value

  if (request.nextUrl.pathname.startsWith('/admin') && !refreshToken) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/bookings/:path*']
}