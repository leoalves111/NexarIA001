"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft } from "lucide-react"
import { auth } from "@/lib/supabase"
import AuthLayout from "@/components/auth/auth-layout"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await auth.resetPassword(email)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <AuthLayout title="E-mail enviado">
        <div className="text-center space-y-4">
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <AlertDescription className="text-green-800 dark:text-green-200">
              Enviamos um link de recuperação para seu e-mail. Verifique sua caixa de entrada.
            </AlertDescription>
          </Alert>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Recuperar senha">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
            placeholder="seu@email.com"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar link de recuperação"
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
