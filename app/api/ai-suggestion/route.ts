import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// ✅ INICIALIZAR OPENAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ✅ INTERFACE PARA RESULTADOS DE LEIS
interface LawResult {
  id: string
  title: string
  description: string
  category: string
  subcategory: string
  article?: string
  lawNumber?: string
  relevance: "alta" | "média" | "baixa"
  source: "openai" | "lexml"
  articles?: Array<{
    number: string
    text: string
    relevance: string
  }>
}

// ✅ CACHE INTELIGENTE PARA LEIS
const lawsCache = new Map<string, { laws: LawResult[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// ✅ RATE LIMITING BÁSICO
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto
const RATE_LIMIT_MAX = 30 // 30 requisições por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return true
  }

  const clientData = rateLimitMap.get(ip)!
  if (clientData.timestamp < windowStart) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return true
  }

  if (clientData.count >= RATE_LIMIT_MAX) {
    return false
  }

  clientData.count++
  return true
}

// ✅ BUSCA INTELIGENTE DE LEIS VIA OPENAI - SISTEMA UNIVERSAL
async function searchLawsWithOpenAI(query: string): Promise<LawResult[]> {
  try {
    console.log(`🔍 [OpenAI] Busca inteligente: "${query.substring(0, 50)}..."`)

    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ [OpenAI] API Key não configurada")
      return []
    }

    const systemPrompt = `
Você é um ESPECIALISTA JURÍDICO UNIVERSAL com PhD em Direito e 30+ anos de experiência em TODAS as áreas jurídicas brasileiras.

CONTEXTO DA CONSULTA: "${query}"

INSTRUÇÕES PARA BUSCA INTELIGENTE:
1. ANALISE o contexto específico da consulta
2. IDENTIFIQUE a área jurídica predominante (civil, penal, trabalhista, tributário, administrativo, etc.)
3. RETORNE leis com aplicação DIRETA e IMEDIATA ao contexto
4. INCLUA artigos, parágrafos e incisos ESPECÍFICOS e APLICÁVEIS
5. SEJA CIRÚRGICO - apenas leis ultra-relevantes
6. MÁXIMO 5 leis de altíssima relevância

ÁREAS JURÍDICAS - EXEMPLOS DE APLICAÇÃO:
- DIREITO CIVIL: Código Civil, leis de locação, contratos, família
- DIREITO PENAL: Código Penal, leis penais especiais, execução penal
- DIREITO TRABALHISTA: CLT, leis trabalhistas, previdência
- DIREITO TRIBUTÁRIO: CTN, leis tributárias específicas
- DIREITO ADMINISTRATIVO: Leis administrativas, licitações, servidores
- DIREITO PROCESSUAL: CPC, CPP, leis processuais
- DIREITO CONSTITUCIONAL: Constituição Federal, leis constitucionais
- DIREITO EMPRESARIAL: Lei das S.A., falência, propriedade industrial
- DIREITO AMBIENTAL: Leis ambientais, licenciamento, crimes ambientais
- DIREITO DIGITAL: LGPD, Marco Civil, crimes digitais

PRECISÃO CONTEXTUAL:
- Se sobre CONTRATOS PENAIS ou CRIMES → inclua Código Penal, leis penais especiais
- Se sobre CONTRATOS CIVIS → inclua Código Civil, leis civis específicas
- Se sobre CONTRATOS TRABALHISTAS → inclua CLT, leis trabalhistas
- Se sobre CONTRATOS TRIBUTÁRIOS → inclua CTN, leis tributárias
- Se sobre CONTRATOS ADMINISTRATIVOS → inclua leis administrativas
- SEMPRE conecte leis ao contexto específico solicitado

FORMATO JSON OBRIGATÓRIO:
{
  "laws": [
    {
      "id": "unique_id",
      "title": "Nome completo da lei",
      "description": "Aplicação específica no contexto solicitado",
      "category": "área jurídica",
      "subcategory": "subárea específica",
      "article": "artigos principais aplicáveis",
      "lawNumber": "número da lei",
      "relevance": "alta",
      "articles": [
        {
          "number": "Art. X",
          "text": "Descrição do artigo",
          "relevance": "aplicação no contexto"
        }
      ]
    }
  ]
}

VALIDAÇÃO FINAL: Cada lei deve ter aplicação IMEDIATA e DIRETA no contexto solicitado.

Retorne APENAS o JSON válido:`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // ✅ UPGRADE PARA GPT-4o - MODELO MAIS PODEROSO
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      temperature: 0.1, // ✅ REDUZIDO PARA MÁXIMA PRECISÃO JURÍDICA
      max_tokens: 4000, // ✅ AUMENTADO PARA ARTIGOS MAIS DETALHADOS
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      console.log("❌ [OpenAI] Resposta vazia")
      return []
    }

    const parsedResponse = JSON.parse(response)
    const laws = parsedResponse.laws || []

    console.log(`✅ [OpenAI] ${laws.length} leis encontradas`)
    
    // Validar e sanitizar leis com artigos específicos
    const validLaws = laws
      .filter((law: any) => law.title && law.description && law.category)
      .slice(0, 5) // Máximo 5 leis ultra-relevantes
      .map((law: any, index: number) => ({
        id: law.id || `law_${Date.now()}_${index}`,
        title: law.title.substring(0, 250),
        description: law.description.substring(0, 600),
        category: law.category,
        subcategory: law.subcategory || law.category,
        article: law.article,
        lawNumber: law.lawNumber,
        relevance: law.relevance || "alta",
        source: "openai",
        articles: law.articles || [] // Incluir artigos específicos
      }))

    return validLaws

  } catch (error) {
    console.error("❌ [OpenAI] Erro na busca:", error)
    return []
  }
}

