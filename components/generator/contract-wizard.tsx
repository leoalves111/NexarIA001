"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Building2, User, FileText, Eye, ArrowLeft, ArrowRight, Wand2, Check, X, Loader2, Sparkles, BookOpen, Save, Clock, Star } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { usePromptProfiles, PromptProfile } from "@/hooks/use-prompt-profiles"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, TrendingUp, Lightbulb, CheckCircle2 } from "lucide-react"

// Interfaces para tipagem
interface PersonData {
  tipo: 'pf' | 'pj'
  nome: string
  documento: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  email: string
}

interface ContractData {
  titulo: string
  tipo: 'servicos' | 'trabalho' | 'locacao' | 'compra_venda' | 'consultoria' | 'prestacao_servicos' | 'fornecimento' | 'sociedade' | 'parceria' | 'franquia' | 'licenciamento' | 'manutencao' | 'seguro' | 'financiamento' | 'outros'
  tipoPersonalizado?: string // Para quando tipo for "outros"
  prompt: string  // Mudado de "objeto" para "prompt"
  valor: string
  prazo: string
  observacoes: string
  template: string // Template visual escolhido
}

interface WizardData {
  contratante: PersonData
  contratada: PersonData
  contrato: ContractData
}

interface Law {
  id: string
  title: string
  description: string
  category: string
  relevance: string
}

interface ContractWizardProps {
  onComplete: (data: WizardData) => void
  generating: boolean
  suggestedLaws: Law[]
  selectedLaws: Law[]
  loadingLaws: boolean
  onSearchLaws: (observacoes: string) => void
  onToggleLaw: (law: Law) => void
}

const INITIAL_PERSON_DATA: PersonData = {
  tipo: 'pj',
  nome: '',
  documento: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  telefone: '',
  email: ''
}

const INITIAL_CONTRACT_DATA: ContractData = {
  titulo: '',
  tipo: 'servicos',
  tipoPersonalizado: '',
  prompt: '',
  valor: '',
  prazo: '',
  observacoes: '',
  template: 'professional' // Template padrão
}

