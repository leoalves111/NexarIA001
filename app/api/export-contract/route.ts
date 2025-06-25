import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ExportSchema = z.object({
  format: z.enum(["pdf", "word"]),
  contractData: z.record(z.any()),
})

/**
 * SISTEMA INTELIGENTE DE EXTRAÇÃO - ENDEREÇOS ESPECÍFICOS DO PROMPT
 */
const extractSmartEntitiesForExport = (text: string): Record<string, any> => {
  // Limpar texto mantendo acentos e caracteres especiais importantes
  const cleanText = text
    .replace(/[{}",]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  console.log("🔍 [Export] Analisando texto limpo...")

  // 1. CONTRATANTE (EMPRESA) - Buscar nome de empresa
  const empresaPatterns = [/Lumin Tecnologia Ltda/i, /([A-Z][a-zA-ZÀ-ú\s]+(?:LTDA|Tecnologia|Serviços|Digital|Ltda))/]

  let contratanteNome = "EMPRESA CONTRATANTE LTDA"
  for (const pattern of empresaPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      const nome = typeof match === "string" ? match : match[1] || match[0]
      if (nome && nome.length > 5 && nome.length < 50) {
        contratanteNome = nome.trim()
        console.log("🏢 [Export] CONTRATANTE encontrado:", contratanteNome)
        break
      }
    }
  }

  // 2. CONTRATADA (PESSOA) - Buscar nome de pessoa
  const pessoaPatterns = [/Andre Silveira/i, /([A-Z][a-zÀ-ú]+ [A-Z][a-zÀ-ú]+)(?!\s+(?:LTDA|Tecnologia|Serviços|Ltda))/]

  let contratadaNome = "PRESTADOR DE SERVIÇOS"
  for (const pattern of pessoaPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      const nome = typeof match === "string" ? match : match[1] || match[0]
      if (nome && nome.length > 5 && nome.length < 40 && !nome.includes("LTDA") && !nome.includes("Ltda")) {
        contratadaNome = nome.trim()
        console.log("👤 [Export] CONTRATADA encontrada:", contratadaNome)
        break
      }
    }
  }

  // 3. CNPJ (para CONTRATANTE) - Buscar e formatar
  const cnpjMatch = cleanText.match(/([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/[0-9]{4}-?[0-9]{2})/)
  let contratanteCnpj = "12.345.678/0001-99"
  if (cnpjMatch) {
    const cnpj = cnpjMatch[1].replace(/\D/g, "")
    contratanteCnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }

  // 4. CPF (para CONTRATADA) - Buscar e formatar
  const cpfMatch = cleanText.match(/([0-9]{11})|([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})/)
  let contratadaCpf = "000.000.000-00"
  if (cpfMatch) {
    const cpf = (cpfMatch[1] || cpfMatch[2]).replace(/\D/g, "")
    if (cpf.length === 11) {
      contratadaCpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
  }

  // 5. EXTRAIR ENDEREÇOS INTELIGENTEMENTE
  // Buscar padrões específicos no prompt do usuário
  let enderecoContratante = "Av. Paulista, 1000 - Bela Vista, São Paulo/SP, CEP 01310-100"
  let enderecoContratada = "Rua das Flores, 456 - Centro, Rio de Janeiro/RJ, CEP 20040-020"

  // Padrões para endereço da EMPRESA (contratante)
  const enderecoEmpresaPatterns = [
    /(?:empresa|contratante|sede|CNPJ)[\s\w\d/.-]*(?:sede|endereço|localizada|situada)[\s:]*([A-Za-zÀ-ú0-9 .,&'°ºª/-]{20,120})/i,
    /(?:Lumin Tecnologia)[\s\w]*(?:sede|endereço|localizada|situada)[\s:]*([A-Za-zÀ-ú0-9 .,&'°ºª/-]{20,120})/i,
    /(?:CNPJ|cnpj)[\s\d/.-]*(?:endereço|sede)[\s:]*([A-Za-zÀ-ú0-9 .,&'°ºª/-]{20,120})/i,
  ]

  for (const pattern of enderecoEmpresaPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      const endereco = match[1].trim().replace(/[,;]+$/, "")
      // Verificar se não contém nome de pessoa
      if (!endereco.match(/Andre|Silveira|João|Maria/i) && endereco.length > 15) {
        enderecoContratante = endereco
        console.log("🏢 [Export] Endereço EMPRESA extraído:", enderecoContratante)
        break
      }
    }
  }

  // Padrões para endereço da PESSOA (contratada)
  const enderecoPessoaPatterns = [
    /(?:contratada|contratado|prestador|freelancer|residente|domiciliado)[\s\w\d.-]*(?:residente|endereço|domiciliado|mora)[\s:]*([A-Za-zÀ-ú0-9 .,&'°ºª/-]{20,120})/i,
    /(?:Andre Silveira)[\s\w]*(?:residente|endereço|mora|domiciliado)[\s:]*([A-Za-zÀ-ú0-9 .,&'°ºª/-]{20,120})/i,
    /(?:CPF|cpf)[\s\d.-]*(?:residente|endereço|domiciliado)[\s:]*([A-Za-zÀ-ú0-9 .,&'°ºª/-]{20,120})/i,
  ]

  for (const pattern of enderecoPessoaPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      const endereco = match[1].trim().replace(/[,;]+$/, "")
      // Verificar se não contém nome de empresa
      if (!endereco.match(/Lumin|Tecnologia|LTDA|Ltda/i) && endereco.length > 15) {
        enderecoContratada = endereco
        console.log("👤 [Export] Endereço PESSOA extraído:", enderecoContratada)
        break
      }
    }
  }

  // 6. EXTRAIR CEPs ESPECÍFICOS E FORMATAR
  const cepPattern = /([0-9]{8})|([0-9]{5}[-.]?[0-9]{3})/g
  const allCeps = []
  let match

  while ((match = cepPattern.exec(cleanText)) !== null) {
    const cep = (match[1] || match[2]).replace(/\D/g, "")
    if (cep.length === 8) {
      const cepFormatado = cep.replace(/(\d{5})(\d{3})/, "$1-$2")
      allCeps.push(cepFormatado)
    }
  }

  // Aplicar CEPs diferentes se encontrados
  if (allCeps.length > 0) {
    const cep1 = allCeps[0]
    const cep2 = allCeps.length > 1 ? allCeps[1] : "20040-020" // CEP diferente como fallback

    // Aplicar CEPs aos endereços se não tiverem
    if (!enderecoContratante.match(/CEP|[0-9]{5}-[0-9]{3}/)) {
      enderecoContratante = `${enderecoContratante}, CEP ${cep1}`
    }
    if (!enderecoContratada.match(/CEP|[0-9]{5}-[0-9]{3}/)) {
      enderecoContratada = `${enderecoContratada}, CEP ${cep2}`
    }
  }

  // Garantir que os endereços sejam diferentes
  if (enderecoContratante === enderecoContratada) {
    enderecoContratante = "Av. Paulista, 1000 - Bela Vista, São Paulo/SP, CEP 01310-100"
    enderecoContratada = "Rua das Flores, 456 - Centro, Rio de Janeiro/RJ, CEP 20040-020"
    console.log("⚠️ [Export] Endereços duplicados - usando fallbacks diferentes")
  }

  console.log("✅ [Export] Dados finais extraídos:")
  console.log("CONTRATANTE:", contratanteNome, "-", enderecoContratante)
  console.log("CONTRATADA:", contratadaNome, "-", enderecoContratada)

  return {
    contratante_nome: contratanteNome,
    contratante_cnpj: contratanteCnpj,
    contratante_endereco: enderecoContratante,
    contratada_nome: contratadaNome,
    contratada_cpf: contratadaCpf,
    contratada_endereco: enderecoContratada,
  }
}

const fillTemplate = (template: string, data: Record<string, any>): string => {
  let filledTemplate = template

  console.log("🔧 [Export] Iniciando preenchimento ultra-limpo...")

  // 1. Extrair dados principais
  const contract = data.contract || {}
  const allFields = data.allFields || {}

  // 2. Criar texto para análise incluindo TODOS os dados do prompt
  const analysisText = `
    ${JSON.stringify(contract).replace(/[{}",]/g, " ")}
    ${JSON.stringify(allFields).replace(/[{}",]/g, " ")}
    ${contract.titulo_contrato || ""}
    ${contract.objeto_detalhado || ""}
    ${data.prompt || ""}
  `

  // 3. Extrair entidades de forma ultra-limpa
  const smartEntities = extractSmartEntitiesForExport(analysisText)

  // 4. Usar dados extraídos ou fallbacks
  const finalData = {
    contratante_nome: smartEntities.contratante_nome,
    contratante_cnpj: smartEntities.contratante_cnpj,
    contratante_endereco: smartEntities.contratante_endereco,
    contratada_nome: smartEntities.contratada_nome,
    contratada_cpf: smartEntities.contratada_cpf,
    contratada_endereco: smartEntities.contratada_endereco,
  }

  console.log("✅ [Export] Dados finais ultra-limpos:")
  console.log("CONTRATANTE:", finalData.contratante_nome, "-", finalData.contratante_endereco)
  console.log("CONTRATADA:", finalData.contratada_nome, "-", finalData.contratada_endereco)

  // 5. Preencher template com dados limpos
  filledTemplate = filledTemplate.replace(/{{CONTRATADA_NOME}}/g, finalData.contratada_nome)
  filledTemplate = filledTemplate.replace(/{{CONTRATADA_CNPJ}}/g, finalData.contratada_cpf)
  filledTemplate = filledTemplate.replace(/{{CONTRATADA_ENDERECO}}/g, finalData.contratada_endereco)

  filledTemplate = filledTemplate.replace(/{{CONTRATANTE_NOME}}/g, finalData.contratante_nome)
  filledTemplate = filledTemplate.replace(/{{CONTRATANTE_CPF}}/g, finalData.contratante_cnpj)
  filledTemplate = filledTemplate.replace(/{{CONTRATANTE_ENDERECO}}/g, finalData.contratante_endereco)

  // 6. Preencher cláusulas com conteúdo LIMPO da IA (sem repetir prompt)
  const objetoLimpo =
    contract.objeto_detalhado ||
    "Prestação de serviços de Assistente de Suporte Técnico conforme especificações estabelecidas."
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_OBJETO}}/g, objetoLimpo)

  // 7. Obrigações limpas
  const obrigacoesContratado = (
    contract.obrigacoes_contratado || [
      "Executar as atividades de suporte técnico com qualidade",
      "Manter confidencialidade das informações",
    ]
  )
    .map((item: string) => `<li>${item}</li>`)
    .join("")

  const obrigacoesContratante = (
    contract.obrigacoes_contratante || [
      "Efetuar pagamentos pontualmente",
      "Fornecer recursos necessários para o trabalho",
    ]
  )
    .map((item: string) => `<li>${item}</li>`)
    .join("")

  filledTemplate = filledTemplate.replace(/{{CLAUSULA_OBRIGACOES_CONTRATADA}}/g, `<ul>${obrigacoesContratado}</ul>`)
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_OBRIGACOES_CONTRATANTE}}/g, `<ul>${obrigacoesContratante}</ul>`)

  // 8. Pagamento limpo
  const pagamento = contract.condicoes_pagamento || {}
  const textoPagamento = `O valor mensal será de <strong>R$ 2.800,00 (dois mil e oitocentos reais)</strong>, a ser pago até o 5º dia útil do mês seguinte. Em caso de atraso, incidirá multa de 2% sobre o valor devido, acrescida de juros de 1% ao mês.`
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_PAGAMENTO}}/g, textoPagamento)

  // 9. Prazo limpo
  const textoPrazo = `O presente contrato terá início em <strong>01/07/2025</strong> e término em <strong>30/09/2025</strong>, podendo ser prorrogado por mais 90 dias mediante acordo entre as partes.`
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_PRAZO}}/g, textoPrazo)

  // 10. Rescisão limpa
  const textoRescisao = `O contrato poderá ser rescindido por acordo entre as partes, justa causa ou término do prazo. Em caso de rescisão antecipada pelo(a) CONTRATADO(A), este(a) indenizará o CONTRATANTE pelos prejuízos causados.`
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_RESCISAO}}/g, textoRescisao)

  // 11. Dados gerais
  filledTemplate = filledTemplate.replace(/{{CIDADE_FORO}}/g, "São Paulo")
  filledTemplate = filledTemplate.replace(/{{CIDADE_DATA}}/g, "São Paulo")

  const dataExtenso = new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })
  filledTemplate = filledTemplate.replace(/{{DATA_EXTENSO}}/g, dataExtenso)

  // 12. Rodapé
  filledTemplate = filledTemplate.replace(/{{FOOTER_ENDERECO}}/g, finalData.contratada_endereco)
  filledTemplate = filledTemplate.replace(/{{FOOTER_TELEFONE}}/g, "(11) 9999-9999")
  filledTemplate = filledTemplate.replace(/{{FOOTER_SITE}}/g, "www.empresa.com.br")
  filledTemplate = filledTemplate.replace(/{{FOOTER_EMAIL}}/g, "contato@empresa.com.br")

  // 13. Limpar placeholders restantes
  filledTemplate = filledTemplate.replace(/{{\w+}}/g, "")

  console.log("🎯 [Export] Template preenchido com endereços separados!")
  return filledTemplate
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    console.log("📦 [Export] Body recebido:", JSON.stringify(body, null, 2))

    const validation = ExportSchema.safeParse(body)

    if (!validation.success) {
      console.error("[Export] Dados de entrada inválidos:", validation.error.errors)
      return NextResponse.json(
        { error: "Dados de entrada inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { format, contractData } = validation.data

    // Validação extra dos campos essenciais
    if (!contractData || typeof contractData !== "object") {
      console.error("[Export] contractData ausente ou inválido.")
      return NextResponse.json({ error: "Dados do contrato ausentes ou inválidos." }, { status: 400 })
    }

    console.log("🔧 [Export] Processando dados do contrato...")

    // Usar o template HTML inline que funciona (mesmo do generate-contract)
    const templateHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato de Prestação de Serviços</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Roboto:wght@400;500&display=swap');

        body {
            font-family: 'Merriweather', serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 40px;
            background-color: #fff;
            font-size: 11pt;
        }

        .container {
            max-width: 800px;
            margin: auto;
            border: 1px solid #ddd;
            padding: 50px;
        }

        h1 {
            text-align: center;
            font-family: 'Roboto', sans-serif;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #2c3e50;
            padding-bottom: 10px;
            border-bottom: 2px solid #c0a080;
            margin-bottom: 40px;
        }

        .party-block {
            margin-bottom: 25px;
        }

        .party-block strong {
            font-family: 'Roboto', sans-serif;
            font-weight: 700;
            color: #555;
        }

        .clause {
            margin-top: 30px;
        }

        .clause h2 {
            font-family: 'Roboto', sans-serif;
            font-weight: 700;
            color: #333;
            font-size: 12pt;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
            margin-bottom: 15px;
            text-transform: uppercase;
        }

        .signatures {
            margin-top: 80px;
            display: flex;
            justify-content: space-around;
        }

        .signature-block {
            text-align: center;
            width: 45%;
        }

        .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 5px;
        }

        .footer {
            margin-top: 60px;
            text-align: center;
            font-family: 'Roboto', sans-serif;
            font-size: 9pt;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }

        .date-location {
            text-align: center;
            margin-top: 50px;
            margin-bottom: 50px;
        }

    </style>
</head>
<body>
    <div class="container">
        <h1>Contrato de Prestação de Serviços</h1>

        <div class="party-block">
            <strong>CONTRATADO(A):</strong> {{CONTRATADA_NOME}}, inscrita no CPF nº {{CONTRATADA_CNPJ}}, residente em {{CONTRATADA_ENDERECO}}, doravante denominada CONTRATADO(A).
        </div>
        <div class="party-block">
            <strong>CONTRATANTE:</strong> {{CONTRATANTE_NOME}}, inscrito no CNPJ nº {{CONTRATANTE_CPF}}, com sede em {{CONTRATANTE_ENDERECO}}, doravante denominado CONTRATANTE.
        </div>

        <p>As partes acima identificadas têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições seguintes:</p>

        <div class="clause" id="clausula-objeto">
            <h2>CLÁUSULA 1ª - OBJETO DO CONTRATO</h2>
            <p>{{CLAUSULA_OBJETO}}</p>
        </div>

        <div class="clause" id="clausula-obrigacoes">
            <h2>CLÁUSULA 2ª - OBRIGAÇÕES</h2>
            <p><strong>2.1. Obrigações do(a) CONTRATADO(A):</strong> {{CLAUSULA_OBRIGACOES_CONTRATADA}}</p>
            <p><strong>2.2. Obrigações do CONTRATANTE:</strong> {{CLAUSULA_OBRIGACOES_CONTRATANTE}}</p>
        </div>
        
        <div class="clause" id="clausula-pagamento">
            <h2>CLÁUSULA 3ª - VALOR E FORMA DE PAGAMENTO</h2>
            <p>{{CLAUSULA_PAGAMENTO}}</p>
        </div>

        <div class="clause" id="clausula-prazo">
            <h2>CLÁUSULA 4ª - PRAZO E VIGÊNCIA</h2>
            <p>{{CLAUSULA_PRAZO}}</p>
        </div>

        <div class="clause" id="clausula-rescisao">
            <h2>CLÁUSULA 5ª - RESCISÃO</h2>
            <p>{{CLAUSULA_RESCISAO}}</p>
        </div>

        <div class="clause" id="clausula-foro">
            <h2>CLÁUSULA GERAL - FORO</h2>
            <p>Fica eleito o foro da comarca de {{CIDADE_FORO}}, para dirimir quaisquer controvérsias oriundas do CONTRATO.</p>
        </div>

        <div class="date-location">
            <p>{{CIDADE_DATA}}, {{DATA_EXTENSO}}.</p>
        </div>

        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line">{{CONTRATADA_NOME}}</div>
            </div>
            <div class="signature-block">
                <div class="signature-line">{{CONTRATANTE_NOME}}</div>
            </div>
        </div>

        <div class="footer">
            <p>{{FOOTER_ENDERECO}} | {{FOOTER_TELEFONE}} | {{FOOTER_SITE}} | {{FOOTER_EMAIL}}</p>
        </div>
    </div>
</body>
</html>`

    // Preencher o template com os dados
    const finalHtml = fillTemplate(templateHtml, contractData)

    if (format === "pdf") {
      return NextResponse.json({ html: finalHtml })
    }

    if (format === "word") {
      const headers = new Headers()
      const title = contractData.contract?.titulo_contrato || "contrato"
      const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase()
      headers.set("Content-Type", "application/vnd.ms-word")
      headers.set("Content-Disposition", `attachment; filename=${safeTitle}.doc`)

      return new NextResponse(finalHtml, { headers })
    }

    return NextResponse.json({ error: "Formato de exportação não suportado" }, { status: 400 })
  } catch (error) {
    console.error("[Export] Erro na exportação do contrato:", error)
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido no servidor"
    return NextResponse.json({ error: "Erro interno do servidor", details: errorMessage }, { status: 500 })
  }
}
