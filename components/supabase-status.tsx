"use client"

import { useAuth } from "@/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function SupabaseStatus() {
  const { isDemo, loading } = useAuth()

  if (loading) {
    return null // Não mostrar nada durante carregamento
  }

  if (isDemo) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <strong>Modo Demo:</strong> Funcionalidades limitadas. Configure o banco de dados para acesso completo.
        </AlertDescription>
      </Alert>
    )
  }

  return null // Não mostrar status quando conectado (por segurança)
}
