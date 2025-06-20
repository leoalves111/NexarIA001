"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Zap, Info } from "lucide-react"

interface ContractTypeSelectorProps {
  selectedType: "simple" | "advanced"
  onTypeChange: (type: "simple" | "advanced") => void
  simpleCredits: number
  advancedCredits: number
  disabled?: boolean
}

export default function ContractTypeSelector({
  selectedType,
  onTypeChange,
  simpleCredits,
  advancedCredits,
  disabled = false,
}: ContractTypeSelectorProps) {
  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Escolha o Tipo de Contrato</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contrato Simples */}
            <div
              className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedType === "simple"
                  ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800"
              }`}
              onClick={() => !disabled && onTypeChange("simple")}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Contrato Simples</h4>
                </div>
                <Badge variant={simpleCredits > 0 ? "default" : "destructive"}>{simpleCredits} créditos</Badge>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Powered by GPT-3.5-turbo. Ideal para contratos básicos e documentos simples.
              </p>

              <div className="text-xs text-gray-500 dark:text-gray-500">
                • Geração rápida (30-60s) • Até 2.000 caracteres • Estrutura padrão
              </div>

              {selectedType === "simple" && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                </div>
              )}
            </div>

            {/* Contrato Avançado */}
            <div
              className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedType === "advanced"
                  ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600"
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800"
              }`}
              onClick={() => !disabled && onTypeChange("advanced")}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Contrato Avançado</h4>
                </div>
                <Badge variant={advancedCredits > 0 ? "default" : "destructive"}>{advancedCredits} créditos</Badge>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Powered by GPT-4o-mini. Para contratos complexos com análise jurídica detalhada.
              </p>

              <div className="text-xs text-gray-500 dark:text-gray-500">
                • Geração detalhada (60-120s) • Até 5.000 caracteres • Cláusulas especializadas
              </div>

              {selectedType === "advanced" && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
