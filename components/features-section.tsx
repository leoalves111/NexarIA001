"use client"

import { Brain, Zap, Shield, FileText, CreditCard, Lock } from "lucide-react"

export default function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "CONTRATO TURBO",
      description: "Geração rápida e eficiente de contratos básicos com IA otimizada para casos do dia a dia.",
    },
    {
      icon: Zap,
      title: "CONTRATO AVANÇADO",
      description: "IA premium para contratos complexos com cláusulas detalhadas e análise jurídica aprofundada.",
    },
    {
      icon: Shield,
      title: "Consulta de Leis",
      description: "Base de dados jurídica atualizada com legislação brasileira em tempo real.",
    },
    {
      icon: FileText,
      title: "Export Word/PDF",
      description: "Exporte seus contratos em formatos profissionais prontos para uso.",
    },
    {
      icon: CreditCard,
      title: "Pagamentos Automáticos",
      description: "Sistema de cobrança integrado com múltiplas formas de pagamento.",
    },
    {
      icon: Lock,
      title: "Segurança Avançada",
      description: "Criptografia de ponta a ponta e conformidade com LGPD garantidas.",
    },
  ]

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Recursos Avançados
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Tecnologia de ponta para criar contratos jurídicos com a máxima precisão e eficiência
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