// ✅ BUSCA VIA LEXML (SISTEMA BACKUP)
async function searchLawsWithLexML(query: string): Promise<LawResult[]> {
  try {
    console.log(`🔍 [LexML] Buscando leis para: "${query}"`)

    // Implementação básica - pode ser melhorada com API real do LexML
    const searchUrl = `https://www.lexml.gov.br/busca/search?q=${encodeURIComponent(query)}&formato=json`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'NexarIA Legal Search Bot 1.0'
      }
    })

    if (!response.ok) {
      console.log(`❌ [LexML] Erro HTTP: ${response.status}`)
      return []
    }

    // Para agora, retornar array vazio - LexML precisa de implementação específica
    console.log(`🔄 [LexML] Funcionalidade em desenvolvimento`)
    return []

  } catch (error) {
    console.error("❌ [LexML] Erro na busca:", error)
    return []
  }
}

// ✅ FUNÇÃO PRINCIPAL DE BUSCA INTELIGENTE
async function searchLaws(query: string): Promise<LawResult[]> {
  const queryLower = query.toLowerCase().trim()

  if (!queryLower || queryLower.length < 3) {
    return []
  }

  // Verificar cache
  const cached = lawsCache.get(queryLower)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`💾 [Cache] Leis encontradas no cache para: "${queryLower}"`)
    return cached.laws
  }

  console.log(`🔍 [Laws] Busca inteligente iniciada para: "${queryLower}"`)

  // Buscar via OpenAI primeiro
  let laws = await searchLawsWithOpenAI(queryLower)

  // Se OpenAI não retornou resultados suficientes, tentar LexML
  if (laws.length < 3) {
    console.log(`🔄 [Laws] Tentando LexML como backup...`)
    const lexmlLaws = await searchLawsWithLexML(queryLower)
    laws = [...laws, ...lexmlLaws].slice(0, 8)
  }

  // Salvar no cache
  if (laws.length > 0) {
    lawsCache.set(queryLower, { laws, timestamp: Date.now() })
  }

  console.log(`✅ [Laws] ${laws.length} leis específicas encontradas para "${queryLower}"`)

  return laws
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
          "Digite pelo menos 3 caracteres para buscar leis específicas (ex: 'contrato penal', 'direito trabalhista', 'crime digital', 'locação residencial')",
      })
    }

    // Verificar se OpenAI está configurado
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI não configurado",
          message: "Chave da API OpenAI não encontrada. Configure OPENAI_API_KEY no .env.local",
        },
        { status: 500 },
      )
    }

    console.log(`🔍 [Laws] Busca universal por: "${observacoes.substring(0, 100)}..."`)

    // Buscar leis com sistema inteligente
    const laws = await searchLaws(observacoes)

    if (laws.length === 0) {
      console.log(`❌ [Laws] Nenhuma lei específica encontrada para: "${observacoes}"`)
      return NextResponse.json({
        success: true,
        laws: [],
        message:
          "Nenhuma lei específica encontrada. Tente termos mais específicos como 'direito penal', 'crime digital', 'contrato trabalho', 'direito tributário', etc.",
      })
    }

    console.log(`✅ [Laws] ${laws.length} leis específicas encontradas`)

    return NextResponse.json({
      success: true,
      laws,
      type: "laws_selection",
      message: `${laws.length} lei(s) específica(s) encontrada(s) via busca inteligente GPT-4o`,
      searchMethod: laws[0]?.source || "openai"
    })
  } catch (error) {
    console.error("❌ [Laws] Erro ao buscar leis:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
        message: "Erro ao buscar leis. Verifique sua conexão e tente novamente.",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de sugestões de leis ativa",
    version: "2.0",
    model: "GPT-4o",
    features: ["Busca inteligente", "Cache otimizado", "Rate limiting", "Suporte universal"]
  })
}
