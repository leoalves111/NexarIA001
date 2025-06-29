import { useState, useEffect } from 'react'

export interface PromptProfile {
  id: string
  nome: string
  prompt: string
  tipo: string
  tipoPersonalizado?: string
  observacoes: string
  tags: string[]
  usageCount: number
  createdAt: string
  updatedAt: string
}

export function usePromptProfiles() {
  const [profiles, setProfiles] = useState<PromptProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar perfis do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexar-prompt-profiles')
      if (saved) {
        setProfiles(JSON.parse(saved))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar perfis de prompt:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Salvar perfil
  const saveProfile = (profile: Omit<PromptProfile, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => {
    const newProfile: PromptProfile = {
      ...profile,
      id: Date.now().toString(),
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updated = [newProfile, ...profiles]
    setProfiles(updated)
    
    try {
      localStorage.setItem('nexar-prompt-profiles', JSON.stringify(updated))
      return newProfile
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error)
      throw error
    }
  }

  // Usar perfil (incrementa contador)
  const useProfile = (id: string) => {
    const profile = profiles.find(p => p.id === id)
    if (!profile) throw new Error('Perfil não encontrado')

    const updated = profiles.map(p => 
      p.id === id 
        ? { ...p, usageCount: p.usageCount + 1, updatedAt: new Date().toISOString() }
        : p
    )
    
    setProfiles(updated)
    
    try {
      localStorage.setItem('nexar-prompt-profiles', JSON.stringify(updated))
      return profile
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error)
      throw error
    }
  }

  // Atualizar perfil
  const updateProfile = (id: string, updates: Partial<PromptProfile>) => {
    const updated = profiles.map(p => 
      p.id === id 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    )
    
    setProfiles(updated)
    
    try {
      localStorage.setItem('nexar-prompt-profiles', JSON.stringify(updated))
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error)
      throw error
    }
  }

  // Deletar perfil
  const deleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id)
    setProfiles(updated)
    
    try {
      localStorage.setItem('nexar-prompt-profiles', JSON.stringify(updated))
    } catch (error) {
      console.error('❌ Erro ao deletar perfil:', error)
      throw error
    }
  }

  // Buscar perfis
  const searchProfiles = (query: string) => {
    if (!query.trim()) return profiles
    
    const searchTerm = query.toLowerCase()
    return profiles.filter(profile => 
      profile.nome.toLowerCase().includes(searchTerm) ||
      profile.prompt.toLowerCase().includes(searchTerm) ||
      profile.tipo.toLowerCase().includes(searchTerm) ||
      profile.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  // Perfis mais usados
  const getPopularProfiles = (limit = 5) => {
    return [...profiles]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  // Perfis por tipo
  const getProfilesByType = (tipo: string) => {
    return profiles.filter(p => p.tipo === tipo)
  }

  return {
    profiles,
    loading,
    saveProfile,
    useProfile,
    updateProfile,
    deleteProfile,
    searchProfiles,
    getPopularProfiles,
    getProfilesByType
  }
} 