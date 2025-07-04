"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useSavedContracts } from "@/hooks/use-saved-contracts"
import { supabaseUtils } from "@/lib/supabase"
import {
  FileText,
  Users,
  DollarSign,
  Sparkles,
  Download,
  Save,
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Clock,
  Palette,
  Wand2,
  Zap,
} from "lucide-react"

// Tipos de contrato disponíveis
const CONTRACT_TYPES = [
  { value: "servicos", label: "Prestação de Serviços", icon: "🔧" },
  { value: "trabalho", label: "Contrato de Trabalho", icon: "👔" },
  { value: "locacao", label: "Locação", icon: "🏠" },
  { value: "compra_venda", label: "Compra e Venda", icon: "🛒" },
  { value: "consultoria", label: "Consultoria", icon: "💼" },
  { value: "prestacao_servicos", label: "Prestação de Serviços Técnicos", icon: "⚙️" },
  { value: "fornecimento", label: "Fornecimento", icon: "📦" },
  { value: "sociedade", label: "Sociedade", icon: "🤝" },
  { value: "parceria", label: "Parceria", icon: "🤝" },
  { value: "franquia", label: "Franquia", icon: "🏪" },
  { value: "licenciamento", label: "Licenciamento", icon: "📄" },
  { value: "manutencao", label: "Manutenção", icon: "🔧" },
  { value: "seguro", label: "Seguro", icon: "🛡️" },
  { value: "financiamento", label: "Financiamento", icon: "💰" },
  { value: "outros", label: "Outros", icon: "📋" },
]

// Templates visuais disponíveis
const VISUAL_TEMPLATES = [
  { id: "professional", name: "Profissional", description: "Clássico e formal", color: "#1e40af" },
  { id: "modern", name: "Moderno", description: "Design contemporâneo", color: "#0891b2" },
  { id: "minimalist", name: "Minimalista", description: "Limpo e simples", color: "#374151" },
  { id: "corporate", name: "Corporativo", description: "Elegante e sóbrio", color: "#1e293b" },
  { id: "legal", name: "Jurídico", description: "Tradicional legal", color: "#92400e" },
  { id: "creative", name: "Criativo", description: "Colorido e dinâmico", color: "#be185d" },
  { id: "tech", name: "Tecnológico", description: "Estilo tech", color: "#0f172a" },
  { id: "premium", name: "Premium", description: "Luxuoso e dourado", color: "#d97706" },
  { id: "startup", name: "Startup", description: "Jovem e inovador", color: "#667eea" },
  { id: "classic", name: "Clássico", description: "Vintage e elegante", color: "#a16207" },
]

interface PersonData {
  tipo: "pf" | "pj"
  nome: string
  documento: string
  endereco: string
  cidade: string
  estado: string
  cep?: string
  telefone?: string
  email?: string
}

interface ContractData {
  titulo: string
  tipo: string
  tipoPersonalizado?: string
  prompt: string
  valor: string
  prazo: string
  observacoes?: string
  template: string
}

interface FormData {
  contratante: PersonData
  contratada: PersonData
  contrato: ContractData
}

// Estados brasileiros
const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]

