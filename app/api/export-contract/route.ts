import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ExportSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  format: z.enum(["pdf", "word"]),
  contractType: z.enum(["simple", "advanced"]).optional(),
  template: z.string().optional().default("classic"),
})

// Substituir a função generateClassicHTMLTemplate para usar o mesmo modelo:

const generateClassicHTMLTemplate = (title: string, content: string, contractType?: string) => {
  // Se o conteúdo já é HTML (vem da nova função), retorna direto
  if (content.includes("<!DOCTYPE html>")) {
    return content
  }

  // Caso contrário, processa o conteúdo texto para HTML
  const processedContent = content
    .replace(
      /CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS/g,
      '<h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇO</h1>',
    )
    .replace(/\n\n/g, '</p><p class="paragraph">')
    .replace(/\n/g, "<br>")

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
        
        .paragraph {
            margin: 10px 0;
            text-align: justify;
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
        ${processedContent}
    </div>
</body>
</html>`
}

// Template HTML Moderno
const generateModernHTMLTemplate = (title: string, content: string, contractType?: string) => {
  const processedContent = content
    .replace(
      /CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS/g,
      '<h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS</h1>',
    )
    .replace(/CONTRATANTE:/g, '<div class="party-section"><h2 class="party-title">CONTRATANTE</h2>')
    .replace(/CONTRATADO:/g, '</div><div class="party-section"><h2 class="party-title">CONTRATADO</h2>')
    .replace(/DATA:/g, '</div><div class="date-section"><h3 class="date-title">DATA:</h3>')
    .replace(/TÍTULO DO CONTRATO:/g, '</div><h2 class="section-title">TÍTULO DO CONTRATO</h2>')
    .replace(/OBJETO PRINCIPAL:/g, '<h2 class="section-title">OBJETO PRINCIPAL</h2>')
    .replace(/OBJETO DETALHADO:/g, '<h2 class="section-title">OBJETO DETALHADO</h2>')
    .replace(/ESPECIFICAÇÕES TÉCNICAS:/g, '<h2 class="section-title">ESPECIFICAÇÕES TÉCNICAS</h2>')
    .replace(/OBRIGAÇÕES DO CONTRATADO:/g, '<h2 class="section-title">OBRIGAÇÕES DO CONTRATADO</h2>')
    .replace(/OBRIGAÇÕES DO CONTRATANTE:/g, '<h2 class="section-title">OBRIGAÇÕES DO CONTRATANTE</h2>')
    .replace(/CONDIÇÕES DE PAGAMENTO:/g, '<h2 class="section-title">CONDIÇÕES DE PAGAMENTO</h2>')
    .replace(/PRAZO DE EXECUÇÃO:/g, '<h2 class="section-title">PRAZO DE EXECUÇÃO</h2>')
    .replace(/CLAUSULAS ESPECIAIS:/g, '<h2 class="section-title">CLÁUSULAS ESPECIAIS</h2>')
    .replace(/RESCISÃO:/g, '<h2 class="section-title">RESCISÃO</h2>')
    .replace(/PROPRIEDADE INTELECTUAL:/g, '<h2 class="section-title">PROPRIEDADE INTELECTUAL</h2>')
    .replace(/CONFIDENCIALIDADE:/g, '<h2 class="section-title">CONFIDENCIALIDADE</h2>')
    .replace(/GARANTIAS:/g, '<h2 class="section-title">GARANTIAS</h2>')
    .replace(/DISPOSIÇÕES LEGAIS:/g, '<h2 class="section-title">DISPOSIÇÕES LEGAIS</h2>')
    .replace(/REFERÊNCIAS LEGAIS:/g, '<h2 class="section-title">REFERÊNCIAS LEGAIS</h2>')
    .replace(/- ([A-Z][^:]+):/g, '<div class="item"><strong>$1:</strong>')
    .replace(/\n\n/g, '</div><p class="paragraph">')
    .replace(/\n/g, "<br>")

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            line-height: 1.7;
            color: #2d3748;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 50px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .contract-title {
            text-align: center;
            font-size: 20pt;
            font-weight: 300;
            margin: 0 0 40px 0;
            padding: 30px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .party-section {
            background: #f7fafc;
            padding: 25px;
            margin: 20px 0;
            border-radius: 10px;
            border-left: 5px solid #667eea;
        }
        
        .party-title {
            font-size: 14pt;
            font-weight: 600;
            margin: 0 0 15px 0;
            color: #667eea;
        }
        
        .date-section {
            text-align: center;
            background: #edf2f7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .section-title {
            font-size: 13pt;
            font-weight: 600;
            margin: 30px 0 15px 0;
            color: #2d3748;
            padding: 10px 0;
            border-bottom: 2px solid #e2e8f0;
            position: relative;
        }
        
        .section-title::before {
            content: "";
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 50px;
            height: 2px;
            background: #667eea;
        }
        
        .item {
            margin: 15px 0;
            padding: 10px 0;
        }
        
        .paragraph {
            margin: 15px 0;
            text-align: justify;
            line-height: 1.8;
        }
        
        .signature-section {
            margin-top: 60px;
            padding-top: 40px;
            border-top: 3px solid #e2e8f0;
        }
        
        .signature-line {
            margin: 50px 0;
            text-align: center;
            padding: 20px;
            background: #f7fafc;
            border-radius: 8px;
        }
        
        .signature-line::before {
            content: "";
            display: block;
            width: 350px;
            height: 2px;
            background: #667eea;
            margin: 0 auto 15px auto;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 9pt;
            color: #718096;
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
        }
        
        @media print {
            body { 
                background: white !important;
                margin: 0; 
            }
            .contract-container { 
                box-shadow: none; 
                margin: 0;
                padding: 20px;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <p class="paragraph">${processedContent}</p>
        
        <div class="signature-section">
            <div class="signature-line">
                <strong>CONTRATANTE</strong><br>
                Nome: _________________________________<br>
                CPF/CNPJ: _____________________________<br>
                Assinatura: ____________________________
            </div>
            
            <div class="signature-line">
                <strong>CONTRATADO</strong><br>
                Nome: _________________________________<br>
                CPF: __________________________________<br>
                Assinatura: ____________________________
            </div>
        </div>
        
        <div class="footer">
            <p>Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
            <p><strong>Este documento foi gerado por IA especializada em direito.</strong> Consulte um advogado antes de usar em situações formais.</p>
        </div>
    </div>
</body>
</html>`
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const parsed = ExportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos: " + parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { title, content, format, contractType, template = "classic" } = parsed.data

    let htmlContent = ""

    // Aplicar template baseado na seleção
    switch (template) {
      case "modern":
        htmlContent = generateModernHTMLTemplate(title, content, contractType)
        break
      case "classic":
      default:
        htmlContent = generateClassicHTMLTemplate(title, content, contractType)
        break
    }

    // Criar blob e retornar
    const blob = new Blob([htmlContent], { type: "text/html" })
    const buffer = await blob.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "_")}.html"`,
      },
    })
  } catch (error) {
    console.error("Erro na exportação:", error)
    return NextResponse.json({ error: "Erro interno na exportação" }, { status: 500 })
  }
}
