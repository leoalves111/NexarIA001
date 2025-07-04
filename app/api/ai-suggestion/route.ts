import { type NextRequest, NextResponse } from "next/server"

// Verificação de ambiente servidor
function isServerEnvironment(): boolean {
  return (
    typeof window === "undefined" &&
    typeof global !== "undefined" &&
    typeof process !== "undefined" &&
    process.env !== undefined
  )
}

// Interface para resultados de leis
interface LawResult {
  id: string
  title: string
  description: string
  category: string
  subcategory: string
  article?: string
  lawNumber?: string
  relevance: "alta" | "média" | "baixa"
  source: "openai" | "fallback"
  articles?: Array<{
    number: string
    text: string
    relevance: string
  }>
}

// Cache para leis
const lawsCache = new Map<string, { laws: LawResult[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
const MAX_CACHE_SIZE = 100

// Rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number; blocked?: boolean }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto
const RATE_LIMIT_MAX = 15
const BLOCK_DURATION = 5 * 60 * 1000 // 5 minutos

function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return { allowed: true }
  }

  const clientData = rateLimitMap.get(ip)!

  if (clientData.blocked && now - clientData.timestamp < BLOCK_DURATION) {
    return {
      allowed: false,
      message: `Bloqueado por excesso de requisições. Tente novamente em ${Math.ceil((BLOCK_DURATION - (now - clientData.timestamp)) / 1000)} segundos.`,
    }
  }

  if (clientData.timestamp < windowStart) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return { allowed: true }
  }

  if (clientData.count >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, { count: clientData.count + 1, timestamp: now, blocked: true })
    return {
      allowed: false,
      message: `Limite de ${RATE_LIMIT_MAX} requisições por minuto excedido. Bloqueado por 5 minutos.`,
    }
  }

  rateLimitMap.set(ip, { count: clientData.count + 1, timestamp: clientData.timestamp })
  return { allowed: true }
}

// Limpeza periódica do rate limit
setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW && !data.blocked) {
      rateLimitMap.delete(ip)
    } else if (data.blocked && now - data.timestamp > BLOCK_DURATION) {
      rateLimitMap.delete(ip)
    }
  }
}, RATE_LIMIT_WINDOW)

