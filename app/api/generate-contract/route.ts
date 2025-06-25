import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { OpenAI } from "openai"

/**
 * FUNÇÃO ULTRA-INTELIGENTE para formatar e-mails
 * Detecta e-mails sem @ e adiciona automaticamente
 */
const formatEmail = (text: string): string => {
  if (!text || text.length < 5) return text

  // Se já tem @, retorna como está
  if (text.includes("@")) return text

  // Padrões para detectar e-mails sem @
  const emailPatterns = [
    // Padrão: nome dominio.com.br (com espaço antes do dominio)
    /^([a-zA-Z0-9._%+-]+)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
    // Padrão: nome.sobrenome gmail.com
    /^([a-zA-Z0-9._%+-]+)\s+([a-zA-Z0-9.-]*(?:gmail|hotmail|yahoo|outlook|live|icloud|uol|bol|terra|ig)\.[a-zA-Z]{2,})$/,
    // Padrão: contato empresa.com.br
    /^([a-zA-Z0-9._%+-]+)\s+([a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|mil)(?:\.[a-zA-Z]{2,})?)$/,
  ]

  for (const pattern of emailPatterns) {
    const match = text.match(pattern)
    if (match) {
      const [, username, domain] = match
      // Verifica se o username já não parece um email completo (caso de erro de regex)
      if (username && domain && !username.includes("@")) {
        return `${username}@${domain}`
      }
    }
  }

  // Tentativa mais genérica se as anteriores falharem
  // nome<espaço>dominio.sufixo
  const generalMatch = text.match(/^([\w.-]+)\s+([\w.-]+\.\w+)/)
  if (generalMatch && generalMatch[1] && generalMatch[2] && !generalMatch[1].includes("@")) {
    return `${generalMatch[1]}@${generalMatch[2]}`
  }

  return text // Retorna original se não encontrar padrão claro
}

/**
 * FUNÇÃO ULTRA-INTELIGENTE para formatar telefones
 * Detecta DDD e formata corretamente com parênteses
 */
const formatPhone = (text: string): string => {
  if (!text) return text

  // Remover caracteres não numéricos para análise
  const numbersOnly = text.replace(/[^\d]/g, "")

  // Se não tem números suficientes, retorna como está
  if (numbersOnly.length < 8) return text

  // Padrões de telefone brasileiro
  if (numbersOnly.length === 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return numbersOnly.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  } else if (numbersOnly.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return numbersOnly.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  } else if (numbersOnly.length === 13 && numbersOnly.startsWith("55")) {
    // Com código do país +55: +55 (XX) 9XXXX-XXXX
    const withoutCountry = numbersOnly.substring(2)
    if (withoutCountry.length === 11) {
      return withoutCountry.replace(/(\d{2})(\d{5})(\d{4})/, "+55 ($1) $2-$3")
    } else if (withoutCountry.length === 10) {
      return withoutCountry.replace(/(\d{2})(\d{4})(\d{4})/, "+55 ($1) $2-$3")
    }
  }

  // Tentar detectar padrões no texto original
  const phonePatterns = [
    // Padrão: XX XXXXX-XXXX ou XX XXXX-XXXX
    /(\d{2})\s+(\d{4,5})-?(\d{4})/,
    // Padrão: (XX) XXXXX-XXXX
    /(\d{2})\s*(\d{4,5})-?(\d{4})/,
    // Padrão: +55 XX XXXXX-XXXX
    /\+55\s*(\d{2})\s+(\d{4,5})-?(\d{4})/,
  ]

  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      const [, ddd, prefix, suffix] = match
      if (prefix.length === 5) {
        return `(${ddd}) ${prefix}-${suffix}`
      } else {
        return `(${ddd}) ${prefix}-${suffix}`
      }
    }
  }

  return text
}

/**
 * SISTEMA ULTRA-INTELIGENTE DE EXTRAÇÃO DE ENTIDADES
 * Capaz de diferenciar entre empresa, sócios e contratada principal
 * Identifica papéis específicos e extrai dados completos
 */
