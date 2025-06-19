"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export default function CtaSection() {
  return (
    <section className="relative py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-white/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 mr-2" />
            Junte-se a mais de 10.000 profissionais
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Pronto para Revolucionar
            <br />
            Sua Prática Jurídica?
          </h2>

          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            Comece hoje mesmo a criar contratos profissionais com a velocidade da IA e a precisão que seus clientes
            merecem.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Inscrever-se
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                Entrar
              </Button>
            </Link>
          </div>

          <div className="text-white/80 text-sm">
            ✓ Sem compromisso • ✓ Configuração em 2 minutos • ✓ Suporte completo
          </div>
        </div>
      </div>
    </section>
  )
}