// Função para buscar leis com OpenAI
async function searchLawsWithOpenAI(query: string, contractType: string): Promise<LawResult[]> {
  if (!isServerEnvironment()) {
    console.warn("⚠️ [AI-Suggestion] Tentativa de usar OpenAI no cliente")
    return []
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ [AI-Suggestion] OpenAI API Key não configurada")
    return []
  }

  try {
    console.log(`🔍 [AI-Suggestion] Buscando leis para: "${query}" (tipo: ${contractType})`)

    const systemPrompt = `Você é um especialista em Direito Brasileiro com foco em legislação aplicável a contratos.

MISSÃO: Identificar as leis brasileiras mais relevantes para o tipo de contrato "${contractType}" e contexto "${query}".

INSTRUÇÕES:
1. Retorne APENAS leis brasileiras vigentes e aplicáveis
2. Foque em leis específicas para o tipo de contrato: ${contractType}
3. Inclua artigos específicos quando relevantes
4. Ordene por relevância (alta, média, baixa)
5. Máximo 8 leis por resposta

FORMATO DE RESPOSTA (JSON):
{
  "laws": [
    {
      "id": "lei_8078_1990",
      "title": "Lei 8.078/90 - Código de Defesa do Consumidor",
      "description": "Proteção dos direitos do consumidor em relações de consumo",
      "category": "Direito do Consumidor",
      "subcategory": "Relações de Consumo",
      "article": "Art. 6º - Direitos básicos do consumidor",
      "lawNumber": "8.078/90",
      "relevance": "alta",
      "articles": [
        {
          "number": "Art. 6º",
          "text": "São direitos básicos do consumidor...",
          "relevance": "alta"
        }
      ]
    }
  ]
}

TIPOS DE CONTRATO E LEIS PRINCIPAIS:
- servicos: CDC, Código Civil, CLT
- trabalho: CLT, Constituição Federal
- locacao: Lei 8.245/91, Código Civil
- compra_venda: Código Civil, CDC
- consultoria: Código Civil, CLT
- prestacao_servicos: Código Civil, CDC
- fornecimento: Código Civil, CDC
- sociedade: Lei 6.404/76, Código Civil
- parceria: Código Civil, Lei 11.101/2005
- franquia: Lei 8.955/94
- licenciamento: Lei 9.279/96, Lei 9.610/98
- manutencao: Código Civil, CDC
- seguro: Código Civil, SUSEP
- financiamento: Código Civil, Lei 8.078/90

Retorne APENAS o JSON válido, sem explicações adicionais.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Buscar leis para contrato tipo "${contractType}" com contexto: "${query}"`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        top_p: 0.9,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [AI-Suggestion] OpenAI Error: ${response.status} - ${errorText}`)
      return []
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    if (!content) {
      console.warn("⚠️ [AI-Suggestion] OpenAI retornou resposta vazia")
      return []
    }

    try {
      const parsed = JSON.parse(content)
      const laws = parsed.laws || []

      console.log(`✅ [AI-Suggestion] OpenAI encontrou ${laws.length} leis`)

      return laws.map((law: any) => ({
        ...law,
        source: "openai" as const,
      }))
    } catch (parseError) {
      console.error("❌ [AI-Suggestion] Erro ao parsear resposta da OpenAI:", parseError)
      console.log("Resposta recebida:", content)
      return []
    }
  } catch (error) {
    console.error("❌ [AI-Suggestion] Erro na OpenAI:", error)
    return []
  }
}

// Função fallback com leis pré-definidas
function getFallbackLaws(contractType: string, query: string): LawResult[] {
  const fallbackLaws: Record<string, LawResult[]> = {
    servicos: [
      {
        id: "cc_2002",
        title: "Lei 10.406/2002 - Código Civil",
        description: "Regras gerais sobre contratos de prestação de serviços",
        category: "Direito Civil",
        subcategory: "Contratos",
        article: "Art. 593 a 609 - Prestação de Serviços",
        lawNumber: "10.406/2002",
        relevance: "alta" as const,
        source: "fallback" as const,
        articles: [
          {
            number: "Art. 593",
            text: "A prestação de serviço, que não estiver sujeita às leis trabalhistas ou a lei especial, reger-se-á pelas disposições deste Capítulo.",
            relevance: "alta",
          },
        ],
      },
      {
        id: "cdc_1990",
        title: "Lei 8.078/90 - Código de Defesa do Consumidor",
        description: "Proteção nas relações de consumo de serviços",
        category: "Direito do Consumidor",
        subcategory: "Prestação de Serviços",
        article: "Art. 14 - Responsabilidade por serviços defeituosos",
        lawNumber: "8.078/90",
        relevance: "alta" as const,
        source: "fallback" as const,
      },
    ],
    trabalho: [
      {
        id: "clt_1943",
        title: "Decreto-Lei 5.452/43 - CLT",
        description: "Consolidação das Leis do Trabalho",
        category: "Direito Trabalhista",
        subcategory: "Contratos de Trabalho",
        article: "Art. 442 - Contrato individual de trabalho",
        lawNumber: "5.452/43",
        relevance: "alta" as const,
        source: "fallback" as const,
      },
    ],
    locacao: [
      {
        id: "lei_locacao_1991",
        title: "Lei 8.245/91 - Lei do Inquilinato",
        description: "Locações de imóveis urbanos",
        category: "Direito Imobiliário",
        subcategory: "Locação",
        article: "Art. 1º - Locações de imóveis urbanos",
        lawNumber: "8.245/91",
        relevance: "alta" as const,
        source: "fallback" as const,
      },
    ],
    compra_venda: [
      {
        id: "cc_compra_venda",
        title: "Lei 10.406/2002 - Código Civil",
        description: "Contrato de compra e venda",
        category: "Direito Civil",
        subcategory: "Contratos",
        article: "Art. 481 a 532 - Compra e Venda",
        lawNumber: "10.406/2002",
        relevance: "alta" as const,
        source: "fallback" as const,
      },
    ],
    consultoria: [
      {
        id: "cc_consultoria",
        title: "Lei 10.406/2002 - Código Civil",
        description: "Prestação de serviços de consultoria",
        category: "Direito Civil",
        subcategory: "Contratos",
        article: "Art. 593 a 609 - Prestação de Serviços",
        lawNumber: "10.406/2002",
        relevance: "alta" as const,
        source: "fallback" as const,
      },
    ],
  }

  const laws = fallbackLaws[contractType] || fallbackLaws.servicos
  console.log(`📚 [AI-Suggestion] Usando ${laws.length} leis fallback para tipo: ${contractType}`)

  return laws
}

// Função principal para buscar leis
async function searchLaws(query: string, contractType: string): Promise<LawResult[]> {
  try {
    // Verificar cache primeiro
    const cacheKey = `${contractType}_${query.toLowerCase().trim()}`
    const cached = lawsCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`💾 [AI-Suggestion] Cache hit para: ${cacheKey}`)
      return cached.laws
    }

    // Tentar OpenAI primeiro
    let laws = await searchLawsWithOpenAI(query, contractType)

    // Se OpenAI falhar, usar fallback
    if (laws.length === 0) {
      console.log("🔄 [AI-Suggestion] OpenAI falhou, usando fallback")
      laws = getFallbackLaws(contractType, query)
    }

    // Salvar no cache
    if (lawsCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = lawsCache.keys().next().value
      lawsCache.delete(oldestKey)
    }

    lawsCache.set(cacheKey, {
      laws,
      timestamp: Date.now(),
    })

    return laws
  } catch (error) {
    console.error("❌ [AI-Suggestion] Erro geral:", error)
    return getFallbackLaws(contractType, query)
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const rateCheck = checkRateLimit(ip)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: rateCheck.message,
        },
        { status: 429 },
      )
    }

    const { query, contractType } = await req.json()

    // Validação de entrada
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Query inválida",
          message: "A consulta deve ter pelo menos 3 caracteres",
        },
        { status: 400 },
      )
    }

    if (!contractType || typeof contractType !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Tipo de contrato inválido",
          message: "Tipo de contrato é obrigatório",
        },
        { status: 400 },
      )
    }

    // Sanitizar entrada
    const sanitizedQuery = query.trim().substring(0, 200)
    const sanitizedContractType = contractType.trim().toLowerCase()

    console.log(`🔍 [AI-Suggestion] Buscando leis para: "${sanitizedQuery}" (${sanitizedContractType})`)

    // Buscar leis
    const laws = await searchLaws(sanitizedQuery, sanitizedContractType)

    console.log(`✅ [AI-Suggestion] Encontradas ${laws.length} leis relevantes`)

    return NextResponse.json({
      success: true,
      laws,
      query: sanitizedQuery,
      contractType: sanitizedContractType,
      cached: false,
      source: laws.length > 0 ? laws[0].source : "fallback",
    })
  } catch (error) {
    console.error("❌ [AI-Suggestion] Erro:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: "Erro ao buscar sugestões de leis. Tente novamente.",
      },
      { status: 500 },
    )
  }
}
