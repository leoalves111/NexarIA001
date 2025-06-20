import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import chromium from "chrome-aws-lambda"
import type { PDFOptions } from "puppeteer-core"

// Função para gerar PDF usando chrome-aws-lambda
const generatePDF = async (html: string, title: string) => {
  let browser = null

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    })

    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    })

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

    const body = await request.json()
    const { contractId, format = "pdf" } = body

    if (!contractId) {
      return NextResponse.json({ error: "ID do contrato é obrigatório" }, { status: 400 })
    }

    // Buscar contrato no banco
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .eq("user_id", session.user.id)
      .single()

    if (error || !contract) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 })
    }

    if (format === "pdf") {
      // Gerar PDF
      const pdfBuffer = await generatePDF(contract.conteudo, contract.nome)

      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${contract.nome.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        },
      })
    } else {
      // Retornar HTML para outros formatos
      return NextResponse.json({
        content: contract.conteudo,
        title: contract.nome,
        format: format,
      })
    }
  } catch (error) {
    console.error("Erro na API export-contract:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
