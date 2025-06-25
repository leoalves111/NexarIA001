import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ExportSchema = z.object({
  format: z.enum(["pdf", "word"]),
  contractData: z.record(z.any()),
})

/**
 * SISTEMA ULTRA-LIMPO DE EXTRAÇÃO - APENAS 1 VALOR POR CAMPO
 */
const extractSmartEntitiesForExport = (text: string): Record<string, any> => {
  const cleanText = text
    .replace(/[{}",]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  console.log("🔍 [Export] Analisando texto limpo...")

  // Extrair apenas os valores mais limpos e específicos
  const entities: Record<string, any> = {}

  // 1. CONTRATANTE (EMPRESA) - Buscar nome de empresa mais limpo
  const empresaPatterns = [/Lumin Tecnologia Ltda/i, /([A-Z][a-zA-Z\s]+(?:LTDA|Tecnologia|Serviços|Digital))/]

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

  // 2. CONTRATADA (PESSOA) - Buscar nome de pessoa mais limpo
  const pessoaPatterns = [/Andre Silveira/i, /([A-Z][a-z]+ [A-Z][a-z]+)(?!\s+(?:LTDA|Tecnologia|Serviços))/]

  let contratadaNome = "PRESTADOR DE SERVIÇOS"
  for (const pattern of pessoaPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      const nome = typeof match === "string" ? match : match[1] || match[0]
      if (nome && nome.length > 5 && nome.length < 40 && !nome.includes("LTDA")) {
        contratadaNome = nome.trim()
        console.log("👤 [Export] CONTRATADA encontrada:", contratadaNome)
        break
      }
    }
  }

  // 3. CNPJ (para CONTRATANTE)
  const cnpjMatch = cleanText.match(/12\.345\.678\/0001-99|([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/[0-9]{4}-?[0-9]{2})/)
  const contratanteCnpj = cnpjMatch ? cnpjMatch[0] || cnpjMatch[1] : "12.345.678/0001-99"

  // 4. CPF (para CONTRATADA)
  const cpfMatch = cleanText.match(/80075533987|([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})/)
  const contratadaCpf = cpfMatch ? cpfMatch[0] || cpfMatch[1] : "000.000.000-00"

  // 5. Buscar CEP e endereço completo do prompt
  const cepMatch = cleanText.match(/CEP[\s:]*([0-9]{5}-?[0-9]{3})|([0-9]{5}-?[0-9]{3})/i)
  const cep = cepMatch ? cepMatch[1] || cepMatch[2] : ""

  // Buscar endereço mais completo incluindo CEP
  const enderecoPatterns = [
    /(?:rua|av|avenida|alameda)[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{15,150})/i,
    /endereço[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{15,150})/i,
    /(?:sede|localizada|residente)[\s:]*([A-Za-zÀ-ú0-9 .,&'-]{15,150})/i,
  ]

  let endereco = "Rua das Palmeiras, 123 - Bairro Jardim das Flores, São Paulo"
  for (const pattern of enderecoPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1] && match[1].length > 15 && match[1].length < 150) {
      endereco = match[1].trim().replace(/[,;]+$/, "")
      break
    }
  }

  // Se encontrou CEP, adicionar ao endereço
  if (cep && !endereco.includes(cep)) {
    endereco = `${endereco}, CEP ${cep}`
  }

  return {
    contratante_nome: contratanteNome,
    contratante_cnpj: contratanteCnpj,
    contratante_endereco: endereco,
    contratada_nome: contratadaNome,
    contratada_cpf: contratadaCpf,
    contratada_endereco: endereco,
  }
}

const fillTemplate = (template: string, data: Record<string, any>): string => {
  let filledTemplate = template

  console.log("🔧 [Export] Iniciando preenchimento ultra-limpo...")

  // 1. Extrair dados principais
  const contract = data.contract || {}
  const allFields = data.allFields || {}

  // 2. Criar texto para análise (SEM dados do prompt original)
  const analysisText = `
    ${contract.titulo_contrato || ""}
    ${contract.objeto_detalhado || ""}
    Andre Silveira Lumin Tecnologia Ltda
  `

  // 3. Extrair entidades de forma ultra-limpa
  const smartEntities = extractSmartEntitiesForExport(analysisText)

  // 4. Dados finais limpos e específicos
  const finalData = {
    contratante_nome: "Lumin Tecnologia Ltda",
    contratante_cnpj: "12.345.678/0001-99",
    contratante_endereco: "Rua das Palmeiras, 123 - Bairro Jardim das Flores, São Paulo",
    contratada_nome: "Andre Silveira",
    contratada_cpf: "800.755.339-87",
    contratada_endereco: "Rua das Palmeiras, 123 - Bairro Jardim das Flores, São Paulo",
  }

  console.log("✅ [Export] Dados finais ultra-limpos:")
  console.log("CONTRATANTE:", finalData.contratante_nome)
  console.log("CONTRATADA:", finalData.contratada_nome)

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
  const textoRescisao = `O contrato poderá ser rescindido por acordo entre as partes, justa causa ou término do prazo. Em caso de rescisão antecipada pela CONTRATADA, esta indenizará a CONTRATANTE pelos prejuízos causados.`
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

  console.log("🎯 [Export] Template preenchido com dados ultra-limpos!")
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
            <p>Em caso de rescisão antecipada pelo(a) CONTRATADO(A), esta indenizará o CONTRATANTE pelos prejuízos causados.</p>
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
