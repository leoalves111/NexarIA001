/**
 * Sistema de Cache e Performance Otimizado para NEXAR IA
 * Substitui caches simples em memória por sistema mais robusto
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expires: number
  hits: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

export class PerformanceCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number
  private defaultTTL: number
  private stats = { hits: 0, misses: 0 }

  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutos padrão
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  /**
   * Armazenar item no cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expires = now + (ttl || this.defaultTTL)

    // Limpar cache se exceder tamanho máximo
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expires,
      hits: 0
    })
  }

  /**
   * Recuperar item do cache
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

    // Incrementar hits
    entry.hits++
    this.stats.hits++
    return entry.data
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
   * Limpar cache expirado
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
    
    return cleaned
  }

  /**
   * Remover item mais antigo
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    const { hits, misses } = this.stats
    const total = hits + misses
    
    return {
      hits,
      misses,
      size: this.cache.size,
      hitRate: total > 0 ? (hits / total) * 100 : 0
    }
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
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 32)
  }
}

/**
 * Cache global para contratos
 */
export const contractCache = new PerformanceCache(500, 600000) // 10 minutos

/**
 * Cache global para sugestões de IA
 */
export const suggestionCache = new PerformanceCache(300, 300000) // 5 minutos

/**
 * Cache global para validações
 */
export const validationCache = new PerformanceCache(200, 1800000) // 30 minutos

/**
 * Rate limiter melhorado
 */
interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

export class AdvancedRateLimiter {
  private requests = new Map<string, RateLimitEntry>()
  private maxRequests: number
  private windowMs: number
  private blockDurationMs: number

  constructor(maxRequests = 10, windowMs = 60000, blockDurationMs = 300000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.blockDurationMs = blockDurationMs
  }

  /**
   * Verificar se request é permitido
   */
  checkLimit(identifier: string): { allowed: boolean; remaining: number; message?: string } {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
        blocked: false
      })
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    // Verificar se está bloqueado
    if (entry.blocked && now < entry.resetTime) {
      return {
        allowed: false,
        remaining: 0,
        message: `Bloqueado até ${new Date(entry.resetTime).toLocaleTimeString()}`
      }
    }

    // Reset se passou da janela de tempo
    if (now > entry.resetTime) {
      entry.count = 1
      entry.resetTime = now + this.windowMs
      entry.blocked = false
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    // Verificar limite
    if (entry.count >= this.maxRequests) {
      entry.blocked = true
      entry.resetTime = now + this.blockDurationMs
      return {
        allowed: false,
        remaining: 0,
        message: `Limite excedido. Bloqueado por ${this.blockDurationMs / 60000} minutos.`
      }
    }

    entry.count++
    return { allowed: true, remaining: this.maxRequests - entry.count }
  }

  /**
   * Limpeza automática
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime && !entry.blocked) {
        this.requests.delete(key)
      }
    }
  }
}

/**
 * Rate limiter global
 */
export const apiRateLimiter = new AdvancedRateLimiter(15, 60000, 300000)

/**
 * Utilitários de performance
 */
export const PerformanceUtils = {
  /**
   * Medir tempo de execução
   */
  timeExecution: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  },

  /**
   * Debounce para prevenir chamadas excessivas
   */
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout
    return ((...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }) as T
  },

  /**
   * Throttle para limitar frequência
   */
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean
    return ((...args: any[]) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }) as T
  },

  /**
   * Retry com backoff exponencial
   */
  retryWithBackoff: async <T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> => {
    let lastError: Error
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (i === maxRetries) {
          throw lastError
        }
        
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }
}

/**
 * Limpeza automática a cada 5 minutos (apenas no cliente)
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    contractCache.cleanup()
    suggestionCache.cleanup()
    validationCache.cleanup()
    apiRateLimiter.cleanup()
  }, 5 * 60 * 1000)
}
