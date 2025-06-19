"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Users, Building, Briefcase, Home, Car, Search } from "lucide-react"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

export default function TemplatesPage() {
  const { subscription } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const templates = [
    {
      icon: FileText,
      title: "Contrato de Prestação de Serviços",
      description: "Template completo para serviços profissionais",
      category: "Serviços",
      plan: "Básico",
    },
    {
      icon: Users,
      title: "Contrato de Trabalho",
      description: "Documentos trabalhistas em conformidade com CLT",
      category: "Trabalho",
      plan: "Profissional",
    },
    {
      icon: Building,
      title: "Contrato de Locação Comercial",
      description: "Locação de imóveis comerciais e industriais",
      category: "Imobiliário",
      plan: "Empresarial",
    },
    {
      icon: Briefcase,
      title: "Contrato de Sociedade",
      description: "Constituição e alteração de sociedades",
      category: "Empresarial",
      plan: "Super Ilimitado",
    },
    {
      icon: Home,
      title: "Contrato de Locação Residencial",
      description: "Locação residencial com garantias",
      category: "Imobiliário",
      plan: "Básico",
    },
    {
      icon: Car,
      title: "Contrato de Compra e Venda",
      description: "Veículos, imóveis e bens em geral",
      category: "Comercial",
      plan: "Profissional",
    },
    {
      icon: FileText,
      title: "Contrato de Confidencialidade (NDA)",
      description: "Proteção de informações confidenciais",
      category: "Empresarial",
      plan: "Básico",
    },
    {
      icon: Users,
      title: "Contrato de Parceria Comercial",
      description: "Estabelecimento de parcerias entre empresas",
      category: "Comercial",
      plan: "Profissional",
    },
    {
      icon: Building,
      title: "Contrato de Construção",
      description: "Obras e reformas residenciais e comerciais",
      category: "Construção",
      plan: "Empresarial",
    },
  ]

  const categories = Array.from(new Set(templates.map((template) => template.category)))

  const planColors = {
    Básico: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Profissional: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Empresarial: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Super Ilimitado": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  const isTemplateAvailable = (plan: string) => {
    if (!subscription) return false

    const planHierarchy = {
      teste_gratis: 0,
      Básico: 1,
      Profissional: 2,
      Empresarial: 3,
      "Super Ilimitado": 4,
    }

    const userPlanLevel = planHierarchy[subscription.plano as keyof typeof planHierarchy] || 0
    const templatePlanLevel = planHierarchy[plan as keyof typeof planHierarchy] || 0

    return userPlanLevel >= templatePlanLevel
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates de Contratos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore nossa biblioteca de modelos jurídicos prontos para personalização
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => {
            const isAvailable = isTemplateAvailable(template.plan)

            return (
              <Card key={index} className={`hover:shadow-lg transition-shadow ${!isAvailable ? "opacity-70" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <template.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge className={`${planColors[template.plan as keyof typeof planColors]} text-xs font-medium`}>
                      {template.plan}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{template.category}</Badge>
                    <Button
                      size="sm"
                      disabled={!isAvailable}
                      className={isAvailable ? "bg-primary-600 hover:bg-primary-700" : ""}
                    >
                      {isAvailable ? "Usar Template" : "Indisponível"}
                    </Button>
                  </div>
                  {!isAvailable && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Disponível apenas para planos {template.plan} ou superior
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Nenhum template encontrado</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Tente ajustar seus filtros ou termos de busca</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
