import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Verificar se Supabase está configurado
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Modo demo - permitir acesso a tudo
      return res
    }

    const supabase = createMiddlewareClient({ req, res })

    // Timeout para evitar travamento
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Session timeout")), 3000))

    let session = null
    try {
      const result = (await Promise.race([sessionPromise, timeoutPromise])) as any
      session = result.data?.session
    } catch (error) {
      console.error("Session check timeout:", error)
      // Em caso de timeout, permitir acesso (modo demo)
      return res
    }

    // Protected routes
    const protectedRoutes = ["/dashboard", "/profile", "/generator", "/templates", "/exports", "/subscription"]
    const authRoutes = ["/auth/login", "/auth/register"]

    const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
    const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }

    // Redirect to dashboard if accessing auth routes with session
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // Em caso de erro, permitir acesso
    return res
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/generator/:path*",
    "/templates/:path*",
    "/exports/:path*",
    "/subscription/:path*",
    "/auth/:path*",
  ],
}
