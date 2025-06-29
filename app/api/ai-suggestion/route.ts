import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Cache simples em memória para rate limiting por IP
const ipRequestCache = new Map<string, { count: number; resetTime: number; blocked: boolean }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 10
const BLOCK_DURATION = 300000 // 5 minutos

// Cache de resultados para evitar requests duplicados
const resultCache = new Map<string, { result: any; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutos

// Cache para evitar calls desnecessários
const cache = new Map<string, { data: any; timestamp: number }>()

// Sistema de detecção de padrões de bot
interface BotPattern {
  ip: string
  timestamps: number[]
  isBlocked: boolean
  blockEndTime?: number
  suspicionLevel: number
  blockCount: number
}

const botDetection = new Map<string, BotPattern>()

// Configuração específica para busca de leis
const BOT_CONFIG = {
  minInterval: 2000, // 2 segundos mínimo entre buscas
  maxRequestsPerWindow: 8, // Máximo 8 buscas em 1 minuto
  windowDuration: 60000, // Janela de 1 minuto
  patternThreshold: 70, // 70% de suspeita = bloqueio
  initialBlockDuration: 120000, // 2 minutos inicial
  maxBlockDuration: 1800000, // 30 minutos máximo
}

// Validação rigorosa de entrada
const RequestSchema = z.object({
  observacoes: z.string()
    .min(3, "Observações devem ter pelo menos 3 caracteres")
    .max(500, "Observações não podem exceder 500 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-\.\,\;\:]+$/, "Observações contêm caracteres inválidos")
})

// Função para verificar rate limit por IP
function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now()
  const record = ipRequestCache.get(ip)

  if (!record) {
    ipRequestCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW, blocked: false })
    return { allowed: true }
  }

  // Se está bloqueado, verificar se o bloqueio expirou
  if (record.blocked && now < record.resetTime) {
    return { 
      allowed: false, 
      message: `IP bloqueado até ${new Date(record.resetTime).toLocaleTimeString()}` 
    }
  }

  // Reset se passou da janela de tempo
  if (now > record.resetTime) {
    ipRequestCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW, blocked: false })
    return { allowed: true }
  }

  // Verificar limite de requests
  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    // Bloquear IP por excesso de uso
    ipRequestCache.set(ip, { 
      count: record.count + 1, 
      resetTime: now + BLOCK_DURATION, 
      blocked: true 
    })
    
    console.warn(`🚨 [Rate Limit] IP ${ip} bloqueado por excesso de requests`)
    
    return { 
      allowed: false, 
      message: `Limite de ${MAX_REQUESTS_PER_MINUTE} requests por minuto excedido. Bloqueado por 5 minutos.` 
    }
  }

  // Incrementar contador
  record.count++
  return { allowed: true }
}

// Função para detectar padrões suspeitos
function detectSuspiciousPatterns(observacoes: string): boolean {
  const suspicious = [
    /(.)\1{10,}/, // Caracteres repetidos
    /^.{1,3}$/, // Muito curto
    /^(test|teste|a+|1+|spam|hack)$/i, // Palavras suspeitas
    /[\x00-\x1f\x7f-\x9f]/, // Caracteres de controle
  ]

  return suspicious.some(pattern => pattern.test(observacoes))
}

