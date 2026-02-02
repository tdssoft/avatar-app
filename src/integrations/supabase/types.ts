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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      partner_shop_links: {
        Row: {
          added_by_admin_id: string
          created_at: string | null
          id: string
          partner_user_id: string
          shop_name: string | null
          shop_url: string
        }
        Insert: {
          added_by_admin_id: string
          created_at?: string | null
          id?: string
          partner_user_id: string
          shop_name?: string | null
          shop_url: string
        }
        Update: {
          added_by_admin_id?: string
          created_at?: string | null
          id?: string
          partner_user_id?: string
          shop_name?: string | null
          shop_url?: string
        }
        Relationships: []
      }
      patient_messages: {
        Row: {
          admin_id: string | null
          id: string
          message_text: string
          message_type: string
          patient_id: string
          person_profile_id: string | null
          sent_at: string | null
        }
        Insert: {
          admin_id?: string | null
          id?: string
          message_text: string
          message_type: string
          patient_id: string
          person_profile_id?: string | null
          sent_at?: string | null
        }
        Update: {
          admin_id?: string | null
          id?: string
          message_text?: string
          message_type?: string
          patient_id?: string
          person_profile_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_person_profile_id_fkey"
            columns: ["person_profile_id"]
            isOneToOne: false
            referencedRelation: "person_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          note_text: string
          patient_id: string
          person_profile_id: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          note_text: string
          patient_id: string
          person_profile_id?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          note_text?: string
          patient_id?: string
          person_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_person_profile_id_fkey"
            columns: ["person_profile_id"]
            isOneToOne: false
            referencedRelation: "person_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          diagnosis_status: string | null
          id: string
          last_communication_at: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          diagnosis_status?: string | null
          id?: string
          last_communication_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          diagnosis_status?: string | null
          id?: string
          last_communication_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      person_profiles: {
        Row: {
          account_user_id: string
          birth_date: string | null
          created_at: string
          gender: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_user_id: string
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_user_id?: string
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          referral_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recommendation_access_log: {
        Row: {
          access_type: string
          accessed_at: string
          id: string
          ip_address: unknown
          person_profile_id: string | null
          recommendation_id: string
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          id?: string
          ip_address?: unknown
          person_profile_id?: string | null
          recommendation_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          id?: string
          ip_address?: unknown
          person_profile_id?: string | null
          recommendation_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_access_log_person_profile_id_fkey"
            columns: ["person_profile_id"]
            isOneToOne: false
            referencedRelation: "person_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_access_log_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          body_systems: string[] | null
          content: string | null
          created_at: string | null
          created_by_admin_id: string
          diagnosis_summary: string | null
          dietary_recommendations: string | null
          download_token: string | null
          id: string
          patient_id: string
          pdf_url: string | null
          person_profile_id: string | null
          recommendation_date: string
          shop_links: string | null
          supplementation_program: string | null
          supporting_therapies: string | null
          tags: string[] | null
          title: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          body_systems?: string[] | null
          content?: string | null
          created_at?: string | null
          created_by_admin_id: string
          diagnosis_summary?: string | null
          dietary_recommendations?: string | null
          download_token?: string | null
          id?: string
          patient_id: string
          pdf_url?: string | null
          person_profile_id?: string | null
          recommendation_date?: string
          shop_links?: string | null
          supplementation_program?: string | null
          supporting_therapies?: string | null
          tags?: string[] | null
          title?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          body_systems?: string[] | null
          content?: string | null
          created_at?: string | null
          created_by_admin_id?: string
          diagnosis_summary?: string | null
          dietary_recommendations?: string | null
          download_token?: string | null
          id?: string
          patient_id?: string
          pdf_url?: string | null
          person_profile_id?: string | null
          recommendation_date?: string
          shop_links?: string | null
          supplementation_program?: string | null
          supporting_therapies?: string | null
          tags?: string[] | null
          title?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_person_profile_id_fkey"
            columns: ["person_profile_id"]
            isOneToOne: false
            referencedRelation: "person_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string | null
          id: string
          referred_email: string
          referred_name: string
          referred_user_id: string
          referrer_code: string
          referrer_user_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          referred_email: string
          referred_name: string
          referred_user_id: string
          referrer_code: string
          referrer_user_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          referred_email?: string
          referred_name?: string
          referred_user_id?: string
          referrer_code?: string
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      user_results: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
