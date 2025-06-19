import type React from "react"
import Header from "@/components/header"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <div className="pt-16 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-sm font-medium mb-8">
              ✨ Estamos felizes em ter você aqui!
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
