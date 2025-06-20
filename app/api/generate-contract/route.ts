import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import chromium from "chrome-aws-lambda"
import type { PDFOptions } from "puppeteer-core"

// Função para gerar HTML estruturado via OpenAI
const generateContractHTML = async (
  title: string,
  description: string,
  contractType: string,
  metadata?: Record<string, Record<string, string>>,
) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const model = contractType === "simple" ? "gpt-3.5-turbo" : "gpt-4o-mini"

  const systemPrompt = `Você é um especialista em Direito Brasileiro. Gere um documento **HTML completo** que:

ESTRUTURA OBRIGATÓRIA:
- Use <!DOCTYPE html> com <html>, <head> e <body>
- Inclua <meta charset="UTF-8"> e viewport responsivo
- Defina CSS inline no <head> com:
  * Tipografia profissional (font-family: 'Times New Roman', serif)
  * Espaçamentos adequados (margin, padding)
  * Bordas e divisores visuais
  * Seção de assinaturas lado a lado (.signatures { display: flex; justify-content: space-between; margin-top: 40px; })
  * Footer fixo com data e local
  * Quebras de página apropriadas (@media print)

CONTEÚDO:
- <h1> com o título do contrato centralizado
- Seções <h2> para cada parte do contrato
- Parágrafos <p> bem estruturados
- Lista <ol> ou <ul> para cláusulas numeradas
- Classe .clause para cláusulas importantes
- Seção de assinaturas com campos para preenchimento

FORMATAÇÃO:
- Margens de 20mm em todas as bordas
- Fonte 12pt para texto normal, 14pt para títulos
- Espaçamento entre linhas de 1.5
- Cores em escala de cinza para impressão
- Background branco sempre`

  let userPrompt = `Crie o HTML completo do contrato com base em:

DADOS DO CONTRATO:
- Título: ${title}
- Descrição: ${description}
- Tipo: ${contractType === "simple" ? "Contrato Simples" : "Contrato Avançado"}`

  // Adicionar metadados se fornecidos
  if (metadata && Object.keys(metadata).length > 0) {
    userPrompt += `\n\nDADOS DAS PARTES:\n`
    Object.entries(metadata).forEach(([section, fields]) => {
      userPrompt += `${section}:\n`
      Object.entries(fields).forEach(([key, value]) => {
        userPrompt += `- ${key}: ${value}\n`
      })
    })
    userPrompt += `\nSubstitua os placeholders [Nome], [CPF], etc. pelos valores fornecidos acima.`
  }

  userPrompt += `\n\nIMPORTANTE: Retorne APENAS o HTML completo, sem explicações ou texto adicional.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: contractType === "simple" ? 3000 : 5000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ""
  } catch (error) {
    console.error("Erro ao chamar OpenAI API:", error)
    throw error
  }
}

// Função para gerar PDF usando chrome-aws-lambda
const generatePDF = async (html: string, title: string) => {
  let browser = null

  try {
    // Configurar browser para ambiente serverless
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    })

    const page = await browser.newPage()

    // Configurar página
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    })

    // Gerar PDF com configurações otimizadas
    const pdfOptions: PDFOptions = {
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    }

    const pdfBuffer = await page.pdf(pdfOptions)

    return pdfBuffer
  } catch (error) {
    console.error("Erro ao gerar PDF:", error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Simulação para desenvolvimento local
const simulateContractHTML = (title: string, description: string, contractType: string) => {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 20mm;
        }
        h1 {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 30px;
            text-transform: uppercase;
        }
        h2 {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 15px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        .clause {
            margin-bottom: 15px;
            padding-left: 20px;
        }
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            page-break-inside: avoid;
        }
        .signature-box {
            text-align: center;
            width: 45%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11pt;
        }
        @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    
    <p><strong>CONTRATANTE:</strong> [Nome do Contratante]</p>
    <p><strong>CONTRATADO:</strong> [Nome do Contratado]</p>
    
    <h2>OBJETO DO CONTRATO</h2>
    <p>${description}</p>
    
    <h2>CLÁUSULAS E CONDIÇÕES</h2>
    
    <div class="clause">
        <strong>CLÁUSULA 1ª - DO OBJETO</strong><br>
        O presente contrato tem por objeto ${description.toLowerCase()}.
    </div>
    
    <div class="clause">
        <strong>CLÁUSULA 2ª - DAS OBRIGAÇÕES DO CONTRATADO</strong><br>
        O CONTRATADO se obriga a:<br>
        a) Prestar os serviços descritos no objeto deste contrato com qualidade e eficiência;<br>
        b) Executar os serviços dentro dos prazos estabelecidos;<br>
        c) Manter absoluto sigilo sobre informações confidenciais do CONTRATANTE.
    </div>
    
    <div class="clause">
        <strong>CLÁUSULA 3ª - DAS OBRIGAÇÕES DO CONTRATANTE</strong><br>
        O CONTRATANTE se obriga a:<br>
        a) Fornecer todas as informações necessárias para execução dos serviços;<br>
        b) Efetuar o pagamento conforme estabelecido neste contrato;<br>
        c) Prestar a colaboração necessária para o bom andamento dos trabalhos.
    </div>
    
    <div class="clause">
        <strong>CLÁUSULA 4ª - DO PRAZO</strong><br>
        O presente contrato terá vigência conforme acordado entre as partes.
    </div>
    
    <div class="clause">
        <strong>CLÁUSULA 5ª - DAS DISPOSIÇÕES GERAIS</strong><br>
        Este contrato é regido pelas leis brasileiras e qualquer alteração deve ser feita por escrito.
    </div>
    
    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line">
                CONTRATANTE<br>
                Nome: [Nome]<br>
                CPF: [CPF]
            </div>
        </div>
        <div class="signature-box">
            <div class="signature-line">
                CONTRATADO<br>
                Nome: [Nome]<br>
                CPF/CNPJ: [Documento]
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>IMPORTANTE:</strong> Este documento foi gerado por IA especializada em direito. Não substitui advogado. Consulte profissional antes de usar em situações formais.</p>
        <p>Local e data: ________________, _____ de _____________ de 20__.</p>
    </div>
</body>
</html>`
}

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

    const body = await request.json().catch(() => ({}))
    const { title, prompt: description, contractType, metadata, generatePdf = false } = body

    // Validações
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
    }

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 })
    }

    if (!["simple", "advanced"].includes(contractType)) {
      return NextResponse.json({ error: "Tipo de contrato inválido" }, { status: 400 })
    }

    // Se for solicitação de PDF
    if (generatePdf) {
      let html: string

      try {
        // Tentar gerar HTML via OpenAI
        if (process.env.OPENAI_API_KEY) {
          html = await generateContractHTML(title, description, contractType, metadata)
        } else {
          // Fallback para simulação
          html = simulateContractHTML(title, description, contractType)
        }

        // Gerar PDF
        const pdfBuffer = await generatePDF(html, title)

        // Salvar contrato no banco
        try {
          await supabase.from("contracts").insert({
            user_id: session.user.id,
            nome: title,
            descricao: description.substring(0, 500),
            tipo: contractType,
            conteudo: html,
            openai_model: contractType === "simple" ? "gpt-3.5-turbo" : "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: contractType === "simple" ? 3000 : 5000,
          })
        } catch (dbError) {
          console.warn("Erro ao salvar contrato:", dbError)
        }

        // Retornar PDF
        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
          },
        })
      } catch (pdfError) {
        console.error("Erro ao gerar PDF:", pdfError)
        return NextResponse.json(
          { error: "Erro ao gerar PDF", details: pdfError instanceof Error ? pdfError.message : "Erro desconhecido" },
          { status: 500 },
        )
      }
    }

    // Fluxo normal (retornar HTML/texto)
    let generatedContent: string
    let usingSimulation = false

    try {
      if (process.env.OPENAI_API_KEY) {
        generatedContent = await generateContractHTML(title, description, contractType, metadata)
      } else {
        generatedContent = simulateContractHTML(title, description, contractType)
        usingSimulation = true
      }
    } catch (error) {
      console.warn("Usando simulação devido a erro:", error)
      generatedContent = simulateContractHTML(title, description, contractType)
      usingSimulation = true
    }

    // Salvar contrato
    try {
      await supabase.from("contracts").insert({
        user_id: session.user.id,
        nome: title,
        descricao: description.substring(0, 500),
        tipo: contractType,
        conteudo: generatedContent,
        openai_model: contractType === "simple" ? "gpt-3.5-turbo" : "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: contractType === "simple" ? 3000 : 5000,
      })
    } catch (contractError) {
      console.warn("Erro ao salvar contrato:", contractError)
    }

    return NextResponse.json({
      content: generatedContent,
      model: contractType === "simple" ? "gpt-3.5-turbo" : "gpt-4o-mini",
      tokens_used: contractType === "simple" ? 800 : 1200,
      cached: false,
      using_simulation: usingSimulation,
    })
  } catch (error) {
    console.error("Erro na API generate-contract:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
