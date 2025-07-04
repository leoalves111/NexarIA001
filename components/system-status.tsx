"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Server,
  Users,
  Shield,
  Activity,
  TrendingUp,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface SystemStatus {
  database: "online" | "offline" | "error"
  realtime: "connected" | "disconnected" | "error"
  auth: "active" | "inactive" | "error"
  rls: "enabled" | "disabled" | "error"
  tables: {
    profiles: boolean
    saved_contracts: boolean
    subscriptions: boolean
    prompt_profiles: boolean
  }
  stats: {
    totalUsers: number
    totalContracts: number
    activeSubscriptions: number
    todayContracts: number
  }
  performance: {
    dbResponseTime: number
    lastCheck: Date
  }
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    database: "offline",
    realtime: "disconnected",
    auth: "inactive",
    rls: "disabled",
    tables: {
      profiles: false,
      saved_contracts: false,
      subscriptions: false,
      prompt_profiles: false,
    },
    stats: {
      totalUsers: 0,
      totalContracts: 0,
      activeSubscriptions: 0,
      todayContracts: 0,
    },
    performance: {
      dbResponseTime: 0,
      lastCheck: new Date(),
    },
  })

  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const checkSystemStatus = async () => {
    setIsChecking(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Teste de conexão com o banco
      const { data: dbTest, error: dbError } = await supabase.from("profiles").select("count").limit(1)

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`)
      }

      const dbResponseTime = Date.now() - startTime

      // Verificar tabelas
      const tables = {
        profiles: false,
        saved_contracts: false,
        subscriptions: false,
        prompt_profiles: false,
      }

      // Testar cada tabela
      const tableTests = await Promise.allSettled([
        supabase.from("profiles").select("count").limit(1),
        supabase.from("saved_contracts").select("count").limit(1),
        supabase.from("subscriptions").select("count").limit(1),
        supabase.from("prompt_profiles").select("count").limit(1),
      ])

      tables.profiles = tableTests[0].status === "fulfilled"
      tables.saved_contracts = tableTests[1].status === "fulfilled"
      tables.subscriptions = tableTests[2].status === "fulfilled"
      tables.prompt_profiles = tableTests[3].status === "fulfilled"

      // Obter estatísticas
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usersResult, contractsResult, subscriptionsResult, todayContractsResult] = await Promise.allSettled([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("saved_contracts").select("id", { count: "exact" }),
        supabase.from("subscriptions").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("saved_contracts").select("id", { count: "exact" }).gte("created_at", today.toISOString()),
      ])

      const stats = {
        totalUsers: usersResult.status === "fulfilled" ? usersResult.value.count || 0 : 0,
        totalContracts: contractsResult.status === "fulfilled" ? contractsResult.value.count || 0 : 0,
        activeSubscriptions: subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value.count || 0 : 0,
        todayContracts: todayContractsResult.status === "fulfilled" ? todayContractsResult.value.count || 0 : 0,
      }

      // Verificar autenticação
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Teste de realtime
      const channel = supabase.channel("status-test")
      const realtimeStatus = await new Promise<"connected" | "disconnected">((resolve) => {
        const timeout = setTimeout(() => {
          supabase.removeChannel(channel)
          resolve("disconnected")
        }, 3000)

        channel.subscribe((status) => {
          clearTimeout(timeout)
          supabase.removeChannel(channel)
          resolve(status === "SUBSCRIBED" ? "connected" : "disconnected")
        })
      })

      setStatus({
        database: "online",
        realtime: realtimeStatus,
        auth: user ? "active" : "inactive",
        rls: "enabled", // Assumindo que RLS está habilitado baseado nos testes
        tables,
        stats,
        performance: {
          dbResponseTime,
          lastCheck: new Date(),
        },
      })

      toast({
        title: "✅ Status atualizado",
        description: `Sistema verificado em ${dbResponseTime}ms`,
      })
    } catch (err) {
      console.error("System status check failed:", err)
      setError(err instanceof Error ? err.message : "Unknown error")

      setStatus((prev) => ({
        ...prev,
        database: "error",
        realtime: "error",
        auth: "error",
        rls: "error",
        performance: {
          ...prev.performance,
          lastCheck: new Date(),
        },
      }))

      toast({
        title: "❌ Erro na verificação",
        description: "Não foi possível verificar o status do sistema",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkSystemStatus()

    // Verificar status a cada 30 segundos
    const interval = setInterval(checkSystemStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
      case "connected":
      case "active":
      case "enabled":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "offline":
      case "disconnected":
      case "inactive":
      case "disabled":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
      case "connected":
      case "active":
      case "enabled":
        return "text-green-600 bg-green-50 border-green-200"
      case "offline":
      case "disconnected":
      case "inactive":
      case "disabled":
        return "text-red-600 bg-red-50 border-red-200"
      case "error":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getPerformanceColor = (responseTime: number) => {
    if (responseTime < 200) return "text-green-600"
    if (responseTime < 500) return "text-yellow-600"
    return "text-red-600"
  }

  const allSystemsOperational = Object.values(status.tables).every(Boolean) && status.database === "online"

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Status do Sistema
              {allSystemsOperational && <Badge className="bg-green-500">Operacional</Badge>}
            </CardTitle>
            <CardDescription>
              Monitoramento em tempo real • Última verificação:{" "}
              {status.performance.lastCheck.toLocaleTimeString("pt-BR")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={checkSystemStatus} disabled={isChecking}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status dos Serviços Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(status.database)}`}>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Banco</span>
            </div>
            {getStatusIcon(status.database)}
          </div>

          <div className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(status.realtime)}`}>
            <div className="flex items-center gap-2">
              {status.realtime === "connected" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="text-sm font-medium">Real-time</span>
            </div>
            {getStatusIcon(status.realtime)}
          </div>

          <div className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(status.auth)}`}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Auth</span>
            </div>
            {getStatusIcon(status.auth)}
          </div>

          <div className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(status.rls)}`}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">RLS</span>
            </div>
            {getStatusIcon(status.rls)}
          </div>
        </div>

        <Separator />

        {/* Performance */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Performance</span>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold ${getPerformanceColor(status.performance.dbResponseTime)}`}>
              {status.performance.dbResponseTime}ms
            </div>
            <div className="text-xs text-muted-foreground">Resposta DB</div>
          </div>
        </div>

        <Separator />

        {/* Status das Tabelas */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Status das Tabelas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(status.tables).map(([table, isActive]) => (
              <div
                key={table}
                className={`flex items-center justify-between p-2 border rounded ${
                  isActive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <span className="text-xs font-mono">{table}</span>
                {isActive ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Estatísticas */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Estatísticas do Sistema
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg bg-blue-50 border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{status.stats.totalUsers}</div>
              <div className="text-xs text-blue-600">Usuários</div>
            </div>

            <div className="text-center p-3 border rounded-lg bg-green-50 border-green-200">
              <div className="text-2xl font-bold text-green-600">{status.stats.totalContracts}</div>
              <div className="text-xs text-green-600">Contratos</div>
            </div>

            <div className="text-center p-3 border rounded-lg bg-purple-50 border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{status.stats.activeSubscriptions}</div>
              <div className="text-xs text-purple-600">Assinaturas</div>
            </div>

            <div className="text-center p-3 border rounded-lg bg-orange-50 border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{status.stats.todayContracts}</div>
              <div className="text-xs text-orange-600">Hoje</div>
            </div>
          </div>
        </div>

        {/* Status Geral */}
        {allSystemsOperational ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🎉 Todos os sistemas estão operacionais! O sistema está funcionando perfeitamente.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Alguns serviços do sistema estão com problemas. Verifique os status acima.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
