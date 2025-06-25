import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/types/database"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Skip middleware in preview environments
    const isPreview =
      req.nextUrl.hostname.includes("vusercontent.net") ||
      req.nextUrl.hostname.includes("v0.dev") ||
      req.nextUrl.hostname.includes("localhost")

    if (isPreview) {
      return res
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isConfigured = !!(
      supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "your-supabase-url" &&
      supabaseAnonKey !== "your-supabase-anon-key" &&
      supabaseUrl.startsWith("https://") &&
      supabaseAnonKey.length > 20
    )

    // If not configured, allow all routes (demo mode)
    if (!isConfigured) {
      return res
    }

    const supabase = createMiddlewareClient<Database>({ req, res })

    // Get session with timeout to prevent hanging
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Session timeout")), 5000))

    let session = null
    try {
      const result = (await Promise.race([sessionPromise, timeoutPromise])) as any
      session = result?.data?.session
    } catch (error) {
      console.warn("Session check failed, allowing access:", error)
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
    console.warn("Middleware error, allowing access:", error)
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