// Formatação de documentos (função externa para não recriar)
const formatDocument = (value: string, type: 'pf' | 'pj'): string => {
  const numbers = value.replace(/[^\d]/g, '')
  if (type === 'pf' && numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (type === 'pj' && numbers.length <= 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return value
}

// Templates profissionais disponíveis
const TEMPLATES = [
  { 
    id: 'professional', 
    name: 'Profissional', 
    description: 'Clássico e formal para negócios',
    preview: '📄'
  },
  { 
    id: 'modern', 
    name: 'Moderno', 
    description: 'Design contemporâneo e limpo',
    preview: '🎯'
  },
  { 
    id: 'minimalist', 
    name: 'Minimalista', 
    description: 'Simples e elegante',
    preview: '⚪'
  },
  { 
    id: 'corporate', 
    name: 'Corporativo', 
    description: 'Para grandes empresas',
    preview: '🏢'
  },
  { 
    id: 'legal', 
    name: 'Jurídico', 
    description: 'Foco em aspectos legais',
    preview: '⚖️'
  },
  { 
    id: 'creative', 
    name: 'Criativo', 
    description: 'Para setores criativos',
    preview: '🎨'
  },
  { 
    id: 'tech', 
    name: 'Tecnológico', 
    description: 'Para empresas de tecnologia',
    preview: '💻'
  },
  { 
    id: 'premium', 
    name: 'Premium', 
    description: 'Luxuoso e sofisticado',
    preview: '👑'
  },
  { 
    id: 'startup', 
    name: 'Startup', 
    description: 'Ágil e inovador',
    preview: '🚀'
  },
  { 
    id: 'classic', 
    name: 'Clássico', 
    description: 'Tradicional e confiável',
    preview: '📜'
  }
]

// Estados brasileiros
const ESTADOS = [
  { value: 'AC', label: 'AC - Acre' },
  { value: 'AL', label: 'AL - Alagoas' },
  { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' },
  { value: 'BA', label: 'BA - Bahia' },
  { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' },
  { value: 'ES', label: 'ES - Espírito Santo' },
  { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' },
  { value: 'MT', label: 'MT - Mato Grosso' },
  { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' },
  { value: 'PA', label: 'PA - Pará' },
  { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' },
  { value: 'PE', label: 'PE - Pernambuco' },
  { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' },
  { value: 'RN', label: 'RN - Rio Grande do Norte' },
  { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' },
  { value: 'RR', label: 'RR - Roraima' },
  { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' },
  { value: 'SE', label: 'SE - Sergipe' },
  { value: 'TO', label: 'TO - Tocantins' }
]

// Componente para sugestões de IA
interface AISuggestionProps {
  originalText: string
  onApply: (suggestion: string) => void
  placeholder: string
}

const AISuggestion = ({ originalText, onApply, placeholder }: AISuggestionProps) => {
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)

  const generateSuggestion = async () => {
    if (!originalText.trim() || originalText.length < 10) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          type: placeholder.includes('PROMPT') ? 'prompt' : 'observacoes'
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSuggestion(result.suggestion)
        setShowSuggestion(true)
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    onApply(suggestion)
    setShowSuggestion(false)
    setSuggestion('')
  }

  const handleReject = () => {
    setShowSuggestion(false)
    setSuggestion('')
  }

  // Trigger suggestion when text changes
  useEffect(() => {
    if (originalText.length > 20 && !loading) {
      const timer = setTimeout(() => {
        generateSuggestion()
      }, 2000) // Wait 2 seconds after typing stops
      
      return () => clearTimeout(timer)
    }
  }, [originalText])

  if (!showSuggestion && !loading) return null

  return (
    <Card className="mt-3 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {loading ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-800">
                {loading ? 'IA gerando sugestão...' : 'Sugestão da IA'}
              </span>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                GPT-4o-mini
              </Badge>
            </div>
            
            {loading ? (
              <div className="text-sm text-blue-700">
                Analisando seu texto e criando uma versão profissional...
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-700 bg-white p-3 rounded border mb-3">
                  {suggestion}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleApply}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aplicar Sugestão
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleReject}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Manter Original
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente PersonForm (externo para evitar re-criação)
interface PersonFormProps {
  personData: PersonData
  title: string
  updatePersonData: (field: keyof PersonData, value: string) => void
}

const PersonForm = ({ personData, title, updatePersonData }: PersonFormProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600">Informe os dados da parte</p>
      </div>

      {/* Tipo de Pessoa */}
      <div>
        <Label className="text-sm font-medium">Tipo de Pessoa</Label>
        <Select 
          value={personData.tipo} 
          onValueChange={(value: 'pf' | 'pj') => {
            updatePersonData('tipo', value)
            updatePersonData('documento', '') // Limpa documento ao trocar tipo
          }}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pf">👤 Pessoa Física</SelectItem>
            <SelectItem value="pj">🏢 Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Nome/Razão Social */}
      <div>
        <Label className="text-sm font-medium">
          {personData.tipo === 'pf' ? 'Nome Completo' : 'Razão Social'}
        </Label>
        <Input
          value={personData.nome}
          onChange={(e) => updatePersonData('nome', e.target.value)}
          placeholder={personData.tipo === 'pf' ? 'João da Silva Santos' : 'Empresa de Tecnologia LTDA'}
          className="mt-2"
        />
      </div>

      {/* Documento */}
      <div>
        <Label className="text-sm font-medium">
          {personData.tipo === 'pf' ? 'CPF' : 'CNPJ'}
        </Label>
        <Input
          value={personData.documento}
          onChange={(e) => updatePersonData('documento', e.target.value)}
          placeholder={personData.tipo === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
          className="mt-2"
        />
      </div>

      {/* Endereço */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-sm font-medium">Endereço Completo</Label>
          <Input
            value={personData.endereco}
            onChange={(e) => updatePersonData('endereco', e.target.value)}
            placeholder="Rua das Flores, 123, Centro"
            className="mt-2"
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium">Cidade</Label>
          <Input
            value={personData.cidade}
            onChange={(e) => updatePersonData('cidade', e.target.value)}
            placeholder="São Paulo"
            className="mt-2"
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium">Estado</Label>
          <Select value={personData.estado} onValueChange={(value) => updatePersonData('estado', value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          

        </div>
      </div>

      {/* Contatos Opcionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">CEP (opcional)</Label>
          <Input
            value={personData.cep}
            onChange={(e) => updatePersonData('cep', e.target.value)}
            placeholder="00000-000"
            className="mt-2"
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium">Telefone (opcional)</Label>
          <Input
            value={personData.telefone}
            onChange={(e) => updatePersonData('telefone', e.target.value)}
            placeholder="(11) 99999-9999"
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">E-mail (opcional)</Label>
        <Input
          type="email"
          value={personData.email}
          onChange={(e) => updatePersonData('email', e.target.value)}
          placeholder="contato@empresa.com"
          className="mt-2"
        />
      </div>
    </div>
  )
}

// Componente ContractForm (externo para evitar re-criação)
interface ContractFormProps {
  contractData: ContractData
  updateContractData: (field: keyof ContractData, value: string) => void
  suggestedLaws: Law[]
  selectedLaws: Law[]
  loadingLaws: boolean
  onSearchLaws: (observacoes: string) => void
  onToggleLaw: (law: Law) => void
}

const ContractForm = ({ 
  contractData, 
  updateContractData, 
  suggestedLaws, 
  selectedLaws, 
  loadingLaws, 
  onSearchLaws, 
  onToggleLaw 
}: ContractFormProps) => {
  const { toast } = useToast()
  const { profiles, getPopularProfiles, saveProfile, useProfile } = usePromptProfiles()
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileTags, setProfileTags] = useState('')

  // Função para buscar leis
  const handleSearchLawsProtected = () => {
    onSearchLaws(contractData.observacoes)
  }

  // Função para salvar perfil de prompt
  const handleSaveProfile = useCallback(() => {

    if (!profileName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o perfil",
        variant: "destructive"
      })
      return
    }

    if (!contractData.prompt.trim()) {
      toast({
        title: "Prompt obrigatório", 
        description: "Digite um prompt antes de salvar o perfil",
        variant: "destructive"
      })
      return
    }

    try {
      const tags = profileTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      saveProfile({
        nome: profileName,
        prompt: contractData.prompt,
        tipo: contractData.tipo,
        tipoPersonalizado: contractData.tipoPersonalizado,
        observacoes: contractData.observacoes,
        tags
      })

      toast({
        title: "✅ Perfil salvo!",
        description: `Perfil "${profileName}" salvo com sucesso`
      })

      setShowProfileDialog(false)
      setProfileName('')
      setProfileTags('')
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar o perfil",
        variant: "destructive"
      })
    }
  }, [profileName, profileTags, contractData, saveProfile, toast])

  // Função para carregar perfil
  const handleLoadProfile = useCallback((profile: any) => {
    updateContractData('prompt', profile.prompt)
    updateContractData('tipo', profile.tipo)
    if (profile.tipoPersonalizado) {
      updateContractData('tipoPersonalizado', profile.tipoPersonalizado)
    }
    updateContractData('observacoes', profile.observacoes)

    // Incrementar uso do perfil (removido hook para evitar erro)
    // useProfile(profile.id) - TODO: implementar método alternativo

    toast({
      title: "📚 Perfil carregado!",
      description: `Perfil "${profile.nome}" aplicado com sucesso`
    })
  }, [updateContractData, toast])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Dados do Contrato</h2>
        <p className="text-gray-600">Defina os detalhes e condições do contrato</p>
      </div>

      {/* Seletor de Template */}
      <div>
        <Label className="text-sm font-medium">Template do Contrato</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
          {TEMPLATES.map((template) => (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                contractData.template === template.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => updateContractData('template', template.id)}
            >
              <CardContent className="p-3 text-center">
                <div className="text-2xl mb-1">{template.preview}</div>
                <div className="text-xs font-medium">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">{template.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Título do Contrato */}
      <div>
        <Label className="text-sm font-medium">Título do Contrato</Label>
        <Input
          value={contractData.titulo}
          onChange={(e) => updateContractData('titulo', e.target.value)}
          placeholder="Contrato de Prestação de Serviços de Marketing Digital"
          className="mt-2"
        />
      </div>

      {/* Tipo de Contrato */}
      <div>
        <Label className="text-sm font-medium">Tipo de Contrato</Label>
        <Select value={contractData.tipo} onValueChange={(value: any) => updateContractData('tipo', value)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
                            <SelectItem value="servicos">🔧 Prestação de Serviços</SelectItem>
                <SelectItem value="trabalho">👨‍💼 Contrato de Trabalho</SelectItem>
                <SelectItem value="locacao">🏠 Locação de Imóvel</SelectItem>
                <SelectItem value="compra_venda">🛒 Compra e Venda</SelectItem>
                <SelectItem value="consultoria">💼 Consultoria</SelectItem>
                <SelectItem value="prestacao_servicos">⚙️ Prestação de Serviços Técnicos</SelectItem>
                <SelectItem value="fornecimento">📦 Fornecimento de Produtos</SelectItem>
                <SelectItem value="sociedade">🤝 Contrato de Sociedade</SelectItem>
                <SelectItem value="parceria">🔗 Parceria Comercial</SelectItem>
                <SelectItem value="franquia">🏪 Franquia</SelectItem>
                <SelectItem value="licenciamento">📋 Licenciamento</SelectItem>
                <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
                <SelectItem value="seguro">🛡️ Seguro</SelectItem>
                <SelectItem value="financiamento">💰 Financiamento</SelectItem>
                <SelectItem value="outros">🆕 Outros (Personalize)</SelectItem>
            
                        </SelectContent>
        </Select>
      </div>

      {/* Campo para tipo personalizado */}
      {contractData.tipo === 'outros' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="text-sm font-medium text-blue-800">
            Especifique o Tipo de Contrato
          </Label>
          <Input
            placeholder="Ex: Contrato de Distribuição, Acordo de Não Divulgação, Contrato de Representação Comercial, etc."
            value={contractData.tipoPersonalizado || ''}
            onChange={(e) => updateContractData('tipoPersonalizado', e.target.value)}
            className="mt-2"
          />
          <div className="text-xs text-blue-600 mt-2">
            💡 A IA criará um contrato personalizado baseado no tipo especificado
          </div>
        </div>
      )}

      {/* PROMPT - Descreva o Contrato */}
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          PROMPT - Descreva o Contrato
          {contractData.tipo === 'outros' && contractData.tipoPersonalizado && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
              Tipo: {contractData.tipoPersonalizado}
            </span>
          )}
          <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
            <Sparkles className="h-3 w-3 mr-1" />
            IA Real
          </Badge>
        </Label>
        
        {/* Perfis de Prompt */}
        <div className="flex gap-2 ml-auto">
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Save className="h-3 w-3 mr-1" />
                Salvar Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Salvar Perfil de Prompt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Perfil</Label>
                  <Input
                    placeholder="Ex: Contrato CLT Padrão"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    placeholder="Ex: trabalho, clt, desenvolvedor"
                    value={profileTags}
                    onChange={(e) => setProfileTags(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveProfile} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Perfil
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {getPopularProfiles(3).length > 0 && (
            <Select onValueChange={(profileId) => {
              const profile = profiles.find(p => p.id === profileId)
              if (profile) handleLoadProfile(profile)
            }}>
              <SelectTrigger className="w-40 text-xs">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <SelectValue placeholder="Perfis Salvos" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {getPopularProfiles(10).map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-32">{profile.nome}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {profile.usageCount}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <Textarea
          value={contractData.prompt}
          onChange={(e) => updateContractData('prompt', e.target.value)}
          placeholder="Exemplo: 'Contrato de trabalho para desenvolvedor frontend, salário R$ 5.000, carga horária 40h/semana, benefícios incluem plano de saúde e vale alimentação'. 

💡 Dicas de Tamanho:
• 'contrato resumido' ou 'básico' = 1 página, cláusulas essenciais
• 'contrato completo' ou 'detalhado' = até 2 páginas, todas as cláusulas"
          className="mt-2 min-h-[120px]"
        />
        <div className="text-xs text-gray-500 mt-1">
          💡 Seja específico! A IA criará todas as cláusulas baseadas neste prompt.
        </div>
      </div>

      {/* Valor e Prazo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Valor Total</Label>
          <Input
            value={contractData.valor}
            onChange={(e) => updateContractData('valor', e.target.value)}
            placeholder="R$ 15.000,00"
            className="mt-2"
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium">Prazo de Execução</Label>
          <Input
            value={contractData.prazo}
            onChange={(e) => updateContractData('prazo', e.target.value)}
            placeholder="90 dias corridos"
            className="mt-2"
          />
        </div>
      </div>

              {/* Sistema de Seleção de Leis */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              Resalte alguma Lei ou Cláusula Específica (opcional)
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                <Wand2 className="h-3 w-3 mr-1" />
                IA Legal
              </Badge>
            </Label>
            <Textarea
              value={contractData.observacoes}
              onChange={(e) => updateContractData('observacoes', e.target.value)}
              placeholder="Ex: 'lei CLT', 'código civil artigo 421', 'LGPD', 'CDC consumidor'... (Digite e clique em 'Buscar' para economizar tokens)"
              className="mt-2"
            />
            
            {/* Botão para buscar leis */}
            <Button 
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearchLawsProtected}
              disabled={!contractData.observacoes || contractData.observacoes.trim().length < 5 || loadingLaws}
              className="w-full mt-2"
            >
              {loadingLaws ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando Leis...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Buscar Leis Relacionadas
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-500 mt-1">
              🏛️ Digite sobre leis que deseja aplicar (ex: "lei CLT") e a IA buscará opções específicas para você escolher.
            </div>
          </div>

          {/* Lista de Leis Sugeridas */}
          {suggestedLaws.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Leis Relacionadas Encontradas</Label>
                <Badge variant="default" className="text-xs">
                  {suggestedLaws.length} leis
                </Badge>
              </div>
              
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {suggestedLaws.map((law) => {
                  const isSelected = selectedLaws.some(l => l.id === law.id)
                  return (
                    <div 
                      key={law.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => onToggleLaw(law)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{law.title}</span>
                            <Badge 
                              variant={law.relevance === 'alta' ? 'default' : law.relevance === 'média' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {law.relevance}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {law.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">{law.description}</p>
                        </div>
                        <div className="ml-2">
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedLaws.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {selectedLaws.length} lei(s) selecionada(s)
                    </span>
                  </div>
                  <div className="text-xs text-green-700">
                    Essas leis serão aplicadas automaticamente no seu contrato junto com o prompt.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  )
}

// Componente ReviewForm (externo para evitar re-criação)
interface ReviewFormProps {
  data: WizardData
  selectedLaws: Law[]
}

const ReviewForm = ({ data, selectedLaws }: ReviewFormProps) => {
      return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Revisão dos Dados</h2>
          <p className="text-gray-600 text-lg">Verifique todas as informações antes de gerar o contrato</p>
        </div>

      {/* Contratante */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Contratante ({data.contratante.tipo === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Nome:</strong> {data.contratante.nome}</div>
            <div><strong>{data.contratante.tipo === 'pf' ? 'CPF' : 'CNPJ'}:</strong> {data.contratante.documento}</div>
            <div><strong>Endereço:</strong> {data.contratante.endereco}</div>
            <div><strong>Cidade:</strong> {data.contratante.cidade}/{data.contratante.estado}</div>
            {data.contratante.email && <div><strong>Email:</strong> {data.contratante.email}</div>}
            {data.contratante.telefone && <div><strong>Telefone:</strong> {data.contratante.telefone}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Contratado(a) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contratado(a) ({data.contratada.tipo === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Nome:</strong> {data.contratada.nome}</div>
            <div><strong>{data.contratada.tipo === 'pf' ? 'CPF' : 'CNPJ'}:</strong> {data.contratada.documento}</div>
            <div><strong>Endereço:</strong> {data.contratada.endereco}</div>
            <div><strong>Cidade:</strong> {data.contratada.cidade}/{data.contratada.estado}</div>
            {data.contratada.email && <div><strong>Email:</strong> {data.contratada.email}</div>}
            {data.contratada.telefone && <div><strong>Telefone:</strong> {data.contratada.telefone}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div><strong>Título:</strong> {data.contrato.titulo}</div>
            <div><strong>Valor:</strong> {data.contrato.valor}</div>
            <div><strong>Prazo:</strong> {data.contrato.prazo}</div>
            <div><strong>PROMPT:</strong> {data.contrato.prompt.length > 200 ? data.contrato.prompt.substring(0, 200) + '...' : data.contrato.prompt}</div>
            {data.contrato.observacoes && (
              <div><strong>Observações:</strong> {data.contrato.observacoes.length > 100 ? data.contrato.observacoes.substring(0, 100) + '...' : data.contrato.observacoes}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leis Selecionadas */}
      {selectedLaws.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Leis Específicas Selecionadas ({selectedLaws.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedLaws.map((law) => (
                <div key={law.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{law.title}</span>
                        <Badge 
                          variant={law.relevance === 'alta' ? 'default' : law.relevance === 'média' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {law.relevance}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {law.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{law.description}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-blue-500 ml-2" />
                  </div>
                </div>
              ))}
              <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                ✅ Essas leis serão aplicadas automaticamente no contrato junto com o seu prompt.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente principal
export default function ContractWizard({ 
  onComplete, 
  generating, 
  suggestedLaws, 
  selectedLaws, 
  loadingLaws, 
  onSearchLaws, 
  onToggleLaw 
}: ContractWizardProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<WizardData>({
    contratante: { ...INITIAL_PERSON_DATA },
    contratada: { ...INITIAL_PERSON_DATA },
    contrato: { ...INITIAL_CONTRACT_DATA }
  })

  const steps = [
    { id: 1, title: "Contratante", icon: Building2 },
    { id: 2, title: "Contratado(a)", icon: User },
    { id: 3, title: "Contrato", icon: FileText },
    { id: 4, title: "Revisão", icon: Eye }
  ]

  const progress = (currentStep / steps.length) * 100

  // Funções de atualização otimizadas com useCallback
  const updateContratanteData = useCallback((field: keyof PersonData, value: string) => {
    setData(prev => ({
      ...prev,
      contratante: {
        ...prev.contratante,
        [field]: field === 'documento' ? formatDocument(value, prev.contratante.tipo) : value
      }
    }))
  }, [])

  const updateContratadaData = useCallback((field: keyof PersonData, value: string) => {
    setData(prev => ({
      ...prev,
      contratada: {
        ...prev.contratada,
        [field]: field === 'documento' ? formatDocument(value, prev.contratada.tipo) : value
      }
    }))
  }, [])

  const updateContractData = useCallback((field: keyof ContractData, value: string) => {
    setData(prev => ({
      ...prev,
      contrato: {
        ...prev.contrato,
        [field]: value
      }
    }))
  }, [])

  // Validação da etapa atual
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        const contratante = data.contratante
        return !!(contratante.nome && contratante.documento && contratante.endereco && contratante.cidade && contratante.estado)
      case 2:
        const contratada = data.contratada
        return !!(contratada.nome && contratada.documento && contratada.endereco && contratada.cidade && contratada.estado)
      case 3:
        const contrato = data.contrato
        return !!(contrato.titulo && contrato.prompt && contrato.valor && contrato.prazo)
      case 4:
        return true
      default:
        return false
    }
  }

  // Renderizar etapa atual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonForm 
            personData={data.contratante} 
            title="Dados do Contratante" 
            updatePersonData={updateContratanteData}
          />
        )
      case 2:
        return (
          <PersonForm 
            personData={data.contratada} 
            title="Dados do(a) Contratado(a)" 
            updatePersonData={updateContratadaData}
          />
        )
              case 3:
          return (
            <ContractForm 
              contractData={data.contrato} 
              updateContractData={updateContractData}
              suggestedLaws={suggestedLaws}
              selectedLaws={selectedLaws}
              loadingLaws={loadingLaws}
              onSearchLaws={onSearchLaws}
              onToggleLaw={onToggleLaw}
            />
          )
              case 4:
          return <ReviewForm data={data} selectedLaws={selectedLaws} />
      default:
        return null
    }
  }

  const handleComplete = () => {
    console.log("🚀 [Wizard] Enviando dados:", JSON.stringify(data, null, 2))
    onComplete(data)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isComplete = currentStep > step.id
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-2
                  ${isComplete ? 'bg-green-500 text-white' : 
                    isActive ? 'bg-blue-500 text-white' : 
                    'bg-gray-200 text-gray-500'}
                `}>
                  {isComplete ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-8">
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!validateCurrentStep()}
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={generating || !validateCurrentStep()}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando Contrato...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Gerar Contrato com IA
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
