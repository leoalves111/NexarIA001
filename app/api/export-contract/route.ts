import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import fs from "fs/promises"
import path from "path"

const ExportSchema = z.object({
  format: z.enum(["pdf", "word"]),
  contractData: z.record(z.any()),
})

// Função para preencher o template de forma inteligente
const fillTemplate = (template: string, data: Record<string, any>): string => {
  let filledTemplate = template

  // 1. Extrair os objetos principais para facilitar o acesso
  const contract = data.contract || {}
  const allFields = data.allFields || {}
  const contratada = allFields.contratada || {}
  const contratante = allFields.contratante || {}
  const lexmlReferences = data.lexmlReferences || []

  // 2. Mapear dados das partes
  filledTemplate = filledTemplate.replace(/{{CONTRATADA_NOME}}/g, contratada.nome || 'Não especificado')
  filledTemplate = filledTemplate.replace(/{{CONTRATADA_CNPJ}}/g, contratada.cnpj || 'Não especificado')
  filledTemplate = filledTemplate.replace(/{{CONTRATADA_ENDERECO}}/g, contratada.endereco || 'Não especificado')
  
  filledTemplate = filledTemplate.replace(/{{CONTRATANTE_NOME}}/g, contratante.nome || 'Não especificado')
  filledTemplate = filledTemplate.replace(/{{CONTRATANTE_CPF}}/g, contratante.cpf || 'Não especificado')
  filledTemplate = filledTemplate.replace(/{{CONTRATANTE_ENDERECO}}/g, contratante.endereco || 'Não especificado')

  // 3. Mapear cláusulas principais geradas pela IA
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_OBJETO}}/g, contract.objeto_detalhado || contract.objeto_principal || 'Não especificado')
  
  const obrigacoesContratado = (contract.obrigacoes_contratado || []).map((item: string) => `<li>${item}</li>`).join('')
  const obrigacoesContratante = (contract.obrigacoes_contratante || []).map((item: string) => `<li>${item}</li>`).join('')
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_OBRIGACOES_CONTRATADA}}/g, `<ul>${obrigacoesContratado}</ul>`)
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_OBRIGACOES_CONTRATANTE}}/g, `<ul>${obrigacoesContratante}</ul>`)

  const pagamento = contract.condicoes_pagamento || {}
  const textoPagamento = `O valor total do presente contrato é de <strong>${pagamento.valor_base || 'a combinar'}</strong>, a ser pago da seguinte forma: ${pagamento.forma_pagamento || 'não especificado'}. Em caso de atraso, incidirá multa de ${pagamento.multas_atraso || 'não aplicável'}.`
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_PAGAMENTO}}/g, textoPagamento)
  
  const prazo = contract.prazo_execucao || {}
  const textoPrazo = `O presente contrato terá início em <strong>${prazo.inicio || 'data a definir'}</strong> e duração de <strong>${prazo.duracao || 'tempo a definir'}</strong>, com os seguintes marcos de entrega: ${(prazo.marcos || []).join(', ') || 'não aplicável'}.`
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_PRAZO}}/g, textoPrazo)

  const rescisao = contract.rescisao || {}
  const textoRescisao = `As condições para rescisão são: ${rescisao.condicoes || 'não especificado'}. As penalidades em caso de rescisão imotivada são: ${rescisao.penalidades || 'não aplicável'}.`
  filledTemplate = filledTemplate.replace(/{{CLAUSULA_RESCISAO}}/g, textoRescisao)

  // 4. Mapear dados gerais
  const cidade = allFields.cidade_foro || 'Cidade não especificada'
  filledTemplate = filledTemplate.replace(/{{CIDADE_FORO}}/g, cidade)
  filledTemplate = filledTemplate.replace(/{{CIDADE_DATA}}/g, cidade)
  
  const dataExtenso = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
  filledTemplate = filledTemplate.replace(/{{DATA_EXTENSO}}/g, dataExtenso)

  // 5. Mapear dados do rodapé
  filledTemplate = filledTemplate.replace(/{{FOOTER_ENDERECO}}/g, contratada.endereco || '')
  filledTemplate = filledTemplate.replace(/{{FOOTER_TELEFONE}}/g, contratada.telefone || '')
  filledTemplate = filledTemplate.replace(/{{FOOTER_SITE}}/g, contratada.site || 'Não informado')
  filledTemplate = filledTemplate.replace(/{{FOOTER_EMAIL}}/g, contratada.email || 'Não informado')

  // 6. Limpar placeholders restantes
  filledTemplate = filledTemplate.replace(/{{\w+}}/g, "Não preenchido")

  return filledTemplate
}


export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const validation = ExportSchema.safeParse(body)

    if (!validation.success) {
      console.error("[Export] Dados de entrada inválidos:", validation.error.errors)
      return NextResponse.json({ error: "Dados de entrada inválidos", details: validation.error.errors }, { status: 400 })
    }

    const { format, contractData } = validation.data

    // Validação extra dos campos essenciais
    if (!contractData || typeof contractData !== 'object') {
      console.error("[Export] contractData ausente ou inválido.")
      return NextResponse.json({ error: "Dados do contrato ausentes ou inválidos." }, { status: 400 })
    }
    if (!contractData.template) {
      console.warn("[Export] Campo 'template' ausente em contractData. Usando 'classic-professional' como padrão.")
    }

    // Determinar qual template usar
    const templateName = contractData.template || 'classic-professional'; // 'classic-professional' como padrão
    const templatePath = path.join(process.cwd(), "lib", "templates", `${templateName}.html`)
    let htmlTemplate: string | null = null;
    let triedFallback = false;

    try {
      htmlTemplate = await fs.readFile(templatePath, "utf-8")
      console.log(`[Export] Template '${templateName}.html' carregado com sucesso.`)
    } catch (err) {
      console.warn(`[Export] Template '${templateName}.html' não encontrado. Tentando fallback 'classic-professional.html'`)
      triedFallback = true;
      const fallbackPath = path.join(process.cwd(), "lib", "templates", "classic-professional.html")
      try {
        htmlTemplate = await fs.readFile(fallbackPath, "utf-8")
        console.log(`[Export] Fallback 'classic-professional.html' carregado com sucesso.`)
      } catch (fallbackErr) {
        console.error(`[Export] Nenhum template encontrado! Falha crítica.`)
        return NextResponse.json({ error: `Template '${templateName}.html' e fallback 'classic-professional.html' não encontrados.` }, { status: 404 })
      }
    }

    // Preencher o template com os dados
    const finalHtml = fillTemplate(htmlTemplate, contractData)

    if (format === "pdf") {
      return NextResponse.json({ html: finalHtml })
    }

    if (format === "word") {
      const headers = new Headers()
      const title = contractData.contract?.titulo_contrato || "contrato"
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
