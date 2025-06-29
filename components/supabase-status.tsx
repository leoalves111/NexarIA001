"use client"

import { useAuth } from "@/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, WifiOff, Loader2 } from "lucide-react"

export default function SupabaseStatus() {
  const { connectionStatus, loading } = useAuth()

  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return !!(
      url &&
      key &&
      url !== "your-supabase-url" &&
      key !== "your-supabase-anon-key" &&
      url.startsWith("https://") &&
      key.length > 20
    )
  }

  if (connectionStatus === "checking" || loading) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Verificando Conexão:</strong> Testando conectividade com o banco de dados...
        </AlertDescription>
      </Alert>
    )
  }



  if (connectionStatus === "error") {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <WifiOff className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong>Erro de Conexão:</strong> Falha na comunicação com o banco. Usando modo demo temporariamente.
        </AlertDescription>
      </Alert>
    )
  }

  if (connectionStatus === "connected") {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Conectado:</strong> Sistema funcionando normalmente com Supabase.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
