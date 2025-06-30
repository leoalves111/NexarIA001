import { type NextRequest, NextResponse } from "next/server"

// ✅ BASE DE LEIS BRASILEIRAS ULTRA-ESPECÍFICAS
const BRAZILIAN_LAWS = [
  {
    id: "clt_contrato_temporario",
    title: "CLT - Contrato de Trabalho Temporário (Lei 6.019/74)",
    description:
      "Regula especificamente contratos temporários, prazo máximo, renovação, direitos do trabalhador temporário",
    category: "trabalhista",
    relevance: "alta",
    exactTerms: ["contrato temporário", "trabalho temporário", "temporário", "lei 6019"],
    relatedTerms: ["prazo determinado", "renovação", "trabalhador temporário"],
  },
  {
    id: "clt_contrato_determinado",
    title: "CLT - Contrato por Prazo Determinado (Art. 443)",
    description: "Regula contratos com prazo determinado, condições, limites de renovação",
    category: "trabalhista",
    relevance: "alta",
    exactTerms: ["prazo determinado", "contrato determinado", "art 443", "artigo 443"],
    relatedTerms: ["prazo", "determinado", "renovação", "limite"],
  },
  {
    id: "codigo_civil_contratos",
    title: "Código Civil - Contratos (Arts. 421 a 480)",
    description: "Regula formação, execução e extinção de contratos, boa-fé objetiva, função social",
    category: "civil",
    relevance: "alta",
    exactTerms: ["código civil contratos", "art 421", "art 422", "boa-fé objetiva", "função social"],
    relatedTerms: ["contrato", "obrigações", "prestação", "acordo"],
  },
  {
    id: "cdc_contratos_consumo",
    title: "CDC - Contratos de Consumo (Arts. 46 a 54)",
    description: "Regula contratos entre fornecedor e consumidor, cláusulas abusivas, direito de arrependimento",
    category: "consumidor",
    relevance: "alta",
    exactTerms: ["cdc contratos", "contrato consumo", "cláusulas abusivas", "direito arrependimento"],
    relatedTerms: ["consumidor", "fornecedor", "produto", "serviço"],
  },
  {
    id: "lei_locacao_comercial",
    title: "Lei do Inquilinato - Locação Comercial (Arts. 51 a 57)",
    description: "Regula especificamente locações comerciais, renovação compulsória, fundo de comércio",
    category: "imobiliario",
    relevance: "alta",
    exactTerms: ["locação comercial", "inquilinato comercial", "renovação compulsória", "fundo comércio"],
    relatedTerms: ["comercial", "ponto comercial", "estabelecimento"],
  },
  {
    id: "lei_locacao_residencial",
    title: "Lei do Inquilinato - Locação Residencial (Arts. 1 a 50)",
    description: "Regula locações residenciais, garantias, reajustes, benfeitorias",
    category: "imobiliario",
    relevance: "alta",
    exactTerms: ["locação residencial", "inquilinato residencial", "aluguel residencial"],
    relatedTerms: ["residencial", "moradia", "habitação", "casa", "apartamento"],
  },
  {
    id: "lei_prestacao_servicos",
    title: "Lei de Prestação de Serviços (LC 116/03)",
    description: "Regula prestação de serviços, ISS, responsabilidades profissionais",
    category: "servicos",
    relevance: "alta",
    exactTerms: ["prestação serviços", "lei serviços", "lc 116", "iss"],
    relatedTerms: ["serviços", "consultoria", "profissional", "técnico"],
  },
  {
    id: "lgpd_tratamento_dados",
    title: "LGPD - Tratamento de Dados Pessoais (Lei 13.709/18)",
    description: "Regula tratamento de dados pessoais, consentimento, direitos do titular",
    category: "dados",
    relevance: "alta",
    exactTerms: ["lgpd", "lei dados", "tratamento dados", "dados pessoais", "lei 13709"],
    relatedTerms: ["privacidade", "consentimento", "proteção dados"],
  },
  {
    id: "lei_franquia_empresarial",
    title: "Lei de Franquia (Lei 8.955/94)",
    description: "Regula sistema de franquias, COF, direitos e deveres de franqueador e franqueado",
    category: "empresarial",
    relevance: "média",
    exactTerms: ["lei franquia", "franquia", "cof", "lei 8955", "franqueador", "franqueado"],
    relatedTerms: ["sistema franquia", "marca", "royalties"],
  },
  {
    id: "lei_sociedade_limitada",
    title: "Código Civil - Sociedade Limitada (Arts. 1052 a 1087)",
    description: "Regula constituição e funcionamento de sociedades limitadas, quotas, administração",
    category: "empresarial",
    relevance: "média",
    exactTerms: ["sociedade limitada", "ltda", "quotas", "art 1052"],
    relatedTerms: ["sociedade", "sócios", "empresa", "quotista"],
  },
]

