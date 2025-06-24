"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, Settings, Info, Scale, Plus, Trash2, Save, RotateCcw, Eye, MessageSquare } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"

interface CustomField {
  id: string
  label: string
  type: "text" | "number" | "date" | "select"
  placeholder: string
  value: string
  options?: string[]
  required: boolean
}

interface FieldSection {
  name: string
  fields: CustomField[]
}

interface FieldPreset {
  id: string
  name: string
  sections: FieldSection[]
  user_id?: string
}

interface LanguageStyle {
  id: string
  name: string
  description: string
  prompt: string
}

const LANGUAGE_STYLES: LanguageStyle[] = [
  {
    id: "professional",
    name: "Profissional",
    description: "Linguagem jurídica técnica e formal",
    prompt:
      "Use linguagem jurídica profissional, técnica e formal, adequada para advogados e profissionais do direito.",
  },
  {
    id: "balanced",
    name: "Equilibrado",
    description: "Linguagem clara mas juridicamente precisa",
    prompt: "Use linguagem jurídica clara e acessível, mantendo precisão técnica sem ser excessivamente complexa.",
  },
  {
    id: "accessible",
    name: "Para Leigos",
    description: "Linguagem simples e fácil de entender",
    prompt:
      "Use linguagem simples e acessível, explicando termos jurídicos quando necessário, para facilitar compreensão de pessoas sem formação jurídica.",
  },
  {
    id: "ultra_legal",
    name: "Super Jurídico",
    description: "Linguagem altamente técnica e especializada",
    prompt: "Use linguagem jurídica altamente técnica, especializada e rigorosa, com terminologia avançada do direito.",
  },
  {
    id: "business",
    name: "Empresarial",
    description: "Linguagem corporativa e comercial",
    prompt: "Use linguagem empresarial e comercial, focada em aspectos de negócios e relações corporativas.",
  },
]

interface AdvancedSettingsProps {
  temperature: number
  onTemperatureChange: (value: number) => void
  maxTokens: number
  onMaxTokensChange: (value: number) => void
  includeLexML: boolean
  onIncludeLexMLChange: (value: boolean) => void
  customPrompt: string
  onCustomPromptChange: (value: string) => void
  contractType: "simple" | "advanced"
  onMetadataChange?: (metadata: any) => void
}

const DEFAULT_PRESET: FieldPreset = {
  id: "default",
  name: "Padrão Nexar IA",
  sections: [
    {
      name: "Contratante",
      fields: [
        { id: "c1", label: "Nome", type: "text", placeholder: "Nome completo", value: "", required: true },
        { id: "c2", label: "CPF/CNPJ", type: "text", placeholder: "000.000.000-00", value: "", required: true },
        { id: "c3", label: "Endereço", type: "text", placeholder: "Endereço completo", value: "", required: false },
      ],
    },
    {
      name: "Contratado",
      fields: [
        { id: "ct1", label: "Nome", type: "text", placeholder: "Nome completo", value: "", required: true },
        { id: "ct2", label: "CPF/CNPJ", type: "text", placeholder: "000.000.000-00", value: "", required: true },
        { id: "ct3", label: "Endereço", type: "text", placeholder: "Endereço completo", value: "", required: false },
      ],
    },
    {
      name: "Fiador",
      fields: [
        { id: "f1", label: "Nome", type: "text", placeholder: "Nome completo (opcional)", value: "", required: false },
        { id: "f2", label: "CPF", type: "text", placeholder: "000.000.000-00", value: "", required: false },
      ],
    },
    {
      name: "Testemunhas",
      fields: [
        { id: "t1", label: "Testemunha 1", type: "text", placeholder: "Nome completo", value: "", required: false },
        { id: "t2", label: "Testemunha 2", type: "text", placeholder: "Nome completo", value: "", required: false },
      ],
    },
  ],
}

