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
  const [generatedContent, setGeneratedContent] = useState("")
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

  const [selectedTemplate, setSelectedTemplate] = useState("classic")

  const { user, subscription, refreshProfile, isDemo } = useAuth()
  const { toast } = useToast()

  // Verificar créditos
  const canGenerateSimple = subscription && subscription.creditos_simples > 0
  const canGenerateAdvanced = subscription && subscription.creditos_avancados > 0

  const generateContract = async () => {
    if (!user && !isDemo) {
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

    // Verificar créditos apenas se não for demo
    if (!isDemo) {
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
          setGeneratedContent(cacheData.content)
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
        throw new Error("Erro na comunicação com o servidor. Tente novamente.")
      }

      if (!result.content) {
        throw new Error("Conteúdo do contrato não foi gerado")
      }

      setGeneratedContent(result.content)
      setShowPreview(true)

      // 5. Atualizar créditos se não for demo
      if (!isDemo && user && subscription) {
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
    try {
      const response = await fetch("/api/export-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: generatedContent,
          format,
          contractType,
          isDemo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Falha na exportação")
      }

      // Criar blob e fazer download direto
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url

      const filename = title.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "_")
      a.download = `${filename}.${format === "pdf" ? "html" : "doc"}`

      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: `Contrato exportado em ${format.toUpperCase()}!`,
        description: "O download foi iniciado automaticamente.",
      })
    } catch (error) {
      console.error("Erro na exportação:", error)
      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Não foi possível exportar o contrato.",
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
          disabled={!canGenerateSimple && !canGenerateAdvanced && !isDemo}
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
            content={generatedContent}
            title={title}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            onExport={handleExport}
            onEditInput={() => {
              setShowPreview(false)
              setGeneratedContent("")
            }}
            onTitleSave={handleTitleSave}
            contractType={contractType}
            cacheHit={cacheHit}
            lexmlData={lexmlData}
            isDemo={isDemo}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
