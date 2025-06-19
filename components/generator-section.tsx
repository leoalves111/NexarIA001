"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles } from "lucide-react"

export default function GeneratorSection() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate generation process
    setTimeout(() => {
      setIsGenerating(false)
    }, 3000)
  }

  return (
    <section id="generator" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Gerador de Contratos IA
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Descreva o tipo de contrato que você precisa e nossa IA criará um documento completo e juridicamente
              válido
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-8">
            <div className="mb-6">
              <label
                htmlFor="contract-prompt"
                className="block text-left text-lg font-semibold text-gray-900 dark:text-white mb-3"
              >
                Descreva seu contrato:
              </label>
              <Textarea
                id="contract-prompt"
                placeholder="Ex: Preciso de um contrato de prestação de serviços de consultoria em marketing digital para uma empresa de tecnologia, com duração de 6 meses, valor mensal de R$ 5.000,00..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] text-base"
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              size="lg"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Gerando Contrato...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Gerar Contrato
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Nossa IA está analisando sua solicitação e criando um contrato personalizado...
                </p>
                <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            ✓ Geração em tempo real • ✓ Conformidade jurídica • ✓ Personalização completa
          </div>
        </div>
      </div>
    </section>
  )
}
