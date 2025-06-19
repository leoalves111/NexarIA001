export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          tipo_pessoa: "PF" | "PJ"
          nome: string | null
          sobrenome: string | null
          cpf: string | null
          razao_social: string | null
          nome_fantasia: string | null
          cnpj: string | null
          nome_responsavel: string | null
          email: string
          whatsapp: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tipo_pessoa: "PF" | "PJ"
          nome?: string | null
          sobrenome?: string | null
          cpf?: string | null
          razao_social?: string | null
          nome_fantasia?: string | null
          cnpj?: string | null
          nome_responsavel?: string | null
          email: string
          whatsapp?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tipo_pessoa?: "PF" | "PJ"
          nome?: string | null
          sobrenome?: string | null
          cpf?: string | null
          razao_social?: string | null
          nome_fantasia?: string | null
          cnpj?: string | null
          nome_responsavel?: string | null
          email?: string
          whatsapp?: string | null
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plano: string
          status: string
          creditos_simples: number
          creditos_avancados: number
          data_expiracao: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plano?: string
          status?: string
          creditos_simples?: number
          creditos_avancados?: number
          data_expiracao?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          plano?: string
          status?: string
          creditos_simples?: number
          creditos_avancados?: number
          data_expiracao?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          user_id: string
          nome: string
          descricao: string
          tipo: "simples" | "avancado"
          conteudo: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          descricao: string
          tipo: "simples" | "avancado"
          conteudo?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          nome?: string
          descricao?: string
          tipo?: "simples" | "avancado"
          conteudo?: string | null
          status?: string
          updated_at?: string
        }
      }
      payment_history: {
        Row: {
          id: string
          user_id: string
          valor: number
          status: string
          tipo: string
          gateway: string | null
          transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          valor: number
          status?: string
          tipo: string
          gateway?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          valor?: number
          status?: string
          tipo?: string
          gateway?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
      }
    }
  }
}
