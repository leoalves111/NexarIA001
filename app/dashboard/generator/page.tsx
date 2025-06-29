"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { useSavedContracts } from "@/hooks/use-saved-contracts"

import { useDebounce } from "@/hooks/use-debounce"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import ContractWizard from "@/components/generator/contract-wizard"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileText, Download, Wand2, Clock, CheckCircle } from "lucide-react"

interface WizardData {
  contratante: {
    tipo: 'pf' | 'pj'
    nome: string
    documento: string
    endereco: string
    cidade: string
    estado: string
    telefone: string
    email: string
  }
  contratada: {
    tipo: 'pf' | 'pj'
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
    tipoPersonalizado?: string // Para quando tipo for "outros"
    prompt: string  // Mudado de "objeto" para "prompt"
    valor: string
    prazo: string
    observacoes: string
    template: string
  }
}

interface GeneratedContract {
  success: boolean
  html?: string    // Para contratos da nova API smart
  content?: string // Para compatibilidade com API antiga
  clauses?: string // Para apenas cláusulas da API smart
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

interface LawsSuggestion {
  success: boolean
  laws?: Law[]
  suggestion?: string
  type: "laws_selection" | "text_suggestion"
}

// Função para gerar estilos baseados no template
const getTemplateStyles = (template: string): string => {
  const baseStyles = `
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
    
    .clause-container {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 20px;
    }
    
    .clause-title {
      padding: 15px;
      font-weight: bold;
      font-size: 16px;
      margin: 25px 0 15px 0;
      border-radius: 8px;
      page-break-after: avoid;
      break-after: avoid;
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
  `

  switch (template) {
         case 'modern':
       return baseStyles + `
         body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
         .contract-header {
           text-align: center;
           margin-bottom: 50px;
           padding: 40px;
           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           color: white;
           border-radius: 20px;
           box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
         }
         .contract-title {
           font-size: 36px;
           font-weight: 100;
           letter-spacing: 3px;
           text-transform: none;
         }
         .clause-title {
           background: linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%);
           border-left: 6px solid #667eea;
           color: #2d3748;
           border-radius: 0 15px 15px 0;
           font-weight: 300;
           text-transform: none;
         }
         .parties-intro {
           background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
           border: none;
           border-radius: 20px;
           box-shadow: 0 5px 15px rgba(0,0,0,0.1);
         }
       `
    
         case 'minimalist':
       return baseStyles + `
         body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; }
         .contract-container { 
           max-width: 190mm;
           padding: 20px;
           box-shadow: none;
           border-radius: 0;
         }
         .contract-header {
           text-align: left;
           margin-bottom: 60px;
           padding: 0;
           border-bottom: 1px solid #e2e8f0;
           background: none;
           border-radius: 0;
           color: #1a202c;
         }
         .contract-title {
           font-size: 24px;
           font-weight: 300;
           color: #1a202c;
           margin: 0 0 20px 0;
           text-transform: none;
           letter-spacing: 0;
         }
         .clause-title {
           background: none;
           border-left: 1px solid #cbd5e0;
           color: #2d3748;
           font-weight: 400;
           padding: 10px 0 10px 20px;
           font-size: 14px;
           text-transform: none;
           border-radius: 0;
           margin: 30px 0 10px 0;
         }
         .parties-intro {
           background: none;
           border: 1px solid #e2e8f0;
           border-radius: 0;
           padding: 20px;
         }
         .clause-content {
           margin-left: 25px;
           font-size: 13px;
           line-height: 1.6;
         }
       `
    
         case 'corporate':
       return baseStyles + `
         body { font-family: 'Georgia', serif; }
         .contract-container {
           border: 2px solid #1a202c;
           border-radius: 0;
         }
         .contract-header {
           text-align: center;
           margin-bottom: 50px;
           padding: 40px;
           background: #1a202c;
           color: white;
           border-radius: 0;
           position: relative;
         }
         .contract-header::after {
           content: '';
           position: absolute;
           bottom: -10px;
           left: 50%;
           transform: translateX(-50%);
           width: 100px;
           height: 4px;
           background: #1a202c;
         }
         .contract-title {
           font-size: 28px;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 4px;
           margin-bottom: 10px;
         }
         .clause-title {
           background: #f7fafc;
           border: 2px solid #1a202c;
           border-left: 8px solid #1a202c;
           color: #1a202c;
           text-transform: uppercase;
           font-weight: 700;
           padding: 20px;
           margin: 30px 0 20px 0;
           border-radius: 0;
           font-size: 15px;
           letter-spacing: 1px;
         }
         .parties-intro {
           border: 2px solid #1a202c;
           border-radius: 0;
           background: #f8fafc;
         }
         .signatures {
           border-top: 3px solid #1a202c;
           padding-top: 40px;
         }
       `
    
         case 'legal':
       return baseStyles + `
         body { font-family: 'Times New Roman', serif; font-size: 13px; }
         .contract-container {
           max-width: 200mm;
           border: 1px solid #2b6cb0;
           border-radius: 5px;
         }
         .contract-header {
           text-align: center;
           margin-bottom: 50px;
           padding: 30px;
           border: 3px solid #2b6cb0;
           border-radius: 5px;
           background: #f7fafc;
           color: #2b6cb0;
         }
         .contract-title {
           font-size: 22px;
           font-weight: 700;
           color: #2b6cb0;
           text-transform: uppercase;
           letter-spacing: 2px;
           margin-bottom: 5px;
         }
         .clause-title {
           background: #ebf8ff;
           border: 1px solid #2b6cb0;
           border-left: 6px solid #2b6cb0;
           color: #2b6cb0;
           font-weight: 700;
           text-transform: uppercase;
           font-size: 13px;
           padding: 15px;
           margin: 25px 0 15px 0;
           border-radius: 3px;
           letter-spacing: 0.5px;
         }
         .parties-intro {
           background: #f0f9ff;
           border: 2px solid #bfdbfe;
           border-radius: 5px;
           font-size: 12px;
         }
         .clause-content {
           font-size: 12px;
           text-align: justify;
           line-height: 1.8;
           margin-left: 15px;
         }
         .signatures {
           border-top: 2px solid #2b6cb0;
           margin-top: 50px;
         }
       `
    
    default: // professional
      return baseStyles + `
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
        .clause-title {
          background: #f8fafc;
          border-left: 4px solid #1e40af;
          color: #1e40af;
        }
      `
  }
}

export default function GeneratorPage() {
  const [generating, setGenerating] = useState(false)
  const { user, subscription, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { saveContract } = useSavedContracts()
  
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null)
  const [suggestedLaws, setSuggestedLaws] = useState<Law[]>([])
  const [selectedLaws, setSelectedLaws] = useState<Law[]>([])
  const [loadingLaws, setLoadingLaws] = useState(false)

  // ✅ VERIFICAÇÃO BÁSICA APENAS PARA UI (não para controle de acesso)  
  const hasCredits = subscription && subscription.creditos_avancados > 0

  // Função utilitária para detectar tamanho do contrato
  const detectContractSize = (prompt: string): "resumido" | "normal" | "completo" => {
    const promptLower = prompt.toLowerCase()
    
    if (promptLower.includes("resumido") || promptLower.includes("resumo") || promptLower.includes("básico") || promptLower.includes("simples")) {
      return "resumido"
    } else if (promptLower.includes("completo") || promptLower.includes("detalhado") || promptLower.includes("extenso") || promptLower.includes("2 páginas") || promptLower.includes("duas páginas")) {
      return "completo"
    }
    
    return "normal"
  }

  // Função utilitária para construir HTML final do contrato
  const buildFinalContract = async (wizardData: WizardData, aiClauses: string, template: string = 'modern-executive'): Promise<string> => {
    const { contratante, contratada, contrato } = wizardData
    
    // Definir labels corretos baseado no tipo
    const contratanteLabel = contratante.tipo === 'pf' ? 'CONTRATANTE (Pessoa Física)' : 'CONTRATANTE (Empresa)'
    const contratadaLabel = contratada.tipo === 'pf' ? 'CONTRATADO(A) (Pessoa Física)' : 'CONTRATADO(A) (Empresa)'
    
    const contratanteDoc = contratante.tipo === 'pf' ? `CPF nº ${contratante.documento}` : `CNPJ nº ${contratante.documento}`
    const contratadaDoc = contratada.tipo === 'pf' ? `CPF nº ${contratada.documento}` : `CNPJ nº ${contratada.documento}`

    const dataAtual = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })

