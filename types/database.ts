export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          tipo_pessoa: string
          nome: string | null
          sobrenome: string | null
          cpf: string | null
          razao_social: string | null
          nome_fantasia: string | null
          cnpj: string | null
          nome_responsavel: string | null
          email: string | null
          whatsapp: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tipo_pessoa: string
          nome?: string | null
          sobrenome?: string | null
          cpf?: string | null
          razao_social?: string | null
          nome_fantasia?: string | null
          cnpj?: string | null
          nome_responsavel?: string | null
          email?: string | null
          whatsapp?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tipo_pessoa?: string
          nome?: string | null
          sobrenome?: string | null
          cpf?: string | null
          razao_social?: string | null
          nome_fantasia?: string | null
          cnpj?: string | null
          nome_responsavel?: string | null
          email?: string | null
          whatsapp?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_contracts: {
        Row: {
          id: string
          titulo: string
          nomepersonalizado: string | null
          tipo: string
          tipopersonalizado: string | null
          tamanho: string | null
          html: string
          contratante: Json | null
          contratada: Json | null
          valor: string | null
          prazo: string | null
          datageracao: string
          datamodificacao: string
          leisselecionadas: string[] | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          nomepersonalizado?: string | null
          tipo: string
          tipopersonalizado?: string | null
          tamanho?: string | null
          html: string
          contratante?: Json | null
          contratada?: Json | null
          valor?: string | null
          prazo?: string | null
          datageracao?: string
          datamodificacao?: string
          leisselecionadas?: string[] | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          nomepersonalizado?: string | null
          tipo?: string
          tipopersonalizado?: string | null
          tamanho?: string | null
          html?: string
          contratante?: Json | null
          contratada?: Json | null
          valor?: string | null
          prazo?: string | null
          datageracao?: string
          datamodificacao?: string
          leisselecionadas?: string[] | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_contracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plano: string
          status: string
          creditos_avancados: number | null
          data_expiracao: string | null
          created_at: string
          updated_at: string
          creditos_premium: number | null
        }
        Insert: {
          id?: string
          user_id: string
          plano: string
          status: string
          creditos_avancados?: number | null
          data_expiracao?: string | null
          created_at?: string
          updated_at?: string
          creditos_premium?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          plano?: string
          status?: string
          creditos_avancados?: number | null
          data_expiracao?: string | null
          created_at?: string
          updated_at?: string
          creditos_premium?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          status: string
          tipo: string
          gateway?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          valor?: number
          status?: string
          tipo?: string
          gateway?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_profiles: {
        Row: {
          id: string
          nome: string
          prompt: string
          tipo: string
          tipopersonalizado: string | null
          observacoes: string | null
          tags: string[] | null
          usage_count: number | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          prompt: string
          tipo: string
          tipopersonalizado?: string | null
          observacoes?: string | null
          tags?: string[] | null
          usage_count?: number | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          prompt?: string
          tipo?: string
          tipopersonalizado?: string | null
          observacoes?: string | null
          tags?: string[] | null
          usage_count?: number | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_history: {
        Row: {
          id: string
          name: string
          executed_at: string
          description: string | null
        }
        Insert: {
          id?: string
          name: string
          executed_at?: string
          description?: string | null
        }
        Update: {
          id?: string
          name?: string
          executed_at?: string
          description?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          id: string
          email: string
          ip_address: string | null
          success: boolean | null
          attempted_at: string
        }
        Insert: {
          id?: string
          email: string
          ip_address?: string | null
          success?: boolean | null
          attempted_at?: string
        }
        Update: {
          id?: string
          email?: string
          ip_address?: string | null
          success?: boolean | null
          attempted_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_subscription: {
        Args: {
          user_uuid: string
        }
        Returns: {
          plano: string
          status: string
          creditos_avancados: number
          data_expiracao: string
        }[]
      }
      get_user_contracts_count: {
        Args: {
          user_uuid: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares para facilitar o uso
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

export type SavedContract = Database["public"]["Tables"]["saved_contracts"]["Row"]
export type SavedContractInsert = Database["public"]["Tables"]["saved_contracts"]["Insert"]
export type SavedContractUpdate = Database["public"]["Tables"]["saved_contracts"]["Update"]

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]
export type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

export type PaymentHistory = Database["public"]["Tables"]["payment_history"]["Row"]
export type PaymentHistoryInsert = Database["public"]["Tables"]["payment_history"]["Insert"]
export type PaymentHistoryUpdate = Database["public"]["Tables"]["payment_history"]["Update"]

export type PromptProfile = Database["public"]["Tables"]["prompt_profiles"]["Row"]
export type PromptProfileInsert = Database["public"]["Tables"]["prompt_profiles"]["Insert"]
export type PromptProfileUpdate = Database["public"]["Tables"]["prompt_profiles"]["Update"]

export type MigrationHistory = Database["public"]["Tables"]["migration_history"]["Row"]
export type LoginAttempt = Database["public"]["Tables"]["login_attempts"]["Row"]

// Tipos para as funções do banco
export type UserSubscription = Database["public"]["Functions"]["get_user_subscription"]["Returns"][0]
