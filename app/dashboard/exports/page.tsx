"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useSavedContracts, SavedContract } from "@/hooks/use-saved-contracts"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  FileText, 
  Download, 
  Eye, 
  Copy, 
  Trash2, 
  MoreVertical,
  Calendar,
  User,
  Building,
  DollarSign,
  Filter,
  SortAsc,
  SortDesc
} from "lucide-react"

type SortOption = 'recent' | 'oldest' | 'name' | 'type' | 'value'
type SortOrder = 'asc' | 'desc'

export default function ExportsPage() {
  const { savedContracts, loading, deleteContract, duplicateContract, searchContracts } = useSavedContracts()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState<SavedContract | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterType, setFilterType] = useState<string>('all')

  // Contratos filtrados e ordenados
  const filteredContracts = () => {
    let contracts = searchQuery ? searchContracts(searchQuery) : savedContracts
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      contracts = contracts.filter(c => c.tipo === filterType)
    }
    
    // Ordenar
    return contracts.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'recent':
          comparison = new Date(b.dataModificacao).getTime() - new Date(a.dataModificacao).getTime()
          break
        case 'oldest':
          comparison = new Date(a.dataGeracao).getTime() - new Date(b.dataGeracao).getTime()
          break
        case 'name':
          comparison = a.titulo.localeCompare(b.titulo)
          break
        case 'type':
          comparison = a.tipo.localeCompare(b.tipo)
          break
        case 'value':
          const valueA = parseFloat(a.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
          const valueB = parseFloat(b.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
          comparison = valueA - valueB
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // Tipos únicos para filtro
  const uniqueTypes = Array.from(new Set(savedContracts.map(c => c.tipo)))

  // Função para baixar contrato como PDF
  const downloadPDF = (contract: SavedContract) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${contract.titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${contract.html}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Função para duplicar contrato
  const handleDuplicate = (contract: SavedContract) => {
    try {
      duplicateContract(contract.id)
      toast({
        title: "✅ Contrato duplicado!",
        description: `"${contract.titulo}" foi duplicado com sucesso`
      })
    } catch (error) {
      toast({
        title: "❌ Erro ao duplicar",
        description: "Não foi possível duplicar o contrato",
        variant: "destructive"
      })
    }
  }

  // Função para deletar contrato
  const handleDelete = (contract: SavedContract) => {
    try {
      deleteContract(contract.id)
      toast({
        title: "🗑️ Contrato excluído",
        description: `"${contract.titulo}" foi excluído`
      })
    } catch (error) {
      toast({
        title: "❌ Erro ao excluir",
        description: "Não foi possível excluir o contrato",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando contratos...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            📄 Contratos Salvos
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Gerencie, visualize e baixe todos os seus contratos gerados pela IA.
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{savedContracts.length}</p>
              <p className="text-sm text-gray-500">Total de Contratos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {savedContracts.filter(c => {
                  const today = new Date()
                  const contractDate = new Date(c.dataGeracao)
                  const diffTime = Math.abs(today.getTime() - contractDate.getTime())
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                  return diffDays <= 7
                }).length}
              </p>
              <p className="text-sm text-gray-500">Esta Semana</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Building className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{uniqueTypes.length}</p>
              <p className="text-sm text-gray-500">Tipos Diferentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                R$ {savedContracts.reduce((total, contract) => {
                  const value = parseFloat(contract.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
                  return total + value
                }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500">Valor Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, tipo, partes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtro por tipo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {filterType === 'all' ? 'Todos os Tipos' : filterType}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    Todos os Tipos
                  </DropdownMenuItem>
                  {uniqueTypes.map(type => (
                    <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Ordenação */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setSortBy('recent'); setSortOrder('desc') }}>
                    Mais Recentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('oldest'); setSortOrder('asc') }}>
                    Mais Antigos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc') }}>
                    Nome (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('type'); setSortOrder('asc') }}>
                    Tipo (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('value'); setSortOrder('desc') }}>
                    Maior Valor
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contratos */}
        {filteredContracts().length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchQuery || filterType !== 'all' ? 'Nenhum contrato encontrado' : 'Nenhum contrato salvo'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterType !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece gerando seu primeiro contrato no Gerador'
                }
              </p>
              {!searchQuery && filterType === 'all' && (
                <Button onClick={() => window.location.href = '/dashboard/generator'}>
                  Gerar Primeiro Contrato
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContracts().map((contract) => (
              <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 line-clamp-2">
                        {contract.titulo}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {contract.tipoPersonalizado || contract.tipo}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          {contract.tamanho}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { setSelectedContract(contract); setShowPreview(true) }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadPDF(contract)}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(contract)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <Separator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(contract)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{contract.contratante.nome}</span>
                      <span className="text-gray-400">→</span>
                      <span>{contract.contratada.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium text-green-600">{contract.valor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(contract.dataGeracao).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedContract(contract); setShowPreview(true) }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPDF(contract)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Preview */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-6xl max-h-[95vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedContract?.titulo}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedContract && downloadPDF(selectedContract)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] p-6">
              {selectedContract && (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedContract.html }}
                />
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
