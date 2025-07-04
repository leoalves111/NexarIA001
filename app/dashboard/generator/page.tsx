"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { useSavedContracts } from "@/hooks/use-saved-contracts"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import ContractWizard from "@/components/generator/contract-wizard"
import { getSupabaseClient } from "@/lib/supabase"

interface WizardData {
  contratante: {
    tipo: "pf" | "pj"
    nome: string
    documento: string
    endereco: string
    cidade: string
    estado: string
    telefone: string
    email: string
  }
  contratada: {
    tipo: "pf" | "pj"
    nome: string
    documento: string
    endereco: string
    cidade: string
    estado: string
    telefone: string
    email: string
  }
  contrato: {
    titulo: string
    tipo: string
    tipoPersonalizado?: string
    prompt: string
    valor: string
    prazo: string
    observacoes: string
    template: string
  }
}

interface GeneratedContract {
  success: boolean
  html?: string
  content?: string
  clauses?: string
  data?: WizardData
  message: string
}

interface Law {
  id: string
  title: string
  description: string
  category: string
  relevance: string
}

export default function GeneratorPage() {
  const [generating, setGenerating] = useState(false)
  const { user, subscription, refreshProfile, refreshSession } = useAuth()
  const { toast } = useToast()
  const { saveContract } = useSavedContracts()

  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null)
  const [suggestedLaws, setSuggestedLaws] = useState<Law[]>([])
  const [selectedLaws, setSelectedLaws] = useState<Law[]>([])
  const [loadingLaws, setLoadingLaws] = useState(false)

  // Leitura dos parâmetros da URL para pré-seleção
  const [urlParams, setUrlParams] = useState<{ template?: string; type?: string }>({})

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      const template = searchParams.get("template")
      const type = searchParams.get("type")

      if (template || type) {
        setUrlParams({ template: template || undefined, type: type || undefined })

        toast({
          title: "🎨 Template Selecionado!",
          description: `Template ${template || "padrão"} ${type ? `para ${type}` : ""} pré-selecionado.`,
          duration: 3000,
        })
      }
    }
  }, [])

  // Função utilitária para detectar tamanho do contrato
  const detectContractSize = (prompt: string): "resumido" | "normal" | "completo" => {
    const promptLower = prompt.toLowerCase()

    if (
      promptLower.includes("resumido") ||
      promptLower.includes("básico") ||
      promptLower.includes("simples") ||
      promptLower.includes("rápido") ||
      promptLower.includes("mínimo") ||
      promptLower.includes("curto")
    ) {
      return "resumido"
    }

    if (
      promptLower.includes("normal") ||
      promptLower.includes("médio") ||
      promptLower.includes("padrão") ||
      promptLower.includes("intermediário")
    ) {
      return "normal"
    }

    return "completo"
  }

  // Função utilitária para construir HTML final do contrato
  const buildFinalContract = async (
    wizardData: WizardData,
    aiClauses: string,
    template = "modern-executive",
  ): Promise<string> => {
    const { contratante, contratada, contrato } = wizardData

    const getRolesForContractType = (tipo: string) => {
      const roleMap: Record<string, { primary: string; secondary: string }> = {
        locacao: { primary: "LOCADOR(A)", secondary: "LOCATÁRIO(A)" },
        trabalho: { primary: "EMPREGADOR(A)", secondary: "EMPREGADO(A)" },
        servicos: { primary: "CONTRATANTE", secondary: "PRESTADOR(A) DE SERVIÇOS" },
        compra_venda: { primary: "VENDEDOR(A)", secondary: "COMPRADOR(A)" },
        consultoria: { primary: "CONTRATANTE", secondary: "CONSULTOR(A)" },
        prestacao_servicos: { primary: "CONTRATANTE", secondary: "PRESTADOR(A)" },
        fornecimento: { primary: "CONTRATANTE", secondary: "FORNECEDOR(A)" },
        sociedade: { primary: "SÓCIO(A) MAJORITÁRIO(A)", secondary: "SÓCIO(A) MINORITÁRIO(A)" },
        parceria: { primary: "PARCEIRO(A) PRINCIPAL", secondary: "PARCEIRO(A) ASSOCIADO(A)" },
        franquia: { primary: "FRANQUEADOR(A)", secondary: "FRANQUEADO(A)" },
        licenciamento: { primary: "LICENCIANTE", secondary: "LICENCIADO(A)" },
        manutencao: { primary: "CONTRATANTE", secondary: "PRESTADOR(A) DE MANUTENÇÃO" },
        seguro: { primary: "SEGURADO(A)", secondary: "SEGURADORA" },
        financiamento: { primary: "FINANCIADOR(A)", secondary: "FINANCIADO(A)" },
        outros: { primary: "CONTRATANTE", secondary: "CONTRATADA" },
      }
      return roleMap[tipo] || roleMap["outros"]
    }

    const getTerminologyForPersonType = (tipo: "pf" | "pj"): string => {
      return tipo === "pf" ? "residente e domiciliado(a)" : "com sede"
    }

    const roles = getRolesForContractType(contrato.tipo)
    let primaryParty = contratante
    let secondaryParty = contratada
    const primaryRole = roles.primary
    const secondaryRole = roles.secondary

    if (contrato.tipo === "locacao" && contratante.tipo === "pf" && contratada.tipo === "pj") {
      primaryParty = contratada
      secondaryParty = contratante
    } else if (contrato.tipo === "trabalho" && contratante.tipo === "pf" && contratada.tipo === "pj") {
      primaryParty = contratada
      secondaryParty = contratante
    } else if (contrato.tipo === "fornecimento" && contratante.tipo === "pf" && contratada.tipo === "pj") {
      primaryParty = contratada
      secondaryParty = contratante
    }

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contrato.titulo}</title>
    <style>
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 30px;
          background: #fff;
        }
        
        .contract-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .contract-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px;
          border-bottom: 3px solid #1e40af;
          color: #1e40af;
        }
        
        .contract-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .parties-intro {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .clause-title {
          background: #f8fafc;
          border-left: 4px solid #1e40af;
          color: #1e40af;
          padding: 15px;
          font-weight: bold;
          font-size: 16px;
          margin: 25px 0 15px 0;
          border-radius: 8px;
        }
        
        .clause-content {
          margin-left: 20px;
          margin-bottom: 20px;
          text-align: justify;
          font-size: 14px;
          line-height: 1.7;
        }
        
        @media print {
          body { margin: 0; padding: 0; }
          .contract-container { 
            max-width: none;
            margin: 0;
            padding: 15px;
            box-shadow: none;
          }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1 class="contract-title">${contrato.titulo.toUpperCase()}</h1>
        </div>
        
        <div class="parties-intro">
            <p><strong>${primaryRole}:</strong> ${primaryParty.nome}, ${primaryParty.tipo === "pf" ? "CPF" : "CNPJ"} nº ${primaryParty.documento}, ${getTerminologyForPersonType(primaryParty.tipo)} em ${primaryParty.endereco}, ${primaryParty.cidade}/${primaryParty.estado}${primaryParty.telefone ? `, telefone: ${primaryParty.telefone}` : ""}${primaryParty.email ? `, e-mail: ${primaryParty.email}` : ""}, doravante denominado(a) <strong>${primaryRole}</strong>.</p>
            
            <p><strong>${secondaryRole}:</strong> ${secondaryParty.nome}, ${secondaryParty.tipo === "pf" ? "CPF" : "CNPJ"} nº ${secondaryParty.documento}, ${getTerminologyForPersonType(secondaryParty.tipo)} em ${secondaryParty.endereco}, ${secondaryParty.cidade}/${secondaryParty.estado}${secondaryParty.telefone ? `, telefone: ${secondaryParty.telefone}` : ""}${secondaryParty.email ? `, e-mail: ${secondaryParty.email}` : ""}, doravante denominado(a) <strong>${secondaryRole}</strong>.</p>
            
            <p>As partes acima identificadas têm, entre si, justo e acordado o presente ${contrato.titulo}, que se regerá pelas cláusulas e condições seguintes:</p>
        </div>
        
        ${aiClauses}
        
        <div class="signature-section">
            <p style="text-align: center; margin: 40px 0 60px 0; font-weight: bold;">
                ${primaryParty.cidade}/${primaryParty.estado}, _____ de _____________ de _______.
            </p>
            
            <div style="display: flex; justify-content: space-between; margin-top: 80px;">
                <div style="text-align: center; width: 45%;">
                    <div style="border-bottom: 1px solid #000; margin-bottom: 10px; height: 50px;"></div>
                    <p style="margin: 0; font-weight: bold;">${primaryParty.nome}</p>
                    <p style="margin: 0; font-size: 14px;">${primaryRole}</p>
                </div>
                
                <div style="text-align: center; width: 45%;">
                    <div style="border-bottom: 1px solid #000; margin-bottom: 10px; height: 50px;"></div>
                    <p style="margin: 0; font-weight: bold;">${secondaryParty.nome}</p>
                    <p style="margin: 0; font-size: 14px;">${secondaryRole}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
  }

  // Função para buscar leis
  const searchLaws = async (observacoes: string) => {
    if (!observacoes.trim() || observacoes.trim().length < 5) {
      setSuggestedLaws([])
      return
    }

    const now = Date.now()
    const lastSearchTime = localStorage.getItem("lastLawSearch")
    if (lastSearchTime && now - Number.parseInt(lastSearchTime) < 3000) {
      toast({
        title: "🚨 Aguarde um pouco",
        description: "Aguarde alguns segundos entre buscas para evitar sobrecarga.",
        variant: "destructive",
      })
      return
    }
    localStorage.setItem("lastLawSearch", now.toString())

    setLoadingLaws(true)
    setSuggestedLaws([])

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch("/api/ai-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacoes: observacoes.trim() }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error("❌ [Laws] Erro ao parsear resposta de erro:", parseError)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (data.success && data.laws && Array.isArray(data.laws)) {
        setSuggestedLaws(data.laws)

        if (data.laws.length > 0) {
          toast({
            title: "🏛️ Leis encontradas!",
            description: `${data.laws.length} leis relacionadas foram encontradas`,
          })
        } else {
          toast({
            title: "📝 Nenhuma lei encontrada",
            description: "Tente usar termos mais específicos como 'CLT', 'Código Civil', etc.",
          })
        }
      } else {
        setSuggestedLaws([])
        toast({
          title: "📝 Nenhuma lei encontrada",
          description: data.message || "Tente usar termos mais específicos como 'CLT', 'Código Civil', etc.",
        })
      }
    } catch (error) {
      console.error("❌ [Laws] Erro ao buscar leis:", error)
      setSuggestedLaws([])

      let errorMessage = "Não foi possível buscar leis. Tente novamente em alguns segundos."

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Busca cancelada por timeout. Tente novamente com termos mais específicos."
        } else if (error.message.includes("Rate limit")) {
          errorMessage = "Muitas buscas realizadas. Aguarde alguns minutos."
        } else if (error.message.includes("HTTP 429")) {
          errorMessage = "Limite de buscas atingido. Aguarde alguns minutos."
        } else if (error.message.includes("HTTP 503")) {
          errorMessage = "Serviço temporariamente indisponível. Tente novamente mais tarde."
        }
      }

      toast({
        title: "❌ Erro na busca",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingLaws(false)
    }
  }

  // Função para selecionar/deselecionar leis
  const toggleLawSelection = (law: Law) => {
    setSelectedLaws((prev) => {
      const isSelected = prev.some((l) => l.id === law.id)
      if (isSelected) {
        return prev.filter((l) => l.id !== law.id)
      } else {
        return [...prev, law]
      }
    })
  }

  const generateContractFromWizard = async (wizardData: WizardData) => {
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa estar logado para gerar contratos.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)

    try {
      const contractSize = detectContractSize(wizardData.contrato.prompt)

      let enhancedPrompt = wizardData.contrato.prompt

      enhancedPrompt += `\n\nINSTRUÇÕES ESPECÍFICAS PARA O SISTEMA:
- Gere um contrato SUPER COMPLETO e PROFISSIONAL
- Inclua TODAS as cláusulas necessárias para este tipo de contrato: ${wizardData.contrato.tipo}
- Use leis específicas e precisas para o contexto
- Cite artigos, incisos e parágrafos das leis aplicáveis
- Inclua cláusulas de segurança jurídica (multa, rescisão, foro, etc.)
- Linguagem jurídica formal e precisa
- Mínimo de 15-20 cláusulas para máxima proteção jurídica
- Use subcláusulas detalhadas quando necessário`

      const sizeInstructions: Record<typeof contractSize, string> = {
        resumido:
          "\n\nTAMANHO SOLICITADO: Criar contrato RESUMIDO com cláusulas essenciais apenas (máximo 1 página, 5-8 cláusulas principais). Use apenas leis fundamentais para este tipo de contrato.",
        normal:
          "\n\nTAMANHO SOLICITADO: Criar contrato PADRÃO com cláusulas necessárias (1-1.5 páginas, 10-15 cláusulas). Inclua leis específicas e artigos precisos para este tipo de contrato.",
        completo:
          "\n\nTAMANHO SOLICITADO: Criar contrato SUPER COMPLETO e DETALHADO com MÁXIMA SEGURANÇA JURÍDICA (2-3 páginas, 15-25 cláusulas). OBRIGATÓRIO incluir: todas as cláusulas necessárias, subcláusulas detalhadas, leis específicas com artigos e incisos precisos, cláusulas de garantia, multa, rescisão, foro competente, disposições gerais e especiais. O contrato deve ser PROFISSIONAL e dar TOTAL TRANQUILIDADE ao usuário.",
      }

      enhancedPrompt += sizeInstructions[contractSize]

      const leisSelecionadas = selectedLaws.map((law) => ({
        text: law.title,
        description: law.description,
        category: law.category,
        context: law.relevance,
      }))

      const enhancedWizardData = {
        ...wizardData,
        contrato: {
          ...wizardData.contrato,
          prompt: enhancedPrompt,
          leisSelecionadas: leisSelecionadas,
        },
      }

      const lastGenerateTime = localStorage.getItem("lastContractGenerate")
      const generateNow = Date.now()
      if (lastGenerateTime && generateNow - Number.parseInt(lastGenerateTime) < 5000) {
        toast({
          title: "🚨 Aguarde um pouco",
          description: "Aguarde alguns segundos entre gerações para evitar sobrecarga.",
          variant: "destructive",
        })
        return
      }

      localStorage.setItem("lastContractGenerate", generateNow.toString())

      const supabase = getSupabaseClient()
      let session = null

      try {
        const { data: sessionData } = await supabase.auth.getSession()

        if (sessionData?.session?.access_token) {
          session = sessionData.session
        } else {
          const { session: renewedSession } = await refreshSession()

          if (renewedSession?.access_token) {
            session = renewedSession
          } else {
            const { data: directRefresh } = await supabase.auth.refreshSession()

            if (directRefresh?.session?.access_token) {
              session = directRefresh.session
            } else {
              throw new Error("Não foi possível obter token de acesso válido")
            }
          }
        }
      } catch (authError) {
        toast({
          title: "❌ Erro de Autenticação",
          description: "Sua sessão expirou. Faça login novamente.",
          variant: "destructive",
          duration: 5000,
        })

        setTimeout(() => {
          window.location.href = "/auth/login?redirect=/dashboard/generator"
        }, 2000)
        return
      }

      if (!session?.access_token) {
        toast({
          title: "❌ Token Inválido",
          description: "Não foi possível obter token de acesso. Redirecionando...",
          variant: "destructive",
        })

        setTimeout(() => {
          window.location.href = "/auth/login?redirect=/dashboard/generator"
        }, 2000)
        return
      }

      const response = await fetch("/api/generate-smart-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(enhancedWizardData),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          const text = await response.text()
          if (text) {
            errorData = JSON.parse(text)
          }
        } catch (parseError) {
          errorData = { error: `Erro HTTP ${response.status}`, details: [] }
        }

        if (response.status === 402) {
          toast({
            title: "❌ Créditos Insuficientes",
            description: errorData.message || "Você não possui créditos GPT-4o-mini suficientes.",
            variant: "destructive",
            duration: 8000,
          })
        } else if (response.status === 401) {
          toast({
            title: "❌ Erro de Autenticação",
            description: "Faça login novamente para continuar.",
            variant: "destructive",
          })
        } else if (response.status === 403) {
          toast({
            title: "❌ Assinatura Inativa",
            description: errorData.message || "Sua assinatura não está ativa.",
            variant: "destructive",
          })
        } else {
          const errorMessage = errorData.error || `Erro HTTP ${response.status}`
          const errorDetails = errorData.details && Array.isArray(errorData.details) ? errorData.details : []

          toast({
            title: errorMessage,
            description:
              errorDetails.length > 0 ? errorDetails.join("\n") : "Verifique os dados informados e tente novamente.",
            variant: "destructive",
            duration: 8000,
          })
        }

        return
      }

      const result = await response.json()

      if (!result.success || !result.clauses) {
        throw new Error(result.error || "API não retornou contrato válido")
      }

      const finalHtml = await buildFinalContract(
        wizardData,
        result.clauses,
        wizardData.contrato.template || "modern-executive",
      )

      const contractResult: GeneratedContract = {
        success: true,
        html: finalHtml,
        clauses: result.clauses,
        data: wizardData,
        message: result.message || "Contrato gerado com sucesso",
      }

      setGeneratedContract(contractResult)

      // Salvar no histórico
      await saveContract({
        titulo: wizardData.contrato.titulo,
        tipo: wizardData.contrato.tipo,
        tipoPersonalizado: wizardData.contrato.tipoPersonalizado,
        html: finalHtml,
        tamanho: contractSize,
        contratante: {
          nome: wizardData.contratante.nome,
          documento: wizardData.contratante.documento,
          endereco: `${wizardData.contratante.endereco}, ${wizardData.contratante.cidade}/${wizardData.contratante.estado}`,
          tipo: wizardData.contratante.tipo,
        },
        contratada: {
          nome: wizardData.contratada.nome,
          documento: wizardData.contratada.documento,
          endereco: `${wizardData.contratada.endereco}, ${wizardData.contratada.cidade}/${wizardData.contratada.estado}`,
          tipo: wizardData.contratada.tipo,
        },
        valor: wizardData.contrato.valor,
        prazo: wizardData.contrato.prazo,
        leisSelecionadas: selectedLaws.map((law) => law.title),
      })

      await refreshProfile()

      toast({
        title: "✅ Contrato Avançado Gerado!",
        description: `Seu contrato foi gerado com GPT-4o-mini. Créditos restantes: ${result.remainingCredits}`,
        duration: 5000,
      })
    } catch (error) {
      console.error("❌ [Generator] Erro na geração:", error)

      toast({
        title: "Erro ao gerar contrato",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <DashboardLayout>
      <ContractWizard
        onComplete={generateContractFromWizard}
        generating={generating}
        suggestedLaws={suggestedLaws}
        selectedLaws={selectedLaws}
        loadingLaws={loadingLaws}
        onSearchLaws={searchLaws}
        onToggleLaw={toggleLawSelection}
        initialTemplate={urlParams.template}
        initialType={urlParams.type}
      />
    </DashboardLayout>
  )
}
