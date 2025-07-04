"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Users, 
  Building, 
  Briefcase, 
  Home, 
  Car, 
  Search, 
  Eye, 
  Palette,
  Wand2,
  Crown,
  Rocket,
  Laptop,
  Scale,
  Paintbrush,
  Building2,
  Scroll
} from "lucide-react"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useToast } from "@/hooks/use-toast"

// Templates visuais disponíveis (mesmos do gerador)
const VISUAL_TEMPLATES = [
  { 
    id: 'professional', 
    name: 'Profissional', 
    description: 'Clássico e formal para negócios corporativos',
    category: 'Corporativo',
    icon: FileText,
    preview: '📄',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    features: ['Times New Roman', 'Formatação clássica', 'Bordas elegantes']
  },
  { 
    id: 'modern', 
    name: 'Moderno', 
    description: 'Design contemporâneo com gradientes e cores vibrantes',
    category: 'Moderno',
    icon: Palette,
    preview: '🎯',
    color: 'from-purple-500 to-pink-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    features: ['Segoe UI', 'Gradientes', 'Layout fluido']
  },
  { 
    id: 'minimalist', 
    name: 'Minimalista', 
    description: 'Simples, elegante e focado no conteúdo',
    category: 'Minimalista',
    icon: Building2,
    preview: '⚪',
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    features: ['Helvetica', 'Linhas limpas', 'Espaços generosos']
  },
  { 
    id: 'corporate', 
    name: 'Corporativo', 
    description: 'Formal e tradicional para grandes empresas',
    category: 'Corporativo',
    icon: Building,
    preview: '🏢',
    color: 'from-slate-700 to-slate-900',
    textColor: 'text-slate-700',
    bgColor: 'bg-slate-50',
    features: ['Georgia', 'Bordas sólidas', 'Layout estruturado']
  },
  { 
    id: 'legal', 
    name: 'Jurídico', 
    description: 'Especializado em documentos legais e oficiais',
    category: 'Jurídico',
    icon: Scale,
    preview: '⚖️',
    color: 'from-amber-600 to-orange-600',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    features: ['Times New Roman', 'Formatação legal', 'Numeração precisa']
  },
  { 
    id: 'creative', 
    name: 'Criativo', 
    description: 'Vibrante e inovador para setores criativos',
    category: 'Criativo',
    icon: Paintbrush,
    preview: '🎨',
    color: 'from-pink-500 to-violet-600',
    textColor: 'text-pink-700',
    bgColor: 'bg-pink-50',
    features: ['Verdana', 'Cores vibrantes', 'Design único']
  },
  { 
    id: 'tech', 
    name: 'Tecnológico', 
    description: 'Moderno e técnico para empresas de tecnologia',
    category: 'Tecnologia',
    icon: Laptop,
    preview: '💻',
    color: 'from-cyan-500 to-blue-600',
    textColor: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    features: ['Monaco', 'Estilo tech', 'Cores modernas']
  },
  { 
    id: 'premium', 
    name: 'Premium', 
    description: 'Luxuoso e sofisticado para clientes VIP',
    category: 'Premium',
    icon: Crown,
    preview: '👑',
    color: 'from-yellow-500 to-orange-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    features: ['Garamond', 'Elementos dourados', 'Design luxuoso']
  },
  { 
    id: 'startup', 
    name: 'Startup', 
    description: 'Ágil e inovador para empresas emergentes',
    category: 'Inovação',
    icon: Rocket,
    preview: '🚀',
    color: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    features: ['Roboto', 'Design ágil', 'Cores energéticas']
  },
  { 
    id: 'classic', 
    name: 'Clássico', 
    description: 'Tradicional e confiável para contratos formais',
    category: 'Clássico',
    icon: Scroll,
    preview: '📜',
    color: 'from-stone-500 to-stone-700',
    textColor: 'text-stone-700',
    bgColor: 'bg-stone-50',
    features: ['Book Antiqua', 'Estilo vintage', 'Elementos clássicos']
  }
]

