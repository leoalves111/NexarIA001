"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, AlertTriangle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

export default function SubscriptionPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  const { user, subscription, refreshProfile } = useAuth()
  const { toast } = useToast()

  const plans = [
    {
      id: "basico",
      name: "Básico",
      monthlyPrice: 49.99,
      annualPrice: 469.99,
      description: "Ideal para profissionais autônomos",
      features: [
        "100 contratos/mês (CONTRATO TURBO)",
        "50 contratos/mês (CONTRATO AVANÇADO)",
        "200 exportações/mês (Word/PDF)",
        "5 templates básicos",
        "1 usuário",
        "7.000 caracteres por contrato",
        "Suporte por e-mail",
      ],
      popular: false,
    },
    {
      id: "profissional",
      name: "Profissional",
      monthlyPrice: 149.99,
      annualPrice: 1429.99,
      description: "Para escritórios de advocacia",
      features: [
        "500 contratos/mês (CONTRATO TURBO)",
        "250 contratos/mês (CONTRATO AVANÇADO)",
        "800 exportações/mês (Word/PDF)",
        "25 templates (básicos + intermediários)",
        "Até 2 usuários",
        "17.500 caracteres por contrato",
        "Suporte por e-mail + WhatsApp",
      ],
      popular: true,
    },
    {
      id: "empresarial",
      name: "Empresarial",
      monthlyPrice: 349.99,
      annualPrice: 3349.99,
      description: "Para empresas e departamentos jurídicos",
      features: [
        "1.000 contratos/mês (CONTRATO TURBO)",
        "500 contratos/mês (CONTRATO AVANÇADO)",
        "2.000 exportações/mês (Word/PDF)",
        "Todos os tipos de templates",
        "3 usuários",
        "35.000 caracteres por contrato",
        "Suporte por e-mail + WhatsApp",
      ],
      popular: false,
    },
    {
      id: "super_ilimitado",
      name: "Super Ilimitado",
      monthlyPrice: 699.99,
      annualPrice: 6719.99,
      description: "Solução enterprise completa",
      features: [
        "Contratos ilimitados (CONTRATO TURBO)",
        "Contratos ilimitados (CONTRATO AVANÇADO)",
        "Exportações ilimitadas (Word/PDF)",
        "Todos os tipos de templates",
        "5 usuários",
        "80.000 caracteres por contrato",
        "Suporte prioritário (e-mail + WhatsApp)",
      ],
      popular: false,
    },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getDaysUntilExpiration = (dateString: string) => {
    const expiration = new Date(dateString)
    const today = new Date()
    const diffTime = expiration.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysLeft = subscription ? getDaysUntilExpiration(subscription.data_expiracao) : 0

  const handleSubscribe = async (planId: string) => {
    if (!user) return

    setProcessingPlan(planId)

    try {
      // Simulação de processamento de pagamento
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Determinar créditos com base no plano
      let creditos_simples = 0
      let creditos_avancados = 0

      switch (planId) {
        case "basico":
          creditos_simples = 100
          creditos_avancados = 50
          break
        case "profissional":
          creditos_simples = 500
          creditos_avancados = 250
          break
        case "empresarial":
          creditos_simples = 1000
          creditos_avancados = 500
          break
        case "super_ilimitado":
          creditos_simples = 9999
          creditos_avancados = 9999
          break
      }

      // Calcular data de expiração (1 mês ou 1 ano)
      const now = new Date()
      const expirationDate = new Date()
      if (isAnnual) {
        expirationDate.setFullYear(now.getFullYear() + 1)
      } else {
        expirationDate.setMonth(now.getMonth() + 1)
      }

      // Atualizar assinatura
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plano: planId,
          status: "active",
          creditos_simples,
          creditos_avancados,
          data_expiracao: expirationDate.toISOString(),
        })
        .eq("user_id", user.id)

      if (error) throw error

      // Registrar pagamento
      const planInfo = plans.find((p) => p.id === planId)
      const valor = isAnnual ? planInfo?.annualPrice : planInfo?.monthlyPrice

      await supabase.from("payment_history").insert({
        user_id: user.id,
        valor,
        status: "aprovado",
        tipo: isAnnual ? "anual" : "mensal",
        gateway: "simulado",
      })

      await refreshProfile()

      toast({
        title: "Assinatura atualizada!",
        description: `Seu plano foi atualizado para ${planInfo?.name} com sucesso.`,
      })
    } catch (error) {
      console.error("Error updating subscription:", error)
      toast({
        title: "Erro ao atualizar assinatura",
        description: "Ocorreu um erro ao processar o pagamento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setProcessingPlan(null)
    }
  }

  const getCurrentPlan = () => {
    if (!subscription) return null
    return plans.find((plan) => plan.id === subscription.plano) || null
  }

  const currentPlan = getCurrentPlan()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Assinatura</h1>
          <p className="text-gray-600 dark:text-gray-400">Visualize e atualize seu plano de assinatura</p>
        </div>

        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Assinatura Atual</CardTitle>
            <CardDescription>Detalhes do seu plano atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Plano</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {currentPlan?.name || subscription?.plano || "Teste Grátis"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                <div>
                  <Badge variant={subscription?.status === "active" ? "default" : "destructive"} className="text-xs">
                    {subscription?.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Expiração</h3>
                <p className="text-gray-900 dark:text-white">
                  {subscription ? formatDate(subscription.data_expiracao) : "N/A"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Créditos Disponíveis</h3>
                <div className="flex gap-4">
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-semibold">{subscription?.creditos_simples || 0}</span> simples
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-semibold">{subscription?.creditos_avancados || 0}</span> avançados
                  </p>
                </div>
              </div>
            </div>

            {daysLeft <= 7 && daysLeft > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800 dark:text-orange-200">Assinatura expirando</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Sua assinatura expira em {daysLeft} dias. Renove agora para evitar interrupções.
                  </p>
                </div>
              </div>
            )}

            {daysLeft <= 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">Assinatura expirada</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Sua assinatura expirou. Renove agora para continuar usando todos os recursos.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Toggle */}
        <div className="flex items-center justify-center space-x-4 my-8">
          <span className={`text-lg font-medium ${!isAnnual ? "text-primary-600" : "text-gray-500"}`}>Mensal</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-700"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAnnual ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={`text-lg font-medium ${isAnnual ? "text-primary-600" : "text-gray-500"}`}>Anual</span>
          {isAnnual && (
            <Badge className="bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
              Economize 20%
            </Badge>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? "bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700"
                  : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white">
                  Mais Popular
                </Badge>
              )}

              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    R$ {isAnnual ? Math.floor(plan.annualPrice / 12) : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">/mês</span>
                  {isAnnual && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Cobrado anualmente (R$ {plan.annualPrice})
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <Check className="h-5 w-5 text-secondary-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary-600 hover:bg-primary-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                  }`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={processingPlan !== null}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : subscription?.plano === plan.id ? (
                    "Plano Atual"
                  ) : (
                    "Assinar Agora"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pagamento</CardTitle>
            <CardDescription>Gerencie seus cartões e formas de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-gray-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">•••• •••• •••• 4242</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expira em 12/2025</p>
                </div>
              </div>
              <Badge>Padrão</Badge>
            </div>
            <Button variant="outline" className="mt-4">
              Adicionar Novo Cartão
            </Button>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>Visualize suas faturas anteriores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fatura
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date().toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      R$ {currentPlan?.monthlyPrice || "0,00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="success"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Pago
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-primary-400">
                      <Button variant="link" className="p-0 h-auto">
                        Download
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
