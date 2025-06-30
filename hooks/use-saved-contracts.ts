"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export interface SavedContract {
  id: string
  titulo: string
  nomePersonalizado?: string
  tipo: string
  tipoPersonalizado?: string
  tamanho: string
  html: string
  contratante: {
    nome: string
    documento: string
    endereco: string
    tipo: "pf" | "pj"
  }
  contratada: {
    nome: string
    documento: string
    endereco: string
    tipo: "pf" | "pj"
  }
  valor: string
  prazo?: string
  dataGeracao: string
  dataModificacao: string
  leisSelecionadas?: string[]
  userId?: string
}

export function useSavedContracts() {
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [useSupabase, setUseSupabase] = useState(false)

  // Verificar se Supabase está disponível e tabela existe
  const checkSupabaseAvailability = async () => {
    try {
      if (!supabase) {
        console.log("Supabase não configurado, usando localStorage")
        return false
      }

      // Tentar fazer uma query simples para verificar se a tabela existe
      const { error } = await supabase.from("saved_contracts").select("id").limit(1)

      if (error) {
        console.log("Tabela saved_contracts não existe, usando localStorage:", error.message)
        return false
      }

      console.log("Supabase disponível e tabela existe")
      return true
    } catch (error) {
      console.log("Erro ao verificar Supabase, usando localStorage:", error)
      return false
    }
  }

  // Carregar contratos do localStorage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem("savedContracts")
      if (saved) {
        const contracts = JSON.parse(saved)
        setSavedContracts(contracts)
        console.log(`Carregados ${contracts.length} contratos do localStorage`)
      }
    } catch (error) {
      console.error("Erro ao carregar do localStorage:", error)
      setSavedContracts([])
    }
  }

  // Carregar contratos do Supabase
  const loadFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_contracts")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Erro ao carregar do Supabase:", error)
        loadFromLocalStorage()
      } else {
        // Mapear campos do Supabase para interface local
        const mappedContracts = (data || []).map((contract: any) => ({
          ...contract,
          dataGeracao: contract.created_at || contract.dataGeracao || new Date().toISOString(),
          dataModificacao: contract.updated_at || contract.dataModificacao || new Date().toISOString(),
        }))

        setSavedContracts(mappedContracts)
        // Sincronizar com localStorage como backup
        localStorage.setItem("savedContracts", JSON.stringify(mappedContracts))
        console.log(`Carregados ${mappedContracts.length} contratos do Supabase`)
      }
    } catch (error) {
      console.error("Erro ao carregar do Supabase:", error)
      loadFromLocalStorage()
    }
  }

  // Carregar contratos
  const loadContracts = async () => {
    try {
      setLoading(true)
      const supabaseAvailable = await checkSupabaseAvailability()
      setUseSupabase(supabaseAvailable)

      if (supabaseAvailable) {
        await loadFromSupabase()
      } else {
        loadFromLocalStorage()
      }
    } catch (error) {
      console.error("Erro ao carregar contratos:", error)
      loadFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContracts()
  }, [])

  // Salvar no localStorage
  const saveToLocalStorage = (contracts: SavedContract[]) => {
    try {
      localStorage.setItem("savedContracts", JSON.stringify(contracts))
      setSavedContracts(contracts)
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error)
    }
  }

  // Função para salvar um novo contrato
  const saveContract = async (contract: Omit<SavedContract, "id" | "dataGeracao" | "dataModificacao">) => {
    const newContract: SavedContract = {
      ...contract,
      id: Date.now().toString(),
      dataGeracao: new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
      nomePersonalizado: contract.nomePersonalizado || `Gerado ${savedContracts.length + 1}`,
    }

    if (useSupabase && supabase) {
      try {
        // Criar objeto para Supabase excluindo campos incompatíveis
        const { dataGeracao, dataModificacao, ...contractWithoutDates } = newContract
        const supabaseContract = {
          ...contractWithoutDates,
          created_at: dataGeracao,
          updated_at: dataModificacao,
        }

        const { error } = await supabase.from("saved_contracts").insert([supabaseContract])

        if (error) {
          console.error("Erro ao salvar no Supabase:", error)
          // Fallback para localStorage
          const updatedContracts = [newContract, ...savedContracts]
          saveToLocalStorage(updatedContracts)
        } else {
          await loadContracts()
          console.log("Contrato salvo no Supabase")
        }
      } catch (error) {
        console.error("Erro ao salvar no Supabase:", error)
        const updatedContracts = [newContract, ...savedContracts]
        saveToLocalStorage(updatedContracts)
      }
    } else {
      // Usar localStorage
      const updatedContracts = [newContract, ...savedContracts]
      saveToLocalStorage(updatedContracts)
      console.log("Contrato salvo no localStorage")
    }

    return newContract.id
  }

  // Função para renomear um contrato
  const renameContract = async (id: string, newName: string) => {
    if (useSupabase && supabase) {
      try {
        const { error } = await supabase
          .from("saved_contracts")
          .update({
            nomePersonalizado: newName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)

        if (error) {
          console.error("Erro ao renomear no Supabase:", error)
          // Fallback para localStorage
          const updatedContracts = savedContracts.map((contract) =>
            contract.id === id
              ? {
                  ...contract,
                  nomePersonalizado: newName,
                  dataModificacao: new Date().toISOString(),
                }
              : contract,
          )
          saveToLocalStorage(updatedContracts)
        } else {
          await loadContracts()
          console.log("Contrato renomeado no Supabase")
        }
      } catch (error) {
        console.error("Erro ao renomear no Supabase:", error)
        const updatedContracts = savedContracts.map((contract) =>
          contract.id === id
            ? {
                ...contract,
                nomePersonalizado: newName,
                dataModificacao: new Date().toISOString(),
              }
            : contract,
        )
        saveToLocalStorage(updatedContracts)
      }
    } else {
      // Usar localStorage
      const updatedContracts = savedContracts.map((contract) =>
        contract.id === id
          ? {
              ...contract,
              nomePersonalizado: newName,
              dataModificacao: new Date().toISOString(),
            }
          : contract,
      )
      saveToLocalStorage(updatedContracts)
      console.log("Contrato renomeado no localStorage")
    }
  }

  // Função para duplicar um contrato
  const duplicateContract = async (id: string) => {
    const contractToDuplicate = savedContracts.find((c) => c.id === id)
    if (!contractToDuplicate) return

    const duplicatedContract: SavedContract = {
      ...contractToDuplicate,
      id: Date.now().toString(),
      titulo: `${contractToDuplicate.titulo} (Cópia)`,
      nomePersonalizado: contractToDuplicate.nomePersonalizado
        ? `${contractToDuplicate.nomePersonalizado} (Cópia)`
        : `${contractToDuplicate.titulo} (Cópia)`,
      dataGeracao: new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
    }

    if (useSupabase && supabase) {
      try {
        // Criar objeto para Supabase excluindo campos incompatíveis
        const { dataGeracao, dataModificacao, ...contractWithoutDates } = duplicatedContract
        const supabaseContract = {
          ...contractWithoutDates,
          created_at: dataGeracao,
          updated_at: dataModificacao,
        }

        const { error } = await supabase.from("saved_contracts").insert([supabaseContract])

        if (error) {
          console.error("Erro ao duplicar no Supabase:", error)
          const updatedContracts = [duplicatedContract, ...savedContracts]
          saveToLocalStorage(updatedContracts)
        } else {
          await loadContracts()
          console.log("Contrato duplicado no Supabase")
        }
      } catch (error) {
        console.error("Erro ao duplicar no Supabase:", error)
        const updatedContracts = [duplicatedContract, ...savedContracts]
        saveToLocalStorage(updatedContracts)
      }
    } else {
      // Usar localStorage
      const updatedContracts = [duplicatedContract, ...savedContracts]
      saveToLocalStorage(updatedContracts)
      console.log("Contrato duplicado no localStorage")
    }

    return duplicatedContract.id
  }

  // Função para deletar um contrato
  const deleteContract = async (id: string) => {
    if (useSupabase && supabase) {
      try {
        const { error } = await supabase.from("saved_contracts").delete().eq("id", id)

        if (error) {
          console.error("Erro ao deletar no Supabase:", error)
          const updatedContracts = savedContracts.filter((contract) => contract.id !== id)
          saveToLocalStorage(updatedContracts)
        } else {
          await loadContracts()
          console.log("Contrato deletado no Supabase")
        }
      } catch (error) {
        console.error("Erro ao deletar no Supabase:", error)
        const updatedContracts = savedContracts.filter((contract) => contract.id !== id)
        saveToLocalStorage(updatedContracts)
      }
    } else {
      // Usar localStorage
      const updatedContracts = savedContracts.filter((contract) => contract.id !== id)
      saveToLocalStorage(updatedContracts)
      console.log("Contrato deletado do localStorage")
    }
  }

  // Função para buscar contratos
  const searchContracts = (query: string): SavedContract[] => {
    if (!query.trim()) return savedContracts

    const searchTerm = query.toLowerCase()
    return savedContracts.filter(
      (contract) =>
        contract.titulo.toLowerCase().includes(searchTerm) ||
        (contract.nomePersonalizado && contract.nomePersonalizado.toLowerCase().includes(searchTerm)) ||
        contract.tipo.toLowerCase().includes(searchTerm) ||
        contract.contratante.nome.toLowerCase().includes(searchTerm) ||
        contract.contratada.nome.toLowerCase().includes(searchTerm) ||
        contract.valor.toLowerCase().includes(searchTerm),
    )
  }

  // Função para obter um contrato por ID
  const getContractById = (id: string): SavedContract | undefined => {
    return savedContracts.find((contract) => contract.id === id)
  }

  return {
    savedContracts,
    loading,
    saveContract,
    renameContract,
    duplicateContract,
    deleteContract,
    searchContracts,
    getContractById,
    loadContracts,
    useSupabase,
  }
}
