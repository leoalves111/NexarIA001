"use client"

import { useAuth } from "@/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle } from "lucide-react"

export default function SupabaseStatus() {
  const { isDemo } = useAuth()

  if (isDemo) {
    return (
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <strong>Modo de Demonstração:</strong> Supabase não configurado. Usando dados simulados para demonstração.
          Para usar funcionalidades completas, configure as variáveis de ambiente do Supabase.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 mb-6">
      <CheckCircle className="h-4 w-4" />
      <AlertDescription className="text-green-800 dark:text-green-200">
        <strong>Supabase Conectado:</strong> Todas as funcionalidades estão disponíveis.
      </AlertDescription>
    </Alert>
  )
}
