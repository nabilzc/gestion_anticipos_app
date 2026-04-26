import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const protectedPaths = ['/administracion', '/aprobaciones', '/solicitudes/nueva', '/nueva-solicitud']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    // Verifica si existe la cookie de sesión de Supabase
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some(c => c.name.includes('-auth-token'))

    if (!hasAuthCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/administracion/:path*', '/aprobaciones/:path*', '/solicitudes/nueva', '/nueva-solicitud'],
}
