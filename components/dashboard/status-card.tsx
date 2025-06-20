"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatusCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  variant?: "default" | "primary" | "success" | "warning" | "danger"
}

export default function StatusCard({ title, value, subtitle, icon: Icon, variant = "default" }: StatusCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20"
      case "success":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
      case "warning":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
      case "danger":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      default:
        return "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case "primary":
        return "text-primary-600 dark:text-primary-400"
      case "success":
        return "text-green-600 dark:text-green-400"
      case "warning":
        return "text-orange-600 dark:text-orange-400"
      case "danger":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <Card
      className={`
      ${getVariantStyles()}
      hover:shadow-lg transition-all duration-200 
      hover:-translate-y-1 cursor-pointer
      border-2
    `}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1">{value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{subtitle}</p>
          </div>
          <div className="ml-4">
            <Icon className={`h-8 w-8 ${getIconStyles()}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
