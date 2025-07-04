import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Skip middleware in preview environments
    const isPreview =
      request.nextUrl.hostname.includes("vusercontent.net") ||
      request.nextUrl.hostname.includes("v0.dev") ||
      request.nextUrl.hostname.includes("localhost")

    if (isPreview) {
      return response
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
      return response
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: "",
              ...options,
            })
          },
        },
      },
    )

    // Get session with timeout to prevent hanging
    const sessionPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Session timeout")), 5000))

    let user = null
    try {
      const result = (await Promise.race([sessionPromise, timeoutPromise])) as any
      user = result?.data?.user
    } catch (error) {
      console.warn("Session check failed, allowing access:", error)
      return response
    }

    // Protected routes
    const protectedRoutes = ["/dashboard", "/profile", "/generator", "/templates", "/exports", "/subscription"]
    const authRoutes = ["/auth/login", "/auth/register"]

    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
    const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect to dashboard if accessing auth routes with session
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return response
  } catch (error) {
    console.warn("Middleware error, allowing access:", error)
    return response
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
