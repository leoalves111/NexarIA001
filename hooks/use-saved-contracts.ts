"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { getSupabaseClient } from "@/lib/supabase"
import { useToast } from "./use-toast"

export interface SavedContract {
  id: string
  titulo: string
  tipo: string
  tipoPersonalizado?: string
  html: string
  tamanho: "resumido" | "normal" | "completo"
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
  prazo: string
  leisSelecionadas: string[]
  created_at: string
  updated_at: string
}

export interface SaveContractData {
  titulo: string
  tipo: string
  tipoPersonalizado?: string
  html: string
  tamanho: "resumido" | "normal" | "completo"
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
  prazo: string
  leisSelecionadas: string[]
}

export function useSavedContracts() {
  const [contracts, setContracts] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  // Carregar contratos salvos
  const loadContracts = async () => {
    if (!user) {
      setContracts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Tentar carregar do Supabase primeiro
      const { data: supabaseContracts, error } = await supabase
        .from("saved_contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ [SavedContracts] Erro ao carregar do Supabase:", error)

        // Fallback para localStorage
        const localContracts = localStorage.getItem(`saved_contracts_${user.id}`)
        if (localContracts) {
          const parsedContracts = JSON.parse(localContracts)
          setContracts(parsedContracts)
        } else {
          setContracts([])
        }
      } else {
        // Mapear dados do Supabase para o formato esperado
        const mappedContracts: SavedContract[] = supabaseContracts.map((contract: any) => ({
          id: contract.id,
          titulo: contract.titulo,
          tipo: contract.tipo,
          tipoPersonalizado: contract.tipo_personalizado,
          html: contract.html_content,
          tamanho: contract.tamanho,
          contratante: {
            nome: contract.contratante_nome,
            documento: contract.contratante_documento,
            endereco: contract.contratante_endereco,
            tipo: contract.contratante_tipo,
          },
          contratada: {
            nome: contract.contratada_nome,
            documento: contract.contratada_documento,
            endereco: contract.contratada_endereco,
            tipo: contract.contratada_tipo,
          },
          valor: contract.valor,
          prazo: contract.prazo,
          leisSelecionadas: contract.leis_selecionadas || [],
          created_at: contract.created_at,
          updated_at: contract.updated_at,
        }))

        setContracts(mappedContracts)

        // Sincronizar com localStorage
        localStorage.setItem(`saved_contracts_${user.id}`, JSON.stringify(mappedContracts))
      }
    } catch (error) {
      console.error("❌ [SavedContracts] Erro geral ao carregar contratos:", error)

      // Fallback final para localStorage
      try {
        const localContracts = localStorage.getItem(`saved_contracts_${user.id}`)
        if (localContracts) {
          const parsedContracts = JSON.parse(localContracts)
          setContracts(parsedContracts)
        } else {
          setContracts([])
        }
      } catch (localError) {
        console.error("❌ [SavedContracts] Erro ao carregar do localStorage:", localError)
        setContracts([])
      }
    } finally {
      setLoading(false)
    }
  }

  // Salvar contrato
  const saveContract = async (contractData: SaveContractData): Promise<boolean> => {
    if (!user) {
      console.error("❌ [SavedContracts] Usuário não autenticado")
      return false
    }

    try {
      const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Preparar dados para o Supabase
      const supabaseData = {
        id: contractId,
        user_id: user.id,
        titulo: contractData.titulo,
        tipo: contractData.tipo,
        tipo_personalizado: contractData.tipoPersonalizado,
        html_content: contractData.html,
        tamanho: contractData.tamanho,
        contratante_nome: contractData.contratante.nome,
        contratante_documento: contractData.contratante.documento,
        contratante_endereco: contractData.contratante.endereco,
        contratante_tipo: contractData.contratante.tipo,
        contratada_nome: contractData.contratada.nome,
        contratada_documento: contractData.contratada.documento,
        contratada_endereco: contractData.contratada.endereco,
        contratada_tipo: contractData.contratada.tipo,
        valor: contractData.valor,
        prazo: contractData.prazo,
        leis_selecionadas: contractData.leisSelecionadas,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Tentar salvar no Supabase primeiro
      const { error: supabaseError } = await supabase.from("saved_contracts").insert([supabaseData])

      if (supabaseError) {
        console.error("❌ [SavedContracts] Erro ao salvar no Supabase:", supabaseError)

        // Fallback para localStorage
        const newContract: SavedContract = {
          ...supabaseData,
          tipoPersonalizado: contractData.tipoPersonalizado,
          html: contractData.html,
          contratante: contractData.contratante,
          contratada: contractData.contratada,
          leisSelecionadas: contractData.leisSelecionadas,
        }

        const existingContracts = contracts
        const updatedContracts = [newContract, ...existingContracts]

        setContracts(updatedContracts)
        localStorage.setItem(`saved_contracts_${user.id}`, JSON.stringify(updatedContracts))

        console.log("✅ [SavedContracts] Contrato salvo no localStorage como fallback")
      } else {
        console.log("✅ [SavedContracts] Contrato salvo no Supabase com sucesso")

        // Recarregar contratos para sincronizar
        await loadContracts()
      }

      return true
    } catch (error) {
      console.error("❌ [SavedContracts] Erro geral ao salvar contrato:", error)

      // Fallback final para localStorage
      try {
        const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newContract: SavedContract = {
          id: contractId,
          titulo: contractData.titulo,
          tipo: contractData.tipo,
          tipoPersonalizado: contractData.tipoPersonalizado,
          html: contractData.html,
          tamanho: contractData.tamanho,
          contratante: contractData.contratante,
          contratada: contractData.contratada,
          valor: contractData.valor,
          prazo: contractData.prazo,
          leisSelecionadas: contractData.leisSelecionadas,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const existingContracts = contracts
        const updatedContracts = [newContract, ...existingContracts]

        setContracts(updatedContracts)
        localStorage.setItem(`saved_contracts_${user.id}`, JSON.stringify(updatedContracts))

        console.log("✅ [SavedContracts] Contrato salvo no localStorage (fallback final)")
        return true
      } catch (localError) {
        console.error("❌ [SavedContracts] Erro no fallback localStorage:", localError)
        return false
      }
    }
  }

  // Deletar contrato
  const deleteContract = async (contractId: string): Promise<boolean> => {
    if (!user) return false

    try {
      // Tentar deletar do Supabase primeiro
      const { error: supabaseError } = await supabase
        .from("saved_contracts")
        .delete()
        .eq("id", contractId)
        .eq("user_id", user.id)

      if (supabaseError) {
        console.error("❌ [SavedContracts] Erro ao deletar do Supabase:", supabaseError)
      }

      // Sempre remover do estado local e localStorage
      const updatedContracts = contracts.filter((contract) => contract.id !== contractId)
      setContracts(updatedContracts)
      localStorage.setItem(`saved_contracts_${user.id}`, JSON.stringify(updatedContracts))

      toast({
        title: "✅ Contrato deletado",
        description: "O contrato foi removido com sucesso.",
      })

      return true
    } catch (error) {
      console.error("❌ [SavedContracts] Erro ao deletar contrato:", error)

      toast({
        title: "❌ Erro ao deletar",
        description: "Não foi possível deletar o contrato.",
        variant: "destructive",
      })

      return false
    }
  }

  // Carregar contratos quando o usuário mudar
  useEffect(() => {
    loadContracts()
  }, [user])

  return {
    contracts,
    loading,
    saveContract,
    deleteContract,
    loadContracts,
  }
}
