import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, content, format, contractType, isDemo, subscription } = body

    // Validação de entrada
    if (!content || !title) {
      return NextResponse.json({ error: "Título e conteúdo são obrigatórios" }, { status: 400 })
    }

    if (!format || !["pdf", "word"].includes(format)) {
      return NextResponse.json({ error: "Formato deve ser 'pdf' ou 'word'" }, { status: 400 })
    }

    // Extrair apenas o HTML limpo do conteúdo
    const cleanHTML = content.includes("<html>")
      ? content
      : `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
    ${content}
</body>
</html>`

    const filename = sanitizeFilename(title)

    if (format === "pdf") {
      // Para PDF, retornamos HTML otimizado para impressão
      return new Response(cleanHTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.html"`,
          "Cache-Control": "no-cache",
        },
      })
    } else if (format === "word") {
      // Para Word, geramos um documento HTML compatível
      const wordHTML = generateWordCompatibleHTML(title, content, contractType, isDemo)

      return new Response(wordHTML, {
        status: 200,
        headers: {
          "Content-Type": "application/msword",
          "Content-Disposition": `attachment; filename="${filename}.doc"`,
          "Cache-Control": "no-cache",
        },
      })
    }

    return NextResponse.json({ error: "Formato não suportado" }, { status: 400 })
  } catch (error) {
    console.error("Erro na exportação:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

function generateWordCompatibleHTML(title: string, content: string, contractType: string, isDemo: boolean): string {
  // Extrair apenas o corpo do HTML se for HTML completo
  let bodyContent = content
  if (content.includes("<body>")) {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      bodyContent = bodyMatch[1]
    }
  }

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotPromptForConvert/>
            <w:DoNotShowInsertionsAndDeletions/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        body { 
            font-family: 'Times New Roman', serif; 
            font-size: 12pt; 
            line-height: 1.4; 
            margin: 15mm;
            color: #000;
        }
        .contract-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #b8860b; padding-bottom: 15px; }
        .contract-title { font-size: 16pt; font-weight: bold; color: #b8860b; text-transform: uppercase; }
        .parties-section { display: table; width: 100%; margin: 25px 0; }
        .party-column { display: table-cell; width: 50%; padding-right: 15px; }
        .party-title { font-weight: bold; font-size: 12pt; margin-bottom: 10px; text-transform: uppercase; }
        .party-field { margin-bottom: 8px; font-size: 11pt; }
        .field-label { display: inline-block; width: 70px; }
        .field-value { border-bottom: 1px solid #000; display: inline-block; min-width: 200px; padding-bottom: 2px; }
        .section-title { font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; text-transform: uppercase; }
        .section-content { margin-bottom: 18px; text-align: justify; font-size: 11pt; line-height: 1.5; }
        .signatures-grid { display: table; width: 100%; margin-top: 40px; }
        .signature-box { display: table-cell; text-align: center; width: 50%; }
        .signature-line { border-top: 1px solid #000; margin: 40px 10px 10px 10px; padding-top: 8px; font-size: 11pt; }
    </style>
</head>
<body>
    ${isDemo ? '<p style="background: yellow; padding: 10pt; text-align: center;"><strong>⚠️ NEXAR IA DEMO</strong></p>' : ""}
    ${bodyContent}
</body>
</html>
  `
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100)
}
