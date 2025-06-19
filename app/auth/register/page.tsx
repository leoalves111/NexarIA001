"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Loader2, User, Building } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { validateCPF, validateCNPJ, validatePassword, formatCPF, formatCNPJ, formatPhone } from "@/utils/validation"
import AuthLayout from "@/components/auth/auth-layout"

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState("pf")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Pessoa Física
  const [pfData, setPfData] = useState({
    nome: "",
    sobrenome: "",
    cpf: "",
    email: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })

  // Pessoa Jurídica
  const [pjData, setPjData] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    nomeResponsavel: "",
    email: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })

  const { signUp, loading: authLoading } = useAuth()
  const router = useRouter()

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const validateForm = () => {
    const data = activeTab === "pf" ? pfData : pjData

    if (!data.acceptTerms) {
      setError("Você deve aceitar os termos de uso")
      return false
    }

    if (data.password !== data.confirmPassword) {
      setError("As senhas não coincidem")
      return false
    }

    const passwordValidation = validatePassword(data.password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0])
      return false
    }

    if (activeTab === "pf") {
      if (!validateCPF(pfData.cpf)) {
        setError("CPF inválido")
        return false
      }
    } else {
      if (!validateCNPJ(pjData.cnpj)) {
        setError("CNPJ inválido")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!validateForm()) {
      setLoading(false)
      return
    }

    const data = activeTab === "pf" ? pfData : pjData
    const userData =
      activeTab === "pf"
        ? {
            tipo_pessoa: "PF",
            nome: pfData.nome,
            sobrenome: pfData.sobrenome,
            cpf: pfData.cpf.replace(/\D/g, ""),
            whatsapp: pfData.whatsapp.replace(/\D/g, ""),
          }
        : {
            tipo_pessoa: "PJ",
            razao_social: pjData.razaoSocial,
            nome_fantasia: pjData.nomeFantasia,
            cnpj: pjData.cnpj.replace(/\D/g, ""),
            nome_responsavel: pjData.nomeResponsavel,
            whatsapp: pjData.whatsapp.replace(/\D/g, ""),
          }

    const { error } = await signUp(data.email, data.password, userData)

    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard")
    }

    setLoading(false)
  }

  return (
    <AuthLayout title="Criar sua conta">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pf" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Pessoa Física
          </TabsTrigger>
          <TabsTrigger value="pj" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Pessoa Jurídica
          </TabsTrigger>
        </TabsList>

        {error && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 mb-6">
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TabsContent value="pf" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome" className="text-gray-700 dark:text-gray-300">
                  Nome *
                </Label>
                <Input
                  id="nome"
                  value={pfData.nome}
                  onChange={(e) => setPfData({ ...pfData, nome: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sobrenome" className="text-gray-700 dark:text-gray-300">
                  Sobrenome *
                </Label>
                <Input
                  id="sobrenome"
                  value={pfData.sobrenome}
                  onChange={(e) => setPfData({ ...pfData, sobrenome: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cpf" className="text-gray-700 dark:text-gray-300">
                CPF *
              </Label>
              <Input
                id="cpf"
                value={pfData.cpf}
                onChange={(e) => setPfData({ ...pfData, cpf: formatCPF(e.target.value) })}
                required
                className="mt-1"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <Label htmlFor="email-pf" className="text-gray-700 dark:text-gray-300">
                E-mail *
              </Label>
              <Input
                id="email-pf"
                type="email"
                value={pfData.email}
                onChange={(e) => setPfData({ ...pfData, email: e.target.value })}
                required
                className="mt-1"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="whatsapp-pf" className="text-gray-700 dark:text-gray-300">
                WhatsApp *
              </Label>
              <Input
                id="whatsapp-pf"
                value={pfData.whatsapp}
                onChange={(e) => setPfData({ ...pfData, whatsapp: formatPhone(e.target.value) })}
                required
                className="mt-1"
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
            </div>

            <div>
              <Label htmlFor="password-pf" className="text-gray-700 dark:text-gray-300">
                Senha *
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password-pf"
                  type={showPassword ? "text" : "password"}
                  value={pfData.password}
                  onChange={(e) => setPfData({ ...pfData, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password-pf" className="text-gray-700 dark:text-gray-300">
                Confirmar Senha *
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password-pf"
                  type={showConfirmPassword ? "text" : "password"}
                  value={pfData.confirmPassword}
                  onChange={(e) => setPfData({ ...pfData, confirmPassword: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms-pf"
                checked={pfData.acceptTerms}
                onCheckedChange={(checked) => setPfData({ ...pfData, acceptTerms: checked as boolean })}
              />
              <Label htmlFor="terms-pf" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Aceito os{" "}
                <Link href="/termos" className="text-primary-600 hover:text-primary-500">
                  Termos de Uso
                </Link>
                ,{" "}
                <Link href="/privacidade" className="text-primary-600 hover:text-primary-500">
                  Política de Privacidade
                </Link>
                ,{" "}
                <Link href="/lgpd" className="text-primary-600 hover:text-primary-500">
                  LGPD
                </Link>{" "}
                e{" "}
                <Link href="/cookies" className="text-primary-600 hover:text-primary-500">
                  Cookies
                </Link>
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="pj" className="space-y-4">
            <div>
              <Label htmlFor="razao-social" className="text-gray-700 dark:text-gray-300">
                Razão Social *
              </Label>
              <Input
                id="razao-social"
                value={pjData.razaoSocial}
                onChange={(e) => setPjData({ ...pjData, razaoSocial: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nome-fantasia" className="text-gray-700 dark:text-gray-300">
                Nome Fantasia
              </Label>
              <Input
                id="nome-fantasia"
                value={pjData.nomeFantasia}
                onChange={(e) => setPjData({ ...pjData, nomeFantasia: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cnpj" className="text-gray-700 dark:text-gray-300">
                CNPJ *
              </Label>
              <Input
                id="cnpj"
                value={pjData.cnpj}
                onChange={(e) => setPjData({ ...pjData, cnpj: formatCNPJ(e.target.value) })}
                required
                className="mt-1"
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <div>
              <Label htmlFor="nome-responsavel" className="text-gray-700 dark:text-gray-300">
                Nome do Responsável *
              </Label>
              <Input
                id="nome-responsavel"
                value={pjData.nomeResponsavel}
                onChange={(e) => setPjData({ ...pjData, nomeResponsavel: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email-pj" className="text-gray-700 dark:text-gray-300">
                E-mail *
              </Label>
              <Input
                id="email-pj"
                type="email"
                value={pjData.email}
                onChange={(e) => setPjData({ ...pjData, email: e.target.value })}
                required
                className="mt-1"
                placeholder="empresa@email.com"
              />
            </div>

            <div>
              <Label htmlFor="whatsapp-pj" className="text-gray-700 dark:text-gray-300">
                WhatsApp *
              </Label>
              <Input
                id="whatsapp-pj"
                value={pjData.whatsapp}
                onChange={(e) => setPjData({ ...pjData, whatsapp: formatPhone(e.target.value) })}
                required
                className="mt-1"
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
            </div>

            <div>
              <Label htmlFor="password-pj" className="text-gray-700 dark:text-gray-300">
                Senha *
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password-pj"
                  type={showPassword ? "text" : "password"}
                  value={pjData.password}
                  onChange={(e) => setPjData({ ...pjData, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password-pj" className="text-gray-700 dark:text-gray-300">
                Confirmar Senha *
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password-pj"
                  type={showConfirmPassword ? "text" : "password"}
                  value={pjData.confirmPassword}
                  onChange={(e) => setPjData({ ...pjData, confirmPassword: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms-pj"
                checked={pjData.acceptTerms}
                onCheckedChange={(checked) => setPjData({ ...pjData, acceptTerms: checked as boolean })}
              />
              <Label htmlFor="terms-pj" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Aceito os{" "}
                <Link href="/termos" className="text-primary-600 hover:text-primary-500">
                  Termos de Uso
                </Link>
                ,{" "}
                <Link href="/privacidade" className="text-primary-600 hover:text-primary-500">
                  Política de Privacidade
                </Link>
                ,{" "}
                <Link href="/lgpd" className="text-primary-600 hover:text-primary-500">
                  LGPD
                </Link>{" "}
                e{" "}
                <Link href="/cookies" className="text-primary-600 hover:text-primary-500">
                  Cookies
                </Link>
              </Label>
            </div>
          </TabsContent>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        <div className="text-center mt-6">
          <span className="text-gray-600 dark:text-gray-400">Já tem uma conta? </span>
          <Link
            href="/auth/login"
            className="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
          >
            Entrar
          </Link>
        </div>
      </Tabs>
    </AuthLayout>
  )
}