// Templates de tipos de contrato
const CONTRACT_TYPES = [
  {
    icon: FileText,
    title: "Contrato de Prestação de Serviços",
    description: "Template completo para serviços profissionais",
    category: "Serviços",
    type: "servicos",
    plan: "Básico",
  },
  {
    icon: Users,
    title: "Contrato de Trabalho",
    description: "Documentos trabalhistas em conformidade com CLT",
    category: "Trabalho",
    type: "trabalho",
    plan: "Profissional",
  },
  {
    icon: Building,
    title: "Contrato de Locação Comercial",
    description: "Locação de imóveis comerciais e industriais",
    category: "Imobiliário",
    type: "locacao",
    plan: "Empresarial",
  },
  {
    icon: Briefcase,
    title: "Contrato de Sociedade",
    description: "Constituição e alteração de sociedades",
    category: "Empresarial",
    type: "sociedade",
    plan: "Super Ilimitado",
  },
  {
    icon: Home,
    title: "Contrato de Locação Residencial",
    description: "Locação residencial com garantias",
    category: "Imobiliário",
    type: "locacao",
    plan: "Básico",
  },
  {
    icon: Car,
    title: "Contrato de Compra e Venda",
    description: "Veículos, imóveis e bens em geral",
    category: "Comercial",
    type: "compra_venda",
    plan: "Profissional",
  },
  {
    icon: FileText,
    title: "Contrato de Confidencialidade (NDA)",
    description: "Proteção de informações confidenciais",
    category: "Empresarial",
    type: "prestacao_servicos",
    plan: "Básico",
  },
  {
    icon: Users,
    title: "Contrato de Parceria Comercial",
    description: "Estabelecimento de parcerias entre empresas",
    category: "Comercial",
    type: "parceria",
    plan: "Profissional",
  },
  {
    icon: Building,
    title: "Contrato de Construção",
    description: "Obras e reformas residenciais e comerciais",
    category: "Construção",
    type: "outros",
    plan: "Empresarial",
  },
]

