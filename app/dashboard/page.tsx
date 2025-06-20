"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { CreditCard, FileText, Download, Calendar, Sparkles, Zap, TrendingUp } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import StatusCard from "@/components/dashboard/status-card"
import QuickActionCard from "@/components/dashboard/quick-action-card"
import AlertBanner from "@/components/dashboard/alert-banner"
import SupabaseStatus from "@/components/supabase-status"

export default function DashboardPage() {
  const { user, profile, subscription, loading, isDemo } = useAuth()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando dados do usuário...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user && !isDemo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Redirecionando para login...</p>
            <Link href="/auth/login">
              <Button>Fazer Login</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Supabase Status Alert */}
        <SupabaseStatus />

        {/* Welcome Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-relaxed">
            Olá, {profile?.nome || "Usuário"}! 👋
            {isDemo && (
              <span className="inline-block ml-3 px-3 py-1 text-sm bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200 rounded-full">
                Modo Demo
              </span>
            )}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
            Bem-vindo ao seu painel de controle do NEXAR IA
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatusCard
            title="Plano Atual"
            value={subscription?.plano || "Carregando..."}
            subtitle={daysLeft > 0 ? `${daysLeft} dias restantes` : "Expirado"}
            icon={CreditCard}
            variant={subscription?.status === "active" ? "success" : "warning"}
          />

          <StatusCard
            title="Créditos Simples"
            value={subscription?.creditos_simples || 0}
            subtitle="CONTRATO TURBO"
            icon={Sparkles}
            variant="primary"
          />

          <StatusCard
            title="Créditos Avançados"
            value={subscription?.creditos_avancados || 0}
            subtitle="CONTRATO AVANÇADO"
            icon={Zap}
            variant="primary"
          />

          <StatusCard
            title="Status da Conta"
            value={subscription?.status === "active" ? "Ativo" : "Inativo"}
            subtitle={`Expira em ${subscription ? formatDate(subscription.data_expiracao) : "N/A"}`}
            icon={TrendingUp}
            variant={subscription?.status === "active" ? "success" : "danger"}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Quick Actions Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center lg:text-left">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickActionCard
              title="Gerar Contrato"
              description="Crie contratos personalizados com nossa IA avançada"
              href="/dashboard/generator"
              icon={Sparkles}
              buttonText="Começar Agora"
              variant="primary"
              color="primary"
            />

            <QuickActionCard
              title="Biblioteca de Templates"
              description="Explore nossa coleção completa de templates jurídicos"
              href="/dashboard/templates"
              icon={FileText}
              buttonText="Ver Templates"
              variant="outline"
              color="secondary"
            />

            <QuickActionCard
              title="Gerenciar Exportações"
              description="Acesse e organize todos os seus contratos exportados"
              href="/dashboard/exports"
              icon={Download}
              buttonText="Ver Exportações"
              variant="outline"
              color="blue"
            />
          </div>
        </div>

        {/* Subscription Alerts */}
        {daysLeft <= 3 && daysLeft > 0 && (
          <AlertBanner
            title="Atenção: Assinatura expirando"
            description={`Sua assinatura expira em ${daysLeft} dias. Renove agora para continuar usando todos os recursos.`}
            icon={Calendar}
            variant="warning"
            actionButton={{
              text: "Renovar Assinatura",
              onClick: () => (window.location.href = "/dashboard/subscription"),
            }}
          />
        )}

        {daysLeft <= 0 && (
          <AlertBanner
            title="Assinatura Expirada"
            description="Sua assinatura expirou. Renove agora para continuar gerando contratos."
            icon={Calendar}
            variant="danger"
            actionButton={{
              text: "Renovar Agora",
              onClick: () => (window.location.href = "/dashboard/subscription"),
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
