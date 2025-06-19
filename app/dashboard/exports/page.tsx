"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Search, Trash2, Eye, Calendar, Clock, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

interface Contract {
  id: string
  nome: string
  descricao: string
  tipo: "simples" | "avancado"
  status: string
  created_at: string
  updated_at: string
}

export default function ExportsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [contractContent, setContractContent] = useState<string>("")

  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchContracts()
    }
  }, [user])

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase.from("contracts").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setContracts(data || [])
    } catch (error) {
      console.error("Error fetching contracts:", error)
      toast({
        title: "Erro ao carregar contratos",
        description: "Não foi possível carregar seus contratos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteContract = async (id: string) => {
    setDeleting(id)
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id)

      if (error) throw error

      setContracts(contracts.filter((contract) => contract.id !== id))
      toast({
        title: "Contrato excluído",
        description: "O contrato foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Error deleting contract:", error)
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o contrato.",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const viewContract = async (contract: Contract) => {
    setViewingContract(contract)
    try {
      // Normalmente você buscaria o conteúdo do contrato aqui
      // Para este exemplo, vamos simular um conteúdo
      const { data, error } = await supabase.from("contracts").select("conteudo").eq("id", contract.id).single()

      if (error) throw error

      setContractContent(data.conteudo || "Conteúdo não disponível")
    } catch (error) {
      console.error("Error fetching contract content:", error)
      setContractContent("Erro ao carregar o conteúdo do contrato.")
    }
  }

  const downloadContract = (contract: Contract) => {
    // Criar um blob com o conteúdo do contrato
    const blob = new Blob([contractContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    // Criar um link temporário e clicar nele para iniciar o download
    const a = document.createElement("a")
    a.href = url
    a.download = `${contract.nome}.txt`
    document.body.appendChild(a)
    a.click()

    // Limpar
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType ? contract.tipo === selectedType : true
    return matchesSearch && matchesType
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratos Exportados</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie todos os seus contratos gerados e exportados</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Buscar contratos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              Todos
            </Button>
            <Button
              variant={selectedType === "simples" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("simples")}
            >
              Simples
            </Button>
            <Button
              variant={selectedType === "avancado" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("avancado")}
            >
              Avançados
            </Button>
          </div>
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filteredContracts.length > 0 ? (
          <div className="space-y-4">
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        <h3 className="font-medium text-gray-900 dark:text-white">{contract.nome}</h3>
                        <Badge variant={contract.tipo === "simples" ? "default" : "secondary"} className="ml-2">
                          {contract.tipo === "simples" ? "Simples" : "Avançado"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{contract.descricao}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(contract.created_at)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(contract.updated_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewContract(contract)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Visualizar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteContract(contract.id)}
                        disabled={deleting === contract.id}
                        className="flex items-center gap-1"
                      >
                        {deleting === contract.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Nenhum contrato encontrado</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchTerm || selectedType
                ? "Tente ajustar seus filtros ou termos de busca"
                : "Você ainda não gerou nenhum contrato"}
            </p>
            {!searchTerm && !selectedType && (
              <Button
                className="mt-4 bg-primary-600 hover:bg-primary-700"
                onClick={() => (window.location.href = "/dashboard/generator")}
              >
                Gerar Novo Contrato
              </Button>
            )}
          </div>
        )}

        {/* Contract Viewer Modal */}
        {viewingContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{viewingContract.nome}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadContract(viewingContract)}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setViewingContract(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {contractContent}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
