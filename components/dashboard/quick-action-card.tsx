"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface QuickActionCardProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
  buttonText: string
  variant?: "primary" | "secondary" | "outline"
  color?: "primary" | "secondary" | "blue" | "green" | "purple"
}

export default function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  buttonText,
  variant = "primary",
  color = "primary",
}: QuickActionCardProps) {
  const getCardStyles = () => {
    switch (color) {
      case "secondary":
        return "hover:border-secondary-300 dark:hover:border-secondary-600"
      case "blue":
        return "hover:border-blue-300 dark:hover:border-blue-600"
      case "green":
        return "hover:border-green-300 dark:hover:border-green-600"
      case "purple":
        return "hover:border-purple-300 dark:hover:border-purple-600"
      default:
        return "hover:border-primary-300 dark:hover:border-primary-600"
    }
  }

  const getIconStyles = () => {
    switch (color) {
      case "secondary":
        return "text-secondary-600 dark:text-secondary-400"
      case "blue":
        return "text-blue-600 dark:text-blue-400"
      case "green":
        return "text-green-600 dark:text-green-400"
      case "purple":
        return "text-purple-600 dark:text-purple-400"
      default:
        return "text-primary-600 dark:text-primary-400"
    }
  }

  const getButtonStyles = () => {
    if (variant === "outline") {
      switch (color) {
        case "secondary":
          return "border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-900/20"
        case "blue":
          return "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
        case "green":
          return "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/20"
        case "purple":
          return "border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20"
        default:
          return "border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-300 dark:hover:bg-primary-900/20"
      }
    }

    switch (color) {
      case "secondary":
        return "bg-secondary-600 hover:bg-secondary-700 text-white"
      case "blue":
        return "bg-blue-600 hover:bg-blue-700 text-white"
      case "green":
        return "bg-green-600 hover:bg-green-700 text-white"
      case "purple":
        return "bg-purple-600 hover:bg-purple-700 text-white"
      default:
        return "bg-primary-600 hover:bg-primary-700 text-white"
    }
  }

  return (
    <Card
      className={`
        dashboard-card
        ${getCardStyles()}
        rounded-xl
        border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        hover:shadow-xl transition-all duration-300 
        hover:-translate-y-2 cursor-pointer
      `}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg dashboard-text">
          <Icon className={`h-6 w-6 ${getIconStyles()}`} />
          {title}
        </CardTitle>
        <CardDescription className="dashboard-text-muted leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Link href={href}>
          <Button
            className={`
              w-full transform transition-all duration-200 
              hover:scale-105 active:scale-95
              ${getButtonStyles()}
            `}
            variant={variant === "primary" ? "default" : variant}
            size="lg"
          >
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