const extractCompleteEntities = (text: string): Record<string, any> => {
  const entities: Record<string, any> = {}
  const cleanText = text.replace(/\s+/g, ' ').trim()
  console.log('🔍 Texto para análise:', cleanText)

  // Lista de campos esperados e padrões
  const fields = [
    // Contratante
    { key: 'contratante_nome', patterns: [/contratante[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,100})/i] },
    { key: 'contratante_razao_social', patterns: [/raz[aã]o social[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,100})/i] },
    { key: 'contratante_nome_fantasia', patterns: [/nome fantasia[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,100})/i] },
    { key: 'contratante_cnpj', patterns: [/CNPJ[\s:ºnº]*([0-9.\-\/]{11,20})/i] },
    { key: 'contratante_inscricao_estadual', patterns: [/inscri[cç][aã]o estadual[\s:]*([A-Za-z0-9.\-\/]{3,30})/i] },
    { key: 'contratante_endereco', patterns: [/endere[cç]o[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{10,100})/i] },
    { key: 'contratante_bairro', patterns: [/bairro[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,50})/i] },
    { key: 'contratante_cep', patterns: [/CEP[\s:]*([0-9\-]{8,10})/i] },
    { key: 'contratante_cidade', patterns: [/cidade[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,50})/i] },
    { key: 'contratante_estado', patterns: [/estado[\s:]*([A-Za-zÀ-ú]{2,30})/i, /UF[\s:]*([A-Za-z]{2})/i] },
    { key: 'contratante_pais', patterns: [/pa[ií]s[\s:]*([A-Za-zÀ-ú ]{3,30})/i] },
    { key: 'contratante_email', patterns: [/e[- ]?mail[\s:]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi] },
    { key: 'contratante_telefone', patterns: [/telefone[\s:]*([0-9 ()-]{8,20})/gi, /celular[\s:]*([0-9 ()-]{8,20})/gi] },
    // Contratado
    { key: 'contratado_nome', patterns: [/contratada[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,100})/i, /prestador[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,100})/i] },
    { key: 'contratado_cpf', patterns: [/CPF[\s:]*([0-9.\-\/]{11,20})/i] },
    { key: 'contratado_rg', patterns: [/RG[\s:]*([A-Za-z0-9.-]{5,20})/i] },
    { key: 'contratado_endereco', patterns: [/endere[cç]o[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{10,100})/i] },
    { key: 'contratado_bairro', patterns: [/bairro[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,50})/i] },
    { key: 'contratado_cep', patterns: [/CEP[\s:]*([0-9\-]{8,10})/i] },
    { key: 'contratado_cidade', patterns: [/cidade[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{3,50})/i] },
    { key: 'contratado_estado', patterns: [/estado[\s:]*([A-Za-zÀ-ú]{2,30})/i, /UF[\s:]*([A-Za-z]{2})/i] },
    { key: 'contratado_pais', patterns: [/pa[ií]s[\s:]*([A-Za-zÀ-ú ]{3,30})/i] },
    { key: 'contratado_email', patterns: [/e[- ]?mail[\s:]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi] },
    { key: 'contratado_telefone', patterns: [/telefone[\s:]*([0-9 ()-]{8,20})/gi, /celular[\s:]*([0-9 ()-]{8,20})/gi] },
    { key: 'contratado_nacionalidade', patterns: [/nacionalidade[\s:]*([A-Za-zÀ-ú ]{3,30})/i] },
    { key: 'contratado_profissao', patterns: [/profiss[aã]o[\s:]*([A-Za-zÀ-ú ]{3,30})/i] },
    { key: 'contratado_data_nascimento', patterns: [/nascimento[\s:]*([0-9/\-]{8,12})/i] },
    // Sócios
    { key: 'socios', patterns: [/s[óo]cio[s]?:? ([A-Za-zÀ-ú0-9 .,&'-]{3,100}(?:, [A-Za-zÀ-ú0-9 .,&'-]{3,100})*)/i] },
  ]

  // Extração principal
  fields.forEach(({ key, patterns }) => {
    let found = false
    for (const pattern of patterns) {
      let match
      if (pattern.flags && pattern.flags.includes('g')) {
        // múltiplos (e-mails, telefones, sócios)
        const results = []
        while ((match = pattern.exec(cleanText)) !== null) {
          if (match[1]) results.push(match[1].trim())
        }
        if (results.length > 0) {
          entities[key] = results
          found = true
          console.log(`🟢 Extraído ${key}:`, results)
          break
        }
      } else {
        match = cleanText.match(pattern)
        if (match && match[1]) {
          entities[key] = match[1].trim()
          found = true
          console.log(`🟢 Extraído ${key}:`, entities[key])
          break
        }
      }
    }
    if (!found) {
      entities[key] = '[Não Informado]'
      console.log(`🔴 Não encontrado ${key}`)
    }
  })

  // Fallback: busca por linhas para campos principais
  const lines = text.split(/\n|\r/)
  lines.forEach((line) => {
    fields.forEach(({ key }) => {
      if ((!entities[key] || entities[key] === '[Não Informado]') && /[A-Za-zÀ-ú]/.test(line)) {
        if (key.includes('contratante') && /contratante/i.test(line)) {
          entities[key] = line.replace(/.*contratante[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('contratado') && /contratada|prestador/i.test(line)) {
          entities[key] = line.replace(/.*(contratada|prestador)[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('cnpj') && /CNPJ/i.test(line)) {
          entities[key] = line.replace(/.*CNPJ[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('cpf') && /CPF/i.test(line)) {
          entities[key] = line.replace(/.*CPF[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('rg') && /RG/i.test(line)) {
          entities[key] = line.replace(/.*RG[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('endereco') && /endere[cç]o/i.test(line)) {
          entities[key] = line.replace(/.*endere[cç]o[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('bairro') && /bairro/i.test(line)) {
          entities[key] = line.replace(/.*bairro[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('cep') && /CEP/i.test(line)) {
          entities[key] = line.replace(/.*CEP[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('cidade') && /cidade/i.test(line)) {
          entities[key] = line.replace(/.*cidade[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
        if (key.includes('estado') && (/estado/i.test(line) || /UF/i.test(line))) {
          entities[key] = line.replace(/.*(estado|UF)[\s:ºnº]*/i, '').trim() || '[Não Informado]'
        }
      }
    })
  })

  // Garantir todos os campos esperados
  fields.forEach(({ key }) => {
    if (!entities[key] || (Array.isArray(entities[key]) && entities[key].length === 0)) {
      entities[key] = '[Não Informado]'
    }
  })
  return entities
}

/**
 * Função principal de extração e classificação (substitui a anterior)
 */
const extractAndClassifyEntities = (prompt: string, title: string): Record<string, any> => {
  const combinedText = `${title}. ${prompt}`
  return extractCompleteEntities(combinedText)
}

// Schema de validação de entrada
const GenerateSchema = z.object({
  prompt: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres")
    .max(5000, "Descrição não pode exceder 5.000 caracteres"),
  contractType: z.enum(["simple", "advanced"], {
    errorMap: () => ({ message: "Tipo de contrato deve ser 'simple' ou 'advanced'" }),
  }),
  fields: z.record(z.string(), z.any()).optional().default({}),
  title: z.string().min(1, "Título é obrigatório").max(100, "Título não pode exceder 100 caracteres").optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(8000).optional(),
  customPrompt: z.string().max(1000, "Prompt customizado não pode exceder 1.000 caracteres").optional(),
  lexmlData: z.any().optional(),
  cacheKey: z.string().optional(),
  fieldMetadata: z.any().optional(),
  template: z.string().min(1, "Template é obrigatório").default("classic-professional"),
  // Configurações existentes
  advancedFieldsEnabled: z.boolean().optional().default(false),
  languageStyle: z.string().optional().default("balanced"),
  enhancedLexML: z.boolean().optional().default(false),
  contractRefinements: z
    .object({
      includePerformanceMetrics: z.boolean().optional().default(false),
      includeForceClause: z.boolean().optional().default(false),
      includeArbitrationClause: z.boolean().optional().default(false),
      includeDataProtection: z.boolean().optional().default(false),
      includeIntellectualProperty: z.boolean().optional().default(false),
      includeNonCompete: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  languagePrompt: z.string().optional().default(""),
  // Novas configurações
  sectionToggles: z
    .object({
      contratante: z.boolean().optional().default(true),
      contratado: z.boolean().optional().default(true),
      fiador: z.boolean().optional().default(false),
      testemunhas: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  includeLegalNumbers: z.boolean().optional().default(true),
})

// Interface para conteúdo profissional do contrato
interface ProfessionalContract {
  titulo_contrato: string
  objeto_principal: string
  objeto_detalhado: string
  especificacoes_tecnicas: string[]
  obrigacoes_contratado: string[]
  obrigacoes_contratante: string[]
  condicoes_pagamento: {
    valor_base: string
    forma_pagamento: string
    prazos: string
    multas_atraso: string
  }
  prazo_execucao: {
    inicio: string
    duracao: string
    marcos: string[]
    entrega: string
  }
  clausulas_especiais: {
    titulo: string
    conteudo: string
  }[]
  rescisao: {
    condicoes: string
    penalidades: string
    devolucoes: string
  }
  propriedade_intelectual?: string
  confidencialidade?: string
  garantias: string[]
  disposicoes_legais: {
    lei_aplicavel: string
    foro_competente: string
    alteracoes: string
  }
}

// Função para achatar fieldMetadata
const flattenFieldMetadata = (metadata: any, sectionToggles: any = {}): Record<string, string> => {
  const flattened: Record<string, string> = {}

  if (!metadata || typeof metadata !== "object") {
    return flattened
  }

  if (Object.values(metadata).every((value) => typeof value === "string")) {
    return metadata as Record<string, string>
  }

  Object.entries(metadata).forEach(([sectionName, sectionData]) => {
    const sectionKey = sectionName.toLowerCase()
    const isSectionActive = sectionToggles[sectionKey] !== false

    if (!isSectionActive) {
      return // Pular seção desativada
    }

    if (typeof sectionData === "object" && sectionData !== null) {
      Object.entries(sectionData as Record<string, any>).forEach(([fieldName, fieldValue]) => {
        if (typeof fieldValue === "string" && fieldValue.trim()) {
          const key = `${sectionName.toLowerCase()}_${fieldName.toLowerCase().replace(/\s+/g, "_")}`
          flattened[key] = fieldValue
        }
      })
    }
  })

  return flattened
}

// Função para gerar hash de cache
const generateCacheKey = (prompt: string, contractType: string, fields: Record<string, string>, title?: string) => {
  const content = `${title || ""}-${prompt}-${contractType}-${JSON.stringify(fields)}`
  return Buffer.from(content).toString("base64").substring(0, 32)
}

// Função para buscar referências LexML
const fetchLexMLReferences = async (prompt: string, title?: string, enhanced = false) => {
  try {
    const searchTerms = `${title || ""} ${prompt}`.toLowerCase()
    const keywords = searchTerms
      .split(" ")
      .filter((word) => word.length > 3)
      .slice(0, enhanced ? 10 : 5) // Mais palavras-chave se enhanced

    const allReferences = [
      {
        title: "Lei nº 10.406/2002 - Código Civil Brasileiro",
        article:
          "Art. 421 - A liberdade de contratar será exercida em razão e nos limites da função social do contrato.",
        url: "http://www.lexml.gov.br/urn/urn:lex:br:federal:lei:2002-01-10;10406",
        keywords: ["contrato", "prestação", "serviço", "civil", "obrigação"],
        relevance: "alta",
      },
      {
        title: "Lei nº 13.709/2018 - Lei Geral de Proteção de Dados (LGPD)",
        article:
          "Art. 7º - O tratamento de dados pessoais somente poderá ser realizado mediante consentimento do titular.",
        url: "http://www.lexml.gov.br/urn/urn:lex:br:federal:lei:2018-08-14;13709",
        keywords: ["dados", "pessoais", "proteção", "privacidade", "consentimento", "lgpd"],
        relevance: "alta",
      },
      {
        title: "Lei nº 9.307/1996 - Lei de Arbitragem",
        article:
          "Art. 1º - As pessoas capazes de contratar poderão valer-se da arbitragem para dirimir litígios relativos a direitos patrimoniais disponíveis.",
        url: "http://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1996-09-23;9307",
        keywords: ["arbitragem", "litígio", "resolução", "conflito"],
        relevance: "média",
      },
      {
        title: "Lei nº 9.279/1996 - Lei de Propriedade Industrial",
        article:
          "Art. 2º - A proteção dos direitos relativos à propriedade industrial se efetua mediante concessão de patentes de invenção e de modelo de utilidade.",
        url: "http://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1996-05-14;9279",
        keywords: ["propriedade", "intelectual", "patente", "marca", "industrial"],
        relevance: "média",
      },
      {
        title: "Lei nº 8.078/1990 - Código de Defesa do Consumidor",
        article:
          "Art. 6º - São direitos básicos do consumidor a proteção da vida, saúde e segurança contra os riscos provocados por práticas no fornecimento de produtos e serviços.",
        url: "http://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1990-09-11;8078",
        keywords: ["consumidor", "proteção", "direitos", "fornecimento", "serviços"],
        relevance: "alta",
      },
      {
        title: "Lei nº 13.467/2017 - Reforma Trabalhista",
        article:
          "Art. 442-B - A contratação do autônomo, cumpridas por este todas as formalidades legais, com ou sem exclusividade, de forma contínua ou não, afasta a qualidade de empregado.",
        url: "http://www.lexml.gov.br/urn/urn:lex:br:federal:lei:2017-07-13;13467",
        keywords: ["trabalhista", "autônomo", "contratação", "freelancer", "prestação"],
        relevance: "alta",
      },
    ]

    const relevantReferences = allReferences
      .filter((ref) => ref.keywords.some((keyword) => keywords.includes(keyword)))
      .sort((a, b) => (a.relevance === "alta" ? -1 : 1))
      .slice(0, enhanced ? 8 : 4) // Mais referências se enhanced

    return {
      references: relevantReferences.length > 0 ? relevantReferences : allReferences.slice(0, enhanced ? 5 : 3),
      total: relevantReferences.length,
      enhanced,
    }
  } catch (error) {
    console.warn("Erro ao buscar referências LexML:", error)
    return { references: [], total: 0, enhanced: false }
  }
}

interface SectionToggles {
  contratante?: boolean;
  contratado?: boolean;
  fiador?: boolean;
  testemunhas?: boolean;
  includePerformanceMetrics?: boolean;
  includeForceClause?: boolean;
  includeArbitrationClause?: boolean;
  includeDataProtection?: boolean;
  includeIntellectualProperty?: boolean;
  includeNonCompete?: boolean;
}

// Função principal para gerar contrato profissional
const generateProfessionalContract = async (
  userPrompt: string,
  title: string,
  contractType: "simple" | "advanced",
  customPrompt?: string,
  lexmlReferences?: any[],
  temperature = 0.3,
  maxTokens = 3000,
  languagePrompt = "",
  contractRefinements: SectionToggles = {},
  sectionToggles: SectionToggles = {},
  includeLegalNumbers = true,
): Promise<ProfessionalContract> => {
  const openAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Construir refinamentos baseados nas seleções
  const refinementPrompts = []

  if (contractRefinements.includePerformanceMetrics) {
    refinementPrompts.push("Incluir cláusulas específicas de métricas de performance e indicadores de qualidade.")
  }

  if (contractRefinements.includeForceClause) {
    refinementPrompts.push("Incluir cláusula detalhada de força maior com eventos específicos.")
  }

  if (contractRefinements.includeArbitrationClause) {
    refinementPrompts.push("Incluir cláusula de arbitragem para resolução de conflitos.")
  }

  if (contractRefinements.includeDataProtection) {
    refinementPrompts.push("Incluir cláusulas específicas de proteção de dados conforme LGPD.")
  }

  if (contractRefinements.includeIntellectualProperty) {
    refinementPrompts.push("Incluir cláusulas detalhadas de propriedade intelectual.")
  }

  if (contractRefinements.includeNonCompete) {
    refinementPrompts.push("Incluir cláusula de não concorrência com limitações específicas.")
  }

  const systemPrompt = `Você é um advogado especialista em Direito Brasileiro com 30 anos de experiência em contratos empresariais e direito civil.

MISSÃO: Analisar a solicitação do usuário e criar um contrato profissional COMPLETO, sem usar o texto original do usuário no documento final.

${
  contractType === "advanced"
    ? `
🏛️ MODO AVANÇADO ATIVADO - CONTRATO ULTRA-DETALHADO:
- Gere um contrato EXTREMAMENTE robusto e juridicamente sofisticado
- Cite múltiplas leis específicas com artigos e incisos (ex: "Art. 421 do Código Civil", "Art. 7º da LGPD")
- Inclua fundamentação jurisprudencial quando relevante
- Explore todas as nuances legais das cláusulas com profundidade técnica
- Adicione cláusulas de proteção avançadas e prevenção de litígios
- Use terminologia jurídica precisa e técnica
- Inclua cláusulas de compliance e governança quando aplicável
- O contrato deve ser significativamente mais completo, técnico e juridicamente robusto que um contrato simples
- Mínimo de 15-20 cláusulas detalhadas com subcláusulas específicas
`
    : `
📋 MODO SIMPLES ATIVADO - CONTRATO PROFISSIONAL:
- Gere um contrato profissional bem estruturado mas conciso
- Inclua leis básicas essenciais (Código Civil, CDC quando aplicável)
- Use linguagem jurídica clara mas acessível
- Foque nas cláusulas essenciais sem excessos
- Máximo de 10-12 cláusulas principais
- Mantenha qualidade profissional sem complexidade desnecessária
`
}

CONFIGURAÇÕES DE LINGUAGEM:
${languagePrompt}

CONFIGURAÇÕES DE REFERÊNCIAS LEGAIS:
${
  includeLegalNumbers
    ? "INCLUIR números específicos de leis, artigos e incisos (ex: 'Art. 421 do Código Civil', 'Lei nº 10.406/2002')"
    : "OMITIR números específicos de leis, usar apenas referências genéricas (ex: 'conforme legislação civil vigente')"
}

CONFIGURAÇÕES DE DADOS DAS PARTES:
${Object.entries(sectionToggles)
  .map(
    ([section, active]) =>
      `• ${section.toUpperCase()}: ${active ? "Usar dados específicos fornecidos" : "Extrair do prompt apenas"}`,
  )
  .join("\n")}

${
  refinementPrompts.length > 0
    ? `
REFINAMENTOS SOLICITADOS:
${refinementPrompts.map((r, i) => `${i + 1}. ${r}`).join("\n")}
`
    : ""
}

IMPORTANTE SOBRE PREENCHIMENTO DE DADOS:
- Para seções ATIVADAS: Use os dados específicos fornecidos nos campos
- Para seções DESATIVADAS: Extraia informações apenas do prompt do usuário
- NUNCA deixe campos vazios como [Nome] ou [CPF] no documento final
- Se não houver dados suficientes, use placeholders genéricos sem colchetes

ESTRUTURA OBRIGATÓRIA:
{
  "titulo_contrato": "Título profissional do contrato",
  "objeto_principal": "Descrição jurídica profissional do objeto",
  "objeto_detalhado": "Especificação completa e técnica do objeto",
  "especificacoes_tecnicas": ["Especificação 1", "Especificação 2", "Especificação 3"],
  "obrigacoes_contratado": ["Obrigação profissional 1", "Obrigação profissional 2"],
  "obrigacoes_contratante": ["Obrigação profissional 1", "Obrigação profissional 2"],
  "condicoes_pagamento": {
    "valor_base": "Descrição das condições de valor",
    "forma_pagamento": "Modalidades de pagamento aceitas",
    "prazos": "Cronograma de pagamentos",
    "multas_atraso": "Penalidades por atraso"
  },
  "prazo_execucao": {
    "inicio": "Condições de início",
    "duracao": "Prazo de execução",
    "marcos": ["Marco 1", "Marco 2"],
    "entrega": "Condições de entrega"
  },
  "clausulas_especiais": [
    {
      "titulo": "TÍTULO DA CLÁUSULA ESPECIAL",
      "conteudo": "Conteúdo jurídico da cláusula"
    }
  ],
  "rescisao": {
    "condicoes": "Condições para rescisão",
    "penalidades": "Penalidades aplicáveis",
    "devolucoes": "Condições de devolução"
  },
  "propriedade_intelectual": "Cláusula de PI (se aplicável)",
  "confidencialidade": "Cláusula de confidencialidade (se aplicável)",
  "garantias": ["Garantia 1", "Garantia 2"],
  "disposicoes_legais": {
    "lei_aplicavel": "Leis brasileiras aplicáveis",
    "foro_competente": "Foro competente específico",
    "alteracoes": "Como fazer alterações"
  }
}

DIRETRIZES ESPECÍFICAS:
1. Analise o tipo de serviço e crie conteúdo específico
2. Use terminologia jurídica apropriada
3. Inclua cláusulas relevantes para o setor
4. Considere aspectos legais brasileiros
5. Seja específico e detalhado
6. NÃO repita o texto original do usuário

${
  lexmlReferences && lexmlReferences.length > 0
    ? `
REFERÊNCIAS LEGAIS DISPONÍVEIS:
${lexmlReferences.map((ref, i) => `${i + 1}. ${ref.title} - ${ref.article}`).join("\n")}
`
    : ""
}

${customPrompt ? `INSTRUÇÕES ADICIONAIS: ${customPrompt}` : ""}

RETORNE APENAS O JSON, SEM EXPLICAÇÕES.`

  const userMessage = `SOLICITAÇÃO: ${title}
DESCRIÇÃO: ${userPrompt}
TIPO: ${contractType}

Crie um contrato profissional baseado nesta solicitação.`

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured")
    }

    const model = contractType === "advanced" ? "gpt-4o-mini" : "gpt-3.5-turbo"

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
    }

    const { choices } = await res.json()
    const content = choices[0]?.message?.content || ""

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error("JSON não encontrado na resposta")
    } catch (parseError) {
      console.warn("Erro ao parsear JSON da OpenAI:", parseError)
      throw new Error("Resposta inválida da OpenAI")
    }
  } catch (error) {
    console.warn("Erro na OpenAI, usando conteúdo simulado:", error)

    // Fallback inteligente baseado no tipo de serviço
    return generateIntelligentFallback(userPrompt, title, contractType)
  }
}

// Fallback inteligente que NÃO usa o prompt original
const generateIntelligentFallback = (
  userPrompt: string,
  title: string,
  contractType: "simple" | "advanced",
): ProfessionalContract => {
  const serviceType = userPrompt.toLowerCase()

  // Analisar tipo de serviço e gerar conteúdo específico
  if (serviceType.includes("marketing") || serviceType.includes("publicidade") || serviceType.includes("digital")) {
    return {
      titulo_contrato: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL",
      objeto_principal:
        "Prestação de serviços especializados de marketing digital, incluindo estratégia, planejamento, execução e monitoramento de campanhas publicitárias online.",
      objeto_detalhado:
        "O presente contrato tem por objeto a prestação de serviços de marketing digital, compreendendo o desenvolvimento de estratégias de comunicação digital, criação e gestão de campanhas publicitárias em plataformas online, análise de métricas de performance, otimização de conversões e elaboração de relatórios gerenciais.",
      especificacoes_tecnicas: [
        "Desenvolvimento de estratégia de marketing digital personalizada",
        "Criação e gestão de campanhas em Google Ads e Meta Ads",
        "Produção de conteúdo para redes sociais",
        "Análise de métricas e KPIs de performance",
        "Otimização contínua de campanhas para maximizar ROI",
        "Relatórios mensais detalhados com insights estratégicos",
      ],
      obrigacoes_contratado: [
        "Executar as estratégias de marketing digital conforme planejamento aprovado",
        "Manter comunicação regular sobre o andamento das campanhas",
        "Fornecer relatórios mensais detalhados de performance",
        "Otimizar campanhas continuamente para melhor performance",
        "Manter sigilo sobre informações estratégicas do contratante",
        "Cumprir prazos estabelecidos no cronograma de atividades",
      ],
      obrigacoes_contratante: [
        "Fornecer acesso às plataformas e ferramentas necessárias",
        "Disponibilizar materiais e informações sobre produtos/serviços",
        "Efetuar pagamentos nas datas acordadas",
        "Aprovar estratégias e campanhas nos prazos estabelecidos",
        "Comunicar alterações estratégicas com antecedência mínima de 48 horas",
      ],
      condicoes_pagamento: {
        valor_base:
          "O valor dos serviços será estabelecido conforme proposta comercial anexa, considerando o escopo de trabalho e investimento em mídia paga.",
        forma_pagamento:
          "Pagamento através de PIX, transferência bancária, cartão de crédito ou boleto bancário, conforme preferência do contratante.",
        prazos:
          "Pagamento mensal até o dia 10 de cada mês, mediante apresentação de nota fiscal e relatório de atividades.",
        multas_atraso: "Multa de 2% sobre o valor em atraso, acrescida de juros de 1% ao mês.",
      },
      prazo_execucao: {
        inicio: "Os serviços iniciam-se na data de assinatura do contrato e aprovação da estratégia inicial.",
        duracao: "Contrato com vigência de 12 meses, renovável automaticamente por períodos iguais.",
        marcos: [
          "Entrega da estratégia inicial em até 7 dias úteis",
          "Lançamento das primeiras campanhas em até 15 dias úteis",
          "Primeiro relatório de performance em 30 dias",
        ],
        entrega: "Relatórios mensais entregues até o dia 5 de cada mês subsequente.",
      },
      clausulas_especiais: [
        {
          titulo: "DA PROPRIEDADE INTELECTUAL",
          conteudo:
            "Todas as estratégias, campanhas e materiais criados especificamente para o contratante serão de sua propriedade exclusiva após o pagamento integral dos serviços.",
        },
        {
          titulo: "DAS METAS E INDICADORES",
          conteudo:
            "As metas de performance serão estabelecidas em comum acordo, considerando o histórico do negócio e objetivos estratégicos do contratante.",
        },
      ],
      rescisao: {
        condicoes:
          "Qualquer das partes poderá rescindir o contrato mediante comunicação escrita com antecedência mínima de 30 dias.",
        penalidades: "Em caso de rescisão sem justa causa, aplicar-se-á multa equivalente a 20% do valor mensal.",
        devolucoes: "Valores pagos antecipadamente serão devolvidos proporcionalmente aos serviços não prestados.",
      },
      propriedade_intelectual:
        "Os materiais criados especificamente para o contratante serão de sua propriedade exclusiva, enquanto metodologias e conhecimentos técnicos permanecem com o contratado.",
      confidencialidade:
        "Todas as informações estratégicas, dados de performance e informações comerciais serão tratadas com absoluto sigilo e confidencialidade.",
      garantias: [
        "Garantia de execução dos serviços conforme especificações técnicas",
        "Garantia de confidencialidade de informações estratégicas",
        "Garantia de entrega de relatórios nos prazos estabelecidos",
      ],
      disposicoes_legais: {
        lei_aplicavel:
          "Este contrato é regido pelas leis brasileiras, especialmente o Código Civil e o Código de Defesa do Consumidor.",
        foro_competente: "Fica eleito o foro da comarca de São Paulo/SP para dirimir questões oriundas deste contrato.",
        alteracoes: "Alterações devem ser formalizadas por escrito e assinadas por ambas as partes.",
      },
    }
  }

  // Fallback genérico para outros tipos de serviço
  return {
    titulo_contrato: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS",
    objeto_principal:
      "Prestação de serviços profissionais especializados conforme especificações técnicas e cronograma estabelecidos.",
    objeto_detalhado:
      "O presente contrato tem por objeto a prestação de serviços profissionais especializados, incluindo planejamento, execução e entrega conforme padrões de qualidade estabelecidos.",
    especificacoes_tecnicas: [
      "Execução dos serviços conforme especificações técnicas",
      "Cumprimento de prazos e cronogramas estabelecidos",
      "Aplicação de metodologias e boas práticas profissionais",
      "Entrega de relatórios e documentação necessária",
    ],
    obrigacoes_contratado: [
      "Executar os serviços com qualidade e profissionalismo",
      "Cumprir prazos estabelecidos no cronograma",
      "Manter comunicação regular sobre o progresso",
      "Entregar resultados conforme especificações acordadas",
    ],
    obrigacoes_contratante: [
      "Fornecer informações e recursos necessários",
      "Efetuar pagamentos nas datas acordadas",
      "Comunicar alterações com antecedência adequada",
      "Colaborar para o bom andamento dos serviços",
    ],
    condicoes_pagamento: {
      valor_base: "Valor conforme proposta comercial anexa ao presente contrato.",
      forma_pagamento: "Pagamento via PIX, transferência bancária ou boleto bancário.",
      prazos: "Pagamentos conforme cronograma estabelecido na proposta comercial.",
      multas_atraso: "Multa de 2% sobre valor em atraso, acrescida de juros de 1% ao mês.",
    },
    prazo_execucao: {
      inicio: "Início dos serviços na data de assinatura do contrato.",
      duracao: "Prazo conforme cronograma específico do projeto.",
      marcos: ["Marcos conforme cronograma detalhado em anexo"],
      entrega: "Entrega conforme especificações e prazos acordados.",
    },
    clausulas_especiais: [
      {
        titulo: "DA QUALIDADE DOS SERVIÇOS",
        conteudo:
          "Os serviços serão executados seguindo as melhores práticas profissionais e padrões de qualidade do mercado.",
      },
    ],
    rescisao: {
      condicoes: "Rescisão mediante aviso prévio de 30 dias ou por descumprimento contratual.",
      penalidades: "Multa de 20% do valor mensal em caso de rescisão sem justa causa.",
      devolucoes: "Devolução proporcional de valores pagos antecipadamente.",
    },
    garantias: [
      "Garantia de execução conforme especificações",
      "Garantia de cumprimento de prazos estabelecidos",
      "Garantia de qualidade dos serviços prestados",
    ],
    disposicoes_legais: {
      lei_aplicavel: "Regido pelas leis brasileiras, especialmente o Código Civil.",
      foro_competente: "Foro da comarca onde foi assinado o contrato.",
      alteracoes: "Alterações devem ser formalizadas por escrito entre as partes.",
    },
  }
}

// Substituir a função generateClassicTemplate completamente por esta versão que segue o modelo exato:

const generateClassicTemplate = (
  title: string,
  contract: ProfessionalContract,
  allFields: Record<string, any>,
  lexmlReferences: any[],
  subscription?: any,
  advancedFieldsEnabled = false,
  sectionToggles: any = {},
) => {
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  // Extrair dados automaticamente dos campos ou usar valores padrão
  const contratanteNome = allFields.contratante_nome || "EMPRESA CONTRATANTE LTDA"
  const contratanteCnpj = allFields.contratante_cnpj || "00.000.000/0001-00"
  const contratanteEndereco = allFields.contratante_endereco || "Rua Exemplo, 123, Centro, São Paulo/SP"
  const contratanteTelefone = allFields.contratante_telefone || "(11) 9999-9999"
  const contratanteEmail = allFields.contratante_email || "contato@empresa.com.br"

  const contratadoNome = allFields.contratado_nome || "PRESTADOR DE SERVIÇOS"
  const contratadoCpf = allFields.contratado_cpf || "000.000.000-00"
  const contratadoEndereco = allFields.contratado_endereco || "Rua do Prestador, 456, Bairro, São Paulo/SP"
  const contratadoTelefone = allFields.contratado_telefone || "(11) 8888-8888"
  const contratadoEmail = allFields.contratado_email || "prestador@email.com"

  // Processar serviços das especificações técnicas
  const servicos = Array.isArray(contract.especificacoes_tecnicas) ? contract.especificacoes_tecnicas : []
  const servico1 = servicos[0] || "Desenvolvimento de estratégia personalizada"
  const servico2 = servicos[1] || "Execução e acompanhamento dos trabalhos"

  // Gerar valores automáticos
  const valorTotal = "R$ 5.000,00"
  const percentualEntrada = "50%"
  const percentualFinal = "50%"
  const chavePix = contratadoEmail
  const prazoEntrega = "30 (trinta) dias"
  const cidade = allFields.contratante_cidade || "São Paulo"

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato de Prestação de Serviço</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
        }
        
        .contract-title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin: 0 0 30px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .parties-section {
            display: table;
            width: 100%;
            margin: 20px 0;
        }
        
        .party-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 20px;
        }
        
        .party-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .party-field {
            margin-bottom: 8px;
            font-size: 11pt;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            margin: 25px 0 10px 0;
            text-transform: uppercase;
        }
        
        .section-content {
            margin-bottom: 15px;
            text-align: justify;
            font-size: 11pt;
            line-height: 1.4;
        }
        
        .service-item {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .signatures-section {
            margin-top: 50px;
            text-align: center;
        }
        
        .signature-box {
            display: inline-block;
            width: 45%;
            margin: 20px 2.5%;
            text-align: center;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin: 40px 0 10px 0;
            padding-top: 8px;
            font-size: 11pt;
        }
        
        @media print {
            body { margin: 0; }
            .contract-container { 
                box-shadow: none; 
                margin: 0;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇO</h1>
        
        <div class="parties-section">
            <div class="party-column">
                <div class="party-title">CONTRATANTE:</div>
                <div class="party-field"><strong>Nome:</strong> ${contratanteNome}</div>
                <div class="party-field"><strong>E-mail:</strong> ${contratanteEmail}</div>
                <div class="party-field"><strong>Endereço:</strong> ${contratanteEndereco}</div>
                <div class="party-field"><strong>CPF/CNPJ:</strong> ${contratanteCnpj}</div>
                <div class="party-field"><strong>Telefone:</strong> ${contratanteTelefone}</div>
            </div>
            
            <div class="party-column">
                <div class="party-title">CONTRATADO:</div>
                <div class="party-field"><strong>Nome:</strong> ${contratadoNome}</div>
                <div class="party-field"><strong>E-mail:</strong> ${contratadoEmail}</div>
                <div class="party-field"><strong>Endereço:</strong> ${contratadoEndereco}</div>
                <div class="party-field"><strong>CPF/CNPJ:</strong> ${contratadoCpf}</div>
                <div class="party-field"><strong>Telefone:</strong> ${contratadoTelefone}</div>
            </div>
        </div>

        <div class="section-title">1. OBJETO DO CONTRATO:</div>
        <div class="section-content">
            O presente contrato tem como objeto a prestação dos seguintes serviços pela CONTRATADA à CONTRATANTE:
            
            <div class="service-item">1. <strong>${servico1}</strong></div>
            <div class="service-item">2. ${contract.objeto_detalhado}</div>
            
            ${servicos.length > 1 ? `<div class="service-item">3. <strong>${servico2}</strong></div>` : ""}
            ${servicos.length > 2 ? `<div class="service-item">4. ${servicos[2]}</div>` : ""}
        </div>

        <div class="section-title">2. VALOR DO CONTRATO:</div>
        <div class="section-content">
            O valor total dos serviços será de <strong>${valorTotal}</strong>, a ser pago da seguinte forma:<br><br>
            
            <strong>${percentualEntrada}</strong> na assinatura deste contrato, como entrada.<br>
            <strong>${percentualFinal}</strong> ao final da entrega dos serviços.<br><br>
            
            O pagamento poderá ser realizado via <strong>PIX, transferência bancária, boleto</strong>, utilizando os seguintes dados:<br><br>
            
            <strong>Chave PIX:</strong> ${chavePix}<br>
            <strong>Banco:</strong> Conforme dados fornecidos pela CONTRATADA
        </div>

        <div class="section-title">3. PRAZO DE ENTREGA:</div>
        <div class="section-content">
            O prazo final para a entrega dos serviços será até <strong>${prazoEntrega}</strong>, condicionado à prestação de todas as informações e materiais necessários por parte da CONTRATANTE.<br><br>
            
            Caso ocorra atraso na devolução de informações ou no fornecimento de materiais essenciais, o prazo de entrega poderá ser ajustado.
        </div>

        <div class="section-title">4. RESPONSABILIDADES DAS PARTES:</div>
        <div class="section-content">
            <strong>CONTRATANTE:</strong> Compromete-se a fornecer todas as informações e materiais necessários para a execução dos serviços no prazo acordado e a efetuar os pagamentos conforme estipulado neste contrato.<br><br>
            
            <strong>CONTRATADA:</strong> Compromete-se a prestar os serviços conforme descrito, dentro do prazo e com a qualidade técnica adequada, respeitando as especificações acordadas.
        </div>

        <div class="section-title">5. ALTERAÇÕES E ADITIVOS:</div>
        <div class="section-content">
            Qualquer modificação no escopo dos serviços ou no valor do contrato deverá ser formalizada através de um aditivo contratual assinado por ambas as partes.
        </div>

        <div class="section-title">6. RESCISÃO:</div>
        <div class="section-content">
            O presente contrato poderá ser rescindido por qualquer uma das partes mediante notificação prévia por escrito de <strong>10 (dez) dias</strong>. Em caso de rescisão, os valores pagos pela CONTRATANTE serão devolvidos proporcionalmente aos serviços já realizados pela CONTRATADA.<br><br>
            
            Em caso de descumprimento das cláusulas deste contrato, a parte prejudicada poderá rescindir o contrato sem prejuízo de cobrar por eventuais danos e perdas.
        </div>

        <div class="section-title">7. DISPOSIÇÕES GERAIS:</div>
        <div class="section-content">
            As partes concordam em agir de boa-fé durante toda a vigência deste contrato.
        </div>

        <div class="signatures-section">
            <p><strong>${cidade}</strong>, <strong>${currentDate}</strong></p>
            
            <div class="signature-box">
                <div class="signature-line">
                    <strong>${contratanteNome}</strong><br>
                    CONTRATANTE
                </div>
            </div>
            
            <div class="signature-box">
                <div class="signature-line">
                    <strong>${contratadoNome}</strong><br>
                    CONTRATADO
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
}

// Função principal para lidar com a rota
export const POST = async (req: NextRequest) => {
  console.log("🚀 [API /generate-contract] Iniciando geração de contrato.");

  try {
    const body = await req.json()
    console.log("📦 [API /generate-contract] Body recebido:", JSON.stringify(body, null, 2));
    
    const parsed = GenerateSchema.safeParse(body)

    if (!parsed.success) {
      console.error("[API /generate-contract] Erro de validação:", parsed.error)
      return NextResponse.json(
        { error: "Dados de entrada inválidos: " + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const {
      title,
      prompt: userPrompt,
      contractType,
      fields,
      temperature,
      maxTokens,
      customPrompt,
      lexmlData,
      cacheKey,
      fieldMetadata,
      template,
      advancedFieldsEnabled,
      languageStyle,
      enhancedLexML,
      contractRefinements,
      languagePrompt,
      sectionToggles,
      includeLegalNumbers,
    } = parsed.data

    // Validações básicas
    if (!title || title.trim().length === 0) {
      console.error("[API /generate-contract] Título é obrigatório.")
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
    }

    if (!userPrompt || userPrompt.trim().length === 0) {
      console.error("[API /generate-contract] Descrição é obrigatória.")
      return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 })
    }
    if (!template || template.trim().length === 0) {
      console.error("[API /generate-contract] Template é obrigatório.")
      return NextResponse.json({ error: "Template é obrigatório" }, { status: 400 })
    }

    try {
      // Extração ultra-agressiva dos dados das partes ANTES de enviar para a IA
      const extractedFieldsPrompt = extractCompleteEntities(title + '\n' + userPrompt);
      const flattenedFields = flattenFieldMetadata(fieldMetadata, sectionToggles)
      const lexmlReferences = await fetchLexMLReferences(userPrompt, title, enhancedLexML)

      console.log("🧠 [API /generate-contract] Chamando generateProfessionalContract...");
      const partesPrompt = `CONTRATANTE: ${extractedFieldsPrompt.contratante_nome || '[Não Informado]'}, CNPJ: ${extractedFieldsPrompt.contratante_cnpj || '[Não Informado]'}, Endereço: ${extractedFieldsPrompt.contratante_endereco || '[Não Informado]'}; CONTRATADA: ${extractedFieldsPrompt.contratado_nome || '[Não Informado]'}, CPF: ${extractedFieldsPrompt.contratado_cpf || '[Não Informado]'}, Endereço: ${extractedFieldsPrompt.contratado_endereco || '[Não Informado]'};`;
      const userPromptForIA = `${partesPrompt}\n${userPrompt}`;
      const contract = await generateProfessionalContract(
        userPromptForIA,
        title,
        contractType,
        customPrompt,
        lexmlReferences.references,
        temperature,
        maxTokens,
        languagePrompt,
        contractRefinements,
        sectionToggles,
        includeLegalNumbers,
      )

      console.log("✅ [API /generate-contract] Contrato profissional gerado:", JSON.stringify(contract, null, 2));

      if (!contract || Object.keys(contract).length === 0) {
        console.error("❌ [API /generate-contract] Erro: generateProfessionalContract retornou um objeto vazio ou nulo.");
        throw new Error("A IA não conseguiu estruturar o contrato. Tente refinar seu prompt.");
      }
      
      let finalContractContent = ""
      if (template === "classic" || template === "classic-professional") {
        finalContractContent = generateClassicTemplate(
          title,
          contract,
          flattenedFields,
          lexmlReferences.references,
          undefined,
          advancedFieldsEnabled,
          sectionToggles,
        )
      } else {
        // Fallback para outros templates
        finalContractContent = generateClassicTemplate(
          title,
          contract,
          flattenedFields,
          lexmlReferences.references,
          undefined,
          advancedFieldsEnabled,
          sectionToggles,
        )
      }

      // Extração dupla: do prompt do usuário e do contrato gerado
      const extractedFieldsContract = extractCompleteEntities(finalContractContent)
      // Extração global em todo o texto do contrato gerado (frases longas)
      const globalRegexFields = {
        contratante_nome: /empresa\s+([A-Za-zÀ-ú0-9 .,&'-]{3,100})\s+(?:LTDA|Ltda|S\.A\.|EIRELI|ME|EPP|Tecnologia|Servi[cç]os|Digital|Ag[êe]ncia|[A-Za-zÀ-ú0-9 .,&'-]{3,100})?/i,
        contratante_cnpj: /CNPJ[\s:ºnº]*([0-9.\-\/]{11,20})/i,
        contratante_endereco: /(?:sede|localizada|situada|endereço)[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{10,100})/i,
        contratado_nome: /empregado\s+([A-Za-zÀ-ú0-9 .,&'-]{3,100})/i,
        contratado_cpf: /CPF[\s:ºnº]*([0-9.\-\/]{11,20})/i,
        contratado_endereco: /residente[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{10,100})/i,
      }
      const globalExtracted: Record<string, string> = {}
      Object.entries(globalRegexFields).forEach(([key, regex]) => {
        const match = finalContractContent.match(regex)
        if (match && match[1]) {
          globalExtracted[key] = match[1].trim()
          console.log(`🟢 [GLOBAL] Extraído ${key}:`, globalExtracted[key])
        }
      })
      // Merge inteligente: prioriza dados do contrato gerado, depois extração global, depois do prompt, depois do form
      const mergedFields = { ...flattenedFields, ...extractedFieldsPrompt, ...extractedFieldsContract, ...globalExtracted }
      console.log("🔍 [API /generate-contract] Campos finais para o template (merge+global):", JSON.stringify(mergedFields, null, 2));
      // Gerar novamente o contrato, agora com os campos finais
      let contractContentFinal = ""
      if (template === "classic" || template === "classic-professional") {
        contractContentFinal = generateClassicTemplate(
          title,
          contract,
          mergedFields,
          lexmlReferences.references,
          undefined,
          advancedFieldsEnabled,
          sectionToggles,
        )
      } else {
        contractContentFinal = generateClassicTemplate(
          title,
          contract,
          mergedFields,
          lexmlReferences.references,
          undefined,
          advancedFieldsEnabled,
          sectionToggles,
        )
      }

      // Verificar se o conteúdo foi gerado
      if (!contractContentFinal || contractContentFinal.trim().length === 0) {
        return NextResponse.json({ error: "Falha ao gerar o conteúdo do contrato" }, { status: 500 })
      }

      const responsePayload = {
        content: contractContentFinal,
        contract,
        allFields: mergedFields,
        lexmlReferences,
        cacheKey: cacheKey,
        template, // <-- garantir que o template está presente no payload
      }
      
      console.log("📤 [API /generate-contract] Enviando resposta para o cliente.");
      return NextResponse.json(responsePayload)

    } catch (error) {
      console.error("❌ [API /generate-contract] ERRO CRÍTICO NA API:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido."
      return NextResponse.json({ error: "Falha na geração do contrato", details: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [API /generate-contract] ERRO CRÍTICO NA API:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido."
    return NextResponse.json({ error: "Falha na geração do contrato", details: errorMessage }, { status: 500 })
  }
}
