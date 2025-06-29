"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = [
    {
      name: "Básico",
      monthlyPrice: 49.99,
      annualPrice: 469.99,
      description: "Ideal para profissionais autônomos",
      features: [
        "100 contratos/mês (CONTRATO TURBO)",
        "50 contratos/mês (CONTRATO AVANÇADO)",
        "200 exportações/mês (Word/PDF)",
        "5 templates básicos",
        "1 usuário",
        "7.000 caracteres por contrato",
        "Suporte por e-mail",
      ],
      popular: false,
    },
    {
      name: "Profissional",
      monthlyPrice: 149.99,
      annualPrice: 1429.99,
      description: "Para escritórios de advocacia",
      features: [
        "500 contratos/mês (CONTRATO TURBO)",
        "250 contratos/mês (CONTRATO AVANÇADO)",
        "800 exportações/mês (Word/PDF)",
        "25 templates (básicos + intermediários)",
        "Até 2 usuários",
        "17.500 caracteres por contrato",
        "Suporte por e-mail + WhatsApp",
      ],
      popular: true,
    },
    {
      name: "Empresarial",
      monthlyPrice: 349.99,
      annualPrice: 3349.99,
      description: "Para empresas e departamentos jurídicos",
      features: [
        "1.000 contratos/mês (CONTRATO TURBO)",
        "500 contratos/mês (CONTRATO AVANÇADO)",
        "2.000 exportações/mês (Word/PDF)",
        "Todos os tipos de templates",
        "3 usuários",
        "35.000 caracteres por contrato",
        "Suporte por e-mail + WhatsApp",
      ],
      popular: false,
    },
    {
      name: "Super Ilimitado",
      monthlyPrice: 699.99,
      annualPrice: 6719.99,
      description: "Solução enterprise completa",
      features: [
        "Contratos ilimitados (CONTRATO TURBO)",
        "Contratos ilimitados (CONTRATO AVANÇADO)",
        "Exportações ilimitadas (Word/PDF)",
        "Todos os tipos de templates",
        "5 usuários",
        "80.000 caracteres por contrato",
        "Suporte prioritário (e-mail + WhatsApp)",
      ],
      popular: false,
    },
  ]

  const comparisonFeatures = [
    {
              feature: "Contratos GPT-4o-mini Avançados",
      basic: "100/mês",
      professional: "500/mês",
      enterprise: "1.000/mês",
      unlimited: "Ilimitado",
    },
    {
      feature: "Contratos Avançados (CONTRATO AVANÇADO)",
      basic: "50/mês",
      professional: "250/mês",
      enterprise: "500/mês",
      unlimited: "Ilimitado",
    },
    {
      feature: "Exportações (Word/PDF)",
      basic: "200/mês",
      professional: "800/mês",
      enterprise: "2.000/mês",
      unlimited: "Ilimitado",
    },
    {
      feature: "Templates disponíveis",
      basic: "5 básicos",
      professional: "25 (básicos + intermediários)",
      enterprise: "Todos os tipos",
      unlimited: "Todos os tipos",
    },
    {
      feature: "Usuários",
      basic: "1",
      professional: "Até 2",
      enterprise: "3",
      unlimited: "5",
    },
    {
      feature: "Caracteres por contrato",
      basic: "7.000",
      professional: "17.500",
      enterprise: "35.000",
      unlimited: "80.000",
    },
    {
      feature: "Suporte",
      basic: "E-mail",
      professional: "E-mail + WhatsApp",
      enterprise: "E-mail + WhatsApp",
      unlimited: "E-mail + WhatsApp Prioritário",
    },
  ]

  return (
    <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Planos e Preços
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Escolha o plano ideal para suas necessidades jurídicas
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-lg font-medium ${!isAnnual ? "text-primary-600" : "text-gray-500"}`}>Mensal</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-700"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-lg font-medium ${isAnnual ? "text-primary-600" : "text-gray-500"}`}>Anual</span>
            {isAnnual && (
              <Badge className="bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                Economize 20%
              </Badge>
            )}
          </div>

          {/* Free Trial Banner */}
          <div className="bg-gradient-to-r from-secondary-50 to-primary-50 dark:from-secondary-900/20 dark:to-primary-900/20 rounded-2xl p-8 mb-12 border border-secondary-200 dark:border-secondary-700">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                🎉 Teste Grátis - Sem Compromisso
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                <strong>10 contratos GPT-4o-mini</strong> avançados antes de assinar qualquer plano
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                * PDFs exportados no teste grátis incluem marca d'água "NEXAR IA" para demonstração
              </p>
              <Button
                size="lg"
                className="bg-secondary-600 hover:bg-secondary-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Começar Teste Grátis Agora
              </Button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  plan.popular
                    ? "bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white">
                    Mais Popular
                  </Badge>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      R$ {isAnnual ? Math.floor(plan.annualPrice / 12) : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">/mês</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Cobrado anualmente (R$ {plan.annualPrice})
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-secondary-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary-600 hover:bg-primary-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                  }`}
                >
                  Começar Agora
                </Button>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">Comparação Detalhada</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Recursos</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Básico</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Profissional</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Empresarial</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">
                      Super Ilimitado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{row.feature}</td>
                      <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                        {typeof row.basic === "boolean" ? (
                          row.basic ? (
                            <Check className="w-5 h-5 text-secondary-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400 mx-auto" />
                          )
                        ) : (
                          row.basic
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                        {typeof row.professional === "boolean" ? (
                          row.professional ? (
                            <Check className="w-5 h-5 text-secondary-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400 mx-auto" />
                          )
                        ) : (
                          row.professional
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                        {typeof row.enterprise === "boolean" ? (
                          row.enterprise ? (
                            <Check className="w-5 h-5 text-secondary-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400 mx-auto" />
                          )
                        ) : (
                          row.enterprise
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                        {typeof row.unlimited === "boolean" ? (
                          row.unlimited ? (
                            <Check className="w-5 h-5 text-secondary-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400 mx-auto" />
                          )
                        ) : (
                          row.unlimited
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
