/**
 * Sistema de Cache e Performance Otimizado - VERSÃO CORRIGIDA
 * Corrige memory leaks e race conditions
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expires: number
  hits: number
  size: number // Adicionar controle de tamanho
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
  memoryUsage: number // Adicionar monitoramento de memória
}

export class PerformanceCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number
  private maxMemoryMB: number // CORREÇÃO: Limite de memória
  private defaultTTL: number
  private stats = { hits: 0, misses: 0 }
  private cleanupInterval: NodeJS.Timeout | null = null // CORREÇÃO: Controle do interval

  constructor(maxSize = 1000, defaultTTL = 300000, maxMemoryMB = 50) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    this.maxMemoryMB = maxMemoryMB

    // CORREÇÃO: Cleanup automático controlado
    this.startCleanupInterval()
  }

  /**
   * CORREÇÃO: Controle de memória
   */
  private calculateEntrySize(data: T): number {
    try {
      return JSON.stringify(data).length * 2 // Aproximação em bytes
    } catch {
      return 1000 // Fallback
    }
  }

  /**
   * CORREÇÃO: Verificar uso de memória
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += entry.size
    }
    return totalSize / (1024 * 1024) // MB
  }

  /**
   * CORREÇÃO: Eviction baseada em memória e LRU
   */
  private evictIfNeeded(): void {
    // Evict por tamanho
    while (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    // Evict por memória
    while (this.getCurrentMemoryUsage() > this.maxMemoryMB) {
      this.evictLRU()
      if (this.cache.size === 0) break
    }
  }

  /**
   * CORREÇÃO: LRU eviction melhorado
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruTime = Date.now()
    let lruHits = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache.entries()) {
      // Priorizar por último acesso e menor número de hits
      if (entry.timestamp < lruTime || (entry.timestamp === lruTime && entry.hits < lruHits)) {
        lruTime = entry.timestamp
        lruHits = entry.hits
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Armazenar item no cache - VERSÃO CORRIGIDA
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expires = now + (ttl || this.defaultTTL)
    const size = this.calculateEntrySize(data)

    // CORREÇÃO: Verificar se entrada é muito grande
    if (size > this.maxMemoryMB * 1024 * 1024 * 0.1) {
      // Máximo 10% da memória total
      console.warn(`Cache entry too large: ${size} bytes`)
      return
    }

    // CORREÇÃO: Eviction antes de adicionar
    this.evictIfNeeded()

    this.cache.set(key, {
      data,
      timestamp: now,
      expires,
      hits: 0,
      size,
    })
  }

  /**
   * Recuperar item do cache - VERSÃO CORRIGIDA
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Verificar se expirou
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // CORREÇÃO: Atualizar timestamp para LRU
    entry.hits++
    entry.timestamp = Date.now()
    this.stats.hits++
    return entry.data
  }

  /**
   * CORREÇÃO: Cleanup interval controlado
   */
  private startCleanupInterval(): void {
    if (typeof window === "undefined") return // Apenas no servidor

    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000,
    ) // 5 minutos
  }

  /**
   * CORREÇÃO: Parar cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }

  /**
   * Limpar cache expirado - VERSÃO MELHORADA
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
        cleaned++
      }
    }

    // CORREÇÃO: Eviction adicional se necessário
    this.evictIfNeeded()

    return cleaned
  }

  /**
   * Obter estatísticas do cache - VERSÃO MELHORADA
   */
  getStats(): CacheStats {
    const { hits, misses } = this.stats
    const total = hits + misses

    return {
      hits,
      misses,
      size: this.cache.size,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      memoryUsage: this.getCurrentMemoryUsage(),
    }
  }

  /**
   * Verificar se chave existe e não expirou
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)

    if (!entry) return false

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Remover item do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Obter chave para cache baseada em objeto
   */
  static generateKey(obj: any): string {
    try {
      return Buffer.from(JSON.stringify(obj)).toString("base64").slice(0, 32)
    } catch {
      return Math.random().toString(36).substring(2, 15)
    }
  }
}

/**
 * CORREÇÃO: Rate limiter com cleanup automático
 */
interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  violations: number // CORREÇÃO: Contar violações
}