// Função para detectar padrões suspeitos (específica para busca de leis)
function detectBotPatterns(ip: string, timestamps: number[]): number {
  if (timestamps.length < 3) return 0

  let suspicion = 0
  const recentRequests = timestamps.slice(-10) // Últimos 10 requests

  // 1. Detectar intervalos muito regulares (padrão de bot)
  const intervals = recentRequests.slice(1).map((timestamp, i) => 
    timestamp - recentRequests[i]
  )

  if (intervals.length >= 3) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => 
      sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
    
    // Se a variância é muito baixa = padrão muito regular = bot
    if (variance < 80 && avgInterval < 4000) {
      suspicion += 35
      console.warn(`🤖 [Law Search Bot] IP ${ip}: Padrão regular detectado`, { avgInterval, variance })
    }
  }

  // 2. Detectar buscas muito rápidas consecutivas
  const rapidRequests = intervals.filter(interval => interval < BOT_CONFIG.minInterval).length
  if (rapidRequests >= 2) {
    suspicion += 25
    console.warn(`🤖 [Law Search Bot] IP ${ip}: Buscas muito rápidas:`, rapidRequests)
  }

  // 3. Detectar excesso de buscas na janela
  const now = Date.now()
  const recentCount = timestamps.filter(t => now - t < BOT_CONFIG.windowDuration).length
  if (recentCount > BOT_CONFIG.maxRequestsPerWindow) {
    suspicion += 30
    console.warn(`🤖 [Law Search Bot] IP ${ip}: Excesso de buscas:`, recentCount)
  }

  // 4. Detectar buscas com intervalos idênticos
  const identicalIntervals = intervals.filter((interval, index) => 
    intervals.indexOf(interval) !== index
  ).length

  if (identicalIntervals >= 2) {
    suspicion += 40
    console.warn(`🤖 [Law Search Bot] IP ${ip}: Intervalos idênticos detectados:`, identicalIntervals)
  }

  // 5. Detectar rajada de buscas (burst pattern)
  if (timestamps.length >= 5) {
    const last5 = timestamps.slice(-5)
    const timeSpan = last5[4] - last5[0]
    
    if (timeSpan < 10000) { // 5 buscas em menos de 10 segundos
      suspicion += 25
      console.warn(`🤖 [Law Search Bot] IP ${ip}: Rajada de buscas detectada em ${timeSpan}ms`)
    }
  }

  return Math.min(suspicion, 100)
}

// Calcular duração do bloqueio (progressivo, mas mais leve para busca)
function calculateBlockDuration(blockCount: number): number {
  // Bloqueio progressivo: 2min, 4min, 8min, 15min, 30min
  const multipliers = [1, 2, 4, 7.5, 15]
  const multiplier = multipliers[Math.min(blockCount, multipliers.length - 1)]
  return Math.min(BOT_CONFIG.initialBlockDuration * multiplier, BOT_CONFIG.maxBlockDuration)
}

// Middleware de detecção de bot
function checkBotBehavior(ip: string): { blocked: boolean; reason?: string; remainingTime?: number } {
  const now = Date.now()
  let pattern = botDetection.get(ip)

  if (!pattern) {
    pattern = {
      ip,
      timestamps: [],
      isBlocked: false,
      suspicionLevel: 0,
      blockCount: 0
    }
    botDetection.set(ip, pattern)
  }

  // Verificar se ainda está bloqueado
  if (pattern.isBlocked && pattern.blockEndTime && now < pattern.blockEndTime) {
    const remainingTime = pattern.blockEndTime - now
    return { 
      blocked: true, 
      reason: `Muitas buscas detectadas. Aguarde ${Math.ceil(remainingTime / 60000)} minutos.`,
      remainingTime 
    }
  }

  // Se o bloqueio expirou, resetar
  if (pattern.isBlocked && pattern.blockEndTime && now >= pattern.blockEndTime) {
    pattern.isBlocked = false
    pattern.blockEndTime = undefined
    pattern.suspicionLevel = Math.max(0, pattern.suspicionLevel - 25) // Diminuir suspeita
    console.log(`✅ [Law Search Bot] IP ${ip}: Bloqueio expirado, usuário liberado`)
  }

  // Adicionar timestamp atual
  pattern.timestamps.push(now)
  
  // Limpar timestamps antigos (manter apenas últimos 15)
  pattern.timestamps = pattern.timestamps
    .filter(t => now - t < BOT_CONFIG.windowDuration * 3) // Triplo da janela para análise
    .slice(-15)

  // Detectar padrões suspeitos
  const newSuspicion = detectBotPatterns(ip, pattern.timestamps)
  pattern.suspicionLevel = newSuspicion

  // Bloquear se suspeita muito alta
  if (newSuspicion >= BOT_CONFIG.patternThreshold) {
    const blockDuration = calculateBlockDuration(pattern.blockCount)
    pattern.isBlocked = true
    pattern.blockEndTime = now + blockDuration
    pattern.blockCount++
    
    console.warn(`🚨 [Law Search Bot] IP ${ip} bloqueado! Suspeita: ${newSuspicion}% por ${Math.round(blockDuration/60000)}min`)
    
    return { 
      blocked: true, 
      reason: `Padrão de busca automatizada detectado (${newSuspicion}% de confiança). Bloqueado por ${Math.ceil(blockDuration/60000)} minutos.`,
      remainingTime: blockDuration
    }
  }

  // Verificar intervalo mínimo
  if (pattern.timestamps.length >= 2) {
    const lastInterval = pattern.timestamps[pattern.timestamps.length - 1] - pattern.timestamps[pattern.timestamps.length - 2]
    
    if (lastInterval < BOT_CONFIG.minInterval) {
      pattern.suspicionLevel = Math.min(pattern.suspicionLevel + 10, 100)
      
      if (pattern.suspicionLevel >= BOT_CONFIG.patternThreshold) {
        const blockDuration = calculateBlockDuration(pattern.blockCount)
        pattern.isBlocked = true
        pattern.blockEndTime = now + blockDuration
        pattern.blockCount++
        
        console.warn(`🚨 [Law Search Bot] IP ${ip} bloqueado por buscas muito rápidas`)
        return { 
          blocked: true, 
          reason: `Buscas muito rápidas detectadas. Aguarde ${Math.ceil(blockDuration/60000)} minutos.`,
          remainingTime: blockDuration
        }
      }
    }
  }

  return { blocked: false }
}

