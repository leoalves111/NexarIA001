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
        return "border-l-4 border-indigo-300 bg-white dark:bg-gray-800"
      case "success":
        return "border-l-4 border-green-300 bg-white dark:bg-gray-800"
      case "warning":
        return "border-l-4 border-purple-300 bg-white dark:bg-gray-800"
      case "danger":
        return "border-l-4 border-green-300 bg-white dark:bg-gray-800"
      default:
        return "border-l-4 border-green-300 bg-white dark:bg-gray-800"
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case "primary":
        return "text-indigo-600 dark:text-indigo-400"
      case "success":
        return "text-green-600 dark:text-green-400"
      case "warning":
        return "text-purple-600 dark:text-purple-400"
      case "danger":
        return "text-green-600 dark:text-green-400"
      default:
        return "text-green-600 dark:text-green-400"
    }
  }

  return (
    <Card
      className={`
        dashboard-card
        ${getVariantStyles()}
        rounded-xl
        border-gray-200 dark:border-gray-700
        transition-all duration-200
        hover:shadow-lg hover:-translate-y-1
        cursor-pointer
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