export class AdvancedRateLimiter {
  private requests = new Map<string, RateLimitEntry>()
  private maxRequests: number
  private windowMs: number
  private blockDurationMs: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(maxRequests = 10, windowMs = 60000, blockDurationMs = 300000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.blockDurationMs = blockDurationMs

    // CORREÇÃO: Cleanup automático
    this.startCleanupInterval()
  }

  /**
   * CORREÇÃO: Cleanup interval controlado
   */
  private startCleanupInterval(): void {
    if (typeof window === "undefined") return

    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      2 * 60 * 1000,
    ) // 2 minutos
  }

  /**
   * Verificar se request é permitido - VERSÃO CORRIGIDA
   */
  checkLimit(identifier: string): { allowed: boolean; remaining: number; message?: string } {
    const now = Date.now()
    let entry = this.requests.get(identifier)

    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + this.windowMs,
        blocked: false,
        violations: 0,
      }
      this.requests.set(identifier, entry)
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    // Verificar se está bloqueado
    if (entry.blocked && now < entry.resetTime) {
      return {
        allowed: false,
        remaining: 0,
        message: `Bloqueado até ${new Date(entry.resetTime).toLocaleTimeString()}`,
      }
    }

    // Reset se passou da janela de tempo
    if (now > entry.resetTime) {
      entry.count = 1
      entry.resetTime = now + this.windowMs
      entry.blocked = false
      // CORREÇÃO: Não resetar violações imediatamente
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    // Verificar limite
    if (entry.count >= this.maxRequests) {
      entry.blocked = true
      entry.violations++

      // CORREÇÃO: Bloqueio progressivo baseado em violações
      const multiplier = Math.min(entry.violations, 5)
      entry.resetTime = now + this.blockDurationMs * multiplier

      return {
        allowed: false,
        remaining: 0,
        message: `Limite excedido. Bloqueado por ${(this.blockDurationMs * multiplier) / 60000} minutos.`,
      }
    }

    entry.count++
    return { allowed: true, remaining: this.maxRequests - entry.count }
  }

  /**
   * Limpeza automática - VERSÃO MELHORADA
   */
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.requests.entries()) {
      // CORREÇÃO: Limpar entradas antigas e não bloqueadas
      if (now > entry.resetTime && !entry.blocked) {
        this.requests.delete(key)
        cleaned++
      }
      // CORREÇÃO: Limpar violações antigas
      else if (now > entry.resetTime + 24 * 60 * 60 * 1000) {
        // 24 horas
        entry.violations = Math.max(0, entry.violations - 1)
      }
    }

    console.log(`Rate limiter cleanup: ${cleaned} entries removed`)
  }

  /**
   * CORREÇÃO: Destruir rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.requests.clear()
  }
}

/**
 * CORREÇÃO: Instâncias globais com controle de lifecycle
 */
export const contractCache = new PerformanceCache(500, 600000, 100) // 100MB max
export const suggestionCache = new PerformanceCache(300, 300000, 50) // 50MB max
export const validationCache = new PerformanceCache(200, 1800000, 25) // 25MB max
export const apiRateLimiter = new AdvancedRateLimiter(15, 60000, 300000)

/**
 * CORREÇÃO: Cleanup global controlado
 */
let globalCleanupInterval: NodeJS.Timeout | null = null

export const initializeGlobalCleanup = () => {
  if (typeof window !== "undefined" && !globalCleanupInterval) {
    globalCleanupInterval = setInterval(
      () => {
        contractCache.cleanup()
        suggestionCache.cleanup()
        validationCache.cleanup()
        apiRateLimiter.cleanup()
      },
      5 * 60 * 1000,
    )
  }
}

export const destroyGlobalCleanup = () => {
  if (globalCleanupInterval) {
    clearInterval(globalCleanupInterval)
    globalCleanupInterval = null
  }

  contractCache.destroy()
  suggestionCache.destroy()
  validationCache.destroy()
  apiRateLimiter.destroy()
}

// CORREÇÃO: Auto-inicializar apenas no cliente
if (typeof window !== "undefined") {
  initializeGlobalCleanup()

  // CORREÇÃO: Cleanup na saída da página
  window.addEventListener("beforeunload", destroyGlobalCleanup)
}
