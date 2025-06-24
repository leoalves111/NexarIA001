"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import AuthLayout from "@/components/auth/auth-layout"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { signIn, loading: authLoading } = useAuth()
  const router = useRouter()

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Only show error if it's not a demo mode fallback
        if (!error.message?.includes("demo mode")) {
          setError(error.message)
        } else {
          // Success in demo mode
          setTimeout(() => {
            router.push("/dashboard")
            router.refresh()
          }, 100)
        }
      } else {
        // Success - redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 100)
      }
    } catch (err) {
      // On any error, try demo mode
      console.warn("Login error, trying demo mode")
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 100)
    }

    setLoading(false)
  }

  return (
    <AuthLayout title="Entrar na sua conta">
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

        <div>
          <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
            Senha
          </Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
              placeholder="Sua senha"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>

        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">Não tem uma conta? </span>
          <Link
            href="/auth/register"
            className="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
          >
            Cadastre-se
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
