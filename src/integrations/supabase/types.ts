export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      etapas_obra: {
        Row: {
          created_at: string
          data_conclusao: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          percentual_concluido: number
          percentual_planejado: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem: number
          percentual_concluido?: number
          percentual_planejado?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          percentual_concluido?: number
          percentual_planejado?: number
          updated_at?: string
        }
        Relationships: []
      }
      etapas_obra_arquivos: {
        Row: {
          arquivo_url: string | null
          conteudo_texto: string | null
          created_at: string
          data_upload: string
          descricao: string | null
          etapa_id: string
          id: string
          tipo: string
          titulo: string
          uploaded_by: string
        }
        Insert: {
          arquivo_url?: string | null
          conteudo_texto?: string | null
          created_at?: string
          data_upload?: string
          descricao?: string | null
          etapa_id: string
          id?: string
          tipo: string
          titulo: string
          uploaded_by: string
        }
        Update: {
          arquivo_url?: string | null
          conteudo_texto?: string | null
          created_at?: string
          data_upload?: string
          descricao?: string | null
          etapa_id?: string
          id?: string
          tipo?: string
          titulo?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_obra_arquivos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_obra_historico: {
        Row: {
          alterado_por: string
          campo_alterado: string
          created_at: string
          data_alteracao: string
          etapa_id: string
          id: string
          observacao: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_por: string
          campo_alterado: string
          created_at?: string
          data_alteracao?: string
          etapa_id: string
          id?: string
          observacao?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_por?: string
          campo_alterado?: string
          created_at?: string
          data_alteracao?: string
          etapa_id?: string
          id?: string
          observacao?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapas_obra_historico_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      investimentos: {
        Row: {
          created_at: string
          data_inicio: string
          id: string
          numero_parcelas: number
          observacoes: string | null
          updated_at: string
          user_id: string
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_inicio: string
          id?: string
          numero_parcelas: number
          observacoes?: string | null
          updated_at?: string
          user_id: string
          valor_parcela: number
          valor_total: number
        }
        Update: {
          created_at?: string
          data_inicio?: string
          id?: string
          numero_parcelas?: number
          observacoes?: string | null
          updated_at?: string
          user_id?: string
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: []
      }
      obra_fotos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_obra"]
          created_at: string
          data_upload: string
          descricao: string | null
          foto_url: string | null
          id: string
          titulo: string
          uploaded_by: string
          video_url: string | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_obra"]
          created_at?: string
          data_upload?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          titulo: string
          uploaded_by: string
          video_url?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_obra"]
          created_at?: string
          data_upload?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          titulo?: string
          uploaded_by?: string
          video_url?: string | null
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string | null
          honorarios: number | null
          id: string
          investimento_id: string
          juros: number | null
          multa: number | null
          numero_parcela: number
          observacoes: string | null
          renegociacao_id: string | null
          status: string
          updated_at: string
          valor_pago: number | null
          valor_parcela: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao?: string | null
          honorarios?: number | null
          id?: string
          investimento_id: string
          juros?: number | null
          multa?: number | null
          numero_parcela: number
          observacoes?: string | null
          renegociacao_id?: string | null
          status?: string
          updated_at?: string
          valor_pago?: number | null
          valor_parcela: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string | null
          honorarios?: number | null
          id?: string
          investimento_id?: string
          juros?: number | null
          multa?: number | null
          numero_parcela?: number
          observacoes?: string | null
          renegociacao_id?: string | null
          status?: string
          updated_at?: string
          valor_pago?: number | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_investimento_id_fkey"
            columns: ["investimento_id"]
            isOneToOne: false
            referencedRelation: "investimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_renegociacao_id_fkey"
            columns: ["renegociacao_id"]
            isOneToOne: false
            referencedRelation: "renegociacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_renegociadas: {
        Row: {
          created_at: string
          id: string
          parcela_id: string
          renegociacao_id: string
          valor_original: number
        }
        Insert: {
          created_at?: string
          id?: string
          parcela_id: string
          renegociacao_id: string
          valor_original: number
        }
        Update: {
          created_at?: string
          id?: string
          parcela_id?: string
          renegociacao_id?: string
          valor_original?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_renegociadas_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_renegociadas_renegociacao_id_fkey"
            columns: ["renegociacao_id"]
            isOneToOne: false
            referencedRelation: "renegociacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          data_cadastro: string
          data_compra: string | null
          email: string | null
          fase: string | null
          id: string
          lote: string | null
          nome_completo: string
          quadra: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          data_cadastro?: string
          data_compra?: string | null
          email?: string | null
          fase?: string | null
          id: string
          lote?: string | null
          nome_completo: string
          quadra?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          data_cadastro?: string
          data_compra?: string | null
          email?: string | null
          fase?: string | null
          id?: string
          lote?: string | null
          nome_completo?: string
          quadra?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      renegociacoes: {
        Row: {
          created_at: string
          criado_por: string
          data_renegociacao: string
          id: string
          investimento_id: string
          numero_parcelas: number
          observacoes: string | null
          status: string
          taxa_juros: number | null
          updated_at: string
          user_id: string
          valor_entrada: number | null
          valor_original: number
          valor_parcela: number
          valor_renegociado: number
        }
        Insert: {
          created_at?: string
          criado_por: string
          data_renegociacao?: string
          id?: string
          investimento_id: string
          numero_parcelas: number
          observacoes?: string | null
          status?: string
          taxa_juros?: number | null
          updated_at?: string
          user_id: string
          valor_entrada?: number | null
          valor_original: number
          valor_parcela: number
          valor_renegociado: number
        }
        Update: {
          created_at?: string
          criado_por?: string
          data_renegociacao?: string
          id?: string
          investimento_id?: string
          numero_parcelas?: number
          observacoes?: string | null
          status?: string
          taxa_juros?: number | null
          updated_at?: string
          user_id?: string
          valor_entrada?: number | null
          valor_original?: number
          valor_parcela?: number
          valor_renegociado?: number
        }
        Relationships: [
          {
            foreignKeyName: "renegociacoes_investimento_id_fkey"
            columns: ["investimento_id"]
            isOneToOne: false
            referencedRelation: "investimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          endpoint: string | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validation_errors: {
        Row: {
          attempted_value: string | null
          created_at: string
          endpoint: string
          error_message: string
          field_name: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
          validation_rule: string
        }
        Insert: {
          attempted_value?: string | null
          created_at?: string
          endpoint: string
          error_message: string
          field_name: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
          validation_rule: string
        }
        Update: {
          attempted_value?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string
          field_name?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
          validation_rule?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      detect_attack_patterns: {
        Args: { threshold?: number; time_window?: unknown }
        Returns: {
          distinct_endpoints: number
          distinct_fields: number
          error_count: number
          first_attempt: string
          ip_address: string
          last_attempt: string
        }[]
      }
      get_validation_error_stats: {
        Args: { time_period?: unknown }
        Returns: {
          error_count: number
          field_name: string
          last_occurrence: string
          unique_ips: number
          validation_rule: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cooperado"
      categoria_obra:
        | "1ª Fase do Muro"
        | "2ª Fase do Muro"
        | "3ª Fase do Muro"
        | "Supressão Vegetal"
        | "Terraplanagem"
        | "Infraestrutura"
        | "Pavimentação"
        | "Portaria e Clube"
        | "Paisagismo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cooperado"],
      categoria_obra: [
        "1ª Fase do Muro",
        "2ª Fase do Muro",
        "3ª Fase do Muro",
        "Supressão Vegetal",
        "Terraplanagem",
        "Infraestrutura",
        "Pavimentação",
        "Portaria e Clube",
        "Paisagismo",
      ],
    },
  },
} as const