export default function ContractWizard() {
  const { toast } = useToast()
  const { saveContract } = useSavedContracts()

  // Estados do formulário
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContract, setGeneratedContract] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [user, setUser] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Dados do formulário
  const [formData, setFormData] = useState<FormData>({
    contratante: {
      tipo: "pf",
      nome: "",
      documento: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      telefone: "",
      email: "",
    },
    contratada: {
      tipo: "pf",
      nome: "",
      documento: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      telefone: "",
      email: "",
    },
    contrato: {
      titulo: "",
      tipo: "",
      tipoPersonalizado: "",
      prompt: "",
      valor: "",
      prazo: "",
      observacoes: "",
      template: "professional",
    },
  })

  // ✅ CORREÇÃO: Verificar autenticação na inicialização
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoadingUser(true)
      try {
        const { user: currentUser, error } = await supabaseUtils.getCurrentUser()

        if (currentUser && !error) {
          setUser(currentUser)
          console.log("✅ [Wizard] Usuário autenticado:", currentUser.email)
        } else {
          console.log("❌ [Wizard] Usuário não autenticado")
          setUser(null)
        }
      } catch (error) {
        console.error("❌ [Wizard] Erro ao verificar autenticação:", error)
        setUser(null)
      } finally {
        setIsLoadingUser(false)
      }
    }

    checkAuth()
  }, [])

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/[^\d]/g, "")
    if (cleaned.length !== 11 || cleaned.match(/^(\d)\1{10}$/)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += Number.parseInt(cleaned.charAt(i)) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== Number.parseInt(cleaned.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += Number.parseInt(cleaned.charAt(i)) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    return remainder === Number.parseInt(cleaned.charAt(10))
  }

  // Validação de CNPJ
  const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/[^\d]/g, "")
    if (cleaned.length !== 14 || cleaned.match(/^(\d)\1{13}$/)) return false

    let length = cleaned.length - 2
    let numbers = cleaned.substring(0, length)
    const digits = cleaned.substring(length)
    let sum = 0
    let pos = length - 7

    for (let i = length; i >= 1; i--) {
      sum += Number.parseInt(numbers.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== Number.parseInt(digits.charAt(0))) return false

    length = length + 1
    numbers = cleaned.substring(0, length)
    sum = 0
    pos = length - 7
    for (let i = length; i >= 1; i--) {
      sum += Number.parseInt(numbers.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return result === Number.parseInt(digits.charAt(1))
  }

  // Validação de email
  const validateEmail = (email: string): boolean => {
    if (!email) return true // Email é opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Função para validar um passo
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}

    if (step === 1) {
      // Validar contratante
      if (!formData.contratante.nome.trim()) {
        errors["contratante.nome"] = "Nome é obrigatório"
      }
      if (!formData.contratante.documento.trim()) {
        errors["contratante.documento"] = "Documento é obrigatório"
      } else if (formData.contratante.tipo === "pf" && !validateCPF(formData.contratante.documento)) {
        errors["contratante.documento"] = "CPF inválido"
      } else if (formData.contratante.tipo === "pj" && !validateCNPJ(formData.contratante.documento)) {
        errors["contratante.documento"] = "CNPJ inválido"
      }
      if (!formData.contratante.endereco.trim()) {
        errors["contratante.endereco"] = "Endereço é obrigatório"
      }
      if (!formData.contratante.cidade.trim()) {
        errors["contratante.cidade"] = "Cidade é obrigatória"
      }
      if (!formData.contratante.estado) {
        errors["contratante.estado"] = "Estado é obrigatório"
      }
      if (formData.contratante.email && !validateEmail(formData.contratante.email)) {
        errors["contratante.email"] = "Email inválido"
      }
    }

    if (step === 2) {
      // Validar contratada
      if (!formData.contratada.nome.trim()) {
        errors["contratada.nome"] = "Nome é obrigatório"
      }
      if (!formData.contratada.documento.trim()) {
        errors["contratada.documento"] = "Documento é obrigatório"
      } else if (formData.contratada.tipo === "pf" && !validateCPF(formData.contratada.documento)) {
        errors["contratada.documento"] = "CPF inválido"
      } else if (formData.contratada.tipo === "pj" && !validateCNPJ(formData.contratada.documento)) {
        errors["contratada.documento"] = "CNPJ inválido"
      }
      if (!formData.contratada.endereco.trim()) {
        errors["contratada.endereco"] = "Endereço é obrigatório"
      }
      if (!formData.contratada.cidade.trim()) {
        errors["contratada.cidade"] = "Cidade é obrigatória"
      }
      if (!formData.contratada.estado) {
        errors["contratada.estado"] = "Estado é obrigatório"
      }
      if (formData.contratada.email && !validateEmail(formData.contratada.email)) {
        errors["contratada.email"] = "Email inválido"
      }
    }

    if (step === 3) {
      // Validar contrato
      if (!formData.contrato.titulo.trim()) {
        errors["contrato.titulo"] = "Título é obrigatório"
      }
      if (!formData.contrato.tipo) {
        errors["contrato.tipo"] = "Tipo de contrato é obrigatório"
      }
      if (formData.contrato.tipo === "outros" && !formData.contrato.tipoPersonalizado?.trim()) {
        errors["contrato.tipoPersonalizado"] = "Especifique o tipo personalizado"
      }
      if (!formData.contrato.prompt.trim()) {
        errors["contrato.prompt"] = "Descrição do objeto é obrigatória"
      } else if (formData.contrato.prompt.length < 20) {
        errors["contrato.prompt"] = "Descrição deve ter pelo menos 20 caracteres"
      }
      if (!formData.contrato.valor.trim()) {
        errors["contrato.valor"] = "Valor é obrigatório"
      }
      if (!formData.contrato.prazo.trim()) {
        errors["contrato.prazo"] = "Prazo é obrigatório"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Função para avançar para o próximo passo
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    } else {
      toast({
        title: "❌ Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios antes de continuar",
        variant: "destructive",
      })
    }
  }

  // Função para voltar ao passo anterior
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Função para atualizar dados do formulário
  const updateFormData = (section: keyof FormData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))

    // Limpar erro do campo quando ele for preenchido
    const errorKey = `${section}.${field}`
    if (validationErrors[errorKey]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // ✅ CORREÇÃO: Função melhorada para gerar contrato
  const generateContract = async () => {
    if (!validateStep(3)) {
      toast({
        title: "❌ Dados incompletos",
        description: "Verifique todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      console.log("🚀 [Wizard] Iniciando geração do contrato...")

      const response = await fetch("/api/generate-contract-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ [Wizard] Erro na API:", data)
        throw new Error(data.message || data.error || "Erro ao gerar contrato")
      }

      console.log("✅ [Wizard] Contrato gerado com sucesso!")

      setGeneratedContract(data.contract)
      setCurrentStep(4)

      // ✅ CORREÇÃO: Salvar automaticamente no Supabase/localStorage
      try {
        console.log("💾 [Wizard] Salvando contrato automaticamente...")

        const contractToSave = {
          titulo: formData.contrato.titulo,
          nomepersonalizado: formData.contrato.titulo,
          tipo: formData.contrato.tipo,
          tipopersonalizado: formData.contrato.tipoPersonalizado,
          tamanho: "médio",
          html: data.contract,
          contratante: formData.contratante,
          contratada: formData.contratada,
          valor: formData.contrato.valor,
          prazo: formData.contrato.prazo,
          leisselecionadas: [],
        }

        const savedId = await saveContract(contractToSave)

        if (savedId) {
          console.log("✅ [Wizard] Contrato salvo com ID:", savedId)
          toast({
            title: "✅ Contrato gerado e salvo!",
            description: "Contrato disponível na seção Exportações",
          })
        } else {
          console.warn("⚠️ [Wizard] Contrato gerado mas não foi salvo")
          toast({
            title: "✅ Contrato gerado!",
            description: "⚠️ Não foi possível salvar automaticamente",
          })
        }
      } catch (saveError) {
        console.error("❌ [Wizard] Erro ao salvar contrato:", saveError)
        toast({
          title: "✅ Contrato gerado!",
          description: "⚠️ Erro ao salvar - use o botão Salvar",
        })
      }
    } catch (error) {
      console.error("❌ [Wizard] Erro ao gerar contrato:", error)
      toast({
        title: "❌ Erro ao gerar contrato",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Função para salvar contrato manualmente
  const handleSaveContract = async () => {
    if (!generatedContract) return

    try {
      const contractToSave = {
        titulo: formData.contrato.titulo,
        nomepersonalizado: formData.contrato.titulo,
        tipo: formData.contrato.tipo,
        tipopersonalizado: formData.contrato.tipoPersonalizado,
        tamanho: "médio",
        html: generatedContract,
        contratante: formData.contratante,
        contratada: formData.contratada,
        valor: formData.contrato.valor,
        prazo: formData.contrato.prazo,
        leisselecionadas: [],
      }

      const savedId = await saveContract(contractToSave)

      if (savedId) {
        toast({
          title: "✅ Contrato salvo!",
          description: "Contrato salvo com sucesso",
        })
      }
    } catch (error) {
      console.error("Erro ao salvar contrato:", error)
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar o contrato",
        variant: "destructive",
      })
    }
  }

  // Função para baixar contrato
  const handleDownloadContract = () => {
    if (!generatedContract) return

    const blob = new Blob([generatedContract], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${formData.contrato.titulo.replace(/[^a-zA-Z0-9]/g, "_")}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "📥 Download iniciado",
      description: "Contrato baixado com sucesso",
    })
  }

  // Função para visualizar contrato
  const handlePreviewContract = () => {
    if (!generatedContract) return

    const newWindow = window.open("", "_blank")
    if (newWindow) {
      newWindow.document.write(generatedContract)
      newWindow.document.close()
    }
  }

  // Função para resetar formulário
  const resetForm = () => {
    setCurrentStep(1)
    setGeneratedContract(null)
    setValidationErrors({})
    setFormData({
      contratante: {
        tipo: "pf",
        nome: "",
        documento: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
        email: "",
      },
      contratada: {
        tipo: "pf",
        nome: "",
        documento: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
        email: "",
      },
      contrato: {
        titulo: "",
        tipo: "",
        tipoPersonalizado: "",
        prompt: "",
        valor: "",
        prazo: "",
        observacoes: "",
        template: "professional",
      },
    })
  }

  // Renderizar campo de entrada com validação
  const renderInputField = (
    section: keyof FormData,
    field: string,
    label: string,
    type = "text",
    placeholder?: string,
    required = true,
    icon?: React.ReactNode,
  ) => {
    const value = (formData[section] as any)[field] || ""
    const errorKey = `${section}.${field}`
    const hasError = !!validationErrors[errorKey]

    return (
      <div className="space-y-2">
        <Label htmlFor={`${section}-${field}`} className="flex items-center gap-2">
          {icon}
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id={`${section}-${field}`}
          type={type}
          value={value}
          onChange={(e) => updateFormData(section, field, e.target.value)}
          placeholder={placeholder}
          className={hasError ? "border-red-500" : ""}
        />
        {hasError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {validationErrors[errorKey]}
          </p>
        )}
      </div>
    )
  }

  // Renderizar seletor com validação
  const renderSelectField = (
    section: keyof FormData,
    field: string,
    label: string,
    options: { value: string; label: string }[],
    placeholder?: string,
    required = true,
    icon?: React.ReactNode,
  ) => {
    const value = (formData[section] as any)[field] || ""
    const errorKey = `${section}.${field}`
    const hasError = !!validationErrors[errorKey]

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          {icon}
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={value} onValueChange={(value) => updateFormData(section, field, value)}>
          <SelectTrigger className={hasError ? "border-red-500" : ""}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {validationErrors[errorKey]}
          </p>
        )}
      </div>
    )
  }

  // Renderizar textarea com validação
  const renderTextareaField = (
    section: keyof FormData,
    field: string,
    label: string,
    placeholder?: string,
    required = true,
    rows = 4,
    icon?: React.ReactNode,
  ) => {
    const value = (formData[section] as any)[field] || ""
    const errorKey = `${section}.${field}`
    const hasError = !!validationErrors[errorKey]

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          {icon}
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          value={value}
          onChange={(e) => updateFormData(section, field, e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={hasError ? "border-red-500" : ""}
        />
        {hasError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {validationErrors[errorKey]}
          </p>
        )}
        {field === "prompt" && <p className="text-sm text-gray-500">{value.length}/3000 caracteres (mínimo 20)</p>}
      </div>
    )
  }

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Wand2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gerador de Contratos IA</h1>
        </div>
        <p className="text-muted-foreground">Crie contratos profissionais em minutos com inteligência artificial</p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <Progress value={(currentStep / 4) * 100} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Passo {currentStep} de 4</span>
            <span>{Math.round((currentStep / 4) * 100)}% completo</span>
          </div>
        </div>
      </div>

      {/* Status do usuário */}
      {!user && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Você não está logado. Os contratos serão salvos apenas localmente.
            <strong> Faça login para sincronizar com a nuvem.</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Passo 1: Dados do Contratante */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Contratante
            </CardTitle>
            <CardDescription>Informe os dados de quem está contratando o serviço</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de pessoa */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Pessoa *</Label>
                <Select
                  value={formData.contratante.tipo}
                  onValueChange={(value: "pf" | "pj") => updateFormData("contratante", "tipo", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pf">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Pessoa Física
                      </div>
                    </SelectItem>
                    <SelectItem value="pj">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Pessoa Jurídica
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nome e Documento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputField(
                "contratante",
                "nome",
                formData.contratante.tipo === "pf" ? "Nome Completo" : "Razão Social",
                "text",
                formData.contratante.tipo === "pf" ? "João Silva" : "Empresa LTDA",
                true,
                <User className="h-4 w-4" />,
              )}
              {renderInputField(
                "contratante",
                "documento",
                formData.contratante.tipo === "pf" ? "CPF" : "CNPJ",
                "text",
                formData.contratante.tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00",
                true,
                <CreditCard className="h-4 w-4" />,
              )}
            </div>

            {/* Endereço */}
            {renderInputField(
              "contratante",
              "endereco",
              "Endereço Completo",
              "text",
              "Rua das Flores, 123, Centro",
              true,
              <MapPin className="h-4 w-4" />,
            )}

            {/* Cidade, Estado e CEP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInputField(
                "contratante",
                "cidade",
                "Cidade",
                "text",
                "São Paulo",
                true,
                <MapPin className="h-4 w-4" />,
              )}
              {renderSelectField(
                "contratante",
                "estado",
                "Estado",
                BRAZILIAN_STATES.map((state) => ({ value: state, label: state })),
                "Selecione o estado",
                true,
                <MapPin className="h-4 w-4" />,
              )}
              {renderInputField(
                "contratante",
                "cep",
                "CEP",
                "text",
                "00000-000",
                false,
                <MapPin className="h-4 w-4" />,
              )}
            </div>

            {/* Contatos opcionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputField(
                "contratante",
                "telefone",
                "Telefone",
                "tel",
                "(11) 99999-9999",
                false,
                <Phone className="h-4 w-4" />,
              )}
              {renderInputField(
                "contratante",
                "email",
                "E-mail",
                "email",
                "contato@exemplo.com",
                false,
                <Mail className="h-4 w-4" />,
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 2: Dados da Contratada */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dados da Contratada
            </CardTitle>
            <CardDescription>Informe os dados de quem vai prestar o serviço</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de pessoa */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Pessoa *</Label>
                <Select
                  value={formData.contratada.tipo}
                  onValueChange={(value: "pf" | "pj") => updateFormData("contratada", "tipo", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pf">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Pessoa Física
                      </div>
                    </SelectItem>
                    <SelectItem value="pj">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Pessoa Jurídica
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nome e Documento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputField(
                "contratada",
                "nome",
                formData.contratada.tipo === "pf" ? "Nome Completo" : "Razão Social",
                "text",
                formData.contratada.tipo === "pf" ? "Maria Santos" : "Prestadora LTDA",
                true,
                <User className="h-4 w-4" />,
              )}
              {renderInputField(
                "contratada",
                "documento",
                formData.contratada.tipo === "pf" ? "CPF" : "CNPJ",
                "text",
                formData.contratada.tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00",
                true,
                <CreditCard className="h-4 w-4" />,
              )}
            </div>

            {/* Endereço */}
            {renderInputField(
              "contratada",
              "endereco",
              "Endereço Completo",
              "text",
              "Av. Principal, 456, Bairro",
              true,
              <MapPin className="h-4 w-4" />,
            )}

            {/* Cidade, Estado e CEP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInputField(
                "contratada",
                "cidade",
                "Cidade",
                "text",
                "Rio de Janeiro",
                true,
                <MapPin className="h-4 w-4" />,
              )}
              {renderSelectField(
                "contratada",
                "estado",
                "Estado",
                BRAZILIAN_STATES.map((state) => ({ value: state, label: state })),
                "Selecione o estado",
                true,
                <MapPin className="h-4 w-4" />,
              )}
              {renderInputField("contratada", "cep", "CEP", "text", "00000-000", false, <MapPin className="h-4 w-4" />)}
            </div>

            {/* Contatos opcionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputField(
                "contratada",
                "telefone",
                "Telefone",
                "tel",
                "(21) 88888-8888",
                false,
                <Phone className="h-4 w-4" />,
              )}
              {renderInputField(
                "contratada",
                "email",
                "E-mail",
                "email",
                "prestador@exemplo.com",
                false,
                <Mail className="h-4 w-4" />,
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 3: Dados do Contrato */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dados do Contrato
            </CardTitle>
            <CardDescription>Configure os detalhes do contrato que será gerado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Título e Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputField(
                "contrato",
                "titulo",
                "Título do Contrato",
                "text",
                "Contrato de Prestação de Serviços",
                true,
                <FileText className="h-4 w-4" />,
              )}
              {renderSelectField(
                "contrato",
                "tipo",
                "Tipo de Contrato",
                CONTRACT_TYPES.map((type) => ({ value: type.value, label: `${type.icon} ${type.label}` })),
                "Selecione o tipo",
                true,
                <FileText className="h-4 w-4" />,
              )}
            </div>

            {/* Tipo personalizado (se "outros" for selecionado) */}
            {formData.contrato.tipo === "outros" &&
              renderInputField(
                "contrato",
                "tipoPersonalizado",
                "Especifique o Tipo",
                "text",
                "Descreva o tipo de contrato",
                true,
                <FileText className="h-4 w-4" />,
              )}

            {/* Descrição do objeto */}
            {renderTextareaField(
              "contrato",
              "prompt",
              "Descrição Detalhada do Objeto",
              "Descreva detalhadamente o que será contratado, incluindo especificações técnicas, metodologia, entregáveis, responsabilidades e qualquer informação relevante...",
              true,
              6,
              <FileText className="h-4 w-4" />,
            )}

            {/* Valor e Prazo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputField(
                "contrato",
                "valor",
                "Valor Total",
                "text",
                "R$ 5.000,00",
                true,
                <DollarSign className="h-4 w-4" />,
              )}
              {renderInputField(
                "contrato",
                "prazo",
                "Prazo de Execução",
                "text",
                "30 dias corridos",
                true,
                <Clock className="h-4 w-4" />,
              )}
            </div>

            {/* Template Visual */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Template Visual
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {VISUAL_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      formData.contrato.template === template.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => updateFormData("contrato", "template", template.id)}
                  >
                    <div className="w-full h-8 rounded mb-2" style={{ backgroundColor: template.color }} />
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações adicionais */}
            {renderTextareaField(
              "contrato",
              "observacoes",
              "Observações Adicionais",
              "Cláusulas especiais, condições específicas, garantias, confidencialidade, etc.",
              false,
              4,
              <FileText className="h-4 w-4" />,
            )}
          </CardContent>
        </Card>
      )}

      {/* Passo 4: Contrato Gerado */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Contrato Gerado com Sucesso!
            </CardTitle>
            <CardDescription>Seu contrato foi gerado e está pronto para uso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações do contrato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <p className="font-medium">{formData.contrato.titulo}</p>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Badge variant="secondary">
                  {CONTRACT_TYPES.find((t) => t.value === formData.contrato.tipo)?.label || formData.contrato.tipo}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Contratante</Label>
                <p className="font-medium">{formData.contratante.nome}</p>
              </div>
              <div className="space-y-2">
                <Label>Contratada</Label>
                <p className="font-medium">{formData.contratada.nome}</p>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <p className="font-medium text-green-600">{formData.contrato.valor}</p>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <p className="font-medium">{formData.contrato.prazo}</p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePreviewContract} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              <Button onClick={handleDownloadContract} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar HTML
              </Button>
              <Button onClick={handleSaveContract} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Salvar Novamente
              </Button>
              <Button onClick={resetForm} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </div>

            {/* Preview do contrato */}
            {generatedContract && (
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: generatedContract }} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botões de navegação */}
      {currentStep < 4 && (
        <div className="flex justify-between">
          <Button onClick={prevStep} variant="outline" disabled={currentStep === 1}>
            Anterior
          </Button>

          {currentStep < 3 ? (
            <Button onClick={nextStep}>Próximo</Button>
          ) : (
            <Button
              onClick={generateContract}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando Contrato...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Contrato com IA
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
