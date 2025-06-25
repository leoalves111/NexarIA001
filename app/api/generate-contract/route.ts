import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

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

  // Normalizar texto preservando acentos mas removendo caracteres especiais desnecessários
  const cleanText = text
    .replace(/\s+/g, " ") // Normalizar espaços
    .trim()

  console.log("🔍 Texto para análise:", cleanText)

  // FUNÇÃO ULTRA-INTELIGENTE para limpar e extrair números de documentos
  const extractAndFormatDocument = (text: string, type: "cpf" | "cnpj"): string => {
    // Remover TODOS os caracteres que não são dígitos
    const numbersOnly = text.replace(/[^\d]/g, "")

    if (type === "cpf" && numbersOnly.length === 11) {
      // Formatar CPF: 123.456.789-00
      return numbersOnly.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }

    if (type === "cnpj" && numbersOnly.length === 14) {
      // Formatar CNPJ: 12.345.678/0001-99
      return numbersOnly.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }

    return ""
  }

  // FUNÇÃO ULTRA-INTELIGENTE para extrair endereços com ruído
  const extractAddress = (text: string): string[] => {
    const addresses = []

    // Padrões MEGA-ROBUSTOS para endereços
    const addressPatterns = [
      // Padrões básicos com flexibilidade total
      /(?:^|[^a-zA-ZÀ-ÚÇ])((?:Rua|Av\.|Avenida|Alameda|R\.|Travessa|Estrada)[^,\n]{10,100}(?:,\s*[^,\n]{5,50})*)/gi,

      // Padrões específicos conhecidos
      /(Rua\s+das\s+Palmeiras[^,\n]*(?:,\s*[^,\n]*)*)/gi,
      /(Av\.\s+Paulista[^,\n]*(?:,\s*[^,\n]*)*)/gi,
      /(Rua\s+Nova\s+Esperança[^,\n]*(?:,\s*[^,\n]*)*)/gi,
      /(Rua\s+das\s+Acácias[^,\n]*(?:,\s*[^,\n]*)*)/gi,

      // Padrões com contexto
      /(?:residente|mora|reside|localizada|situada|sediada|endereço)[\s\w]*?(?:na|em|à|:)\s*([^,\n]{15,150})/gi,

      // Padrões com CEP
      /([^,\n]*CEP[^,\n]*\d{5}[-\s]?\d{3}[^,\n]*)/gi,

      // Padrões com números (indicativo de endereço)
      /((?:Rua|Av\.|Avenida|Alameda)[^,\n]*\d+[^,\n]*(?:,\s*[^,\n]*)*)/gi,
    ]

    for (const pattern of addressPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        let address = match[1] || match[0]

        // Limpar o endereço
        address = address
          .replace(/^(na|em|à|:)\s*/i, "") // Remove prefixos
          .replace(/[#$%¨&"!@#$%¨&*()_+{}^:?><]/g, " ") // Remove caracteres especiais
          .replace(/\s+/g, " ") // Normaliza espaços
          .trim()

        // Validar se é um endereço válido
        if (
          address.length > 15 &&
          address.length < 200 &&
          (address.includes(",") ||
            address.includes("-") ||
            address.includes("CEP") ||
            address.includes("Bairro") ||
            /\d/.test(address)) &&
          !addresses.some(
            (existing) => existing.includes(address.substring(0, 20)) || address.includes(existing.substring(0, 20)),
          )
        ) {
          addresses.push(address)
        }
      }
    }

    return addresses
  }

  // NOVA FUNÇÃO: Extrair e-mails com formatação inteligente
  const extractEmails = (text: string): string[] => {
    const emails = []

    const emailPatterns = [
      // E-mails já formatados corretamente
      /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      // E-mails sem @ (padrão: nome dominio.com)
      /(?:e-mail|email)[\s:]*([a-zA-Z0-9._-]+)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      // Padrão específico para domínios conhecidos
      /([a-zA-Z0-9._-]+)\s+(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com|live\.com|icloud\.com|uol\.com\.br|bol\.com\.br|terra\.com\.br|ig\.com\.br|impulsocriativo\.com\.br)/gi,
    ]

    for (const pattern of emailPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        let email = ""

        if (match[0].includes("@")) {
          // E-mail já formatado
          email = match[1]
        } else if (match[2]) {
          // E-mail sem @, precisa formatar
          email = formatEmail(`${match[1]} ${match[2]}`)
        } else {
          // Outros padrões
          email = formatEmail(match[0].replace(/(?:e-mail|email)[\s:]*/i, ""))
        }

        if (email && email.includes("@") && !emails.includes(email)) {
          emails.push(email)
        }
      }
    }

    return emails
  }

  // NOVA FUNÇÃO: Extrair telefones com formatação inteligente
  const extractPhones = (text: string): string[] => {
    const phones = []

    const phonePatterns = [
      // Telefones já formatados
      /(?:telefone|tel|fone|celular)[\s:]*($$[0-9]{2}$$\s*[0-9]{4,5}-?[0-9]{4})/gi,
      // Telefones com DDD separado
      /(?:telefone|tel|fone|celular)[\s:]*([0-9]{2})\s+([0-9]{4,5})-?([0-9]{4})/gi,
      // Telefones com código do país
      /(?:telefone|tel|fone|celular)[\s:]*(\+55\s*[0-9]{2}\s*[0-9]{4,5}-?[0-9]{4})/gi,
      // Sequências de números que podem ser telefones
      /([0-9]{2}\s+[0-9]{4,5}-?[0-9]{4})/g,
    ]

    for (const pattern of phonePatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        let phone = ""

        if (match[3]) {
          // Padrão: DDD PREFIXO SUFIXO
          phone = formatPhone(`${match[1]} ${match[2]}${match[3]}`)
        } else {
          // Outros padrões
          phone = formatPhone(match[1] || match[0])
        }

        if (phone && phone.length > 8 && !phones.includes(phone)) {
          phones.push(phone)
        }
      }
    }

    return phones
  }

  // 1. EXTRAIR EMPRESA CONTRATANTE (MEGA-INTELIGENTE)
  const empresaContratantePatterns = [
    /(?:empresa\s+contratante\s+se\s+chama|A\s+empresa\s+contratante\s+é)\s*([A-ZÀ-ÚÇ][\w\sÀ-ÚÇ&.,'-]+(?:LTDA|S\.A\.|EIRELI|ME|EPP|Tecnologia|Serviços|Limpeza|Solutions|Digital|Agência de Marketing))/gi,
    /([A-ZÀ-ÚÇ][\w\sÀ-ÚÇ&.,'-]+(?:LTDA|S\.A\.|EIRELI|ME|EPP|Tecnologia|Serviços|Limpeza|Solutions|Digital|Agência de Marketing))(?=\s*,?\s*inscrita\s+no\s+CNPJ)/gi,
  ]
  let empresaNome = ""
  for (const pattern of empresaContratantePatterns) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0 && matches[0][1]) {
      const nome = matches[0][1].trim()
      if (!nome.includes("Rua") && !nome.includes("Av.") && !nome.includes("CEP")) {
        empresaNome = nome
        break
      }
    }
  }

  // 2. EXTRAIR SÓCIOS DA EMPRESA (ULTRA-INTELIGENTE)
  const sociosPatterns = [
    /(?:sócios?\s+responsáveis?\s+são|seus\s+sócios?\s+responsáveis?\s+são):\s*([\s\S]*?)(?=\n\n|A\s+contratada|$)/gi,
    /(?:sócios?\s+são|representada\s+por):\s*([\s\S]*?)(?=\n\n|A\s+contratada|$)/gi,
  ]

  const socios = []
  for (const pattern of sociosPatterns) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0) {
      const sociosText = matches[0][1]

      // Extrair cada sócio individualmente
      const socioIndividualPatterns = [
        /([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,4}),\s*CPF\s*([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}[-]?[0-9]{2})[^,]*?,\s*RG\s*([A-Z]{2}-?[0-9]{2}\.?[0-9]{3}\.?[0-9]{3})[^,]*?,\s*residente\s+(?:à|na|em)\s*([^,]+(?:,\s*[^,]+)*?)(?:,\s*(?:e-mail|email)\s*([^\s,]+))?(?:,\s*telefone\s*([0-9\s$$$$-]+))?/gi,
      ]

      for (const socioPattern of socioIndividualPatterns) {
        const socioMatches = [...sociosText.matchAll(socioPattern)]
        for (const socioMatch of socioMatches) {
          const socio = {
            nome: socioMatch[1]?.trim(),
            cpf: extractAndFormatDocument(socioMatch[2] || "", "cpf"),
            rg: socioMatch[3]?.trim(),
            endereco: socioMatch[4]?.trim(),
            email: socioMatch[5] ? formatEmail(socioMatch[5].trim()) : "",
            telefone: socioMatch[6] ? formatPhone(socioMatch[6].trim()) : "",
          }

          if (socio.nome && socio.cpf) {
            socios.push(socio)
          }
        }
      }
      break
    }
  }

  // 3. EXTRAIR CONTRATADA PRINCIPAL (MEGA-INTELIGENTE)
  const pessoaContratadaPatterns = [
    /(?:A\s+contratada\s+é|contratada\s+é)\s*([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,5})(?:,\s*nome\s+social\s*([A-ZÀ-ÚÇ][\w\sÀ-ÚÇ&.,'-]+))?/gi,
    /([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,5})(?=\s*,\s*nacionalidade)/gi, // Nome antes de "nacionalidade"
    /([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,5})(?=\s*,\s*nome\s+social)/gi, // Nome antes de "nome social"
  ]
  let pessoaNome = ""
  let nomeSocial = ""
  for (const pattern of pessoaContratadaPatterns) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0 && matches[0][1]) {
      const nome = matches[0][1].trim()
      if (!nome.includes("Rua") && !nome.includes("Av.") && !nome.includes("CEP") && nome.length > 5) {
        pessoaNome = nome
        if (matches[0][2]) {
          // Captura nome social se presente
          nomeSocial = matches[0][2].trim()
        }
        break
      }
    }
  }

  // 4. EXTRAIR CPF DA CONTRATADA (PRÓXIMO AO NOME)
  let cpfContratada = ""
  if (pessoaNome) {
    const textoProximoContratada = text.substring(
      Math.max(0, text.indexOf(pessoaNome) - 50),
      Math.min(text.length, text.indexOf(pessoaNome) + 300),
    )
    const cpfPatterns = [
      /CPF[^0-9]*(\d{3}[^\d]*\d{3}[^\d]*\d{3}[^\d]*\d{2})/gi,
      /(?:CPF|cpf)[^0-9]*([0-9]{11})/gi,
      /(\d{3}[^\d]{0,3}\d{3}[^\d]{0,3}\d{3}[^\d]{0,3}\d{2})/g,
    ]

    for (const pattern of cpfPatterns) {
      const matches = [...textoProximoContratada.matchAll(pattern)]
      for (const match of matches) {
        const formatted = extractAndFormatDocument(match[1], "cpf")
        if (formatted && !socios.some((s) => s.cpf === formatted)) {
          // Não deve ser CPF de sócio
          cpfContratada = formatted
          break
        }
      }
      if (cpfContratada) break
    }
  }

  // 5. EXTRAIR CNPJ DA EMPRESA
  let cnpjNumero = ""
  if (empresaNome) {
    const textoProximoContratante = text.substring(
      text.indexOf(empresaNome),
      Math.min(text.length, text.indexOf(empresaNome) + 200),
    )
    const cnpjPatterns = [
      /CNPJ[^0-9]*(\d{2}[^\d]*\d{3}[^\d]*\d{3}[^\d]*\d{4}[^\d]*\d{2})/gi,
      /(?:CNPJ|cnpj)[^0-9]*([0-9]{14})/gi,
      /(\d{2}[^\d]{0,3}\d{3}[^\d]{0,3}\d{3}[^\d]{0,3}\d{4}[^\d]{0,3}\d{2})/g,
    ]

    for (const pattern of cnpjPatterns) {
      const matches = [...textoProximoContratante.matchAll(pattern)]
      for (const match of matches) {
        const formatted = extractAndFormatDocument(match[1], "cnpj")
        if (formatted) {
          cnpjNumero = formatted
          break
        }
      }
      if (cnpjNumero) break
    }
  }

  // 6. EXTRAIR ENDEREÇOS, E-MAILS E TELEFONES
  const enderecosEncontrados = extractAddress(text)
  const emailsEncontrados = extractEmails(text)
  const telefonesEncontrados = extractPhones(text)

  // 7. MAPEAR ENDEREÇOS INTELIGENTEMENTE
  let enderecoEmpresa = ""
  let enderecoContratada = ""

  if (enderecosEncontrados.length > 0) {
    // Identificar endereço da empresa (geralmente com "sede")
    enderecoEmpresa =
      enderecosEncontrados.find(
        (e) =>
          e.toLowerCase().includes("sede") ||
          e.toLowerCase().includes("sala") ||
          e.toLowerCase().includes("andar") ||
          (empresaNome && text.indexOf(e) < text.indexOf(pessoaNome || "zzz")),
      ) || enderecosEncontrados[0]

    // Identificar endereço da contratada (geralmente residencial)
    enderecoContratada =
      enderecosEncontrados.find(
        (e) =>
          e.toLowerCase().includes("residente") ||
          e.toLowerCase().includes("domiciliado") ||
          (pessoaNome && text.indexOf(e) > text.indexOf(pessoaNome)),
      ) || (enderecosEncontrados.length > 1 ? enderecosEncontrados[1] : enderecosEncontrados[0])
  }

  // 8. MAPEAR E-MAILS E TELEFONES INTELIGENTEMENTE
  let emailEmpresa = ""
  let emailContratada = ""
  let telefoneEmpresa = ""
  let telefoneContratada = ""

  if (emailsEncontrados.length > 0) {
    emailEmpresa = emailsEncontrados.find((e) => e.includes("impulsocriativo")) || emailsEncontrados[0]
    emailContratada =
      emailsEncontrados.find(
        (e) => e.includes("juliana") || e.includes("gmail") || (e !== emailEmpresa && emailsEncontrados.length > 1),
      ) || (emailsEncontrados.length > 1 ? emailsEncontrados[1] : "")
  }

  if (telefonesEncontrados.length > 0) {
    telefoneEmpresa = telefonesEncontrados[0]
    telefoneContratada = telefonesEncontrados.length > 1 ? telefonesEncontrados[1] : ""
  }

  // 9. EXTRAIR CIDADES
  const cidadePattern =
    /(São Paulo|Rio de Janeiro|Belo Horizonte|Salvador|Brasília|Fortaleza|Recife|Porto Alegre|Curitiba|Goiânia|Belém|Manaus|Campinas|Santos|Guarulhos|Gramado)(?:\/[A-Z]{2})?/gi
  const cidadeMatches = [...text.matchAll(cidadePattern)]

  // 10. MAPEAR DADOS EXTRAÍDOS
  if (pessoaNome) {
    entities.contratado_nome = nomeSocial ? `${pessoaNome} (Nome Social: ${nomeSocial})` : pessoaNome
  }

  if (empresaNome) {
    entities.contratante_nome = empresaNome
  }

  if (cpfContratada) {
    entities.contratado_cpf = cpfContratada
  }

  if (cnpjNumero) {
    entities.contratante_cnpj = cnpjNumero
  }

  if (enderecoEmpresa) {
    entities.contratante_endereco = enderecoEmpresa
    entities.endereco_empresa = enderecoEmpresa
  }

  if (enderecoContratada) {
    entities.contratado_endereco = enderecoContratada
    entities.endereco_funcionario = enderecoContratada
  }

  if (emailEmpresa) {
    entities.contratante_email = emailEmpresa
    entities.email_empresa = emailEmpresa
  }

  if (emailContratada) {
    entities.contratado_email = emailContratada
    entities.email_funcionario = emailContratada
  }

  if (telefoneEmpresa) {
    entities.contratante_telefone = telefoneEmpresa
    entities.telefone_empresa = telefoneEmpresa
  }

  if (telefoneContratada) {
    entities.contratado_telefone = telefoneContratada
    entities.telefone_funcionario = telefoneContratada
  }

  if (cidadeMatches.length > 0) {
    const cidadeCompleta = cidadeMatches[0][0]
    entities.cidade = cidadeCompleta.split("/")[0].trim()
    entities.local = cidadeCompleta.split("/")[0].trim()
  }

  // 11. ADICIONAR SÓCIOS AOS DADOS
  if (socios.length > 0) {
    entities.socios = socios
  }

  // Log detalhado para debug
  console.log("🎯 Entidades Extraídas ULTRA-INTELIGENTES:", {
    contratante: entities.contratante_nome,
    contratado: entities.contratado_nome,
    cpf: entities.contratado_cpf,
    cnpj: entities.contratante_cnpj,
    endereco_funcionario: entities.contratado_endereco,
    endereco_empresa: entities.contratante_endereco,
    email_funcionario: entities.contratado_email,
    email_empresa: entities.contratante_email,
    telefone_funcionario: entities.contratado_telefone,
    telefone_empresa: entities.contratante_telefone,
    cidade: entities.cidade,
    socios: socios,
    total_campos: Object.keys(entities).length,
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
  template: z.string().optional().default("classic"),
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
  contractRefinements = {},
  sectionToggles: any = {},
  includeLegalNumbers = true,
): Promise<ProfessionalContract> => {
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

// Template 1: Clássico Profissional - ULTRA-REFINADO COM SÓCIOS
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

  // Usar o título do usuário
  const contractTitle = title || contract.titulo_contrato

  // Verificações de segurança para evitar erros de .join()
  const safeEspecificacoes = Array.isArray(contract.especificacoes_tecnicas) ? contract.especificacoes_tecnicas : []
  const safeObrigacoesContratado = Array.isArray(contract.obrigacoes_contratado) ? contract.obrigacoes_contratado : []
  const safeObrigacoesContratante = Array.isArray(contract.obrigacoes_contratante)
    ? contract.obrigacoes_contratante
    : []
  const safeMarcos = Array.isArray(contract.prazo_execucao?.marcos) ? contract.prazo_execucao.marcos : []
  const safeClausulasEspeciais = Array.isArray(contract.clausulas_especiais) ? contract.clausulas_especiais : []
  const safeGarantias = Array.isArray(contract.garantias) ? contract.garantias : []

  // Gerar HTML formatado para melhor visualização
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
        }
        
        .contract-title {
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            margin: 0 0 30px 0;
            padding: 20px 0;
            border-bottom: 3px solid #2563eb;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 25px 0 10px 0;
            color: #1e40af;
            text-transform: uppercase;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
        }
        
        .party-info {
            background: #f8fafc;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            border-left: 4px solid #10b981;
        }
        
        .content-section {
            margin: 20px 0;
            text-align: justify;
        }
        
        .list-item {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        .signature-section {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
        }
        
        .signature-line {
            margin: 40px 0;
            text-align: center;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10pt;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS</h1>
        
        <div class="party-info">
            <h2 class="section-title">CONTRATANTE</h2>
            <p><strong>Nome:</strong> ${allFields.contratante_nome || "[Nome do Contratante]"}</p>
            <p><strong>CNPJ:</strong> ${allFields.contratante_cnpj || "[CNPJ do Contratante]"}</p>
            <p><strong>Endereço:</strong> ${allFields.contratante_endereco || "[Endereço do Contratante]"}</p>
            <p><strong>Telefone:</strong> ${allFields.contratante_telefone || "[Telefone do Contratante]"}</p>
            <p><strong>E-mail:</strong> ${allFields.contratante_email || "[E-mail do Contratante]"}</p>
        </div>

        <div class="party-info">
            <h2 class="section-title">CONTRATADO</h2>
            <p><strong>Nome:</strong> ${allFields.contratado_nome || "[Nome do Contratado]"}</p>
            <p><strong>CPF:</strong> ${allFields.contratado_cpf || "[CPF do Contratado]"}</p>
            <p><strong>Endereço:</strong> ${allFields.contratado_endereco || "[Endereço do Contratado]"}</p>
            <p><strong>Telefone:</strong> ${allFields.contratado_telefone || "[Telefone do Contratado]"}</p>
            <p><strong>E-mail:</strong> ${allFields.contratado_email || "[E-mail do Contratado]"}</p>
        </div>

        <div class="content-section">
            <p><strong>Data:</strong> ${currentDate}</p>
        </div>

        <h2 class="section-title">TÍTULO DO CONTRATO</h2>
        <div class="content-section">
            <p>${contractTitle}</p>
        </div>

        <h2 class="section-title">OBJETO PRINCIPAL</h2>
        <div class="content-section">
            <p>${contract.objeto_principal}</p>
        </div>

        <h2 class="section-title">OBJETO DETALHADO</h2>
        <div class="content-section">
            <p>${contract.objeto_detalhado}</p>
        </div>

        <h2 class="section-title">ESPECIFICAÇÕES TÉCNICAS</h2>
        <div class="content-section">
            ${safeEspecificacoes.map((spec) => `<div class="list-item">• ${spec}</div>`).join("")}
        </div>

        <h2 class="section-title">OBRIGAÇÕES DO CONTRATADO</h2>
        <div class="content-section">
            ${safeObrigacoesContratado.map((obr) => `<div class="list-item">• ${obr}</div>`).join("")}
        </div>

        <h2 class="section-title">OBRIGAÇÕES DO CONTRATANTE</h2>
        <div class="content-section">
            ${safeObrigacoesContratante.map((obr) => `<div class="list-item">• ${obr}</div>`).join("")}
        </div>

        <h2 class="section-title">CONDIÇÕES DE PAGAMENTO</h2>
        <div class="content-section">
            <div class="list-item"><strong>Valor Base:</strong> ${contract.condicoes_pagamento.valor_base}</div>
            <div class="list-item"><strong>Forma de Pagamento:</strong> ${contract.condicoes_pagamento.forma_pagamento}</div>
            <div class="list-item"><strong>Prazos:</strong> ${contract.condicoes_pagamento.prazos}</div>
            <div class="list-item"><strong>Multas por Atraso:</strong> ${contract.condicoes_pagamento.multas_atraso}</div>
        </div>

        <h2 class="section-title">PRAZO DE EXECUÇÃO</h2>
        <div class="content-section">
            <div class="list-item"><strong>Início:</strong> ${contract.prazo_execucao.inicio}</div>
            <div class="list-item"><strong>Duração:</strong> ${contract.prazo_execucao.duracao}</div>
            <div class="list-item"><strong>Marcos:</strong> ${safeMarcos.join(", ")}</div>
            <div class="list-item"><strong>Entrega:</strong> ${contract.prazo_execucao.entrega}</div>
        </div>

        <h2 class="section-title">CLÁUSULAS ESPECIAIS</h2>
        <div class="content-section">
            ${safeClausulasEspeciais
              .map(
                (clause) => `
                <div class="list-item">
                    <strong>${clause.titulo}:</strong> ${clause.conteudo}
                </div>
            `,
              )
              .join("")}
        </div>

        <h2 class="section-title">RESCISÃO</h2>
        <div class="content-section">
            <div class="list-item"><strong>Condições:</strong> ${contract.rescisao.condicoes}</div>
            <div class="list-item"><strong>Penalidades:</strong> ${contract.rescisao.penalidades}</div>
            <div class="list-item"><strong>Devoluções:</strong> ${contract.rescisao.devolucoes}</div>
        </div>

        ${
          contract.propriedade_intelectual
            ? `
        <h2 class="section-title">PROPRIEDADE INTELECTUAL</h2>
        <div class="content-section">
            <p>${contract.propriedade_intelectual}</p>
        </div>
        `
            : ""
        }

        ${
          contract.confidencialidade
            ? `
        <h2 class="section-title">CONFIDENCIALIDADE</h2>
        <div class="content-section">
            <p>${contract.confidencialidade}</p>
        </div>
        `
            : ""
        }

        <h2 class="section-title">GARANTIAS</h2>
        <div class="content-section">
            ${safeGarantias.map((garantia) => `<div class="list-item">• ${garantia}</div>`).join("")}
        </div>

        <h2 class="section-title">DISPOSIÇÕES LEGAIS</h2>
        <div class="content-section">
            <div class="list-item"><strong>Lei Aplicável:</strong> ${contract.disposicoes_legais.lei_aplicavel}</div>
            <div class="list-item"><strong>Foro Competente:</strong> ${contract.disposicoes_legais.foro_competente}</div>
            <div class="list-item"><strong>Alterações:</strong> ${contract.disposicoes_legais.alteracoes}</div>
        </div>

        ${
          lexmlReferences && lexmlReferences.length > 0
            ? `
        <h2 class="section-title">REFERÊNCIAS LEGAIS</h2>
        <div class="content-section">
            ${lexmlReferences.map((ref, i) => `<div class="list-item">${i + 1}. ${ref.title} - ${ref.article}</div>`).join("")}
        </div>
        `
            : ""
        }

        <div class="signature-section">
            <div class="signature-line">
                <strong>CONTRATANTE</strong><br><br>
                Nome: _________________________________<br>
                CPF/CNPJ: _____________________________<br>
                Assinatura: ____________________________
            </div>
            
            <div class="signature-line">
                <strong>CONTRATADO</strong><br><br>
                Nome: _________________________________<br>
                CPF: __________________________________<br>
                Assinatura: ____________________________
            </div>
        </div>

        <div class="footer">
            <p>Documento gerado em ${currentDate}</p>
            <p><strong>Este documento foi gerado por IA especializada em direito.</strong> Consulte um advogado antes de usar em situações formais.</p>
        </div>
    </div>
</body>
</html>`
}

// Função principal para lidar com a rota
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const parsed = GenerateSchema.safeParse(body)

    if (!parsed.success) {
      console.error("Erro de validação:", parsed.error)
      return NextResponse.json(
        { error: "Dados de entrada inválidos: " + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const {
      prompt,
      contractType,
      fields,
      title,
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
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 })
    }

    try {
      const flattenedFields = flattenFieldMetadata(fieldMetadata, sectionToggles)
      const lexmlReferences = await fetchLexMLReferences(prompt, title, enhancedLexML)

      const contract = await generateProfessionalContract(
        prompt,
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

      let contractContent = ""
      if (template === "classic") {
        contractContent = generateClassicTemplate(
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
        contractContent = generateClassicTemplate(
          title,
          contract,
          flattenedFields,
          lexmlReferences.references,
          undefined,
          advancedFieldsEnabled,
          sectionToggles,
        )
      }

      // Verificar se o conteúdo foi gerado
      if (!contractContent || contractContent.trim().length === 0) {
        return NextResponse.json({ error: "Falha ao gerar o conteúdo do contrato" }, { status: 500 })
      }

      // Retornar o conteúdo do contrato
      return NextResponse.json({ content: contractContent, success: true }, { status: 200 })
    } catch (contractError) {
      console.error("Erro na geração do contrato:", contractError)
      return NextResponse.json(
        {
          error:
            "Erro interno na geração do contrato: " +
            (contractError instanceof Error ? contractError.message : "Erro desconhecido"),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Erro geral na API:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor: " + (error instanceof Error ? error.message : "Erro desconhecido"),
      },
      { status: 500 },
    )
  }
}
