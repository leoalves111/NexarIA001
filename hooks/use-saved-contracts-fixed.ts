"use client"

import { useState, useEffect, useRef } from "react"
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

  // CORREÇÃO: Prevenir race conditions
  const loadingRef = useRef(false)
  const initializingRef = useRef(false)

  // Verificar se Supabase está disponível e tabela existe
  const checkSupabaseAvailability = async () => {
    try {
      if (!supabase) {
        console.log("🚫 [Supabase] Não configurado, usando localStorage")
        return false
      }

      // CORREÇÃO: Timeout para query de verificação
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))

      const queryPromise = supabase.from("saved_contracts").select("id").limit(1)

      const { error } = (await Promise.race([queryPromise, timeoutPromise])) as any

      if (error) {
        console.log("⚠️ [Supabase] Tabela saved_contracts não existe:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        return false
      }

      console.log("✅ [Supabase] Disponível e tabela existe")
      return true
    } catch (error: any) {
      console.log("❌ [Supabase] Erro ao verificar:", {
        message: error?.message || "Erro desconhecido",
        error: error,
      })
      return false
    }
  }

  // Carregar contratos do localStorage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem("savedContracts")
      if (saved) {
        const contracts = JSON.parse(saved)
        // CORREÇÃO: Validar estrutura dos dados
        const validContracts = contracts.filter(
          (contract: any) => contract && contract.id && contract.titulo && contract.html,
        )
        setSavedContracts(validContracts)
        console.log(`Carregados ${validContracts.length} contratos válidos do localStorage`)
      }
    } catch (error) {
      console.error("Erro ao carregar do localStorage:", error)
      setSavedContracts([])
      // CORREÇÃO: Limpar localStorage corrompido
      localStorage.removeItem("savedContracts")
    }
  }

  // Carregar contratos do Supabase
  const loadFromSupabase = async () => {
    try {
      // CORREÇÃO: Timeout para query
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout na consulta")), 10000),
      )

      const queryPromise = supabase.from("saved_contracts").select("*").order("created_at", { ascending: false })

      const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any

      if (error) {
        console.error("Erro ao carregar do Supabase:", error)
        loadFromLocalStorage()
      } else {
        // Mapear campos do Supabase para interface local
        const mappedContracts = (data || [])
          .filter((contract: any) => contract && contract.id && contract.titulo) // CORREÇÃO: Filtrar dados inválidos
          .map((contract: any) => ({
            ...contract,
            dataGeracao: contract.created_at || contract.dataGeracao || new Date().toISOString(),
            dataModificacao: contract.updated_at || contract.dataModificacao || new Date().toISOString(),
          }))

        setSavedContracts(mappedContracts)
        // Sincronizar com localStorage como backup
        try {
          localStorage.setItem("savedContracts", JSON.stringify(mappedContracts))
        } catch (storageError) {
          console.warn("Erro ao sincronizar com localStorage:", storageError)
        }
        console.log(`Carregados ${mappedContracts.length} contratos do Supabase`)
      }
    } catch (error) {
      console.error("Erro ao carregar do Supabase:", error)
      loadFromLocalStorage()
    }
  }

  // Carregar contratos
  const loadContracts = async () => {
    // CORREÇÃO: Prevenir múltiplas cargas simultâneas
    if (loadingRef.current) return
    loadingRef.current = true

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
      loadingRef.current = false
    }
  }

  useEffect(() => {
    // CORREÇÃO: Prevenir múltiplas inicializações
    if (initializingRef.current) return
    initializingRef.current = true

    loadContracts().finally(() => {
      initializingRef.current = false
    })
  }, [])

  // Salvar no localStorage
  const saveToLocalStorage = (contracts: SavedContract[]) => {
    try {
      // CORREÇÃO: Verificar tamanho antes de salvar
      const dataString = JSON.stringify(contracts)
      if (dataString.length > 5 * 1024 * 1024) {
        // 5MB limit
        console.warn("Dados muito grandes para localStorage, mantendo apenas os 100 mais recentes")
        const limitedContracts = contracts.slice(0, 100)
        localStorage.setItem("savedContracts", JSON.stringify(limitedContracts))
        setSavedContracts(limitedContracts)
      } else {
        localStorage.setItem("savedContracts", dataString)
        setSavedContracts(contracts)
      }
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error)
      // CORREÇÃO: Tentar salvar versão reduzida
      try {
        const reducedContracts = contracts.slice(0, 50).map((contract) => ({
          ...contract,
          html: contract.html.substring(0, 10000), // Limitar HTML
        }))
        localStorage.setItem("savedContracts", JSON.stringify(reducedContracts))
        setSavedContracts(reducedContracts)
      } catch (secondError) {
        console.error("Erro crítico no localStorage:", secondError)
      }
    }
  }

  // Função para salvar um novo contrato
  const saveContract = async (contract: Omit<SavedContract, "id" | "dataGeracao" | "dataModificacao">) => {
    console.log("🔄 [SaveContract] Iniciando salvamento do contrato:", contract.titulo)

    // CORREÇÃO: Validar dados de entrada
    if (!contract.titulo || !contract.html || !contract.contratante || !contract.contratada) {
      throw new Error("Dados obrigatórios faltando no contrato")
    }

    const newContract: SavedContract = {
      ...contract,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // CORREÇÃO: ID mais único
      dataGeracao: new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
      nomePersonalizado: contract.nomePersonalizado || `Gerado ${savedContracts.length + 1}`,
    }

    // Sempre salvar no localStorage primeiro como backup
    const updatedContracts = [newContract, ...savedContracts]
    saveToLocalStorage(updatedContracts)
    console.log("✅ [SaveContract] Salvo no localStorage como backup")

    // Tentar salvar no Supabase se disponível
    if (useSupabase && supabase) {
      try {
        console.log("🔄 [SaveContract] Tentando salvar no Supabase...")

        // CORREÇÃO: Verificar se a tabela existe antes de tentar inserir
        const { error: tableError } = await supabase.from("saved_contracts").select("id").limit(1)

        if (tableError && tableError.code !== "PGRST116") {
          console.warn("⚠️ [SaveContract] Tabela não existe ou erro de acesso:", tableError.message)
          console.log("📦 [SaveContract] Usando apenas localStorage")
          return newContract.id
        }

        // Criar objeto para Supabase com validação
        const { dataGeracao, dataModificacao, ...contractWithoutDates } = newContract
        const supabaseContract = {
          ...contractWithoutDates,
          created_at: dataGeracao,
          updated_at: dataModificacao,
          // CORREÇÃO: Garantir que campos obrigatórios não sejam undefined
          titulo: contractWithoutDates.titulo || "Contrato sem título",
          tipo: contractWithoutDates.tipo || "outros",
          tamanho: contractWithoutDates.tamanho || "normal",
          html: contractWithoutDates.html || "",
          valor: contractWithoutDates.valor || "Não informado",
          contratante: contractWithoutDates.contratante || { nome: "", documento: "", endereco: "", tipo: "pf" },
          contratada: contractWithoutDates.contratada || { nome: "", documento: "", endereco: "", tipo: "pf" },
        }

        console.log("📤 [SaveContract] Enviando para Supabase:", {
          id: supabaseContract.id,
          titulo: supabaseContract.titulo,
          tipo: supabaseContract.tipo,
        })

        // CORREÇÃO: Timeout para insert
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout no salvamento")), 15000),
        )

        const insertPromise = supabase.from("saved_contracts").insert([supabaseContract]).select()

        const { data, error } = (await Promise.race([insertPromise, timeoutPromise])) as any

        if (error) {
          console.error("❌ [SaveContract] Erro detalhado do Supabase:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          console.log("📦 [SaveContract] Mantendo salvamento no localStorage")
        } else {
          console.log("✅ [SaveContract] Salvo com sucesso no Supabase:", data)
          // Recarregar para sincronizar
          await loadContracts()
        }
      } catch (error: any) {
        console.error("❌ [SaveContract] Erro de execução:", {
          message: error?.message || "Erro desconhecido",
          stack: error?.stack || "Stack não disponível",
          error: error,
        })
        console.log("📦 [SaveContract] Mantendo salvamento no localStorage")
      }
    } else {
      console.log("📦 [SaveContract] Supabase não disponível, usando localStorage")
    }

    return newContract.id
  }

  // Função para renomear um contrato
  const renameContract = async (id: string, newName: string) => {
    // CORREÇÃO: Validar entrada
    if (!id || !newName.trim()) {
      throw new Error("ID e novo nome são obrigatórios")
    }

    const sanitizedName = newName.trim().substring(0, 200) // Limitar tamanho

    if (useSupabase && supabase) {
      try {
        // CORREÇÃO: Timeout para update
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))

        const updatePromise = supabase
          .from("saved_contracts")
          .update({
            nomePersonalizado: sanitizedName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)

        const { error } = (await Promise.race([updatePromise, timeoutPromise])) as any

        if (error) {
          console.error("Erro ao renomear no Supabase:", error)
          // Fallback para localStorage
          const updatedContracts = savedContracts.map((contract) =>
            contract.id === id
              ? {
                  ...contract,
                  nomePersonalizado: sanitizedName,
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
                nomePersonalizado: sanitizedName,
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
              nomePersonalizado: sanitizedName,
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
    if (!contractToDuplicate) {
      throw new Error("Contrato não encontrado para duplicação")
    }

    const duplicatedContract: SavedContract = {
      ...contractToDuplicate,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // CORREÇÃO: ID único
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

        // CORREÇÃO: Timeout para insert
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))

        const insertPromise = supabase.from("saved_contracts").insert([supabaseContract])
        const { error } = (await Promise.race([insertPromise, timeoutPromise])) as any

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
    // CORREÇÃO: Validar entrada
    if (!id) {
      throw new Error("ID é obrigatório para deletar contrato")
    }

    if (useSupabase && supabase) {
      try {
        // CORREÇÃO: Timeout para delete
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))

        const deletePromise = supabase.from("saved_contracts").delete().eq("id", id)
        const { error } = (await Promise.race([deletePromise, timeoutPromise])) as any

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

    const searchTerm = query.toLowerCase().trim()
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
