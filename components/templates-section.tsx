"use client"

import { Badge } from "@/components/ui/badge"
import { FileText, Users, Building, Briefcase, Home, Car } from "lucide-react"

export default function TemplatesSection() {
  const templates = [
    {
      icon: FileText,
      title: "Contrato de Prestação de Serviços",
      description: "Template completo para serviços profissionais",
      tags: ["Básico", "Profissional", "Empresarial"],
    },
    {
      icon: Users,
      title: "Contrato de Trabalho",
      description: "Documentos trabalhistas em conformidade com CLT",
      tags: ["Profissional", "Empresarial"],
    },
    {
      icon: Building,
      title: "Contrato de Locação Comercial",
      description: "Locação de imóveis comerciais e industriais",
      tags: ["Empresarial", "Super Ilimitado"],
    },
    {
      icon: Briefcase,
      title: "Contrato de Sociedade",
      description: "Constituição e alteração de sociedades",
      tags: ["Empresarial", "Super Ilimitado"],
    },
    {
      icon: Home,
      title: "Contrato de Locação Residencial",
      description: "Locação residencial com garantias",
      tags: ["Básico", "Profissional"],
    },
    {
      icon: Car,
      title: "Contrato de Compra e Venda",
      description: "Veículos, imóveis e bens em geral",
      tags: ["Profissional", "Empresarial"],
    },
  ]

  const planColors = {
    Básico: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Profissional: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Empresarial: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Super Ilimitado": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  }

  return (
    <section id="templates" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Templates Personalizáveis
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Biblioteca completa de modelos jurídicos prontos para personalização
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <template.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{template.title}</h3>

              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{template.description}</p>

              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} className={`${planColors[tag as keyof typeof planColors]} text-xs font-medium`}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