export default function AdvancedSettings({
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  includeLexML,
  onIncludeLexMLChange,
  customPrompt,
  onCustomPromptChange,
  contractType,
  onMetadataChange,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sections, setSections] = useState<FieldSection[]>(DEFAULT_PRESET.sections)
  const [currentPreset, setCurrentPreset] = useState<string>("default")
  const [userPresets, setUserPresets] = useState<FieldPreset[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showMetadataModal, setShowMetadataModal] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Novas configurações
  const [languageStyle, setLanguageStyle] = useState("balanced")
  const [enhancedLexML, setEnhancedLexML] = useState(false)
  const [contractRefinements, setContractRefinements] = useState({
    includePerformanceMetrics: false,
    includeForceClause: false,
    includeArbitrationClause: false,
    includeDataProtection: false,
    includeIntellectualProperty: false,
    includeNonCompete: false,
  })

  const [sectionToggles, setSectionToggles] = useState({
    contratante: true,
    contratado: true,
    fiador: false,
    testemunhas: false,
  })
  const [includeLegalNumbers, setIncludeLegalNumbers] = useState(true)

  const { user, isDemo } = useAuth()
  const { toast } = useToast()

  // Load user presets on mount
  useEffect(() => {
    if (!isDemo && user) {
      loadUserPresets()
    }
  }, [user, isDemo])

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(
      "nexar-advanced-settings",
      JSON.stringify({
        sections,
        currentPreset,
        temperature,
        maxTokens,
        includeLexML,
        customPrompt,
        languageStyle,
        enhancedLexML,
        contractRefinements,
        sectionToggles,
        includeLegalNumbers,
      }),
    )
  }, [
    sections,
    currentPreset,
    temperature,
    maxTokens,
    includeLexML,
    customPrompt,
    languageStyle,
    enhancedLexML,
    contractRefinements,
    sectionToggles,
    includeLegalNumbers,
  ])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("nexar-advanced-settings")
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.sections) setSections(data.sections)
        if (data.currentPreset) setCurrentPreset(data.currentPreset)
        if (data.languageStyle) setLanguageStyle(data.languageStyle)
        if (data.enhancedLexML !== undefined) setEnhancedLexML(data.enhancedLexML)
        if (data.contractRefinements) setContractRefinements(data.contractRefinements)
        if (data.sectionToggles) setSectionToggles(data.sectionToggles)
        if (data.includeLegalNumbers !== undefined) setIncludeLegalNumbers(data.includeLegalNumbers)
      } catch (error) {
        console.warn("Erro ao carregar configurações salvas:", error)
      }
    }
  }, [])

  // Generate metadata whenever sections change
  useEffect(() => {
    const metadata = generateMetadata()
    const advancedConfig = {
      fieldMetadata: metadata,
      sectionToggles,
      includeLegalNumbers,
      languageStyle,
      languagePrompt: LANGUAGE_STYLES.find((s) => s.id === languageStyle)?.prompt || "",
      enhancedLexML,
      contractRefinements,
      advancedFieldsEnabled: true,
    }
    onMetadataChange?.(advancedConfig)
  }, [
    sections,
    sectionToggles,
    includeLegalNumbers,
    languageStyle,
    enhancedLexML,
    contractRefinements,
    onMetadataChange,
  ])

  const loadUserPresets = async () => {
    try {
      const { data, error } = await supabase
        .from("field_presets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setUserPresets(data)
      }
    } catch (error) {
      console.warn("Erro ao carregar presets:", error)
    }
  }

  const generateMetadata = () => {
    const metadata: Record<string, Record<string, string>> = {}
    sections.forEach((section) => {
      metadata[section.name] = {}
      section.fields.forEach((field) => {
        if (field.value.trim()) {
          metadata[section.name][field.label] = field.value
        }
      })
    })
    return metadata
  }

  const validateFields = () => {
    const errors: Record<string, string> = {}
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required && !field.value.trim()) {
          errors[field.id] = `${field.label} é obrigatório`
        }
      })
    })
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const addField = (sectionIndex: number) => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: "Novo Campo",
      type: "text",
      placeholder: "Digite aqui...",
      value: "",
      required: false,
    }

    const newSections = [...sections]
    newSections[sectionIndex].fields.push(newField)
    setSections(newSections)
  }

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<CustomField>) => {
    const newSections = [...sections]
    newSections[sectionIndex].fields[fieldIndex] = {
      ...newSections[sectionIndex].fields[fieldIndex],
      ...updates,
    }
    setSections(newSections)
  }

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const newSections = [...sections]
    newSections[sectionIndex].fields.splice(fieldIndex, 1)
    setSections(newSections)
  }

  const loadPreset = (presetId: string) => {
    if (presetId === "default") {
      setSections(DEFAULT_PRESET.sections)
      setCurrentPreset("default")
    } else {
      const preset = userPresets.find((p) => p.id === presetId)
      if (preset) {
        setSections(preset.sections)
        setCurrentPreset(presetId)
      }
    }
    setValidationErrors({})
  }

  const savePreset = async () => {
    if (!newPresetName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o preset.",
        variant: "destructive",
      })
      return
    }

    if (isDemo) {
      toast({
        title: "Preset salvo localmente",
        description: "No modo demo, presets são salvos apenas na sessão atual.",
      })
      setShowSaveModal(false)
      setNewPresetName("")
      return
    }

    try {
      const { data, error } = await supabase
        .from("field_presets")
        .insert({
          name: newPresetName,
          sections: sections,
          user_id: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      await loadUserPresets()
      setCurrentPreset(data.id)
      setShowSaveModal(false)
      setNewPresetName("")

      toast({
        title: "Preset salvo!",
        description: `"${newPresetName}" foi salvo com sucesso.`,
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o preset. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const resetFields = () => {
    loadPreset(currentPreset)
    toast({
      title: "Campos resetados",
      description: "Todos os campos foram restaurados para o preset atual.",
    })
  }

  const maxTokensLimit = 5000
  const minTokens = 500

  const toggleSection = (sectionName: string) => {
    setSectionToggles((prev) => ({
      ...prev,
      [sectionName.toLowerCase()]: !prev[sectionName.toLowerCase()],
    }))
  }

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Configurações Avançadas
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {/* Tipo de Linguagem do Contrato */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <Label className="text-sm font-medium">Tipo de Linguagem do Contrato</Label>
            </div>

            <Select value={languageStyle} onValueChange={setLanguageStyle}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo de linguagem" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{style.name}</span>
                      <span className="text-xs text-gray-500">{style.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-xs text-gray-600 bg-purple-50 p-3 rounded-lg">
              <strong>Selecionado:</strong> {LANGUAGE_STYLES.find((s) => s.id === languageStyle)?.description}
            </div>
          </div>

          {/* Preset Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Preset de Campos</Label>
            <div className="flex gap-2">
              <Select value={currentPreset} onValueChange={loadPreset}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão Nexar IA</SelectItem>
                  {userPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salvar Preset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="presetName">Nome do Preset</Label>
                      <Input
                        id="presetName"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Ex: Contrato de Prestação de Serviços"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={savePreset} className="flex-1">
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={resetFields}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Dialog open={showMetadataModal} onOpenChange={setShowMetadataModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Metadados Gerados</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto max-h-96">
                      {JSON.stringify(generateMetadata(), null, 2)}
                    </pre>
                    <p className="text-xs text-gray-500">
                      Estes dados serão injetados automaticamente no contrato gerado.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Dynamic Field Sections */}
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => {
              const sectionKey = section.name.toLowerCase()
              const isActive = sectionToggles[sectionKey] !== false

              return (
                <div
                  key={section.name}
                  className={`border rounded-lg p-4 space-y-3 ${!isActive ? "opacity-50 bg-gray-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleSection(section.name)}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <h4 className="font-medium text-gray-900 dark:text-white">{section.name}</h4>
                      <div className="text-xs text-gray-500">
                        {isActive ? "Usar campos específicos" : "Usar apenas prompt"}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addField(sectionIndex)}
                      disabled={!isActive}
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Campo
                    </Button>
                  </div>

                  {isActive && (
                    <div className="space-y-3">
                      {section.fields.map((field, fieldIndex) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Tipo</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value: any) => updateField(sectionIndex, fieldIndex, { type: value })}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Texto</SelectItem>
                                <SelectItem value="number">Número</SelectItem>
                                <SelectItem value="date">Data</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Valor</Label>
                            <Input
                              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                              value={field.value}
                              onChange={(e) => updateField(sectionIndex, fieldIndex, { value: e.target.value })}
                              placeholder={field.placeholder}
                              className={`text-sm ${validationErrors[field.id] ? "border-red-500" : ""}`}
                            />
                            {validationErrors[field.id] && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors[field.id]}</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) => updateField(sectionIndex, fieldIndex, { placeholder: e.target.value })}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-1 flex items-center">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) =>
                                updateField(sectionIndex, fieldIndex, { required: !!checked })
                              }
                            />
                            <Label className="text-xs ml-1">Obr.</Label>
                          </div>
                          <div className="col-span-1 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(sectionIndex, fieldIndex)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isActive && (
                    <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                      <strong>Modo Prompt:</strong> Os dados desta seção serão extraídos automaticamente da descrição do
                      contrato.
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Temperature Setting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="temperature" className="text-sm font-medium">
                Criatividade (Temperature)
              </Label>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Controla a criatividade: 0.0 = muito conservador, 1.0 = muito criativo
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Slider
                id="temperature"
                min={0.0}
                max={1.0}
                step={0.1}
                value={[temperature]}
                onValueChange={(value) => onTemperatureChange(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Conservador (0.0)</span>
                <span className="font-medium">{temperature.toFixed(1)}</span>
                <span>Criativo (1.0)</span>
              </div>
            </div>
          </div>

          {/* Max Tokens Setting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="maxTokens" className="text-sm font-medium">
                Tamanho Máximo (Tokens)
              </Label>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Controla o tamanho máximo do contrato gerado (500-5.000)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Slider
                id="maxTokens"
                min={minTokens}
                max={maxTokensLimit}
                step={100}
                value={[maxTokens]}
                onValueChange={(value) => onMaxTokensChange(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Mínimo: {minTokens.toLocaleString()}</span>
                <span className="font-medium">{maxTokens.toLocaleString()}</span>
                <span>Máximo: {maxTokensLimit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* LexML Integration */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLexML"
                checked={includeLexML}
                onCheckedChange={onIncludeLexMLChange}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <Label htmlFor="includeLexML" className="text-sm font-medium cursor-pointer">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-green-600" />
                  Incluir sumário de referências legais (LexML)
                </div>
              </Label>
            </div>

            {/* Enhanced LexML */}
            <div className="flex items-center space-x-2 ml-6">
              <Checkbox
                id="enhancedLexML"
                checked={enhancedLexML}
                onCheckedChange={setEnhancedLexML}
                disabled={!includeLexML}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <Label htmlFor="enhancedLexML" className="text-sm cursor-pointer">
                Pesquisa jurídica aprimorada (mais referências)
              </Label>
            </div>

            <p className="text-xs text-gray-500 ml-6">
              Consulta automática de leis brasileiras relevantes para enriquecer o contrato com base legal sólida.
            </p>
          </div>

          {/* Controle de Números de Leis */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLegalNumbers"
                checked={includeLegalNumbers}
                onCheckedChange={setIncludeLegalNumbers}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="includeLegalNumbers" className="text-sm font-medium cursor-pointer">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  Incluir números e incisos de leis no contrato
                </div>
              </Label>
            </div>

            <p className="text-xs text-gray-500 ml-6">
              Quando ativado, inclui referências específicas como "Art. 421 do Código Civil" e incisos detalhados.
            </p>
          </div>

          {/* Refinamentos do Contrato */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <Label className="text-sm font-medium">Refinamentos do Contrato</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="performance-metrics"
                  checked={contractRefinements.includePerformanceMetrics}
                  onCheckedChange={(checked) =>
                    setContractRefinements((prev) => ({ ...prev, includePerformanceMetrics: checked }))
                  }
                />
                <Label htmlFor="performance-metrics" className="text-sm">
                  Incluir métricas de performance
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="force-clause"
                  checked={contractRefinements.includeForceClause}
                  onCheckedChange={(checked) =>
                    setContractRefinements((prev) => ({ ...prev, includeForceClause: checked }))
                  }
                />
                <Label htmlFor="force-clause" className="text-sm">
                  Cláusula de força maior
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="arbitration"
                  checked={contractRefinements.includeArbitrationClause}
                  onCheckedChange={(checked) =>
                    setContractRefinements((prev) => ({ ...prev, includeArbitrationClause: checked }))
                  }
                />
                <Label htmlFor="arbitration" className="text-sm">
                  Cláusula de arbitragem
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="data-protection"
                  checked={contractRefinements.includeDataProtection}
                  onCheckedChange={(checked) =>
                    setContractRefinements((prev) => ({ ...prev, includeDataProtection: checked }))
                  }
                />
                <Label htmlFor="data-protection" className="text-sm">
                  Proteção de dados (LGPD)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="intellectual-property"
                  checked={contractRefinements.includeIntellectualProperty}
                  onCheckedChange={(checked) =>
                    setContractRefinements((prev) => ({ ...prev, includeIntellectualProperty: checked }))
                  }
                />
                <Label htmlFor="intellectual-property" className="text-sm">
                  Propriedade intelectual
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="non-compete"
                  checked={contractRefinements.includeNonCompete}
                  onCheckedChange={(checked) =>
                    setContractRefinements((prev) => ({ ...prev, includeNonCompete: checked }))
                  }
                />
                <Label htmlFor="non-compete" className="text-sm">
                  Cláusula de não concorrência
                </Label>
              </div>
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-3">
            <Label htmlFor="customPrompt" className="text-sm font-medium">
              Prompt adicional (Cláusulas customizadas)
            </Label>
            <Textarea
              id="customPrompt"
              placeholder="Ex: Incluir cláusula de não concorrência por 2 anos, adicionar multa de 20% por atraso no pagamento, especificar que o trabalho será remoto..."
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              maxLength={500}
            />
            <div className="text-xs text-gray-500">
              {customPrompt.length}/500 caracteres • Instruções específicas para personalizar seu contrato
            </div>
          </div>

          {/* Current Plan Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Configuração {contractType === "simple" ? "Simples" : "Avançada"}:</strong>
              <br />• Modelo: {contractType === "simple" ? "GPT-3.5-turbo" : "GPT-4"}
              <br />• Tempo estimado: {contractType === "simple" ? "30-60s" : "60-120s"}
              <br />• Máximo de tokens: {maxTokensLimit.toLocaleString()}
              <br />• Consulta LexML: {includeLexML ? (enhancedLexML ? "Aprimorada" : "Ativada") : "Desativada"}
              <br />• Números de leis: {includeLegalNumbers ? "Incluídos" : "Omitidos"}
              <br />• Linguagem: {LANGUAGE_STYLES.find((s) => s.id === languageStyle)?.name}
              <br />• Seções ativas: {Object.values(sectionToggles).filter(Boolean).length}/
              {Object.keys(sectionToggles).length}
              <br />• Campos personalizados:{" "}
              {sections.reduce((acc, s, i) => {
                const sectionKey = s.name.toLowerCase()
                return acc + (sectionToggles[sectionKey] !== false ? s.fields.length : 0)
              }, 0)}
              <br />• Refinamentos ativos: {Object.values(contractRefinements).filter(Boolean).length}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