// Função para gerar preview HTML do template
const generateTemplatePreview = (templateId: string): string => {
  const baseContent = `
    <div class="contract-container">
      <div class="contract-header">
        <h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
        <div class="contract-subtitle">Template ${templateId}</div>
      </div>
      
      <div class="parties-intro">
        <div class="party-info">
          <strong>CONTRATANTE:</strong> Empresa ABC Ltda, CNPJ nº 12.345.678/0001-90
        </div>
        <div class="party-info">
          <strong>CONTRATADO:</strong> João Silva, CPF nº 123.456.789-00
        </div>
      </div>
      
      <div class="clause-title">CLÁUSULA 1ª - OBJETO</div>
      <div class="clause-content">
        <p>Fica estabelecido que o presente contrato tem como objeto...</p>
      </div>
      
      <div class="clause-title">CLÁUSULA 2ª - VALOR</div>
      <div class="clause-content">
        <p>O valor total dos serviços será de R$ 5.000,00...</p>
      </div>
    </div>
  `

  // Estilos específicos para cada template (baseados no gerador)
  const templateStyles = {
    professional: `
      body { font-family: 'Times New Roman', serif; color: #333; }
      .contract-header { 
        text-align: center; margin-bottom: 40px; padding: 20px;
        border-bottom: 3px solid #1e40af; color: #1e40af; 
      }
      .clause-title { 
        background: #f8fafc; border-left: 4px solid #1e40af; 
        padding: 12px; color: #1e40af; font-weight: bold;
      }
      .parties-intro { background: #f8fafc; padding: 20px; border-radius: 8px; }
    `,
    modern: `
      body { font-family: 'Segoe UI', sans-serif; }
      .contract-header { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; padding: 40px; border-radius: 20px; text-align: center;
      }
      .clause-title { 
        background: linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%);
        border-left: 6px solid #667eea; padding: 15px; border-radius: 0 15px 15px 0;
      }
    `,
    minimalist: `
      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; }
      .contract-header { 
        text-align: left; border-bottom: 1px solid #e2e8f0; 
        padding-bottom: 20px; margin-bottom: 40px;
      }
      .clause-title { 
        border-left: 1px solid #cbd5e0; padding: 10px 0 10px 20px;
        font-weight: 400; font-size: 14px;
      }
    `,
    corporate: `
      body { font-family: 'Georgia', serif; }
      .contract-header { 
        background: #1a202c; color: white; padding: 40px; text-align: center;
        border: 2px solid #1a202c;
      }
      .clause-title { 
        background: #f7fafc; border: 2px solid #1a202c;
        border-left: 8px solid #1a202c; padding: 20px; font-weight: 700;
        text-transform: uppercase;
      }
    `,
    legal: `
      body { font-family: 'Times New Roman', serif; background: #fffbeb; }
      .contract-header { 
        border: 2px solid #92400e; color: #92400e; background: #fef3c7;
        padding: 30px; text-align: center;
      }
      .clause-title { 
        background: #fed7aa; border: 1px solid #ea580c; color: #9a3412;
        padding: 15px; font-weight: bold;
      }
    `,
    creative: `
      body { font-family: 'Verdana', sans-serif; }
      .contract-header { 
        background: linear-gradient(45deg, #ec4899, #8b5cf6); color: white;
        padding: 40px; border-radius: 20px; text-align: center;
      }
      .clause-title { 
        background: linear-gradient(90deg, #ec4899, #8b5cf6); color: white;
        padding: 15px; border-radius: 10px; text-align: center;
      }
    `,
    tech: `
      body { font-family: 'Monaco', monospace; background: #0f172a; color: #e2e8f0; }
      .contract-header { 
        background: #082f49; border-bottom: 2px solid #22d3ee; color: #22d3ee;
        padding: 30px; text-align: center;
      }
      .clause-title { 
        background: #1e293b; border-left: 4px solid #06b6d4; color: #06b6d4;
        padding: 15px;
      }
    `,
    premium: `
      body { font-family: 'Garamond', serif; background: linear-gradient(to bottom, #fef7cd, #fff); }
      .contract-header { 
        color: #92400e; padding: 40px; text-align: center;
        border-bottom: 3px solid #d97706; background: #fffbeb;
      }
      .clause-title { 
        background: linear-gradient(90deg, #f59e0b, #d97706); color: white;
        padding: 15px; box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
      }
    `,
    startup: `
      body { font-family: 'Roboto', sans-serif; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
      .contract-header { 
        background: rgba(0,0,0,0.2); color: #fff; padding: 30px; text-align: center;
        border-radius: 15px;
      }
      .clause-title { 
        background: rgba(0,0,0,0.3); border-left: 4px solid #10b981; color: #10b981;
        padding: 15px;
      }
    `,
    classic: `
      body { font-family: 'Book Antiqua', serif; background: #fefce8; }
      .contract-header { 
        border: 3px double #a16207; color: #a16207; background: #fffbeb;
        padding: 30px; text-align: center;
      }
      .clause-title { 
        background: #fef3c7; border: 1px solid #d97706; color: #92400e;
        padding: 15px; text-align: center;
      }
    `
  }

  const styles = templateStyles[templateId as keyof typeof templateStyles] || templateStyles.professional

  return `
    <style>
      ${styles}
      .contract-container { max-width: 100%; padding: 20px; }
      .contract-title { font-size: 18px; margin-bottom: 10px; }
      .contract-subtitle { font-size: 10px; opacity: 0.8; }
      .party-info { margin: 10px 0; font-size: 12px; }
      .clause-title { font-size: 14px; margin: 15px 0 10px 0; }
      .clause-content { font-size: 12px; margin-bottom: 15px; }
      .clause-content p { margin: 5px 0; }
    </style>
    ${baseContent}
  `
}

