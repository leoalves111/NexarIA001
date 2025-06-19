"use client"

import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, FileText, Download, Calendar, TrendingUp, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import SupabaseStatus from "@/components/supabase-status"

export default function DashboardPage() {
  const { profile, subscription } = useAuth()

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
      <div className="space-y-6">
        <SupabaseStatus />
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {profile?.nome || "Usuário"}! 👋</h1>
          <p className="text-gray-600 dark:text-gray-400">Bem-vindo ao seu painel de controle do NEXAR IA</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{subscription?.plano || "Carregando..."}</div>
              <p className="text-xs text-muted-foreground">
                {daysLeft > 0 ? `${daysLeft} dias restantes` : "Expirado"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Simples</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription?.creditos_simples || 0}</div>
              <p className="text-xs text-muted-foreground">CONTRATO TURBO</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Avançados</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription?.creditos_avancados || 0}</div>
              <p className="text-xs text-muted-foreground">CONTRATO AVANÇADO</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge variant={subscription?.status === "active" ? "default" : "destructive"} className="text-xs">
                  {subscription?.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Expira em {subscription ? formatDate(subscription.data_expiracao) : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-600" />
                Gerar Contrato
              </CardTitle>
              <CardDescription>Crie contratos personalizados com nossa IA</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/generator">
                <Button className="w-full bg-primary-600 hover:bg-primary-700">Começar Agora</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-secondary-600" />
                Templates
              </CardTitle>
              <CardDescription>Explore nossa biblioteca de templates</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/templates">
                <Button variant="outline" className="w-full">
                  Ver Templates
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600" />
                Exportações
              </CardTitle>
              <CardDescription>Gerencie seus contratos exportados</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/exports">
                <Button variant="outline" className="w-full">
                  Ver Exportações
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Alert */}
        {daysLeft <= 3 && daysLeft > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Calendar className="h-5 w-5" />
                Atenção: Assinatura expirando
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                Sua assinatura expira em {daysLeft} dias. Renove agora para continuar usando todos os recursos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/subscription">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">Renovar Assinatura</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {daysLeft <= 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <Calendar className="h-5 w-5" />
                Assinatura Expirada
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300">
                Sua assinatura expirou. Renove agora para continuar gerando contratos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/subscription">
                <Button className="bg-red-600 hover:bg-red-700 text-white">Renovar Agora</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