    // Aplicar estilo baseado no template selecionado
    const templateStyles = getTemplateStyles(template)
    
    // Construir HTML completo
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contrato.titulo}</title>
    <style>
        ${templateStyles}
        .parties-intro {
            margin: 30px 0;
            text-align: justify;
            font-size: 14px;
            line-height: 1.7;
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #e5e7eb;
        }
        
        .party-info {
            font-weight: bold;
            margin: 15px 0;
            padding: 12px;
            border-radius: 6px;
        }
        
        .signatures {
            margin-top: 60px;
            padding: 20px 0;
            page-break-inside: avoid;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .signature-block {
            width: 45%;
            text-align: center;
            margin: 0;
        }
        
        .signature-line {
            border-top: 2px solid #666;
            margin: 60px 0 15px 0;
            padding-top: 10px;
            font-size: 12px;
            font-weight: bold;
            min-height: 40px;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1 class="contract-title">${contrato.titulo}</h1>
        </div>
        
        <div class="parties-intro">
            <div class="party-info">
                <strong>${contratanteLabel}:</strong> ${contratante.nome}, ${contratanteDoc}, 
                residente e domiciliado(a) em ${contratante.endereco}, ${contratante.cidade}/${contratante.estado}
                ${contratante.email ? `, e-mail: ${contratante.email}` : ''}
                ${contratante.telefone ? `, telefone: ${contratante.telefone}` : ''}, 
                doravante denominado(a) <strong>CONTRATANTE</strong>.
            </div>
            
            <div class="party-info">
                <strong>${contratadaLabel}:</strong> ${contratada.nome}, ${contratadaDoc}, 
                residente e domiciliado(a) em ${contratada.endereco}, ${contratada.cidade}/${contratada.estado}
                ${contratada.email ? `, e-mail: ${contratada.email}` : ''}
                ${contratada.telefone ? `, telefone: ${contratada.telefone}` : ''}, 
                doravante denominado(a) <strong>CONTRATADA</strong>.
            </div>
            
            <p style="margin-top: 25px; text-align: justify;">
                As partes acima identificadas têm, entre si, justo e acordado o presente 
                <span class="value-highlight">${contrato.titulo}</span>, que se regerá pelas cláusulas e condições seguintes:
            </p>
        </div>

        ${aiClauses}

        <div style="text-align: center; margin: 40px 0;">
            <p style="font-size: 18px; font-weight: bold;">${contratante.cidade}, ${dataAtual}.</p>
        </div>

        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line">${contratante.nome}<br>CONTRATANTE</div>
            </div>
            <div class="signature-block">
                <div class="signature-line">${contratada.nome}<br>CONTRATADA</div>
            </div>
        </div>
        
        <div class="ai-generated">
        </div>
    </div>
</body>
</html>`
  }

  // Função para buscar leis relacionadas às observações
  const searchLaws = async (observacoes: string) => {
    if (!observacoes.trim() || observacoes.trim().length < 5) {
      setSuggestedLaws([])
      return
    }

    // Rate limiting simples com estado local
    const now = Date.now()
    const lastSearchTime = localStorage.getItem('lastLawSearch')
    if (lastSearchTime && now - parseInt(lastSearchTime) < 2000) { // 2 segundos entre buscas
      toast({
        title: "🚨 Aguarde um pouco",
        description: "Aguarde alguns segundos entre buscas para evitar sobrecarga.",
        variant: "destructive"
      })
      return
    }
    localStorage.setItem('lastLawSearch', now.toString())

    setLoadingLaws(true)
    setSuggestedLaws([])

    try {
      console.log('🔍 [Laws] Iniciando busca por leis relacionadas...')
      
      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacoes: observacoes.trim() })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.laws && Array.isArray(data.laws)) {
        setSuggestedLaws(data.laws)
        console.log(`✅ [Laws] ${data.laws.length} leis encontradas`)
        
        toast({
          title: "🏛️ Leis encontradas!",
          description: `${data.laws.length} leis relacionadas foram encontradas`
        })
      } else {
        setSuggestedLaws([])
        toast({
          title: "📝 Nenhuma lei encontrada",
          description: "Tente usar termos mais específicos como 'CLT', 'Código Civil', etc."
        })
      }

    } catch (error) {
      console.error('❌ [Laws] Erro ao buscar leis:', error)
      setSuggestedLaws([])
      
      toast({
        title: "❌ Erro na busca",
        description: "Não foi possível buscar leis. Tente novamente em alguns segundos.",
        variant: "destructive"
      })
    } finally {
      setLoadingLaws(false)
    }
  }

  // Função para selecionar/deselecionar leis
  const toggleLawSelection = (law: Law) => {
    setSelectedLaws(prev => {
      const isSelected = prev.some(l => l.id === law.id)
      if (isSelected) {
        return prev.filter(l => l.id !== law.id)
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
      console.log(`📏 [Generator] Tamanho detectado: ${contractSize}`)

      // Montar prompt melhorado baseado no tamanho
      let enhancedPrompt = wizardData.contrato.prompt
      
      // Adicionar instruções de tamanho
      const sizeInstructions: Record<typeof contractSize, string> = {
        resumido: "\n\nTAMANHO: Criar contrato RESUMIDO com cláusulas essenciais apenas (máximo 1 página, 5-7 cláusulas principais).",
        normal: "\n\nTAMANHO: Criar contrato PADRÃO com cláusulas necessárias (1-1.5 páginas, 8-12 cláusulas).",
        completo: "\n\nTAMANHO: Criar contrato COMPLETO e DETALHADO com todas as cláusulas possíveis (até 2 páginas, 12-18 cláusulas, incluindo cláusulas de garantia, multa, foro, disposições gerais)."
      }
      
      enhancedPrompt += sizeInstructions[contractSize]
      console.log(`📏 [Generator] Tamanho detectado: ${contractSize}`)
      
      if (selectedLaws.length > 0) {
        const lawsText = selectedLaws.map(law => `${law.title}: ${law.description}`).join(". ")
        enhancedPrompt += `\n\nLEIS ESPECÍFICAS A APLICAR: ${lawsText}`
        console.log(`📚 [Generator] ${selectedLaws.length} leis adicionadas ao prompt`)
      }

      // Criar dados modificados com prompt melhorado
      const enhancedWizardData = {
        ...wizardData,
        contrato: {
          ...wizardData.contrato,
          prompt: enhancedPrompt
        }
      }

      // Rate limiting simples para geração
      const lastGenerateTime = localStorage.getItem('lastContractGenerate')
      const generateNow = Date.now()
      if (lastGenerateTime && generateNow - parseInt(lastGenerateTime) < 5000) { // 5 segundos entre gerações
        toast({
          title: "🚨 Aguarde um pouco",
          description: "Aguarde alguns segundos entre gerações para evitar sobrecarga.",
          variant: "destructive"
        })
        return
      }

      // Registrar o tempo da geração
      localStorage.setItem('lastContractGenerate', generateNow.toString())

      // ✅ OBTER TOKEN DE AUTENTICAÇÃO
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: "❌ Erro de autenticação",
          description: "Não foi possível obter token de acesso. Faça login novamente.",
          variant: "destructive"
        })
        return
      }

      // ✅ LOGS PARA DEBUG
      console.log("🔍 [Generator] Dados enviados para API:", JSON.stringify(enhancedWizardData, null, 2))
      console.log("🔍 [Generator] Tipo de contrato:", enhancedWizardData.contrato.tipo)
      console.log("🔍 [Generator] Tipo personalizado:", enhancedWizardData.contrato.tipoPersonalizado)

      // ✅ FAZER CHAMADA COM TOKEN DE AUTENTICAÇÃO
      const response = await fetch("/api/generate-smart-contract", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` // Token para API
        },
        body: JSON.stringify(enhancedWizardData),
      })

      if (!response.ok) {
        console.error(`❌ [Generator] API Error: ${response.status} ${response.statusText}`)
        
        let errorData: any = {}
        try {
          const text = await response.text()
          if (text) {
            errorData = JSON.parse(text)
          }
        } catch (parseError) {
          console.error("❌ [Generator] Erro ao parsear resposta de erro:", parseError)
          errorData = { error: `Erro HTTP ${response.status}`, details: [] }
        }
        
        console.error("❌ [Generator] Dados do erro:", errorData)
        
        // ✅ TRATAR ERROS ESPECÍFICOS DA API
        if (response.status === 402) {
          // Créditos insuficientes
          toast({
            title: "❌ Créditos Insuficientes",
            description: errorData.message || "Você não possui créditos GPT-4o-mini suficientes.",
            variant: "destructive",
            duration: 8000,
          })
        } else if (response.status === 401) {
          // Não autenticado
          toast({
            title: "❌ Erro de Autenticação",
            description: "Faça login novamente para continuar.",
            variant: "destructive",
          })
        } else if (response.status === 403) {
          // Assinatura inativa
          toast({
            title: "❌ Assinatura Inativa",
            description: errorData.message || "Sua assinatura não está ativa.",
            variant: "destructive",
          })
        } else {
          // Outros erros
          const errorMessage = errorData.error || `Erro HTTP ${response.status}`
          const errorDetails = errorData.details && Array.isArray(errorData.details) ? errorData.details : []
          
          toast({
            title: errorMessage,
            description: errorDetails.length > 0 
              ? errorDetails.join("\n") 
              : "Verifique os dados informados e tente novamente.",
            variant: "destructive",
            duration: 8000,
          })
        }
        
        return
      }

      const result = await response.json()
      console.log("✅ [Generator] Contrato gerado com sucesso:", result)

      // Validar resposta da API
      if (!result.success || !result.clauses) {
        throw new Error(result.error || "API não retornou contrato válido")
      }

      // Construir HTML final com dados das partes + cláusulas da IA
      const finalHtml = await buildFinalContract(wizardData, result.clauses, wizardData.contrato.template || 'modern-executive')

      const contractResult: GeneratedContract = {
        success: true,
        html: finalHtml,
        clauses: result.clauses,
        data: wizardData,
        message: result.message || "Contrato gerado com sucesso"
      }

      setGeneratedContract(contractResult)
      setShowPreview(true)

             // Salvar no histórico
       await saveContract({
         titulo: wizardData.contrato.titulo,
         tipo: wizardData.contrato.tipo,
         html: finalHtml,
         tamanho: contractSize,
         contratante: {
           nome: wizardData.contratante.nome,
           tipo: wizardData.contratante.tipo
         },
         contratada: {
           nome: wizardData.contratada.nome,
           tipo: wizardData.contratada.tipo
         },
         valor: wizardData.contrato.valor,
         leisSelecionadas: selectedLaws.map(law => law.title)
       })

      // ✅ ATUALIZAR DADOS DO USUÁRIO APÓS SUCESSO
      console.log(`💰 [Generator] Créditos restantes: ${result.remainingCredits}`)
      await refreshProfile() // Sincronizar dados do usuário

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

  const handleExport = async (format: "pdf" | "word") => {
    if (!generatedContract) return

    setExporting(format)
    
    try {
      if (format === "pdf") {
        // Para PDF, abrir em nova janela para impressão
        const content = generatedContract.html || generatedContract.content || ''
        const pdfWindow = window.open("")
        if (pdfWindow && content) {
          pdfWindow.document.write(content)
          pdfWindow.document.close()
          setTimeout(() => {
            pdfWindow.print()
          }, 500)
        }
        
        toast({
          title: "PDF gerado!",
          description: "O contrato foi aberto para impressão/download.",
        })
      } else if (format === "word") {
        // Para Word, criar blob e download
        const content = generatedContract.html || generatedContract.content || ''
        const blob = new Blob([content], { 
          type: 'application/msword' 
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        const safeTitle = (generatedContract.data?.contrato.titulo || 'contrato').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        a.href = url
        a.download = `${safeTitle}.doc`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Word gerado!",
          description: "O arquivo foi baixado com sucesso.",
        })
      }
    } catch (error) {
      console.error("Erro na exportação:", error)
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o arquivo.",
        variant: "destructive",
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wand2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Gerador de Contratos IA
            </h1>
          </div>
                      <p className="text-xl text-gray-600 dark:text-gray-400 max-w-5xl mx-auto">
            Crie contratos profissionais com nosso wizard inteligente <strong className="text-purple-600">GPT-4o-mini</strong>.
            <br />
            <span className="text-lg">Dados 100% precisos, IA avançada, validação automática e exportação instantânea.</span>
          </p>
        </div>

        {/* Estatísticas do usuário */}
                    <Card className="max-w-xl mx-auto">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-sm text-gray-500">Créditos GPT-4o-mini</p>
                <p className="text-2xl font-bold text-purple-600">
                  {subscription?.creditos_avancados || 0}
                </p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-sm text-gray-500">Plano Atual</p>
                <Badge variant="outline" className="text-sm">
                  {subscription?.plano || "Demo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wizard do Contrato */}
                <ContractWizard 
          onComplete={generateContractFromWizard} 
          generating={generating}
          suggestedLaws={suggestedLaws}
          selectedLaws={selectedLaws}
          loadingLaws={loadingLaws}
          onSearchLaws={searchLaws}
          onToggleLaw={toggleLawSelection}
        />

        {/* Modal de Preview */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-7xl max-h-[95vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <DialogTitle className="text-xl">
                      {generatedContract?.data?.contrato.titulo || "Contrato Gerado"}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-green-100 text-green-800">
                        <Wand2 className="h-3 w-3 mr-1" />
                        Wizard Estruturado
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Gerado agora
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Botões de Export */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExport("pdf")}
                    disabled={exporting === "pdf"}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {exporting === "pdf" ? (
                      <Clock className="h-4 w-4 mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {exporting === "pdf" ? "Gerando..." : "PDF"}
                  </Button>
                  <Button
                    onClick={() => handleExport("word")}
                    disabled={exporting === "word"}
                    variant="outline"
                  >
                    {exporting === "word" ? (
                      <Clock className="h-4 w-4 mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {exporting === "word" ? "Gerando..." : "Word"}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <Separator />

            {/* Resumo dos dados */}
            {generatedContract?.data && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Contratante:</span>{" "}
                    {generatedContract.data.contratante.nome} ({generatedContract.data.contratante.tipo === 'pf' ? 'Pessoa Física' : 'Empresa'})
                  </div>
                  <div>
                    <span className="font-medium">Contratada:</span>{" "}
                    {generatedContract.data.contratada.nome} ({generatedContract.data.contratada.tipo === 'pf' ? 'Pessoa Física' : 'Empresa'})
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span>{" "}
                    {generatedContract.data.contrato.valor}
                  </div>
                  <div>
                    <span className="font-medium">Prazo:</span>{" "}
                    {generatedContract.data.contrato.prazo}
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo do contrato */}
            <div className="flex-1 px-6">
              <ScrollArea className="h-[500px] w-full">
                <div className="contract-preview bg-white dark:bg-gray-900 p-8 rounded-lg border shadow-sm">
                  <div
                    className="contract-content"
                    dangerouslySetInnerHTML={{
                      __html: generatedContract?.html || generatedContract?.content || "",
                    }}
                  />
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Footer */}
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">
                Contrato gerado com IA • Dados 100% precisos • Validado automaticamente
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