// ✅ RATE LIMITING
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60000 // 1 minuto
  const maxRequests = 15 // 15 requests por minuto

  const current = rateLimitMap.get(ip)

  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

// ✅ BUSCA ULTRA-PRECISA E CIRÚRGICA
function searchLaws(query: string) {
  const queryLower = query.toLowerCase().trim()

  if (!queryLower || queryLower.length < 3) {
    return []
  }

  console.log(`🔍 [Laws] Busca cirúrgica por: "${queryLower}"`)

  const results = BRAZILIAN_LAWS.map((law) => {
    let score = 0
    const matchDetails = []

    // ✅ 1. TERMOS EXATOS (peso máximo - 1000 pontos)
    for (const exactTerm of law.exactTerms) {
      if (queryLower === exactTerm) {
        score += 1000
        matchDetails.push(`EXATO: "${exactTerm}"`)
        break
      } else if (queryLower.includes(exactTerm) || exactTerm.includes(queryLower)) {
        score += 500
        matchDetails.push(`CONTÉM: "${exactTerm}"`)
      }
    }

    // ✅ 2. TERMOS RELACIONADOS (peso médio - 200 pontos)
    if (score === 0) {
      // Só buscar relacionados se não encontrou exato
      for (const relatedTerm of law.relatedTerms) {
        if (queryLower.includes(relatedTerm) || relatedTerm.includes(queryLower)) {
          score += 200
          matchDetails.push(`RELACIONADO: "${relatedTerm}"`)
        }
      }
    }

    // ✅ 3. BUSCA POR PALAVRAS-CHAVE ESPECÍFICAS (peso baixo - 100 pontos)
    if (score === 0) {
      // Só se não encontrou nada ainda
      const queryWords = queryLower.split(/\s+/).filter((word) => word.length >= 3)

      for (const word of queryWords) {
        // Buscar no título
        if (law.title.toLowerCase().includes(word)) {
          score += 100
          matchDetails.push(`TÍTULO: "${word}"`)
        }

        // Buscar na descrição
        if (law.description.toLowerCase().includes(word)) {
          score += 50
          matchDetails.push(`DESCRIÇÃO: "${word}"`)
        }
      }
    }

    // ✅ 4. BONUS POR RELEVÂNCIA (só se já tem score)
    if (score > 0) {
      if (law.relevance === "alta") {
        score += 50
      } else if (law.relevance === "média") {
        score += 25
      }
    }

    if (score > 0) {
      console.log(`🎯 [Laws] "${law.title}" - Score: ${score} - Matches: ${matchDetails.join(", ")}`)
    }

    return { ...law, score, matchDetails }
  })

  // ✅ FILTRAR APENAS RESULTADOS RELEVANTES (score > 100)
  const filteredResults = results
    .filter((law) => law.score >= 100) // Só leis com score significativo
    .sort((a, b) => b.score - a.score) // Ordenar por relevância
    .slice(0, 5) // Máximo 5 leis

  console.log(`✅ [Laws] ${filteredResults.length} leis específicas encontradas para "${queryLower}"`)

  if (filteredResults.length === 0) {
    console.log(`❌ [Laws] Nenhuma lei específica encontrada para "${queryLower}"`)
  }

  return filteredResults.map(({ score, matchDetails, ...law }) => law)
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Muitas requisições. Aguarde 1 minuto.",
        },
        { status: 429 },
      )
    }

    const { observacoes } = await request.json()

    if (!observacoes || typeof observacoes !== "string" || observacoes.trim().length < 3) {
      return NextResponse.json({
        success: true,
        laws: [],
        message:
          "Digite pelo menos 3 caracteres para buscar leis específicas (ex: 'contrato temporário', 'locação comercial', 'lgpd')",
      })
    }

    console.log(`🔍 [Laws] Busca específica por: "${observacoes.substring(0, 100)}..."`)

    // Buscar leis com precisão cirúrgica
    const laws = searchLaws(observacoes)

    if (laws.length === 0) {
      console.log(`❌ [Laws] Nenhuma lei específica encontrada para: "${observacoes}"`)
      return NextResponse.json({
        success: true,
        laws: [],
        message:
          "Nenhuma lei específica encontrada. Tente termos mais específicos como 'contrato temporário', 'locação comercial', 'lgpd', etc.",
      })
    }

    console.log(`✅ [Laws] ${laws.length} leis específicas encontradas`)

    return NextResponse.json({
      success: true,
      laws,
      type: "laws_selection",
      message: `${laws.length} lei(s) específica(s) encontrada(s) para sua consulta`,
    })
  } catch (error) {
    console.error("❌ [Laws] Erro ao buscar leis:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
        message: "Erro ao buscar leis. Tente novamente.",
      },
      { status: 500 },
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "AI Law Suggestion - Ultra Precise",
    laws_count: BRAZILIAN_LAWS.length,
    precision: "cirúrgica",
    timestamp: new Date().toISOString(),
  })
}
