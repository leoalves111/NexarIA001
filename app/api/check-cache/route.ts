import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar autenticação
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { cacheKey, prompt, contractType } = body

    if (!cacheKey) {
      return NextResponse.json({ found: false })
    }

    // Buscar no cache
    const { data: cacheData, error } = await supabase
      .from("contract_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("user_id", session.user.id)
      .single()

    if (error || !cacheData) {
      return NextResponse.json({ found: false })
    }

    // Verificar se o cache ainda é válido (ex: 30 dias)
    const cacheDate = new Date(cacheData.created_at)
    const now = new Date()
    const daysDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 3600 * 24)

    if (daysDiff > 30) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      content: cacheData.generated_content,
      cached_at: cacheData.created_at,
    })
  } catch (error) {
    console.error("Erro na API check-cache:", error)
    return NextResponse.json({ found: false })
  }
}
