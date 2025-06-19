"use client"

import { useEffect, useState } from "react"

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById("stats-section")
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [])

  const stats = [
    {
      number: "50,000+",
      label: "Contratos Gerados",
      description: "Documentos criados com sucesso",
    },
    {
      number: "99.8%",
      label: "Precisão da IA",
      description: "Conformidade jurídica garantida",
    },
    {
      number: "2.5min",
      label: "Tempo Médio",
      description: "Para gerar um contrato completo",
    },
  ]

  return (
    <section id="stats-section" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                isVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{stat.label}</div>
              <div className="text-gray-600 dark:text-gray-300">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
