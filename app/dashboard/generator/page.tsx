"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Zap, Save, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

export default function GeneratorPage() {
  const [description, setDescription] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState("")
  const [contractName, setContractName] = useState("")
  const [saving, setSaving] = useState(false)

  const { user, subscription, refreshProfile, isDemo } = useAuth()
  const { toast } = useToast()

  const canGenerateSimple = subscription && subscription.creditos_simples > 0
  const canGenerateAdvanced = subscription && subscription.creditos_avancados > 0

  const generateContract = async (type: "simples" | "avancado") => {
    if (!user && !isDemo) return

    if (type === "simples" && !canGenerateSimple) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não possui créditos suficientes para gerar contratos simples.",
        variant: "destructive",
      })
      return
    }

    if (type === "avancado" && !canGenerateAdvanced) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não possui créditos suficientes para gerar contratos avançados.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)

    try {
      // Simular geração de contrato (aqui você integraria com a API da OpenAI)
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const mockContent = `
# CONTRATO DE PRESTAÇÃO DE SERVIÇOS

**Partes:**
- CONTRATANTE: [Nome do Contratante]
- CONTRATADO: [Nome do Contratado]

**Objeto:**
${description}

**Cláusulas:**

1. **DO OBJETO**: O presente contrato tem por objeto ${description.toLowerCase()}.

2. **DAS OBRIGAÇÕES**: O CONTRATADO se obriga a prestar os serviços descritos no objeto deste contrato.

3. **DO PRAZO**: O presente contrato terá vigência de [prazo] a partir da data de assinatura.

4. **DO VALOR**: Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor de R$ [valor].

5. **DO PAGAMENTO**: O pagamento será efetuado [forma de pagamento].

6. **DAS DISPOSIÇÕES GERAIS**: Este contrato é regido pelas leis brasileiras.

Local e data: ________________

_________________________        _________________________
    CONTRATANTE                      CONTRATADO
      `

      setGeneratedContent(mockContent)
      setContractName(`Contrato ${type} - ${new Date().toLocaleDateString("pt-BR")}`)

      if (!isDemo && user) {
        // Atualizar créditos apenas se não estiver em modo demo
        const newCredits =
          type === "simples"
            ? { creditos_simples: subscription!.creditos_simples - 1 }
            : { creditos_avancados: subscription!.creditos_avancados - 1 }

        await supabase.from("subscriptions").update(newCredits).eq("user_id", user.id)
        await refreshProfile()
      }

      toast({
        title: "Contrato gerado com sucesso!",
        description: `Seu contrato ${type} foi gerado. Você pode salvá-lo agora.`,
      })
    } catch (error) {
      toast({
        title: "Erro ao gerar contrato",
        description: "Ocorreu um erro ao gerar o contrato. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const saveContract = async () => {
    if (!user && !isDemo) return
    if (!generatedContent) return

    setSaving(true)

    try {
      if (!isDemo && user) {
        const { error } = await supabase.from("contracts").insert({
          user_id: user.id,
          nome: contractName,
          descricao: description,
          tipo: "simples", // Você pode determinar isso baseado no tipo gerado
          conteudo: generatedContent,
        })

        if (error) throw error
      }

      toast({
        title: "Contrato salvo!",
        description: isDemo ? "Contrato salvo no modo demonstração." : "Seu contrato foi salvo com sucesso.",
      })

      // Limpar formulário
      setDescription("")
      setGeneratedContent("")
      setContractName("")
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o contrato.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerador de Contratos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Descreva o contrato que você precisa e nossa IA criará um documento completo
          </p>
        </div>

        {/* Credits Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary-600" />
                Créditos Simples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription?.creditos_simples || 0}</div>
              <p className="text-xs text-muted-foreground">CONTRATO TURBO disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-secondary-600" />
                Créditos Avançados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription?.creditos_avancados || 0}</div>
              <p className="text-xs text-muted-foreground">CONTRATO AVANÇADO disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Generator Form */}
        <Card>
          <CardHeader>
            <CardTitle>Descreva seu contrato</CardTitle>
            <CardDescription>
              Seja específico sobre o tipo de contrato, partes envolvidas, valores e condições
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Descrição do contrato</Label>
              <Textarea
                id="description"
                placeholder="Ex: Preciso de um contrato de prestação de serviços de consultoria em marketing digital para uma empresa de tecnologia, com duração de 6 meses, valor mensal de R$ 5.000,00..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] mt-1"
                disabled={generating}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => generateContract("simples")}
                disabled={generating || !description.trim() || (!canGenerateSimple && !isDemo)}
                className="flex-1 bg-primary-600 hover:bg-primary-700"
              >
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Gerar Simples (1 crédito)
              </Button>

              <Button
                onClick={() => generateContract("avancado")}
                disabled={generating || !description.trim() || (!canGenerateAdvanced && !isDemo)}
                variant="outline"
                className="flex-1 border-secondary-600 text-secondary-600 hover:bg-secondary-50"
              >
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Gerar Avançado (1 crédito)
              </Button>
            </div>

            {!canGenerateSimple && !canGenerateAdvanced && !isDemo && (
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  Você não possui créditos suficientes. Atualize seu plano para continuar gerando contratos.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generated Content */}
        {generatedContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Contrato Gerado
                <Badge variant="secondary">Pronto para salvar</Badge>
              </CardTitle>
              <CardDescription>Revise o contrato gerado e salve-o em suas exportações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contract-name">Nome do contrato</Label>
                <input
                  id="contract-name"
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  placeholder="Nome para identificar este contrato"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{generatedContent}</pre>
              </div>

              <Button
                onClick={saveContract}
                disabled={saving || !contractName.trim()}
                className="w-full bg-secondary-600 hover:bg-secondary-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Contrato
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