export default function TemplatesPage() {
  const { subscription } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"visual" | "types">("visual")
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null)

  const categories = Array.from(new Set(CONTRACT_TYPES.map((template) => template.category)))
  const visualCategories = Array.from(new Set(VISUAL_TEMPLATES.map((template) => template.category)))

  const planColors = {
    Básico: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Profissional: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Empresarial: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Super Ilimitado": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  }

  const filteredContractTypes = CONTRACT_TYPES.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  const filteredVisualTemplates = VISUAL_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  const isTemplateAvailable = (plan: string) => {
    if (!subscription) return false

    const planHierarchy = {
      teste_gratis: 0,
      Básico: 1,
      Profissional: 2,
      Empresarial: 3,
      "Super Ilimitado": 4,
    }

    const userPlanLevel = planHierarchy[subscription.plano as keyof typeof planHierarchy] || 0
    const templatePlanLevel = planHierarchy[plan as keyof typeof planHierarchy] || 0

    return userPlanLevel >= templatePlanLevel
  }

  const handleUseTemplate = (templateId: string, type?: string) => {
    toast({
      title: "🎨 Template Selecionado!",
      description: `Redirecionando para o gerador com template ${templateId}...`,
    })
    
    // Construir URL com parâmetros
    const params = new URLSearchParams()
    params.set('template', templateId)
    if (type) {
      params.set('type', type)
    }
    
    // Redirecionar para o gerador
    window.location.href = `/dashboard/generator?${params.toString()}`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Templates de Contratos
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto">
            Explore nossa biblioteca completa de <strong>templates visuais</strong> e <strong>tipos de contratos</strong> para personalizar seus documentos.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => {
                setActiveTab("visual")
                setSelectedCategory(null)
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "visual"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Palette className="h-4 w-4 mr-2 inline" />
              Templates Visuais
            </button>
            <button
              onClick={() => {
                setActiveTab("types")
                setSelectedCategory(null)
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "types"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="h-4 w-4 mr-2 inline" />
              Tipos de Contrato
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder={`Buscar ${activeTab === "visual" ? "templates visuais" : "tipos de contrato"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {(activeTab === "visual" ? visualCategories : categories).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {activeTab === "visual" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVisualTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-all group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-lg flex items-center justify-center text-2xl`}>
                      {template.preview}
                    </div>
                    <Badge className={`${template.bgColor} ${template.textColor} text-xs font-medium border-0`}>
                      {template.category}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 group-hover:text-purple-600 transition-colors">
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {template.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setPreviewTemplate(template.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <span className="text-2xl">{template.preview}</span>
                              Preview: {template.name}
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: generateTemplatePreview(template.id) 
                              }} 
                            />
                          </ScrollArea>
                          <div className="flex gap-2 justify-end">
                            <Button 
                              onClick={() => handleUseTemplate(template.id)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Wand2 className="h-4 w-4 mr-2" />
                              Usar Template
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleUseTemplate(template.id)}
                      >
                        <Wand2 className="h-4 w-4 mr-1" />
                        Usar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContractTypes.map((template, index) => {
              const isAvailable = isTemplateAvailable(template.plan)

              return (
                <Card key={index} className={`hover:shadow-lg transition-shadow ${!isAvailable ? "opacity-70" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                        <template.icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge className={`${planColors[template.plan as keyof typeof planColors]} text-xs font-medium`}>
                        {template.plan}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4">{template.title}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{template.category}</Badge>
                      <Button
                        size="sm"
                        disabled={!isAvailable}
                        className={isAvailable ? "bg-primary-600 hover:bg-primary-700" : ""}
                        onClick={() => isAvailable && handleUseTemplate('professional', template.type)}
                      >
                        {isAvailable ? "Usar Template" : "Indisponível"}
                      </Button>
                    </div>
                    {!isAvailable && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Disponível apenas para planos {template.plan} ou superior
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {(activeTab === "visual" ? filteredVisualTemplates : filteredContractTypes).length === 0 && (
          <div className="text-center py-12">
            {activeTab === "visual" ? <Palette className="mx-auto h-12 w-12 text-gray-400" /> : <FileText className="mx-auto h-12 w-12 text-gray-400" />}
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
              Nenhum template encontrado
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Tente ajustar seus filtros ou termos de busca
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