// Limpeza automática de dados antigos
setInterval(() => {
  const now = Date.now()
  const thirtyMinutes = 30 * 60 * 1000
  
  // Limpar cache antigo
  for (const [key, { timestamp }] of cache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      cache.delete(key)
    }
  }
  
  // Limpar padrões de bot antigos (que não estão bloqueados)
  for (const [ip, pattern] of botDetection.entries()) {
    if (!pattern.isBlocked && pattern.timestamps.length > 0) {
      const lastActivity = Math.max(...pattern.timestamps)
      if (now - lastActivity > thirtyMinutes) {
        botDetection.delete(ip)
      }
    }
  }
}, 3 * 60 * 1000) // A cada 3 minutos

// Detectar padrões suspeitos no conteúdo
function detectSuspiciousContent(text: string): boolean {
  // Detectar spam/teste
  const suspiciousPatterns = [
    /(.)\1{10,}/, // Caracteres repetidos
    /^(test|teste|spam|bot|auto)\s*$/i,
    /^\s*[a-z]\s*$/i, // Apenas uma letra
    /[\x00-\x1F\x7F]/, // Caracteres de controle
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(text))
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 [AI Suggestion] Iniciando busca de leis...')

    // Obter IP do cliente para rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Verificar rate limit
    const rateCheck = checkRateLimit(clientIP)
    if (!rateCheck.allowed) {
      console.warn(`🚨 [AI Suggestion] Rate limit violado para IP: ${clientIP}`)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: rateCheck.message,
          retryAfter: Math.ceil((ipRequestCache.get(clientIP)?.resetTime || Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    // Verificar detecção de bot
    const botCheck = checkBotBehavior(clientIP)
    if (botCheck.blocked) {
      return NextResponse.json(
        { 
          error: 'Bot detectado',
          message: botCheck.reason,
          remainingTime: botCheck.remainingTime,
          suggestions: [] // Retornar array vazio para manter compatibilidade
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validação com Zod
    const validationResult = RequestSchema.safeParse(body)
    if (!validationResult.success) {
      console.warn('❌ [AI Suggestion] Dados inválidos:', validationResult.error.errors)
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validationResult.error.errors.map(err => err.message)
        },
        { status: 400 }
      )
    }

    const { observacoes } = validationResult.data

    // Detectar padrões suspeitos
    if (detectSuspiciousPatterns(observacoes)) {
      console.warn(`🚨 [AI Suggestion] Padrão suspeito detectado: "${observacoes}" do IP: ${clientIP}`)
      return NextResponse.json(
        { 
          error: 'Conteúdo suspeito detectado',
          message: 'Por favor, digite observações válidas sobre leis brasileiras.'
        },
        { status: 400 }
      )
    }

    // Detectar conteúdo suspeito
    if (detectSuspiciousContent(observacoes)) {
      console.warn(`🚨 [Suspicious Content] IP ${clientIP}: "${observacoes}"`)
      return NextResponse.json(
        { error: 'Conteúdo suspeito detectado', suggestions: [] },
        { status: 400 }
      )
    }

    // Verificar cache de resultados
    const cacheKey = observacoes.trim().toLowerCase()
    const cached = resultCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🎯 [AI Suggestion] Resultado encontrado no cache')
      return NextResponse.json({ ...cached.result, cached: true })
    }

    console.log(`📝 [AI Suggestion] Processando: "${observacoes.substring(0, 50)}..."`)

    // Timeout para evitar requests longos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 25000)
    )

    const openaiPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em direito brasileiro. Sua função é analisar observações do usuário e retornar EXCLUSIVAMENTE um JSON válido com leis brasileiras relevantes.

INSTRUÇÕES CRÍTICAS:
1. SEMPRE retorne JSON válido no formato especificado
2. NUNCA inclua explicações ou texto fora do JSON
3. Se não encontrar leis relevantes, retorne array vazio
4. Máximo 5 leis por resposta
5. Foque apenas em leis brasileiras (CLT, Código Civil, CDC, etc.)

FORMATO OBRIGATÓRIO:
{
  "laws": [
    {
      "id": "clt_art_7",
      "title": "CLT - Art. 7º (Direitos dos Trabalhadores)",
      "description": "Estabelece os direitos fundamentais dos trabalhadores urbanos e rurais",
      "category": "trabalhista",
      "relevance": "alta"
    }
  ]
}`
        },
        {
          role: "user",
          content: `Analise esta observação e retorne leis brasileiras relevantes: "${observacoes}"`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    })

    const completion = await Promise.race([openaiPromise, timeoutPromise]) as any

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('Resposta vazia da IA')
    }

    let responseText = completion.choices[0].message.content.trim()
    
    // Limpar resposta
    responseText = responseText
      .replace(/```json|```/g, '')
      .replace(/^json\s*/gi, '')
      .trim()

    // Parse do JSON
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ [AI Suggestion] Erro ao fazer parse do JSON:', parseError)
      console.error('Resposta da IA:', responseText)
      
      return NextResponse.json({
        laws: [],
        message: "Não foram encontradas leis específicas para sua consulta.",
        error: "parse_error"
      })
    }

    // Validar estrutura da resposta
    if (!parsedResponse.laws || !Array.isArray(parsedResponse.laws)) {
      console.warn('❌ [AI Suggestion] Estrutura de resposta inválida')
      return NextResponse.json({
        laws: [],
        message: "Formato de resposta inválido da IA."
      })
    }

    const result = {
      laws: parsedResponse.laws.slice(0, 5), // Limitar a 5 leis
      cached: false,
      processingTime: Date.now() - startTime
    }

    // Salvar no cache
    resultCache.set(cacheKey, { result, timestamp: Date.now() })

    // Limpeza periódica do cache (máximo 100 entradas)
    if (resultCache.size > 100) {
      const entries = Array.from(resultCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, 20).forEach(([key]) => resultCache.delete(key))
    }

    console.log(`✅ [AI Suggestion] ${result.laws.length} leis encontradas em ${result.processingTime}ms`)

    return NextResponse.json(result)

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ [AI Suggestion] Erro completo:', error)

    if (error instanceof Error && error.message === 'Timeout') {
      return NextResponse.json(
        { 
          error: 'Timeout',
          message: 'Busca demorou muito tempo. Tente novamente com termos mais específicos.',
          laws: []
        },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Erro interno',
        message: 'Não foi possível buscar leis. Tente novamente em alguns segundos.',
        laws: [],
        processingTime
      },
      { status: 500 }
    )
  }
} 