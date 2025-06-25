"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import ContractTypeSelector from "@/components/generator/contract-type-selector"
import ContractForm from "@/components/generator/contract-form"
import AdvancedSettings from "@/components/generator/advanced-settings"
import ContractPreviewModal from "@/components/generator/contract-preview-modal"
import ContractTemplateSelector from "@/components/generator/contract-template-selector"
import { supabase } from "@/lib/supabase"

// Replace the existing generateCacheKey function with this browser-compatible version
const generateCacheKey = (title: string, description: string, contractType: string, advancedConfig: any) => {
  const content = `${title}-${description}-${contractType}-${JSON.stringify(advancedConfig)}`
  // Use a simple hash function for the browser
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export default function GeneratorPage() {
  // Estados principais
  const [contractType, setContractType] = useState<"simple" | "advanced">("simple")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [generating, setGenerating] = useState(false)
  
  // Alterado para armazenar o objeto completo do contrato
  const [generatedContractData, setGeneratedContractData] = useState<any>(null)
  
  const [showPreview, setShowPreview] = useState(false)

  // Configurações avançadas
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(3500)
  const [includeLexML, setIncludeLexML] = useState(true)
  const [customPrompt, setCustomPrompt] = useState("")
  const [advancedConfig, setAdvancedConfig] = useState<any>({})

  // Estados de integração
  const [lexmlData, setLexmlData] = useState<any>(null)
  const [cacheHit, setCacheHit] = useState(false)

  const [selectedTemplate, setSelectedTemplate] = useState("classic-professional")

  const { user, subscription, refreshProfile } = useAuth()
  const { toast } = useToast()

  // Verificar créditos
  const canGenerateSimple = subscription && subscription.creditos_simples > 0
  const canGenerateAdvanced = subscription && subscription.creditos_avancados > 0

  const generateContract = async () => {
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa estar logado para gerar contratos.",
        variant: "destructive",
      })
      return
    }

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título e a descrição do contrato.",
        variant: "destructive",
      })
      return
    }

    if (!selectedTemplate || selectedTemplate.trim().length === 0) {
      toast({
        title: "Template não selecionado",
        description: "Selecione um template antes de gerar o contrato.",
        variant: "destructive",
      })
      return
    }

    // Verificar créditos
    if (contractType === "simple" && !canGenerateSimple) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não possui créditos suficientes para gerar contratos simples.",
        variant: "destructive",
      })
      return
    }

    if (contractType === "advanced" && !canGenerateAdvanced) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não possui créditos suficientes para gerar contratos avançados.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    setCacheHit(false)
    setLexmlData(null)

    try {
      // 1. Gerar hash para cache
      // With this:
      const cacheKey = generateCacheKey(title, description, contractType, advancedConfig)

      // 2. Verificar cache
      const cacheResponse = await fetch("/api/check-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cacheKey,
          prompt: `${title}

${description}`,
          contractType,
          temperature,
          maxTokens,
        }),
      })

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        if (cacheData.found) {
          setGeneratedContractData(cacheData.content)
          setCacheHit(true)
          setShowPreview(true)
          toast({
            title: "Contrato salvo em cache!",
            description: "Encontramos um contrato similar já gerado.",
          })
          return
        }
      }

      // 3. Consultar LexML se habilitado
      if (includeLexML || advancedConfig.enhancedLexML) {
        try {
          const lexmlResponse = await fetch("/api/lexml-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `${title} ${description}`,
              enhanced: advancedConfig.enhancedLexML,
            }),
          })

          if (lexmlResponse.ok) {
            const lexmlResult = await lexmlResponse.json()
            if (lexmlResult.laws && lexmlResult.laws.length > 0) {
              setLexmlData(lexmlResult)
            }
          }
        } catch (error) {
          console.warn("LexML indisponível:", error)
          toast({
            title: "Consulta LexML indisponível",
            description: "Prosseguindo sem consulta legal automática.",
            variant: "default",
          })
        }
      }

      // 4. Gerar contrato via API
      const generateResponse = await fetch("/api/generate-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prompt: description,
          contractType,
          temperature,
          maxTokens,
          customPrompt,
          lexmlData,
          cacheKey,
          template: selectedTemplate,
          // Configurações avançadas
          ...advancedConfig,
        }),
      })

      let result
      try {
        // Verificar se a resposta é JSON válido
        const responseText = await generateResponse.text()

        if (!generateResponse.ok) {
          // Tentar parsear como JSON para pegar a mensagem de erro
          try {
            const errorData = JSON.parse(responseText)
            throw new Error(errorData.error || `Erro HTTP ${generateResponse.status}`)
          } catch {
            // Se não for JSON, usar o texto da resposta
            throw new Error(`Erro do servidor: ${responseText.substring(0, 100)}...`)
          }
        }

        // Tentar parsear a resposta como JSON
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Erro ao processar resposta da API:", parseError)
        toast({
          title: "Erro ao gerar contrato",
          description: parseError instanceof Error ? parseError.message : "Erro na comunicação com o servidor.",
          variant: "destructive",
        })
        setGenerating(false)
        return
      }

      if (!result.contract) {
        toast({
          title: "Erro ao gerar contrato",
          description: result.error || "Conteúdo do contrato não foi gerado.",
          variant: "destructive",
        })
        setGenerating(false)
        return
      }

      // Armazenar o objeto de dados completo
      setGeneratedContractData(result)
      setShowPreview(true)

      // 5. Atualizar créditos
      if (user && subscription) {
        try {
          const newCredits =
            contractType === "simple"
              ? { creditos_simples: subscription.creditos_simples - 1 }
              : { creditos_avancados: subscription.creditos_avancados - 1 }

          const { error: updateError } = await supabase.from("subscriptions").update(newCredits).eq("user_id", user.id)

          if (!updateError) {
            await refreshProfile()
          }
        } catch (creditError) {
          console.warn("Erro ao atualizar créditos:", creditError)
        }
      }

      toast({
        title: "Contrato gerado com sucesso!",
        description: `Seu contrato "${title}" foi gerado e está pronto para revisão.`,
      })
    } catch (error) {
      console.error("Erro na geração:", error)
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
    if (!generatedContractData) {
        toast({
            title: "Nenhum contrato gerado",
            description: "Por favor, gere um contrato antes de exportar.",
            variant: "destructive",
        })
        return
    }
    if (!generatedContractData.template || generatedContractData.template.trim().length === 0) {
        toast({
            title: "Template não encontrado no contrato gerado",
            description: "Não foi possível identificar o template do contrato para exportação.",
            variant: "destructive",
        })
        return
    }
    try {
      const response = await fetch("/api/export-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          contractData: generatedContractData, // Enviar o objeto de dados completo
        }),
      })

      if (!response.ok) {
        let errorMsg = "Falha ao preparar a exportação"
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
        } catch {}
        throw new Error(errorMsg)
      }

      if (format === "pdf") {
        const { html } = await response.json();
        const pdfWindow = window.open("");
        pdfWindow?.document.write(html);
        pdfWindow?.document.close();
        setTimeout(() => {
          pdfWindow?.print();
        }, 500);
      } else if (format === "word") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        const safeTitle = (generatedContractData.contract?.titulo_contrato || "contrato").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.href = url
        a.download = `${safeTitle}.doc`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Erro na exportação:", error)
      toast({
        title: "Erro ao exportar",
        description: error instanceof Error ? error.message : "Não foi possível exportar o arquivo.",
        variant: "destructive",
      })
    }
  }

  const handleTitleSave = async (newTitle: string) => {
    setTitle(newTitle)
    toast({
      title: "Título atualizado!",
      description: "O título do contrato foi atualizado com sucesso.",
    })
  }

  const handleEditDescription = () => {
    // Implementar lógica para permitir edição se necessário
    toast({
      title: "Função em desenvolvimento",
      description: "A edição do contrato gerado estará disponível em breve.",
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerador de Contratos IA</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Crie contratos profissionais com inteligência artificial especializada em direito brasileiro
          </p>
        </div>

        {/* Seletor de Tipo */}
        <ContractTypeSelector
          selectedType={contractType}
          onTypeChange={setContractType}
          simpleCredits={subscription?.creditos_simples || 0}
          advancedCredits={subscription?.creditos_avancados || 0}
          disabled={generating}
        />

        {/* Seletor de Template */}
        <ContractTemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          disabled={generating}
        />

        {/* Formulário Principal */}
        <ContractForm
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          onGenerate={generateContract}
          generating={generating}
          contractType={contractType}
          disabled={!canGenerateSimple && !canGenerateAdvanced}
          userPlan={subscription?.plano || "Demo"}
        />

        {/* Configurações Avançadas */}
        <AdvancedSettings
          temperature={temperature}
          onTemperatureChange={setTemperature}
          maxTokens={maxTokens}
          onMaxTokensChange={setMaxTokens}
          includeLexML={includeLexML}
          onIncludeLexMLChange={setIncludeLexML}
          customPrompt={customPrompt}
          onCustomPromptChange={setCustomPrompt}
          contractType={contractType}
          onMetadataChange={setAdvancedConfig}
        />

        {/* Modal de Preview */}
        {showPreview && (
          <ContractPreviewModal
            content={generatedContractData}
            title={title}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            onExport={handleExport}
            onEditInput={handleEditDescription}
            onTitleSave={handleTitleSave}
            contractType={contractType}
            cacheHit={cacheHit}
            lexmlData={lexmlData}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
