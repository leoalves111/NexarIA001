"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { type LucideIcon, X } from "lucide-react"

interface AlertBannerProps {
  title: string
  description: string
  icon: LucideIcon
  variant?: "default" | "success" | "warning" | "danger" | "info"
  autoClose?: boolean
  autoCloseDelay?: number
  onClose?: () => void
  actionButton?: {
    text: string
    href?: string
    onClick?: () => void
  }
}

export default function AlertBanner({
  title,
  description,
  icon: Icon,
  variant = "default",
  autoClose = false,
  autoCloseDelay = 5000,
  onClose,
  actionButton,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoCloseDelay)

      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseDelay, onClose])

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
      case "warning":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
      case "danger":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      case "info":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      default:
        return "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
    }
  }

  const getTextStyles = () => {
    switch (variant) {
      case "success":
        return "text-green-800 dark:text-green-200"
      case "warning":
        return "text-orange-800 dark:text-orange-200"
      case "danger":
        return "text-red-800 dark:text-red-200"
      case "info":
        return "text-blue-800 dark:text-blue-200"
      default:
        return "text-gray-800 dark:text-gray-200"
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case "success":
        return "text-green-600 dark:text-green-400"
      case "warning":
        return "text-orange-600 dark:text-orange-400"
      case "danger":
        return "text-red-600 dark:text-red-400"
      case "info":
        return "text-blue-600 dark:text-blue-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  if (!isVisible) return null

  return (
    <Alert
      className={`
      ${getVariantStyles()}
      transition-all duration-300 border-2
      animate-in slide-in-from-top-2
    `}
    >
      <Icon className={`h-5 w-5 ${getIconStyles()}`} />
      <div className="flex-1">
        <AlertDescription className={`${getTextStyles()} leading-relaxed`}>
          <strong className="font-semibold">{title}:</strong> {description}
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {actionButton && (
          <Button size="sm" variant="outline" className="text-xs" onClick={actionButton.onClick}>
            {actionButton.text}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsVisible(false)
            onClose?.()
          }}
          className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </Alert>
  )
}
