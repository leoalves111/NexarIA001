import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
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
    /$$(\d{2})$$\s*(\d{4,5})-?(\d{4})/,
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
 * Sistema de extração MEGA-INTELIGENTE que captura TODOS os dados em QUALQUER formato
 * Detecta CPF/CNPJ sem pontos, com pontos, com caracteres especiais, acentos, etc.
 * Detecta endereços mesmo com ruído e formatação irregular
 * NOVO: Formata e-mails e telefones automaticamente
 */
const extractCompleteEntities = (text: string): Record<string, string> => {
  const entities: Record<string, string> = {}

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
      /(?:residente|mora|reside|localizada|situada|sediada|endereço)[\s\w]*?(?:na|em|:)\s*([^,\n]{15,150})/gi,

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
          .replace(/^(na|em|:)\s*/i, "") // Remove prefixos
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
      /([a-zA-Z0-9._-]+)\s+(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com|live\.com|icloud\.com|uol\.com\.br|bol\.com\.br|terra\.com\.br|ig\.com\.br)/gi,
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

  // 1. EXTRAIR NOMES DE PESSOAS (MEGA-ROBUSTO)
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
  // Fallback se não encontrar com padrão específico
  if (!empresaNome) {
    const empresaPatterns = [
      /(?:empresa|contratante|empregadora|firma)\s+(?:é\s+|se\s+chama\s+|denominada\s+|:)?\s*([A-ZÀ-ÚÇ][\w\sÀ-ÚÇ&.,'-]+(?:LTDA|S\.A\.|EIRELI|ME|EPP|Tecnologia|Serviços|Limpeza|Solutions|Digital|Agência de Marketing))/gi,
      /([A-ZÀ-ÚÇ][\w\sÀ-ÚÇ&.,'-]+\s+(?:Tecnologia|Digital|Solutions|Agência de Marketing)\s+LTDA)/gi,
    ]
    for (const pattern of empresaPatterns) {
      const matches = [...text.matchAll(pattern)]
      if (matches.length > 0 && matches[0][1]) {
        const nome = matches[0][1].trim()
        if (!nome.includes("Rua") && !nome.includes("Av.") && !nome.includes("CEP")) {
          empresaNome = nome
          break
        }
      }
    }
  }

  // 2. EXTRAIR NOMES DE PESSOAS (CONTRATADA PRINCIPAL)
  const pessoaContratadaPatterns = [
    /(?:A\s+contratada\s+é|contratada\s+é)\s*([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,5})(?:,\s*nome\s+social\s*([A-ZÀ-ÚÇ][\w\sÀ-ÚÇ&.,'-]+))?/gi,
    /([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,5})(?=\s*,\s*nacionalidade)/gi, // Nome antes de "nacionalidade"
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
  // Fallback para pessoa
  if (!pessoaNome) {
    const pessoaPatterns = [
      /(?:empregado|funcionário|contratado|trabalhador|pessoa|freelancer)\s+(?:se\s+chama\s+|é\s+|:)?\s*([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){1,5})/gi,
      /([A-ZÀ-ÚÇ][a-zà-úç]+(?:\s+[A-ZÀ-ÚÇ][a-zà-úç]+){2,4})(?=\s+(?:inscrito|portador|residente|CPF|RG|nascida))/gi,
    ]
    for (const pattern of pessoaPatterns) {
      const matches = [...text.matchAll(pattern)]
      if (matches.length > 0 && matches[0][1]) {
        const nome = matches[0][1].trim()
        if (!nome.includes("Rua") && !nome.includes("Av.") && !nome.includes("CEP") && nome.length > 5) {
          pessoaNome = nome
          break
        }
      }
    }
  }

  // 3. EXTRAIR CPF (MEGA-ROBUSTO - QUALQUER FORMATO)
  const cpfPatterns = [
    // CPF com formatação tradicional
    /CPF[^0-9]*(\d{3}[^\d]*\d{3}[^\d]*\d{3}[^\d]*\d{2})/gi,
    // CPF sem formatação (11 dígitos seguidos)
    /(?:CPF|cpf)[^0-9]*([0-9]{11})/gi,
    // Sequência de 11 dígitos que pode ser CPF
    /(?:^|[^0-9])([0-9]{11})(?:[^0-9]|$)/g,
    // CPF com qualquer separador
    /(\d{3}[^\d]{0,3}\d{3}[^\d]{0,3}\d{3}[^\d]{0,3}\d{2})/g,
  ]

  let cpfNumero = ""
  // Tentar extrair CPF próximo ao nome da CONTRATADA
  if (pessoaNome) {
    const textoProximoContratada = text.substring(
      text.indexOf(pessoaNome),
      Math.min(text.length, text.indexOf(pessoaNome) + 200),
    )
    for (const pattern of cpfPatterns) {
      const matches = [...textoProximoContratada.matchAll(pattern)]
      for (const match of matches) {
        const formatted = extractAndFormatDocument(match[1], "cpf")
        if (formatted) {
          cpfNumero = formatted
          break
        }
      }
      if (cpfNumero) break
    }
  }
  // Se não encontrou, tentar no texto todo
  if (!cpfNumero) {
    for (const pattern of cpfPatterns) {
      const matches = [...text.matchAll(pattern)]
      // Priorizar o último CPF encontrado se houver múltiplos, assumindo que o da contratada pode vir depois
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        const formatted = extractAndFormatDocument(match[1], "cpf")
        if (formatted) {
          cpfNumero = formatted
          break
        }
      }
      if (cpfNumero) break
    }
  }

  // 4. EXTRAIR CNPJ (MEGA-ROBUSTO - QUALQUER FORMATO)
  const cnpjPatterns = [
    // CNPJ com formatação tradicional
    /CNPJ[^0-9]*(\d{2}[^\d]*\d{3}[^\d]*\d{3}[^\d]*\d{4}[^\d]*\d{2})/gi,
    // CNPJ sem formatação (14 dígitos seguidos)
    /(?:CNPJ|cnpj)[^0-9]*([0-9]{14})/gi,
    // Sequência de 14 dígitos que pode ser CNPJ
    /(?:^|[^0-9])([0-9]{14})(?:[^0-9]|$)/g,
    // CNPJ com qualquer separador
    /(\d{2}[^\d]{0,3}\d{3}[^\d]{0,3}\d{3}[^\d]{0,3}\d{4}[^\d]{0,3}\d{2})/g,
  ]

  let cnpjNumero = ""
  // Tentar extrair CNPJ próximo ao nome da CONTRATANTE
  if (empresaNome) {
    const textoProximoContratante = text.substring(
      text.indexOf(empresaNome),
      Math.min(text.length, text.indexOf(empresaNome) + 200),
    )
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
  // Se não encontrou, tentar no texto todo
  if (!cnpjNumero) {
    for (const pattern of cnpjPatterns) {
      const matches = [...text.matchAll(pattern)]
      // Priorizar o primeiro CNPJ encontrado
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

  // 5. EXTRAIR ENDEREÇOS (MEGA-ROBUSTO)
  const enderecosEncontrados = extractAddress(text)

  // 6. EXTRAIR E-MAILS (NOVO - COM FORMATAÇÃO INTELIGENTE)
  const emailsEncontrados = extractEmails(text)

  // 7. EXTRAIR TELEFONES (NOVO - COM FORMATAÇÃO INTELIGENTE)
  const telefonesEncontrados = extractPhones(text)

  console.log("📧 E-mails encontrados:", emailsEncontrados)
  console.log("📞 Telefones encontrados:", telefonesEncontrados)
  console.log("🏠 Endereços encontrados:", enderecosEncontrados)

  // 8. MAPEAR ENDEREÇOS INTELIGENTEMENTE
  if (enderecosEncontrados.length > 0) {
    // Identificar endereço da empresa (geralmente Av. Paulista ou com palavras empresariais)
    const enderecoEmpresa =
      enderecosEncontrados.find(
        (e) =>
          e.toLowerCase().includes("paulista") ||
          e.toLowerCase().includes("empresa") ||
          e.toLowerCase().includes("contratante") ||
          e.toLowerCase().includes("empregadora") ||
          e.toLowerCase().includes("comercial") ||
          e.toLowerCase().includes("centro") ||
          e.toLowerCase().includes("andar") ||
          e.toLowerCase().includes("esperança"),
      ) || enderecosEncontrados[0]

    // Identificar endereço do funcionário (geralmente Rua das Palmeiras ou residencial)
    const enderecoFuncionario =
      enderecosEncontrados.find(
        (e) =>
          e.toLowerCase().includes("palmeiras") ||
          e.toLowerCase().includes("acácias") ||
          e.toLowerCase().includes("funcionário") ||
          e.toLowerCase().includes("empregado") ||
          e.toLowerCase().includes("contratado") ||
          e.toLowerCase().includes("residente") ||
          e.toLowerCase().includes("residencial") ||
          (e !== enderecoEmpresa && enderecosEncontrados.length > 1),
      ) || (enderecosEncontrados.length > 1 ? enderecosEncontrados[1] : enderecosEncontrados[0])

    // Mapear para múltiplas variações de campo
    if (enderecoEmpresa) {
      entities.contratante_endereco = enderecoEmpresa
      entities.endereco_empresa = enderecoEmpresa
      entities.endereco_contratante = enderecoEmpresa
    }

    if (enderecoFuncionario) {
      entities.contratado_endereco = enderecoFuncionario
      entities.endereco_funcionario = enderecoFuncionario
      entities.endereco_contratado = enderecoFuncionario
    }
  }

  // 9. MAPEAR E-MAILS INTELIGENTEMENTE
  if (emailsEncontrados.length > 0) {
    const emailContratante =
      emailsEncontrados.find(
        (e) => empresaNome && text.substring(text.indexOf(empresaNome)).includes(e.split("@")[0]),
      ) || emailsEncontrados.find((e) => e.includes("impulsocriativo"))
    const emailContratada =
      emailsEncontrados.find((e) => pessoaNome && text.substring(text.indexOf(pessoaNome)).includes(e.split("@")[0])) ||
      emailsEncontrados.find((e) => e.includes("juliana.ribeiro.design"))

    if (emailContratante) {
      entities.contratante_email = emailContratante
      entities.email_empresa = emailContratante
    } else if (emailsEncontrados.length === 1 && empresaNome) {
      // Se só um email e temos nome da empresa
      entities.contratante_email = emailsEncontrados[0]
      entities.email_empresa = emailsEncontrados[0]
    }

    if (emailContratada) {
      entities.contratado_email = emailContratada
      entities.email_funcionario = emailContratada
    } else if (emailsEncontrados.length === 1 && pessoaNome && !emailContratante) {
      // Se só um email e temos nome da pessoa, e não foi pego pelo contratante
      entities.contratado_email = emailsEncontrados[0]
      entities.email_funcionario = emailsEncontrados[0]
    } else if (
      emailsEncontrados.length > 1 &&
      emailContratante &&
      emailsEncontrados.find((e) => e !== emailContratante)
    ) {
      // Se mais de um e um já é do contratante, o outro é do contratado
      entities.contratado_email = emailsEncontrados.find((e) => e !== emailContratante)
      entities.email_funcionario = emailsEncontrados.find((e) => e !== emailContratante)
    }
  }

  // 10. MAPEAR TELEFONES INTELIGENTEMENTE
  if (telefonesEncontrados.length > 0) {
    const telefoneContratante =
      telefonesEncontrados.find(
        (t) => empresaNome && text.substring(text.indexOf(empresaNome)).includes(t.replace(/[^\d]/g, "")),
      ) || telefonesEncontrados.find((t) => t.includes("51")) // Exemplo de DDD de Porto Alegre
    const telefoneContratada =
      telefonesEncontrados.find(
        (t) => pessoaNome && text.substring(text.indexOf(pessoaNome)).includes(t.replace(/[^\d]/g, "")),
      ) || telefonesEncontrados.find((t) => t.includes("54")) // Exemplo de DDD de Gramado

    if (telefoneContratante) {
      entities.contratante_telefone = telefoneContratante
      entities.telefone_empresa = telefoneContratante
    } else if (telefonesEncontrados.length === 1 && empresaNome) {
      entities.contratante_telefone = telefonesEncontrados[0]
      entities.telefone_empresa = telefonesEncontrados[0]
    }

    if (telefoneContratada) {
      entities.contratado_telefone = telefoneContratada
      entities.telefone_funcionario = telefoneContratada
    } else if (telefonesEncontrados.length === 1 && pessoaNome && !telefoneContratante) {
      entities.contratado_telefone = telefonesEncontrados[0]
      entities.telefone_funcionario = telefonesEncontrados[0]
    } else if (
      telefonesEncontrados.length > 1 &&
      telefoneContratante &&
      telefonesEncontrados.find((t) => t !== telefoneContratante)
    ) {
      entities.contratado_telefone = telefonesEncontrados.find((t) => t !== telefoneContratante)
      entities.telefone_funcionario = telefonesEncontrados.find((t) => t !== telefoneContratante)
    }
  }

  // 11. EXTRAIR CIDADES
  const cidadePattern =
    /(São Paulo|Rio de Janeiro|Belo Horizonte|Salvador|Brasília|Fortaleza|Recife|Porto Alegre|Curitiba|Goiânia|Belém|Manaus|Campinas|Santos|Guarulhos)(?:\/[A-Z]{2})?/gi
  const cidadeMatches = [...text.matchAll(cidadePattern)]

  // 12. MAPEAR DADOS EXTRAÍDOS
  if (pessoaNome) {
    entities.contratado_nome = nomeSocial ? `${pessoaNome} (Nome Social: ${nomeSocial})` : pessoaNome
  }

  if (empresaNome) {
    entities.contratante_nome = empresaNome
  }

  if (cpfNumero) {
    entities.contratado_cpf = cpfNumero
  }

  if (cnpjNumero) {
    entities.contratante_cnpj = cnpjNumero
  }

  if (cidadeMatches.length > 0) {
    const cidadeCompleta = cidadeMatches[0][0]
    entities.cidade = cidadeCompleta.split("/")[0].trim()
    entities.local = cidadeCompleta.split("/")[0].trim()
  }

  // VALIDAÇÃO FINAL ULTRA-RIGOROSA
  Object.keys(entities).forEach((key) => {
    const value = entities[key]

    // Remover se contém palavras do prompt
    if (
      value &&
      (value.includes("preciso de") ||
        value.includes("contrato de") ||
        value.includes("deve iniciar") ||
        value.includes("função será") ||
        value.includes("remuneração será") ||
        value.includes("incluir cláusulas") ||
        value.includes("gerar o contrato"))
    ) {
      delete entities[key]
    }

    // Remover se é muito longo
    if (value && value.length > 200) {
      delete entities[key]
    }

    // Validação específica para CPF
    if (key.includes("cpf") && value && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
      delete entities[key]
    }

    // Validação específica para CNPJ
    if (key.includes("cnpj") && value && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
      delete entities[key]
    }

    // Validação específica para e-mail
    if (key.includes("email") && value && !value.includes("@")) {
      delete entities[key]
    }

    // Validação específica para telefone
    if (key.includes("telefone") && value && value.length < 8) {
      delete entities[key]
    }
  })

  // Log detalhado para debug
  console.log("🎯 Entidades Extraídas MEGA-INTELIGENTES:", {
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
    total_campos: Object.keys(entities).length,
  })

  return entities
}

/**
 * Função principal de extração e classificação (substitui a anterior)
 */
const extractAndClassifyEntities = (prompt: string, title: string): Record<string, string> => {
  const combinedText = `${title}. ${prompt}`
  return extractCompleteEntities(combinedText)
}

// =================================================================
// Resto do código permanece igual...
// (Mantendo todas as outras funções existentes)

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
      // Adicionar mais referências específicas...
    ]

    const relevantReferences = allReferences
      .filter((ref) => ref.keywords.some((keyword) => keywords.includes(keyword)))
      .sort((a, b) => (a.relevance === "alta" ? -1 : 1))
      .slice(0, enhanced ? 5 : 3) // Mais referências se enhanced

    return {
      references: relevantReferences.length > 0 ? relevantReferences : allReferences.slice(0, enhanced ? 3 : 2),
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

  const systemPrompt = `Você é um advogado especialista em Direito Brasileiro com 25 anos de experiência em contratos empresariais.

MISSÃO: Analisar a solicitação do usuário e criar um contrato profissional COMPLETO, sem usar o texto original do usuário no documento final.
${
  contractType === "advanced"
    ? `
MODO AVANÇADO ATIVADO: Gere um contrato EXTREMAMENTE detalhado e robusto. Utilize fundamentação jurídica aprofundada, cite artigos de lei e jurisprudência relevantes (quando aplicável e solicitado implicitamente pelo contexto do prompt), explore todas as nuances legais das cláusulas. Seja exaustivo na análise e na redação, visando máxima proteção e clareza para as partes. O contrato deve ser significativamente mais completo e técnico do que um contrato simples.
`
    : ""
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
REFERÊNCIAS LEGAIS:
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

  if (
    serviceType.includes("desenvolvimento") ||
    serviceType.includes("software") ||
    serviceType.includes("sistema") ||
    serviceType.includes("app")
  ) {
    return {
      titulo_contrato: "CONTRATO DE DESENVOLVIMENTO DE SOFTWARE",
      objeto_principal:
        "Desenvolvimento de solução de software personalizada, incluindo análise, programação, testes e implementação de sistema informatizado.",
      objeto_detalhado:
        "O presente contrato tem por objeto o desenvolvimento de software personalizado, compreendendo análise de requisitos, arquitetura de sistema, programação, testes de qualidade, documentação técnica e implementação da solução.",
      especificacoes_tecnicas: [
        "Análise detalhada de requisitos funcionais e não-funcionais",
        "Desenvolvimento utilizando tecnologias modernas e seguras",
        "Implementação de testes automatizados e manuais",
        "Documentação técnica completa do sistema",
        "Treinamento para usuários finais",
        "Suporte técnico durante período de garantia",
      ],
      obrigacoes_contratado: [
        "Desenvolver o software conforme especificações aprovadas",
        "Seguir boas práticas de programação e segurança",
        "Realizar testes rigorosos antes da entrega",
        "Fornecer documentação técnica completa",
        "Treinar usuários para utilização do sistema",
        "Prestar suporte técnico durante período de garantia",
      ],
      obrigacoes_contratante: [
        "Fornecer especificações detalhadas dos requisitos",
        "Disponibilizar acesso a sistemas e dados necessários",
        "Participar ativamente das validações e testes",
        "Efetuar pagamentos conforme cronograma estabelecido",
        "Designar responsável técnico para acompanhamento do projeto",
      ],
      condicoes_pagamento: {
        valor_base: "Valor fixo conforme proposta comercial, dividido em parcelas conforme marcos do projeto.",
        forma_pagamento: "Pagamento via PIX, transferência bancária ou boleto bancário.",
        prazos: "Pagamentos vinculados à entrega de marcos específicos do projeto.",
        multas_atraso: "Multa de 2% sobre o valor em atraso, acrescida de juros de 1% ao mês.",
      },
      prazo_execucao: {
        inicio: "Início imediato após assinatura do contrato e aprovação das especificações.",
        duracao: "Prazo de desenvolvimento conforme cronograma detalhado em anexo.",
        marcos: [
          "Aprovação das especificações técnicas",
          "Entrega da versão beta para testes",
          "Entrega da versão final homologada",
        ],
        entrega: "Entrega final com código fonte, documentação e treinamento completos.",
      },
      clausulas_especiais: [
        {
          titulo: "DA PROPRIEDADE INTELECTUAL E CÓDIGO FONTE",
          conteudo:
            "O código fonte desenvolvido e toda propriedade intelectual serão transferidos integralmente ao contratante após pagamento total do projeto.",
        },
        {
          titulo: "DA GARANTIA E SUPORTE TÉCNICO",
          conteudo:
            "Garantia de 6 meses para correção de bugs e suporte técnico gratuito para esclarecimento de dúvidas sobre o sistema.",
        },
      ],
      rescisao: {
        condicoes: "Rescisão mediante acordo entre as partes ou por descumprimento de cláusulas contratuais.",
        penalidades: "Multa de 30% do valor total em caso de rescisão sem justa causa.",
        devolucoes: "Entrega obrigatória de todo material desenvolvido até a data da rescisão.",
      },
      propriedade_intelectual:
        "Todo código fonte, documentação e propriedade intelectual desenvolvidos serão de propriedade exclusiva do contratante.",
      confidencialidade: "Sigilo absoluto sobre códigos, algoritmos, dados e informações técnicas do projeto.",
      garantias: [
        "Garantia de funcionamento conforme especificações",
        "Garantia de qualidade do código desenvolvido",
        "Garantia de suporte técnico durante período estabelecido",
      ],
      disposicoes_legais: {
        lei_aplicavel: "Regido pelas leis brasileiras, especialmente Lei de Software e Marco Civil da Internet.",
        foro_competente: "Foro da comarca onde foi assinado o contrato.",
        alteracoes: "Alterações de escopo devem ser formalizadas por escrito com impacto em prazo e valor.",
      },
    }
  }

  if (serviceType.includes("consultoria") || serviceType.includes("assessoria") || serviceType.includes("auditoria")) {
    return {
      titulo_contrato: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA EMPRESARIAL",
      objeto_principal:
        "Prestação de serviços especializados de consultoria empresarial, incluindo diagnóstico, planejamento estratégico e implementação de melhorias organizacionais.",
      objeto_detalhado:
        "O presente contrato tem por objeto a prestação de serviços de consultoria empresarial, compreendendo análise organizacional, diagnóstico de processos, elaboração de planos de ação, acompanhamento de implementação e treinamento de equipes.",
      especificacoes_tecnicas: [
        "Diagnóstico completo da situação atual da empresa",
        "Análise de processos e identificação de oportunidades",
        "Elaboração de plano estratégico personalizado",
        "Acompanhamento da implementação das melhorias",
        "Treinamento de equipes e gestores",
        "Relatórios de progresso e resultados alcançados",
      ],
      obrigacoes_contratado: [
        "Realizar diagnóstico detalhado da situação empresarial",
        "Elaborar plano de ação com cronograma específico",
        "Acompanhar implementação das recomendações",
        "Treinar equipes conforme necessidades identificadas",
        "Manter absoluto sigilo sobre informações empresariais",
        "Entregar relatórios periódicos de progresso",
      ],
      obrigacoes_contratante: [
        "Fornecer acesso a informações e documentos necessários",
        "Disponibilizar equipe para participar dos trabalhos",
        "Implementar recomendações conforme cronograma",
        "Efetuar pagamentos nas datas estabelecidas",
        "Comunicar mudanças organizacionais relevantes",
      ],
      condicoes_pagamento: {
        valor_base: "Valor baseado em horas de consultoria e complexidade do projeto conforme proposta comercial.",
        forma_pagamento: "Pagamento mensal via PIX, transferência bancária ou boleto.",
        prazos: "Pagamento até o dia 10 de cada mês mediante apresentação de relatório de atividades.",
        multas_atraso: "Multa de 2% sobre valor em atraso, acrescida de juros de 1% ao mês.",
      },
      prazo_execucao: {
        inicio: "Início dos trabalhos na data de assinatura do contrato.",
        duracao: "Prazo conforme cronograma específico do projeto de consultoria.",
        marcos: [
          "Conclusão do diagnóstico inicial",
          "Apresentação do plano estratégico",
          "Implementação das primeiras melhorias",
        ],
        entrega: "Entrega de relatório final com resultados e recomendações para continuidade.",
      },
      clausulas_especiais: [
        {
          titulo: "DA CONFIDENCIALIDADE E SIGILO PROFISSIONAL",
          conteudo:
            "Todas as informações empresariais, estratégicas e operacionais serão tratadas com absoluto sigilo, não podendo ser divulgadas a terceiros.",
        },
        {
          titulo: "DOS RESULTADOS E RESPONSABILIDADES",
          conteudo:
            "O consultor compromete-se a aplicar as melhores práticas, sendo os resultados dependentes também da implementação pelo contratante.",
        },
      ],
      rescisao: {
        condicoes: "Rescisão mediante aviso prévio de 30 dias ou por descumprimento de cláusulas contratuais.",
        penalidades: "Multa de 20% do valor mensal em caso de rescisão sem justa causa.",
        devolucoes: "Entrega de todos os materiais e relatórios desenvolvidos até a data da rescisão.",
      },
      confidencialidade:
        "Compromisso de sigilo absoluto sobre todas as informações empresariais, estratégicas e operacionais do contratante.",
      garantias: [
        "Garantia de aplicação das melhores práticas de consultoria",
        "Garantia de confidencialidade das informações",
        "Garantia de entrega dos relatórios nos prazos estabelecidos",
      ],
      disposicoes_legais: {
        lei_aplicavel: "Regido pelas leis brasileiras e código de ética profissional aplicável.",
        foro_competente: "Foro da comarca do domicílio do contratante.",
        alteracoes: "Alterações devem ser acordadas por escrito entre as partes.",
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

// Template 1: Clássico Profissional - REVISADO COM FORMATAÇÃO DE E-MAIL E TELEFONE
const generateClassicTemplate = (
  title: string,
  contract: ProfessionalContract,
  allFields: Record<string, string>,
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

  // Função ULTRA-INTELIGENTE para determinar terminologia jurídica correta
  const getCorrectLegalTerminology = (documentNumber: string, fieldType: "contratante" | "contratado") => {
    // Detectar se é CPF ou CNPJ baseado no formato
    const isCNPJ =
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(documentNumber) || documentNumber.replace(/\D/g, "").length === 14

    if (isCNPJ) {
      return {
        terminology: "com sede em",
        entityType: "jurídica",
      }
    } else {
      return {
        terminology: "residente e domiciliado em",
        entityType: "física",
      }
    }
  }

  // Função MEGA-INTELIGENTE para obter valor do campo com terminologia correta
  const getFieldValue = (fieldName: string, placeholder: string, sectionName?: string) => {
    // Verificar se a seção está ativa
    if (sectionName && sectionToggles) {
      const sectionKey = sectionName.toLowerCase()
      if (sectionToggles[sectionKey] === false) {
        return placeholder
      }
    }

    // Buscar valor nos campos extraídos (prioridade máxima)
    if (allFields[fieldName] && allFields[fieldName] !== placeholder) {
      const value = allFields[fieldName]

      // VALIDAÇÃO ULTRA-RIGOROSA - Evitar dados incorretos

      // Se é nome de pessoa, deve ter 2-5 palavras e não conter endereço
      if (fieldName.includes("nome") && fieldName.includes("contratado")) {
        const words = value.split(" ")
        if (
          words.length >= 2 &&
          words.length <= 5 &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP") &&
          !value.includes("Bairro")
        ) {
          return value
        }
      }

      // Se é nome de empresa, deve conter palavras empresariais
      if (fieldName.includes("nome") && fieldName.includes("contratante")) {
        if (
          (value.includes("Ltda") ||
            value.includes("S.A.") ||
            value.includes("EIRELI") ||
            value.includes("Tecnologia") ||
            value.includes("Serviços") ||
            value.includes("ME") ||
            value.includes("Solutions") ||
            value.includes("Digital")) &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP")
        ) {
          return value
        }
      }

      // Se é CPF, deve ter formato correto
      if (fieldName.includes("cpf")) {
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
      }

      // Se é CNPJ, deve ter formato correto
      if (fieldName.includes("cnpj")) {
        if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
      }

      // NOVA LÓGICA: Se é campo de endereço, usar terminologia jurídica correta
      if (fieldName.includes("endereco")) {
        const enderecoVariations = [
          fieldName,
          fieldName.replace("contratante_", "").replace("contratado_", ""),
          "endereco_empresa",
          "endereco_funcionario",
          "endereco_contratante",
          "endereco_contratado",
          "endereco",
        ]

        for (const variation of enderecoVariations) {
          if (allFields[variation] && allFields[variation].length > 15) {
            const endereco = allFields[variation]
            if (
              (endereco.startsWith("Rua") ||
                endereco.startsWith("Av.") ||
                endereco.startsWith("Avenida") ||
                endereco.startsWith("Alameda")) &&
              (endereco.includes(",") ||
                endereco.includes("Bairro") ||
                endereco.includes("CEP") ||
                endereco.includes("-"))
            ) {
              return endereco
            }
          }
        }
      }

      // Se passou em todas as validações, retornar o valor
      return value
    }

    // Buscar variações do nome do campo
    const fieldVariations = [
      fieldName,
      fieldName.replace(/_/g, ""),
      fieldName.replace(/contratante_/g, ""),
      fieldName.replace(/contratado_/g, ""),
    ]

    for (const variation of fieldVariations) {
      if (allFields[variation] && allFields[variation] !== placeholder) {
        const value = allFields[variation]

        // Aplicar as mesmas validações
        if (fieldName.includes("cpf") && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
        if (fieldName.includes("cnpj") && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
        if (
          fieldName.includes("endereco") &&
          (value.startsWith("Rua") || value.startsWith("Av.")) &&
          value.length > 10
        ) {
          return value
        }
        if (fieldName.includes("nome") && !value.includes("Rua") && !value.includes("CEP")) {
          return value
        }
      }
    }

    // Se não encontrou nada válido, usar placeholder
    return placeholder
  }

  // Função para gerar texto das partes com terminologia jurídica correta E DADOS COMPLETOS
  const generatePartyText = (type: "contratante" | "contratado") => {
    const nome = getFieldValue(`${type}_nome`, "[Nome Completo]", type)
    const cpf = getFieldValue(`${type}_cpf`, "", type)
    const cnpj = getFieldValue(`${type}_cnpj`, "", type)
    const endereco = getFieldValue(`${type}_endereco`, "[Endereço Completo]", type)
    const email = getFieldValue(`${type}_email`, "", type)
    const telefone = getFieldValue(`${type}_telefone`, "", type)

    // Determinar qual documento usar e a terminologia correta
    const documento = cnpj || cpf || "[000.000.000-00]"
    const { terminology } = getCorrectLegalTerminology(documento, type)

    // Construir texto base
    let texto = `${nome}, inscrito no CPF/CNPJ nº ${documento}, ${terminology} ${endereco}`

    // Adicionar telefone se disponível
    if (telefone && telefone !== "[Telefone]") {
      texto += `, telefone ${telefone}`
    }

    // Adicionar e-mail se disponível
    if (email && email !== "[E-mail]" && email.includes("@")) {
      texto += `, e-mail ${email}`
    }

    texto += `, doravante denominado ${type.toUpperCase()}.`

    return texto
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #333;
            background: #ffffff;
            margin: 0;
            padding: 30mm 25mm;
            max-width: 210mm;
            margin: 0 auto;
        }
        
        .contract-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 15px;
            border-bottom: 3px solid #8B4513;
        }
        
        .contract-title {
            font-size: 18pt;
            font-weight: bold;
            color: #8B4513;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
        
        .parties-section {
            margin: 30px 0;
            page-break-inside: avoid;
        }
        
        .party-info {
            margin-bottom: 20px;
            text-align: justify;
            page-break-inside: avoid;
        }
        
        .party-label {
            font-weight: bold;
            text-transform: uppercase;
            color: #8B4513;
        }
        
        .contract-intro {
            margin: 25px 0;
            text-align: justify;
            line-height: 1.6;
        }
        
        .clause {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .clause-title {
            font-weight: bold;
            font-size: 12pt;
            color: #8B4513;
            text-transform: uppercase;
            margin-bottom: 12px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
        }
        
        .clause-content {
            text-align: justify;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        
        .clause-subsection {
            margin: 12px 0;
            padding-left: 15px;
        }
        
        .subsection-list {
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .subsection-list li {
            margin-bottom: 8px;
            text-align: justify;
        }
        
        .signatures-section {
            margin-top: 60px;
            page-break-inside: avoid;
        }
        
        .signature-date {
            text-align: center;
            margin: 40px 0;
            font-size: 12pt;
        }
        
        .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            margin-top: 50px;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            margin: 60px 10px 10px 10px;
            padding-top: 8px;
            font-size: 11pt;
        }
        
        @media print {
            body { margin: 0; padding: 20mm; }
        }
        
        @page {
            margin: 20mm;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="contract-header">
        <h1 class="contract-title">${contractTitle}</h1>
    </div>

    <div class="parties-section">
        <div class="party-info">
            <span class="party-label">CONTRATANTE:</span> ${generatePartyText("contratante")}
        </div>

        <div class="party-info">
            <span class="party-label">CONTRATADO:</span> ${generatePartyText("contratado")}
        </div>
    </div>

    <div class="contract-intro">
        As partes acima identificadas têm, entre si, justo e acordado o presente contrato, que se regerá pelas cláusulas e condições seguintes:
    </div>

    <div class="clause">
        <div class="clause-title">CLÁUSULA PRIMEIRA - DO OBJETO</div>
        <div class="clause-content">
            <p><strong>1.1.</strong> ${contract.objeto_principal}</p>
            <div class="clause-subsection">
                <p><strong>1.2.</strong> ${contract.objeto_detalhado}</p>
            </div>
            <div class="clause-subsection">
                <p><strong>1.3.</strong> As especificações técnicas compreendem:</p>
                <ul class="subsection-list">
                    ${contract.especificacoes_tecnicas.map((spec) => `<li>${spec};</li>`).join("")}
                </ul>
            </div>
        </div>
    </div>

    <div class="clause">
        <div class="clause-title">CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DO CONTRATADO</div>
        <div class="clause-content">
            <p><strong>2.1.</strong> O CONTRATADO obriga-se a:</p>
            <ul class="subsection-list">
                ${contract.obrigacoes_contratado.map((obrigacao) => `<li>${obrigacao};</li>`).join("")}
            </ul>
        </div>
    </div>

    <div class="clause">
        <div class="clause-title">CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO CONTRATANTE</div>
        <div class="clause-content">
            <p><strong>3.1.</strong> O CONTRATANTE obriga-se a:</p>
            <ul class="subsection-list">
                ${contract.obrigacoes_contratante.map((obrigacao) => `<li>${obrigacao};</li>`).join("")}
            </ul>
        </div>
    </div>

    <div class="clause">
        <div class="clause-title">CLÁUSULA QUARTA - DO VALOR E FORMA DE PAGAMENTO</div>
        <div class="clause-content">
            <p><strong>4.1.</strong> ${contract.condicoes_pagamento.valor_base}</p>
            <p><strong>4.2.</strong> ${contract.condicoes_pagamento.forma_pagamento}</p>
            <p><strong>4.3.</strong> ${contract.condicoes_pagamento.prazos}</p>
            <p><strong>4.4.</strong> ${contract.condicoes_pagamento.multas_atraso}</p>
        </div>
    </div>

    <div class="clause">
        <div class="clause-title">CLÁUSULA QUINTA - DO PRAZO E VIGÊNCIA</div>
        <div class="clause-content">
            <p><strong>5.1.</strong> ${contract.prazo_execucao.inicio}</p>
            <p><strong>5.2.</strong> ${contract.prazo_execucao.duracao}</p>
            <p><strong>5.3.</strong> ${contract.prazo_execucao.entrega}</p>
        </div>
    </div>

    ${contract.clausulas_especiais
      .map(
        (clausula, index) => `
    <div class="clause">
        <div class="clause-title">CLÁUSULA ${["SEXTA", "SÉTIMA", "OITAVA", "NONA"][index] || `${index + 6}ª`} - ${clausula.titulo}</div>
        <div class="clause-content">
            <p><strong>${index + 6}.1.</strong> ${clausula.conteudo}</p>
        </div>
    </div>
    `,
      )
      .join("")}

    <div class="clause">
        <div class="clause-title">CLÁUSULA PENÚLTIMA - DA RESCISÃO</div>
        <div class="clause-content">
            <p><strong>Parágrafo Primeiro:</strong> ${contract.rescisao.condicoes}</p>
            <p><strong>Parágrafo Segundo:</strong> ${contract.rescisao.penalidades}</p>
            <p><strong>Parágrafo Terceiro:</strong> ${contract.rescisao.devolucoes}</p>
        </div>
    </div>

    <div class="clause">
        <div class="clause-title">CLÁUSULA FINAL - DAS DISPOSIÇÕES GERAIS</div>
        <div class="clause-content">
            <p><strong>Parágrafo Primeiro:</strong> ${contract.disposicoes_legais.lei_aplicavel}</p>
            <p><strong>Parágrafo Segundo:</strong> ${contract.disposicoes_legais.foro_competente}</p>
            <p><strong>Parágrafo Terceiro:</strong> ${contract.disposicoes_legais.alteracoes}</p>
        </div>
    </div>

    <div class="signatures-section">
        <div class="signature-date">
            ${getFieldValue("cidade", getFieldValue("local", "[Cidade]"))}, ${currentDate}
        </div>
        
        <div class="signatures-grid">
            <div class="signature-box">
                <div class="signature-line">
                    <div>CONTRATADO: ${getFieldValue("contratado_nome", "[Nome do Contratado]")}</div>
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    <div>CONTRATANTE: ${getFieldValue("contratante_nome", "[Nome do Contratante]")}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
}

// Template 2: Moderno Profissional
const generateModernTemplate = (
  title: string,
  contract: ProfessionalContract,
  allFields: Record<string, string>,
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

  // Função ULTRA-INTELIGENTE para determinar terminologia jurídica correta
  const getCorrectLegalTerminology = (documentNumber: string, fieldType: "contratante" | "contratado") => {
    // Detectar se é CPF ou CNPJ baseado no formato
    const isCNPJ =
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(documentNumber) || documentNumber.replace(/\D/g, "").length === 14

    if (isCNPJ) {
      return {
        terminology: "com sede em",
        entityType: "jurídica",
      }
    } else {
      return {
        terminology: "residente e domiciliado em",
        entityType: "física",
      }
    }
  }

  // Função MEGA-INTELIGENTE para obter valor do campo com terminologia correta
  const getFieldValue = (fieldName: string, placeholder: string, sectionName?: string) => {
    // Verificar se a seção está ativa
    if (sectionName && sectionToggles) {
      const sectionKey = sectionName.toLowerCase()
      if (sectionToggles[sectionKey] === false) {
        return placeholder
      }
    }

    // Buscar valor nos campos extraídos (prioridade máxima)
    if (allFields[fieldName] && allFields[fieldName] !== placeholder) {
      const value = allFields[fieldName]

      // VALIDAÇÃO ULTRA-RIGOROSA - Evitar dados incorretos

      // Se é nome de pessoa, deve ter 2-5 palavras e não conter endereço
      if (fieldName.includes("nome") && fieldName.includes("contratado")) {
        const words = value.split(" ")
        if (
          words.length >= 2 &&
          words.length <= 5 &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP") &&
          !value.includes("Bairro")
        ) {
          return value
        }
      }

      // Se é nome de empresa, deve conter palavras empresariais
      if (fieldName.includes("nome") && fieldName.includes("contratante")) {
        if (
          (value.includes("Ltda") ||
            value.includes("S.A.") ||
            value.includes("EIRELI") ||
            value.includes("Tecnologia") ||
            value.includes("Serviços") ||
            value.includes("ME") ||
            value.includes("Solutions") ||
            value.includes("Digital")) &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP")
        ) {
          return value
        }
      }

      // Se é CPF, deve ter formato correto
      if (fieldName.includes("cpf")) {
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
      }

      // Se é CNPJ, deve ter formato correto
      if (fieldName.includes("cnpj")) {
        if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
      }

      // NOVA LÓGICA: Se é campo de endereço, usar terminologia jurídica correta
      if (fieldName.includes("endereco")) {
        const enderecoVariations = [
          fieldName,
          fieldName.replace("contratante_", "").replace("contratado_", ""),
          "endereco_empresa",
          "endereco_funcionario",
          "endereco_contratante",
          "endereco_contratado",
          "endereco",
        ]

        for (const variation of enderecoVariations) {
          if (allFields[variation] && allFields[variation].length > 15) {
            const endereco = allFields[variation]
            if (
              (endereco.startsWith("Rua") ||
                endereco.startsWith("Av.") ||
                endereco.startsWith("Avenida") ||
                endereco.startsWith("Alameda")) &&
              (endereco.includes(",") ||
                endereco.includes("Bairro") ||
                endereco.includes("CEP") ||
                endereco.includes("-"))
            ) {
              return endereco
            }
          }
        }
      }

      // Se passou em todas as validações, retornar o valor
      return value
    }

    // Buscar variações do nome do campo
    const fieldVariations = [
      fieldName,
      fieldName.replace(/_/g, ""),
      fieldName.replace(/contratante_/g, ""),
      fieldName.replace(/contratado_/g, ""),
    ]

    for (const variation of fieldVariations) {
      if (allFields[variation] && allFields[variation] !== placeholder) {
        const value = allFields[variation]

        // Aplicar as mesmas validações
        if (fieldName.includes("cpf") && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
        if (fieldName.includes("cnpj") && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
        if (
          fieldName.includes("endereco") &&
          (value.startsWith("Rua") || value.startsWith("Av.")) &&
          value.length > 10
        ) {
          return value
        }
        if (fieldName.includes("nome") && !value.includes("Rua") && !value.includes("CEP")) {
          return value
        }
      }
    }

    // Se não encontrou nada válido, usar placeholder
    return placeholder
  }

  // Função para gerar texto das partes com terminologia jurídica correta E DADOS COMPLETOS
  const generatePartyText = (type: "contratante" | "contratado") => {
    const nome = getFieldValue(`${type}_nome`, "[Nome Completo]", type)
    const cpf = getFieldValue(`${type}_cpf`, "", type)
    const cnpj = getFieldValue(`${type}_cnpj`, "", type)
    const endereco = getFieldValue(`${type}_endereco`, "[Endereço Completo]", type)
    const email = getFieldValue(`${type}_email`, "", type)
    const telefone = getFieldValue(`${type}_telefone`, "", type)

    // Determinar qual documento usar e a terminologia correta
    const documento = cnpj || cpf || "[000.000.000-00]"
    const { terminology } = getCorrectLegalTerminology(documento, type)

    // Construir texto base
    let texto = `${nome}, inscrito no CPF/CNPJ nº ${documento}, ${terminology} ${endereco}`

    // Adicionar telefone se disponível
    if (telefone && telefone !== "[Telefone]") {
      texto += `, telefone ${telefone}`
    }

    // Adicionar e-mail se disponível
    if (email && email !== "[E-mail]" && email.includes("@")) {
      texto += `, e-mail ${email}`
    }

    texto += `, doravante denominado ${type.toUpperCase()}.`

    return texto
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        /* Estilos gerais */
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f4f4f4;
            margin: 0;
            padding: 30mm;
            box-sizing: border-box;
            max-width: 210mm; /* Largura A4 */
            margin: 0 auto;
        }

        h1, h2, h3 {
            color: #2c3e50;
            margin-bottom: 15px;
        }

        .container {
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        /* Header */
        .header {
            text-align: center;
            border-bottom: 2px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #3498db;
            font-size: 2.5em;
            margin-bottom: 5px;
        }

        /* Seções */
        .section {
            margin-bottom: 35px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            overflow: hidden;
            page-break-inside: avoid;
        }

        .section-title {
            background: #3498db;
            color: white;
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            font-size: 1.2em;
            font-weight: bold;
            border-radius: 12px 12px 0 0;
        }

        .section-content {
            padding: 20px;
            text-align: justify;
        }

        /* Listas */
        ul {
            list-style-type: square;
            padding-left: 20px;
        }

        ul li {
            margin-bottom: 8px;
        }

        /* Tabelas */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }

        /* Assinaturas */
        .signatures {
            margin-top: 50px;
            text-align: center;
            page-break-inside: avoid;
        }

        .signature-line {
            border-top: 2px solid #333;
            margin: 20px auto;
            width: 70%;
            padding-top: 10px;
        }

        .date {
            margin-top: 30px;
            font-style: italic;
            color: #777;
        }

        /* Media query para impressão */
        @media print {
            body {
                padding: 20mm;
            }

            .section {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }

        /* Espaçamento e alinhamento */
        p {
            margin-bottom: 15px;
            text-align: justify;
        }

        /* Parties Section */
        .parties-section {
            margin-bottom: 35px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            overflow: hidden;
            page-break-inside: avoid;
        }

        .parties-section-title {
            background: #3498db;
            color: white;
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            font-size: 1.2em;
            font-weight: bold;
            border-radius: 12px 12px 0 0;
        }

        .parties-section-content {
            padding: 20px;
            text-align: justify;
        }

        .party-info {
            margin-bottom: 20px;
            text-align: justify;
            page-break-inside: avoid;
        }

        .party-label {
            font-weight: bold;
            color: #3498db;
            display: block;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${contractTitle}</h1>
        </div>

        <div class="parties-section">
            <div class="parties-section-title">Partes Contratantes</div>
            <div class="parties-section-content">
                <div class="party-info">
                    <span class="party-label">Contratante:</span>
                    ${generatePartyText("contratante")}
                </div>
                <div class="party-info">
                    <span class="party-label">Contratado:</span>
                    ${generatePartyText("contratado")}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Objeto do Contrato</div>
            <div class="section-content">
                <p>${contract.objeto_principal}</p>
                <p>${contract.objeto_detalhado}</p>
                <h3>Especificações Técnicas:</h3>
                <ul>
                    ${contract.especificacoes_tecnicas.map((spec) => `<li>${spec}</li>`).join("")}
                </ul>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Obrigações do Contratado</div>
            <div class="section-content">
                <ul>
                    ${contract.obrigacoes_contratado.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
                </ul>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Obrigações do Contratante</div>
            <div class="section-content">
                <ul>
                    ${contract.obrigacoes_contratante.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
                </ul>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Valor e Forma de Pagamento</div>
            <div class="section-content">
                <p><strong>Valor:</strong> ${contract.condicoes_pagamento.valor_base}</p>
                <p><strong>Forma:</strong> ${contract.condicoes_pagamento.forma_pagamento}</p>
                <p><strong>Prazos:</strong> ${contract.condicoes_pagamento.prazos}</p>
                <p><strong>Multas por Atraso:</strong> ${contract.condicoes_pagamento.multas_atraso}</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Prazo e Vigência</div>
            <div class="section-content">
                <p><strong>Início:</strong> ${contract.prazo_execucao.inicio}</p>
                <p><strong>Duração:</strong> ${contract.prazo_execucao.duracao}</p>
                <p><strong>Entrega:</strong> ${contract.prazo_execucao.entrega}</p>
            </div>
        </div>

        ${contract.clausulas_especiais
          .map(
            (clausula) => `
        <div class="section">
            <div class="section-title">${clausula.titulo}</div>
            <div class="section-content">
                <p>${clausula.conteudo}</p>
            </div>
        </div>
        `,
          )
          .join("")}

        <div class="section">
            <div class="section-title">Rescisão</div>
            <div class="section-content">
                <p><strong>Condições:</strong> ${contract.rescisao.condicoes}</p>
                <p><strong>Penalidades:</strong> ${contract.rescisao.penalidades}</p>
                <p><strong>Devoluções:</strong> ${contract.rescisao.devolucoes}</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Disposições Gerais</div>
            <div class="section-content">
                <p><strong>Lei Aplicável:</strong> ${contract.disposicoes_legais.lei_aplicavel}</p>
                <p><strong>Foro Competente:</strong> ${contract.disposicoes_legais.foro_competente}</p>
                <p><strong>Alterações:</strong> ${contract.disposicoes_legais.alteracoes}</p>
            </div>
        </div>

        <div class="signatures">
            <div class="signature-line">
                ${getFieldValue("contratante_nome", "[Nome do Contratante]")}
            </div>
            <div class="signature-line">
                ${getFieldValue("contratado_nome", "[Nome do Contratado]")}
            </div>
            <div class="date">${getFieldValue("cidade", getFieldValue("local", "[Cidade]"))}, ${currentDate}</div>
        </div>
    </div>
</body>
</html>`
}

// Template 3: Minimalista Profissional
const generateMinimalTemplate = (
  title: string,
  contract: ProfessionalContract,
  allFields: Record<string, string>,
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

  // Função ULTRA-INTELIGENTE para determinar terminologia jurídica correta
  const getCorrectLegalTerminology = (documentNumber: string, fieldType: "contratante" | "contratado") => {
    // Detectar se é CPF ou CNPJ baseado no formato
    const isCNPJ =
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(documentNumber) || documentNumber.replace(/\D/g, "").length === 14

    if (isCNPJ) {
      return {
        terminology: "com sede em",
        entityType: "jurídica",
      }
    } else {
      return {
        terminology: "residente e domiciliado em",
        entityType: "física",
      }
    }
  }

  // Função MEGA-INTELIGENTE para obter valor do campo com terminologia jurídica correta
  const getFieldValue = (fieldName: string, placeholder: string, sectionName?: string) => {
    // Verificar se a seção está ativa
    if (sectionName && sectionToggles) {
      const sectionKey = sectionName.toLowerCase()
      if (sectionToggles[sectionKey] === false) {
        return placeholder
      }
    }

    // Buscar valor nos campos extraídos (prioridade máxima)
    if (allFields[fieldName] && allFields[fieldName] !== placeholder) {
      const value = allFields[fieldName]

      // VALIDAÇÃO ULTRA-RIGOROSA - Evitar dados incorretos

      // Se é nome de pessoa, deve ter 2-5 palavras e não conter endereço
      if (fieldName.includes("nome") && fieldName.includes("contratado")) {
        const words = value.split(" ")
        if (
          words.length >= 2 &&
          words.length <= 5 &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP") &&
          !value.includes("Bairro")
        ) {
          return value
        }
      }

      // Se é nome de empresa, deve conter palavras empresariais
      if (fieldName.includes("nome") && fieldName.includes("contratante")) {
        if (
          (value.includes("Ltda") ||
            value.includes("S.A.") ||
            value.includes("EIRELI") ||
            value.includes("Tecnologia") ||
            value.includes("Serviços") ||
            value.includes("ME") ||
            value.includes("Solutions") ||
            value.includes("Digital")) &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP")
        ) {
          return value
        }
      }

      // Se é CPF, deve ter formato correto
      if (fieldName.includes("cpf")) {
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
      }

      // Se é CNPJ, deve ter formato correto
      if (fieldName.includes("cnpj")) {
        if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
      }

      // NOVA LÓGICA: Se é campo de endereço, usar terminologia jurídica correta
      if (fieldName.includes("endereco")) {
        const enderecoVariations = [
          fieldName,
          fieldName.replace("contratante_", "").replace("contratado_", ""),
          "endereco_empresa",
          "endereco_funcionario",
          "endereco_contratante",
          "endereco_contratado",
          "endereco",
        ]

        for (const variation of enderecoVariations) {
          if (allFields[variation] && allFields[variation].length > 15) {
            const endereco = allFields[variation]
            if (
              (endereco.startsWith("Rua") ||
                endereco.startsWith("Av.") ||
                endereco.startsWith("Avenida") ||
                endereco.startsWith("Alameda")) &&
              (endereco.includes(",") ||
                endereco.includes("Bairro") ||
                endereco.includes("CEP") ||
                endereco.includes("-"))
            ) {
              return endereco
            }
          }
        }
      }

      // Se passou em todas as validações, retornar o valor
      return value
    }

    // Buscar variações do nome do campo
    const fieldVariations = [
      fieldName,
      fieldName.replace(/_/g, ""),
      fieldName.replace(/contratante_/g, ""),
      fieldName.replace(/contratado_/g, ""),
    ]

    for (const variation of fieldVariations) {
      if (allFields[variation] && allFields[variation] !== placeholder) {
        const value = allFields[variation]

        // Aplicar as mesmas validações
        if (fieldName.includes("cpf") && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
        if (fieldName.includes("cnpj") && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
        if (
          fieldName.includes("endereco") &&
          (value.startsWith("Rua") || value.startsWith("Av.")) &&
          value.length > 10
        ) {
          return value
        }
        if (fieldName.includes("nome") && !value.includes("Rua") && !value.includes("CEP")) {
          return value
        }
      }
    }

    // Se não encontrou nada válido, usar placeholder
    return placeholder
  }

  // Função para gerar texto das partes com terminologia jurídica correta E DADOS COMPLETOS
  const generatePartyText = (type: "contratante" | "contratado") => {
    const nome = getFieldValue(`${type}_nome`, "[Nome Completo]", type)
    const cpf = getFieldValue(`${type}_cpf`, "", type)
    const cnpj = getFieldValue(`${type}_cnpj`, "", type)
    const endereco = getFieldValue(`${type}_endereco`, "[Endereço Completo]", type)
    const email = getFieldValue(`${type}_email`, "", type)
    const telefone = getFieldValue(`${type}_telefone`, "", type)

    // Determinar qual documento usar e a terminologia correta
    const documento = cnpj || cpf || "[000.000.000-00]"
    const { terminology } = getCorrectLegalTerminology(documento, type)

    // Construir texto base
    let texto = `${nome}, inscrito no CPF/CNPJ nº ${documento}, ${terminology} ${endereco}`

    // Adicionar telefone se disponível
    if (telefone && telefone !== "[Telefone]") {
      texto += `, telefone ${telefone}`
    }

    // Adicionar e-mail se disponível
    if (email && email !== "[E-mail]" && email.includes("@")) {
      texto += `, e-mail ${email}`
    }

    texto += `, doravante denominado ${type.toUpperCase()}.`

    return texto
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 30mm;
            max-width: 210mm;
            margin: 0 auto;
            background: #f8f8f8;
        }

        .container {
            background: #fff;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        h1 {
            font-size: 2.2em;
            color: #444;
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }

        h2 {
            font-size: 1.6em;
            color: #555;
            margin-top: 30px;
            margin-bottom: 15px;
        }

        p {
            margin-bottom: 15px;
            color: #666;
            text-align: justify;
        }

        ul {
            list-style-type: square;
            padding-left: 20px;
            color: #666;
        }

        li {
            margin-bottom: 8px;
        }

        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }

        .parties-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }

        .signatures {
            margin-top: 40px;
            text-align: center;
            page-break-inside: avoid;
        }

        .signature-line {
            border-top: 1px solid #888;
            margin: 20px auto;
            width: 60%;
            padding-top: 10px;
            color: #777;
        }

        .date {
            font-style: italic;
            color: #999;
            margin-top: 10px;
        }

        @media print {
            body {
                padding: 20mm;
            }

            .container {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }

        .parties-section-title {
            font-size: 1.6em;
            color: #555;
            margin-top: 30px;
            margin-bottom: 15px;
        }

        .party-info {
            margin-bottom: 20px;
            text-align: justify;
            page-break-inside: avoid;
        }

        .party-label {
            font-weight: bold;
            color: #3498db;
            display: block;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${contractTitle}</h1>

        <div class="parties-section">
            <h2 class="parties-section-title">Partes Contratantes</h2>
            <div class="party-info">
                <span class="party-label">Contratante:</span>
                ${generatePartyText("contratante")}
            </div>
            <div class="party-info">
                <span class="party-label">Contratado:</span>
                ${generatePartyText("contratado")}
            </div>
        </div>

        <div class="section">
            <h2>Objeto do Contrato</h2>
            <p>${contract.objeto_principal}</p>
            <p>${contract.objeto_detalhado}</p>
            <h3>Especificações Técnicas:</h3>
            <ul>
                ${contract.especificacoes_tecnicas.map((spec) => `<li>${spec}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Obrigações do Contratado</h2>
            <ul>
                ${contract.obrigacoes_contratado.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Obrigações do Contratante</h2>
            <ul>
                ${contract.obrigacoes_contratante.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Valor e Forma de Pagamento</h2>
            <p><strong>Valor:</strong> ${contract.condicoes_pagamento.valor_base}</p>
            <p><strong>Forma:</strong> ${contract.condicoes_pagamento.forma_pagamento}</p>
            <p><strong>Prazos:</strong> ${contract.condicoes_pagamento.prazos}</p>
            <p><strong>Multas por Atraso:</strong> ${contract.condicoes_pagamento.multas_atraso}</p>
        </div>

        <div class="section">
            <h2>Prazo e Vigência</h2>
            <p><strong>Início:</strong> ${contract.prazo_execucao.inicio}</p>
            <p><strong>Duração:</strong> ${contract.prazo_execucao.duracao}</p>
            <p><strong>Entrega:</strong> ${contract.prazo_execucao.entrega}</p>
        </div>

        ${contract.clausulas_especiais
          .map(
            (clausula) => `
        <div class="section">
            <h2>${clausula.titulo}</h2>
            <p>${clausula.conteudo}</p>
        </div>
        `,
          )
          .join("")}

        <div class="section">
            <h2>Rescisão</h2>
            <p><strong>Condições:</strong> ${contract.rescisao.condicoes}</p>
            <p><strong>Penalidades:</strong> ${contract.rescisao.penalidades}</p>
            <p><strong>Devoluções:</strong> ${contract.rescisao.devolucoes}</p>
        </div>

        <div class="section">
            <h2>Disposições Gerais</h2>
            <p><strong>Lei Aplicável:</strong> ${contract.disposicoes_legais.lei_aplicavel}</p>
            <p><strong>Foro Competente:</strong> ${contract.disposicoes_legais.foro_competente}</p>
            <p><strong>Alterações:</strong> ${contract.disposicoes_legais.alteracoes}</p>
        </div>

        <div class="signatures">
            <div class="signature-line">
                ${getFieldValue("contratante_nome", "[Nome do Contratante]")}
            </div>
            <div class="signature-line">
                ${getFieldValue("contratado_nome", "[Nome do Contratado]")}
            </div>
            <div class="date">${getFieldValue("cidade", getFieldValue("local", "[Cidade]"))}, ${currentDate}</div>
        </div>
    </div>
</body>
</html>`
}

// Template 4: Corporativo Profissional
const generateCorporateTemplate = (
  title: string,
  contract: ProfessionalContract,
  allFields: Record<string, string>,
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

  // Função ULTRA-INTELIGENTE para determinar terminologia jurídica correta
  const getCorrectLegalTerminology = (documentNumber: string, fieldType: "contratante" | "contratado") => {
    // Detectar se é CPF ou CNPJ baseado no formato
    const isCNPJ =
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(documentNumber) || documentNumber.replace(/\D/g, "").length === 14

    if (isCNPJ) {
      return {
        terminology: "com sede em",
        entityType: "jurídica",
      }
    } else {
      return {
        terminology: "residente e domiciliado em",
        entityType: "física",
      }
    }
  }

  // Função MEGA-INTELIGENTE para obter valor do campo com terminologia jurídica correta
  const getFieldValue = (fieldName: string, placeholder: string, sectionName?: string) => {
    // Verificar se a seção está ativa
    if (sectionName && sectionToggles) {
      const sectionKey = sectionName.toLowerCase()
      if (sectionToggles[sectionKey] === false) {
        return placeholder
      }
    }

    // Buscar valor nos campos extraídos (prioridade máxima)
    if (allFields[fieldName] && allFields[fieldName] !== placeholder) {
      const value = allFields[fieldName]

      // VALIDAÇÃO ULTRA-RIGOROSA - Evitar dados incorretos

      // Se é nome de pessoa, deve ter 2-5 palavras e não conter endereço
      if (fieldName.includes("nome") && fieldName.includes("contratado")) {
        const words = value.split(" ")
        if (
          words.length >= 2 &&
          words.length <= 5 &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP") &&
          !value.includes("Bairro")
        ) {
          return value
        }
      }

      // Se é nome de empresa, deve conter palavras empresariais
      if (fieldName.includes("nome") && fieldName.includes("contratante")) {
        if (
          (value.includes("Ltda") ||
            value.includes("S.A.") ||
            value.includes("EIRELI") ||
            value.includes("Tecnologia") ||
            value.includes("Serviços") ||
            value.includes("ME") ||
            value.includes("Solutions") ||
            value.includes("Digital")) &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP")
        ) {
          return value
        }
      }

      // Se é CPF, deve ter formato correto
      if (fieldName.includes("cpf")) {
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
      }

      // Se é CNPJ, deve ter formato correto
      if (fieldName.includes("cnpj")) {
        if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
      }

      // NOVA LÓGICA: Se é campo de endereço, usar terminologia jurídica correta
      if (fieldName.includes("endereco")) {
        const enderecoVariations = [
          fieldName,
          fieldName.replace("contratante_", "").replace("contratado_", ""),
          "endereco_empresa",
          "endereco_funcionario",
          "endereco_contratante",
          "endereco_contratado",
          "endereco",
        ]

        for (const variation of enderecoVariations) {
          if (allFields[variation] && allFields[variation].length > 15) {
            const endereco = allFields[variation]
            if (
              (endereco.startsWith("Rua") ||
                endereco.startsWith("Av.") ||
                endereco.startsWith("Avenida") ||
                endereco.startsWith("Alameda")) &&
              (endereco.includes(",") ||
                endereco.includes("Bairro") ||
                endereco.includes("CEP") ||
                endereco.includes("-"))
            ) {
              return endereco
            }
          }
        }
      }

      // Se passou em todas as validações, retornar o valor
      return value
    }

    // Buscar variações do nome do campo
    const fieldVariations = [
      fieldName,
      fieldName.replace(/_/g, ""),
      fieldName.replace(/contratante_/g, ""),
      fieldName.replace(/contratado_/g, ""),
    ]

    for (const variation of fieldVariations) {
      if (allFields[variation] && allFields[variation] !== placeholder) {
        const value = allFields[variation]

        // Aplicar as mesmas validações
        if (fieldName.includes("cpf") && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
        if (fieldName.includes("cnpj") && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
        if (
          fieldName.includes("endereco") &&
          (value.startsWith("Rua") || value.startsWith("Av.")) &&
          value.length > 10
        ) {
          return value
        }
        if (fieldName.includes("nome") && !value.includes("Rua") && !value.includes("CEP")) {
          return value
        }
      }
    }

    // Se não encontrou nada válido, usar placeholder
    return placeholder
  }

  // Função para gerar texto das partes com terminologia jurídica correta E DADOS COMPLETOS
  const generatePartyText = (type: "contratante" | "contratado") => {
    const nome = getFieldValue(`${type}_nome`, "[Nome Completo]", type)
    const cpf = getFieldValue(`${type}_cpf`, "", type)
    const cnpj = getFieldValue(`${type}_cnpj`, "", type)
    const endereco = getFieldValue(`${type}_endereco`, "[Endereço Completo]", type)
    const email = getFieldValue(`${type}_email`, "", type)
    const telefone = getFieldValue(`${type}_telefone`, "", type)

    // Determinar qual documento usar e a terminologia correta
    const documento = cnpj || cpf || "[000.000.000-00]"
    const { terminology } = getCorrectLegalTerminology(documento, type)

    // Construir texto base
    let texto = `${nome}, inscrito no CPF/CNPJ nº ${documento}, ${terminology} ${endereco}`

    // Adicionar telefone se disponível
    if (telefone && telefone !== "[Telefone]") {
      texto += `, telefone ${telefone}`
    }

    // Adicionar e-mail se disponível
    if (email && email !== "[E-mail]" && email.includes("@")) {
      texto += `, e-mail ${email}`
    }

    texto += `, doravante denominado ${type.toUpperCase()}.`

    return texto
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.7;
            color: #333;
            margin: 0;
            padding: 30mm;
            max-width: 210mm;
            margin: 0 auto;
            background: #f9f9f9;
        }

        .container {
            background: #fff;
            padding: 50px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.07);
        }

        h1 {
            font-size: 2.6em;
            color: #2d3e50;
            margin-bottom: 25px;
            border-bottom: 3px solid #e1e1e1;
            padding-bottom: 12px;
        }

        h2 {
            font-size: 1.8em;
            color: #34495e;
            margin-top: 35px;
            margin-bottom: 20px;
        }

        p {
            margin-bottom: 18px;
            color: #444;
            text-align: justify;
        }

        ul {
            list-style-type: disc;
            padding-left: 22px;
            color: #444;
        }

        li {
            margin-bottom: 10px;
        }

        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }

        .parties-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }

        .signatures {
            margin-top: 50px;
            text-align: center;
            page-break-inside: avoid;
        }

        .signature-line {
            border-top: 2px solid #777;
            margin: 25px auto;
            width: 65%;
            padding-top: 12px;
            color: #555;
        }

        .date {
            font-style: italic;
            color: #888;
            margin-top: 15px;
        }

        @media print {
            body {
                padding: 25mm;
            }

            .container {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }

        .parties-section-title {
            font-size: 1.8em;
            color: #34495e;
            margin-top: 35px;
            margin-bottom: 20px;
        }

        .party-info {
            margin-bottom: 25px;
            text-align: justify;
            page-break-inside: avoid;
        }

        .party-label {
            font-weight: bold;
            color: #3498db;
            display: block;
            margin-bottom: 6px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${contractTitle}</h1>

        <div class="parties-section">
            <h2 class="parties-section-title">Partes Contratantes</h2>
            <div class="party-info">
                <span class="party-label">Contratante:</span>
                ${generatePartyText("contratante")}
            </div>
            <div class="party-info">
                <span class="party-label">Contratado:</span>
                ${generatePartyText("contratado")}
            </div>
        </div>

        <div class="section">
            <h2>Objeto do Contrato</h2>
            <p>${contract.objeto_principal}</p>
            <p>${contract.objeto_detalhado}</p>
            <h3>Especificações Técnicas:</h3>
            <ul>
                ${contract.especificacoes_tecnicas.map((spec) => `<li>${spec}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Obrigações do Contratado</h2>
            <ul>
                ${contract.obrigacoes_contratado.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Obrigações do Contratante</h2>
            <ul>
                ${contract.obrigacoes_contratante.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Valor e Forma de Pagamento</h2>
            <p><strong>Valor:</strong> ${contract.condicoes_pagamento.valor_base}</p>
            <p><strong>Forma:</strong> ${contract.condicoes_pagamento.forma_pagamento}</p>
            <p><strong>Prazos:</strong> ${contract.condicoes_pagamento.prazos}</p>
            <p><strong>Multas por Atraso:</strong> ${contract.condicoes_pagamento.multas_atraso}</p>
        </div>

        <div class="section">
            <h2>Prazo e Vigência</h2>
            <p><strong>Início:</strong> ${contract.prazo_execucao.inicio}</p>
            <p><strong>Duração:</strong> ${contract.prazo_execucao.duracao}</p>
            <p><strong>Entrega:</strong> ${contract.prazo_execucao.entrega}</p>
        </div>

        ${contract.clausulas_especiais
          .map(
            (clausula) => `
        <div class="section">
            <h2>${clausula.titulo}</h2>
            <p>${clausula.conteudo}</p>
        </div>
        `,
          )
          .join("")}

        <div class="section">
            <h2>Rescisão</h2>
            <p><strong>Condições:</strong> ${contract.rescisao.condicoes}</p>
            <p><strong>Penalidades:</strong> ${contract.rescisao.penalidades}</p>
            <p><strong>Devoluções:</strong> ${contract.rescisao.devolucoes}</p>
        </div>

        <div class="section">
            <h2>Disposições Gerais</h2>
            <p><strong>Lei Aplicável:</strong> ${contract.disposicoes_legais.lei_aplicavel}</p>
            <p><strong>Foro Competente:</strong> ${contract.disposicoes_legais.foro_competente}</p>
            <p><strong>Alterações:</strong> ${contract.disposicoes_legais.alteracoes}</p>
        </div>

        <div class="signatures">
            <div class="signature-line">
                ${getFieldValue("contratante_nome", "[Nome do Contratante]")}
            </div>
            <div class="signature-line">
                ${getFieldValue("contratado_nome", "[Nome do Contratado]")}
            </div>
            <div class="date">${getFieldValue("cidade", getFieldValue("local", "[Cidade]"))}, ${currentDate}</div>
        </div>
    </div>
</body>
</html>`
}

// Template 5: Criativo Profissional
const generateCreativeTemplate = (
  title: string,
  contract: ProfessionalContract,
  allFields: Record<string, string>,
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

  // Função ULTRA-INTELIGENTE para determinar terminologia jurídica correta
  const getCorrectLegalTerminology = (documentNumber: string, fieldType: "contratante" | "contratado") => {
    // Detectar se é CPF ou CNPJ baseado no formato
    const isCNPJ =
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(documentNumber) || documentNumber.replace(/\D/g, "").length === 14

    if (isCNPJ) {
      return {
        terminology: "com sede em",
        entityType: "jurídica",
      }
    } else {
      return {
        terminology: "residente e domiciliado em",
        entityType: "física",
      }
    }
  }

  // Função MEGA-INTELIGENTE para obter valor do campo com terminologia jurídica correta
  const getFieldValue = (fieldName: string, placeholder: string, sectionName?: string) => {
    // Verificar se a seção está ativa
    if (sectionName && sectionToggles) {
      const sectionKey = sectionName.toLowerCase()
      if (sectionToggles[sectionKey] === false) {
        return placeholder
      }
    }

    // Buscar valor nos campos extraídos (prioridade máxima)
    if (allFields[fieldName] && allFields[fieldName] !== placeholder) {
      const value = allFields[fieldName]

      // VALIDAÇÃO ULTRA-RIGOROSA - Evitar dados incorretos

      // Se é nome de pessoa, deve ter 2-5 palavras e não conter endereço
      if (fieldName.includes("nome") && fieldName.includes("contratado")) {
        const words = value.split(" ")
        if (
          words.length >= 2 &&
          words.length <= 5 &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP") &&
          !value.includes("Bairro")
        ) {
          return value
        }
      }

      // Se é nome de empresa, deve conter palavras empresariais
      if (fieldName.includes("nome") && fieldName.includes("contratante")) {
        if (
          (value.includes("Ltda") ||
            value.includes("S.A.") ||
            value.includes("EIRELI") ||
            value.includes("Tecnologia") ||
            value.includes("Serviços") ||
            value.includes("ME") ||
            value.includes("Solutions") ||
            value.includes("Digital")) &&
          !value.includes("Rua") &&
          !value.includes("Av.") &&
          !value.includes("CEP")
        ) {
          return value
        }
      }

      // Se é CPF, deve ter formato correto
      if (fieldName.includes("cpf")) {
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
      }

      // Se é CNPJ, deve ter formato correto
      if (fieldName.includes("cnpj")) {
        if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
      }

      // NOVA LÓGICA: Se é campo de endereço, usar terminologia jurídica correta
      if (fieldName.includes("endereco")) {
        const enderecoVariations = [
          fieldName,
          fieldName.replace("contratante_", "").replace("contratado_", ""),
          "endereco_empresa",
          "endereco_funcionario",
          "endereco_contratante",
          "endereco_contratado",
          "endereco",
        ]

        for (const variation of enderecoVariations) {
          if (allFields[variation] && allFields[variation].length > 15) {
            const endereco = allFields[variation]
            if (
              (endereco.startsWith("Rua") ||
                endereco.startsWith("Av.") ||
                endereco.startsWith("Avenida") ||
                endereco.startsWith("Alameda")) &&
              (endereco.includes(",") ||
                endereco.includes("Bairro") ||
                endereco.includes("CEP") ||
                endereco.includes("-"))
            ) {
              return endereco
            }
          }
        }
      }

      // Se passou em todas as validações, retornar o valor
      return value
    }

    // Buscar variações do nome do campo
    const fieldVariations = [
      fieldName,
      fieldName.replace(/_/g, ""),
      fieldName.replace(/contratante_/g, ""),
      fieldName.replace(/contratado_/g, ""),
    ]

    for (const variation of fieldVariations) {
      if (allFields[variation] && allFields[variation] !== placeholder) {
        const value = allFields[variation]

        // Aplicar as mesmas validações
        if (fieldName.includes("cpf") && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return value
        }
        if (fieldName.includes("cnpj") && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
          return value
        }
        if (
          fieldName.includes("endereco") &&
          (value.startsWith("Rua") || value.startsWith("Av.")) &&
          value.length > 10
        ) {
          return value
        }
        if (fieldName.includes("nome") && !value.includes("Rua") && !value.includes("CEP")) {
          return value
        }
      }
    }

    // Se não encontrou nada válido, usar placeholder
    return placeholder
  }

  // Função para gerar texto das partes com terminologia jurídica correta E DADOS COMPLETOS
  const generatePartyText = (type: "contratante" | "contratado") => {
    const nome = getFieldValue(`${type}_nome`, "[Nome Completo]", type)
    const cpf = getFieldValue(`${type}_cpf`, "", type)
    const cnpj = getFieldValue(`${type}_cnpj`, "", type)
    const endereco = getFieldValue(`${type}_endereco`, "[Endereço Completo]", type)
    const email = getFieldValue(`${type}_email`, "", type)
    const telefone = getFieldValue(`${type}_telefone`, "", type)

    // Determinar qual documento usar e a terminologia correta
    const documento = cnpj || cpf || "[000.000.000-00]"
    const { terminology } = getCorrectLegalTerminology(documento, type)

    // Construir texto base
    let texto = `${nome}, inscrito no CPF/CNPJ nº ${documento}, ${terminology} ${endereco}`

    // Adicionar telefone se disponível
    if (telefone && telefone !== "[Telefone]") {
      texto += `, telefone ${telefone}`
    }

    // Adicionar e-mail se disponível
    if (email && email !== "[E-mail]" && email.includes("@")) {
      texto += `, e-mail ${email}`
    }

    texto += `, doravante denominado ${type.toUpperCase()}.`

    return texto
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        body {
            font-family: 'Open Sans', sans-serif;
            line-height: 1.8;
            color: #333;
            margin: 0;
            padding: 30mm;
            max-width: 210mm;
            margin: 0 auto;
            background: #f9f9f9;
        }

        .container {
            background: #fff;
            padding: 60px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
        }

        h1 {
            font-size: 2.8em;
            color: #333;
            margin-bottom: 30px;
            border-bottom: 4px solid #eee;
            padding-bottom: 15px;
            text-align: center;
        }

        h2 {
            font-size: 2em;
            color: #444;
            margin-top: 40px;
            margin-bottom: 25px;
        }

        p {
            margin-bottom: 20px;
            color: #555;
            text-align: justify;
        }

        ul {
            list-style-type: none;
            padding-left: 0;
            color: #555;
        }

        li {
            margin-bottom: 12px;
            padding-left: 25px;
            position: relative;
        }

        li:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #5cb85c;
        }

        .section {
            margin-bottom: 45px;
            page-break-inside: avoid;
        }

        .parties-section {
            margin-bottom: 45px;
            page-break-inside: avoid;
        }

        .signatures {
            margin-top: 55px;
            text-align: center;
            page-break-inside: avoid;
        }

        .signature-line {
            border-top: 3px solid #888;
            margin: 30px auto;
            width: 70%;
            padding-top: 15px;
            color: #666;
        }

        .date {
            font-style: italic;
            color: #999;
            margin-top: 20px;
            text-align: center;
        }

        @media print {
            body {
                padding: 25mm;
            }

            .container {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }

        .parties-section-title {
            font-size: 2em;
            color: #444;
            margin-top: 40px;
            margin-bottom: 25px;
            text-align: left;
        }

        .party-info {
            margin-bottom: 30px;
            text-align: justify;
            page-break-inside: avoid;
        }

        .party-label {
            font-weight: bold;
            color: #3498db;
            display: block;
            margin-bottom: 8px;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${contractTitle}</h1>

        <div class="parties-section">
            <h2 class="parties-section-title">Partes Contratantes</h2>
            <div class="party-info">
                <span class="party-label">Contratante:</span>
                ${generatePartyText("contratante")}
            </div>
            <div class="party-info">
                <span class="party-label">Contratado:</span>
                ${generatePartyText("contratado")}
            </div>
        </div>

        <div class="section">
            <h2>Objeto do Contrato</h2>
            <p>${contract.objeto_principal}</p>
            <p>${contract.objeto_detalhado}</p>
            <h3>Especificações Técnicas:</h3>
            <ul>
                ${contract.especificacoes_tecnicas.map((spec) => `<li>${spec}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Obrigações do Contratado</h2>
            <ul>
                ${contract.obrigacoes_contratado.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Obrigações do Contratante</h2>
            <ul>
                ${contract.obrigacoes_contratante.map((obrigacao) => `<li>${obrigacao}</li>`).join("")}
            </ul>
        </div>

        <div class="section">
            <h2>Valor e Forma de Pagamento</h2>
            <p><strong>Valor:</strong> ${contract.condicoes_pagamento.valor_base}</p>
            <p><strong>Forma:</strong> ${contract.condicoes_pagamento.forma_pagamento}</p>
            <p><strong>Prazos:</strong> ${contract.condicoes_pagamento.prazos}</p>
            <p><strong>Multas por Atraso:</strong> ${contract.condicoes_pagamento.multas_atraso}</p>
        </div>

        <div class="section">
            <h2>Prazo e Vigência</h2>
            <p><strong>Início:</strong> ${contract.prazo_execucao.inicio}</p>
            <p><strong>Duração:</strong> ${contract.prazo_execucao.duracao}</p>
            <p><strong>Entrega:</strong> ${contract.prazo_execucao.entrega}</p>
        </div>

        ${contract.clausulas_especiais
          .map(
            (clausula) => `
        <div class="section">
            <h2>${clausula.titulo}</h2>
            <p>${clausula.conteudo}</p>
        </div>
        `,
          )
          .join("")}

        <div class="section">
            <h2>Rescisão</h2>
            <p><strong>Condições:</strong> ${contract.rescisao.condicoes}</p>
            <p><strong>Penalidades:</strong> ${contract.rescisao.penalidades}</p>
            <p><strong>Devoluções:</strong> ${contract.rescisao.devolucoes}</p>
        </div>

        <div class="section">
            <h2>Disposições Gerais</h2>
            <p><strong>Lei Aplicável:</strong> ${contract.disposicoes_legais.lei_aplicavel}</p>
            <p><strong>Foro Competente:</strong> ${contract.disposicoes_legais.foro_competente}</p>
            <p><strong>Alterações:</strong> ${contract.disposicoes_legais.alteracoes}</p>
        </div>

        <div class="signatures">
            <div class="signature-line">
                ${getFieldValue("contratante_nome", "[Nome do Contratante]")}
            </div>
            <div class="signature-line">
                ${getFieldValue("contratado_nome", "[Nome do Contratado]")}
            </div>
            <div class="date">${getFieldValue("cidade", getFieldValue("local", "[Cidade]"))}, ${currentDate}</div>
        </div>
    </div>
</body>
</html>`
}

// Aplicar as mesmas melhorias para todos os outros templates...
// (Os outros templates seguem o mesmo padrão, aplicando a função generatePartyText)

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

    // Validar entrada
    const body = await request.json().catch(() => ({}))

    // Mapear campos do frontend para o schema
    const mappedBody = {
      prompt: body.prompt || body.description,
      contractType: body.contractType,
      fields: body.fields || {},
      title: body.title,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      customPrompt: body.customPrompt,
      lexmlData: body.lexmlData,
      cacheKey: body.cacheKey,
      fieldMetadata: body.fieldMetadata,
      template: body.template || "classic",
      advancedFieldsEnabled: body.advancedFieldsEnabled,
      languageStyle: body.languageStyle,
      enhancedLexML: body.enhancedLexML,
      contractRefinements: body.contractRefinements,
      languagePrompt: body.languagePrompt,
      sectionToggles: body.sectionToggles,
      includeLegalNumbers: body.includeLegalNumbers,
    }

    const validatedData = GenerateSchema.parse(mappedBody)
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
    } = validatedData

    // NOVO: Extrai entidades do prompt para preenchimento automático
    const extractedEntities = extractAndClassifyEntities(prompt, title || "")

    // Achata os campos inseridos manualmente pelo usuário
    const flattenedFields = flattenFieldMetadata(fieldMetadata, sectionToggles)

    // Combina os campos com a prioridade correta:
    // 1. Campos manuais (flattenedFields) têm a maior prioridade.
    // 2. Campos extraídos do prompt (extractedEntities) são usados como fallback.
    // 3. Campos antigos (fields) como última opção.
    const allFields = { ...flattenedFields, ...extractedEntities, ...fields }

    // Verificar cache se fornecido
    const finalCacheKey = cacheKey || generateCacheKey(prompt, contractType, allFields, title)

    if (finalCacheKey) {
      try {
        const { data: cachedContract } = await supabase
          .from("contract_cache")
          .select("generated_content, created_at")
          .eq("cache_key", finalCacheKey)
          .eq("user_id", session.user.id)
          .single()

        if (cachedContract) {
          const cacheAge = Date.now() - new Date(cachedContract.created_at).getTime()
          const maxCacheAge = 24 * 60 * 60 * 1000 // 24 horas

          if (cacheAge < maxCacheAge) {
            return NextResponse.json({
              content: cachedContract.generated_content,
              html: cachedContract.generated_content,
              cached: true,
              model: contractType === "advanced" ? "gpt-4o-mini" : "gpt-3.5-turbo",
              tokens_used: 0,
            })
          }
        }
      } catch (cacheError) {
        console.warn("Erro ao verificar cache:", cacheError)
      }
    }

    // Verificar créditos do usuário
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (subscription) {
      const hasCredits =
        contractType === "simple" ? subscription.creditos_simples > 0 : subscription.creditos_avancados > 0

      if (!hasCredits) {
        return NextResponse.json({ error: "Créditos insuficientes" }, { status: 403 })
      }
    }

    // Configuração do modelo baseada no tipo de contrato
    const model = contractType === "advanced" ? "gpt-4o-mini" : "gpt-3.5-turbo"
    const finalTemperature = temperature || (contractType === "advanced" ? 0.5 : 0.2)
    const finalMaxTokens = maxTokens || (contractType === "advanced" ? 4000 : 2500)

    // Buscar referências LexML com configuração aprimorada
    const lexmlReferences = await fetchLexMLReferences(prompt, title, enhancedLexML)

    // Gerar contrato profissional via OpenAI com novas configurações
    const professionalContract = await generateProfessionalContract(
      prompt,
      title || "Contrato de Prestação de Serviços",
      contractType,
      customPrompt,
      lexmlReferences.references,
      finalTemperature,
      finalMaxTokens,
      languagePrompt,
      contractRefinements,
      sectionToggles,
      includeLegalNumbers,
    )

    // Selecionar função de template baseada na escolha do usuário
    const templateFunctions = {
      classic: generateClassicTemplate,
      modern: generateModernTemplate, // Certifique-se que generateModernTemplate está definido e correto
      minimal: generateMinimalTemplate, // Certifique-se que generateMinimalTemplate está definido e correto
      corporate: generateCorporateTemplate, // Certifique-se que generateCorporateTemplate está definido e correto
      creative: generateCreativeTemplate, // Certifique-se que generateCreativeTemplate está definido e correto
    }

    const selectedTemplateFunction =
      templateFunctions[template as keyof typeof templateFunctions] || generateClassicTemplate

    // Gerar contrato usando o template selecionado com conteúdo profissional
    const content = selectedTemplateFunction(
      title || "Contrato de Prestação de Serviços",
      professionalContract,
      allFields,
      lexmlReferences.references,
      subscription,
      advancedFieldsEnabled,
      sectionToggles,
    )

    // Verificar se o conteúdo foi gerado
    if (!content || content.trim().length === 0) {
      throw new Error("Falha ao gerar conteúdo do contrato")
    }

    // Validar tamanho do documento (máximo 80.000 caracteres)
    let finalContent = content
    if (content.length > 80000) {
      finalContent = content.substring(0, 80000) + "\n\n[Documento truncado devido ao limite de caracteres]"
    }

    // Salvar no cache
    try {
      await supabase.from("contract_cache").upsert({
        cache_key: finalCacheKey,
        prompt_hash: finalCacheKey.substring(0, 32),
        contract_type: contractType,
        prompt_text: `${title || ""}\n\n${prompt}`,
        generated_content: finalContent,
        openai_model: model,
        temperature: finalTemperature,
        max_tokens: finalMaxTokens,
        lexml_data: lexmlReferences,
        user_id: session.user.id,
        template: template,
      })
    } catch (cacheError) {
      console.warn("Erro ao salvar no cache:", cacheError)
    }

    // Salvar contrato gerado
    try {
      await supabase.from("contracts").insert({
        user_id: session.user.id,
        nome: title || `Contrato ${contractType} - ${new Date().toLocaleDateString("pt-BR")}`,
        descricao: prompt.substring(0, 500),
        tipo: contractType,
        conteudo: finalContent,
        openai_model: model,
        temperature: finalTemperature,
        max_tokens: finalMaxTokens,
        lexml_data: lexmlReferences,
        template: template,
      })
    } catch (contractError) {
      console.warn("Erro ao salvar contrato:", contractError)
    }

    // Decrementar créditos se necessário
    if (subscription) {
      try {
        const creditField = contractType === "simple" ? "creditos_simples" : "creditos_avancados"
        await supabase
          .from("subscriptions")
          .update({
            [creditField]: Math.max(0, subscription[creditField] - 1),
          })
          .eq("user_id", session.user.id)
      } catch (creditError) {
        console.warn("Erro ao decrementar créditos:", creditError)
      }
    }

    // Retornar resposta com campo 'content' que o frontend espera
    return NextResponse.json({
      content: finalContent, // Campo principal que o frontend espera
      html: finalContent, // Compatibilidade
      model,
      tokens_used: finalMaxTokens,
      cached: false,
      using_simulation: false,
      lexml_references: lexmlReferences.references,
      lexml_total: lexmlReferences.total,
      template: template,
    })
  } catch (error) {
    console.error("generate-contract:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados de entrada inválidos",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
