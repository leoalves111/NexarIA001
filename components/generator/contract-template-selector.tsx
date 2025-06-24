"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

interface ContractTemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  disabled?: boolean
}

const templates = [
  {
    id: "classic",
    name: "Clássico Profissional",
    description: "Design tradicional com tipografia Times New Roman e layout formal",
    preview: "Formato jurídico tradicional com cláusulas numeradas e estrutura clássica",
    color: "#8B4513",
    features: ["Tipografia Times New Roman", "Layout tradicional", "Cores sóbrias", "Formato jurídico padrão"],
  },
  {
    id: "modern",
    name: "Moderno Executivo",
    description: "Design contemporâneo com gradientes e tipografia moderna",
    preview: "Layout moderno com cards, sombras e hierarquia visual clara",
    color: "#667eea",
    features: ["Tipografia Inter", "Gradientes elegantes", "Cards com sombras", "Design responsivo"],
  },
  {
    id: "minimal",
    name: "Minimalista Clean",
    description: "Design limpo e minimalista com foco na legibilidade",
    preview: "Estrutura simples, espaçamento generoso e tipografia clara",
    color: "#2d3748",
    features: ["Design minimalista", "Espaçamento otimizado", "Tipografia clara", "Foco na legibilidade"],
  },
  {
    id: "corporate",
    name: "Corporativo Premium",
    description: "Design empresarial sofisticado com elementos visuais refinados",
    preview: "Layout corporativo com bordas elegantes e estrutura hierárquica",
    color: "#1a365d",
    features: ["Design corporativo", "Bordas elegantes", "Estrutura hierárquica", "Visual sofisticado"],
  },
  {
    id: "creative",
    name: "Criativo com Ícones",
    description: "Design moderno com ícones e emojis para melhor organização visual",
    preview: "Layout criativo com ícones, cores vibrantes e elementos visuais",
    color: "#e53e3e",
    features: ["Ícones e emojis", "Cores vibrantes", "Layout criativo", "Elementos visuais"],
  },
]

export default function ContractTemplateSelector({
  selectedTemplate,
  onTemplateChange,
  disabled = false,
}: ContractTemplateSelectorProps) {
  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded"></div>
          Escolha o Template do Contrato
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selecione o design que melhor se adequa ao seu contrato
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`relative cursor-pointer transition-all duration-200 ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => !disabled && onTemplateChange(template.id)}
            >
              <Card
                className={`border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedTemplate === template.id
                    ? "border-blue-500 shadow-lg ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
                    {selectedTemplate === template.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{template.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Preview Visual */}
                  <div
                    className="w-full h-24 rounded-lg mb-3 p-3 text-xs"
                    style={{
                      backgroundColor: `${template.color}10`,
                      border: `1px solid ${template.color}30`,
                    }}
                  >
                    <div className="w-full h-2 rounded mb-2" style={{ backgroundColor: template.color }}></div>
                    <div className="space-y-1">
                      <div className="w-3/4 h-1 bg-gray-300 rounded"></div>
                      <div className="w-1/2 h-1 bg-gray-300 rounded"></div>
                      <div className="w-5/6 h-1 bg-gray-300 rounded"></div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">{template.preview}</p>

                  {/* Features */}
                  <div className="space-y-1">
                    {template.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs mr-1 mb-1"
                        style={{
                          borderColor: `${template.color}40`,
                          color: template.color,
                        }}
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Dica:</strong> Você pode alterar o template a qualquer momento. O template selecionado será
            aplicado automaticamente ao gerar seu contrato.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
