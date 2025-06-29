import { useState, useEffect } from 'react'

export interface SavedContract {
  id: string
  titulo: string
  tipo: string
  tipoPersonalizado?: string
  dataGeracao: string
  dataModificacao: string
  html: string
  tamanho: 'resumido' | 'normal' | 'completo'
  contratante: {
    nome: string
    tipo: 'pf' | 'pj'
  }
  contratada: {
    nome: string
    tipo: 'pf' | 'pj'
  }
  valor: string
  leisSelecionadas?: string[]
}

export function useSavedContracts() {
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar contratos do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexar-contracts')
      if (saved) {
        setSavedContracts(JSON.parse(saved))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar contratos salvos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Salvar contrato
  const saveContract = (contract: Omit<SavedContract, 'id' | 'dataGeracao' | 'dataModificacao'>) => {
    const newContract: SavedContract = {
      ...contract,
      id: Date.now().toString(),
      dataGeracao: new Date().toISOString(),
      dataModificacao: new Date().toISOString()
    }

    const updated = [newContract, ...savedContracts]
    setSavedContracts(updated)
    
    try {
      localStorage.setItem('nexar-contracts', JSON.stringify(updated))
      return newContract
    } catch (error) {
      console.error('❌ Erro ao salvar contrato:', error)
      throw error
    }
  }

  // Atualizar contrato
  const updateContract = (id: string, updates: Partial<SavedContract>) => {
    const updated = savedContracts.map(contract => 
      contract.id === id 
        ? { ...contract, ...updates, dataModificacao: new Date().toISOString() }
        : contract
    )
    
    setSavedContracts(updated)
    
    try {
      localStorage.setItem('nexar-contracts', JSON.stringify(updated))
    } catch (error) {
      console.error('❌ Erro ao atualizar contrato:', error)
      throw error
    }
  }

  // Deletar contrato
  const deleteContract = (id: string) => {
    const updated = savedContracts.filter(contract => contract.id !== id)
    setSavedContracts(updated)
    
    try {
      localStorage.setItem('nexar-contracts', JSON.stringify(updated))
    } catch (error) {
      console.error('❌ Erro ao deletar contrato:', error)
      throw error
    }
  }

  // Duplicar contrato
  const duplicateContract = (id: string) => {
    const original = savedContracts.find(c => c.id === id)
    if (!original) throw new Error('Contrato não encontrado')

    const duplicate: SavedContract = {
      ...original,
      id: Date.now().toString(),
      titulo: `${original.titulo} (Cópia)`,
      dataGeracao: new Date().toISOString(),
      dataModificacao: new Date().toISOString()
    }

    const updated = [duplicate, ...savedContracts]
    setSavedContracts(updated)
    
    try {
      localStorage.setItem('nexar-contracts', JSON.stringify(updated))
      return duplicate
    } catch (error) {
      console.error('❌ Erro ao duplicar contrato:', error)
      throw error
    }
  }

  // Buscar contratos
  const searchContracts = (query: string) => {
    if (!query.trim()) return savedContracts
    
    const searchTerm = query.toLowerCase()
    return savedContracts.filter(contract => 
      contract.titulo.toLowerCase().includes(searchTerm) ||
      contract.tipo.toLowerCase().includes(searchTerm) ||
      contract.tipoPersonalizado?.toLowerCase().includes(searchTerm) ||
      contract.contratante.nome.toLowerCase().includes(searchTerm) ||
      contract.contratada.nome.toLowerCase().includes(searchTerm)
    )
  }

  return {
    savedContracts,
    loading,
    saveContract,
    updateContract,
    deleteContract,
    duplicateContract,
    searchContracts
  }
} 