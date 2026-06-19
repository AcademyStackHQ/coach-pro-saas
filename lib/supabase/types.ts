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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      batch_students: {
        Row: {
          batch_id: string
          created_at: string | null
          enrolled_at: string | null
          id: string
          institution_id: string
          status: string
          student_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          institution_id: string
          status?: string
          student_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          institution_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          capacity: number
          coach_id: string | null
          created_at: string | null
          effective_from: string
          id: string
          institution_id: string
          monthly_fee: number
          name: string
          program: string
          schedule: Json
          status: string
          venue: string | null
        }
        Insert: {
          capacity: number
          coach_id?: string | null
          created_at?: string | null
          effective_from?: string
          id?: string
          institution_id: string
          monthly_fee?: number
          name: string
          program: string
          schedule?: Json
          status?: string
          venue?: string | null
        }
        Update: {
          capacity?: number
          coach_id?: string | null
          created_at?: string | null
          effective_from?: string
          id?: string
          institution_id?: string
          monthly_fee?: number
          name?: string
          program?: string
          schedule?: Json
          status?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          availability: Json | null
          bio: string | null
          color: string | null
          created_at: string | null
          id: string
          institution_id: string
          joined_at: string | null
          programs: string[] | null
          user_id: string
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          institution_id: string
          joined_at?: string | null
          programs?: string[] | null
          user_id: string
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string
          joined_at?: string | null
          programs?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_ledger: {
        Row: {
          amount_due: number
          amount_paid: number
          balance: number | null
          batch_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          institution_id: string
          month_year: string
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          balance?: number | null
          batch_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          institution_id: string
          month_year: string
          notes?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          balance?: number | null
          batch_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string
          month_year?: string
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_ledger_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_ledger_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          institution_id: string
          ledger_id: string
          notes: string | null
          paid_at: string
          payment_mode: string
          receipt_number: string | null
          recorded_by: string | null
          student_id: string
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          institution_id: string
          ledger_id: string
          notes?: string | null
          paid_at?: string
          payment_mode: string
          receipt_number?: string | null
          recorded_by?: string | null
          student_id: string
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          institution_id?: string
          ledger_id?: string
          notes?: string | null
          paid_at?: string
          payment_mode?: string
          receipt_number?: string | null
          recorded_by?: string | null
          student_id?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "fee_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_allowed_emails: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: string
          institution_id: string
          role: string
          status: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          institution_id: string
          role: string
          status?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          institution_id?: string
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_allowed_emails_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_allowed_emails_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          role: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          category: string | null
          code: string | null
          contact_email: string | null
          contact_mobile: string | null
          created_at: string | null
          fee_config: Json | null
          id: string
          logo_url: string | null
          name: string
          onboarding_complete: boolean | null
          plan: string | null
          programs: string[] | null
          receipt_seq: number
          slug: string
          sms_credits: number | null
          student_seq: number
          timezone: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          code?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string | null
          fee_config?: Json | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_complete?: boolean | null
          plan?: string | null
          programs?: string[] | null
          receipt_seq?: number
          slug: string
          sms_credits?: number | null
          student_seq?: number
          timezone?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          category?: string | null
          code?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string | null
          fee_config?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_complete?: boolean | null
          plan?: string | null
          programs?: string[] | null
          receipt_seq?: number
          slug?: string
          sms_credits?: number | null
          student_seq?: number
          timezone?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          mobile: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          mobile?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          mobile?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          coach_id: string
          created_at: string | null
          date: string
          end_time: string
          fee_override: number | null
          id: string
          institution_id: string
          notes: string | null
          start_time: string
          status: string
          student_id: string
          venue: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          date: string
          end_time: string
          fee_override?: number | null
          id?: string
          institution_id: string
          notes?: string | null
          start_time: string
          status?: string
          student_id: string
          venue?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          date?: string
          end_time?: string
          fee_override?: number | null
          id?: string
          institution_id?: string
          notes?: string | null
          start_time?: string
          status?: string
          student_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          channel: string
          delivered_at: string | null
          gateway_ref: string | null
          id: string
          institution_id: string
          ledger_id: string | null
          message: string
          mobile: string
          sent_at: string
          status: string
          student_id: string | null
          template_name: string | null
        }
        Insert: {
          channel?: string
          delivered_at?: string | null
          gateway_ref?: string | null
          id?: string
          institution_id: string
          ledger_id?: string | null
          message: string
          mobile: string
          sent_at?: string
          status?: string
          student_id?: string | null
          template_name?: string | null
        }
        Update: {
          channel?: string
          delivered_at?: string | null
          gateway_ref?: string | null
          id?: string
          institution_id?: string
          ledger_id?: string | null
          message?: string
          mobile?: string
          sent_at?: string
          status?: string
          student_id?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "fee_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body: string
          id: string
          institution_id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          body: string
          id?: string
          institution_id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          id?: string
          institution_id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          calling_name: string | null
          contact_channel: string
          created_at: string | null
          deposit_amount: number | null
          dob: string
          enrolment_date: string | null
          full_name: string
          gender: string | null
          id: string
          institution_id: string
          monthly_fee: number | null
          parent_email: string | null
          parent_mobile: string
          parent_name: string
          parent_user_id: string | null
          photo_url: string | null
          programs: string[] | null
          sms_opt_in: boolean | null
          status: string | null
          student_code: string | null
          uniform_name: string | null
          uniform_number: number | null
          uniform_size: string | null
          user_id: string | null
        }
        Insert: {
          calling_name?: string | null
          contact_channel?: string
          created_at?: string | null
          deposit_amount?: number | null
          dob: string
          enrolment_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          institution_id: string
          monthly_fee?: number | null
          parent_email?: string | null
          parent_mobile: string
          parent_name: string
          parent_user_id?: string | null
          photo_url?: string | null
          programs?: string[] | null
          sms_opt_in?: boolean | null
          status?: string | null
          student_code?: string | null
          uniform_name?: string | null
          uniform_number?: number | null
          uniform_size?: string | null
          user_id?: string | null
        }
        Update: {
          calling_name?: string | null
          contact_channel?: string
          created_at?: string | null
          deposit_amount?: number | null
          dob?: string
          enrolment_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          institution_id?: string
          monthly_fee?: number | null
          parent_email?: string | null
          parent_mobile?: string
          parent_name?: string
          parent_user_id?: string | null
          photo_url?: string | null
          programs?: string[] | null
          sms_opt_in?: boolean | null
          status?: string | null
          student_code?: string | null
          uniform_name?: string | null
          uniform_number?: number | null
          uniform_size?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_sms_credits: {
        Args: { p_count: number; p_institution_id: string }
        Returns: number
      }
      generate_institution_code: { Args: { p_name: string }; Returns: string }
      get_my_institution_ids: { Args: never; Returns: string[] }
      is_admin_of: { Args: { p_institution_id: string }; Returns: boolean }
      is_coach_of: { Args: { p_institution_id: string }; Returns: boolean }
      is_email_allowed: { Args: { p_email: string }; Returns: boolean }
      is_institution_name_available: {
        Args: { p_name: string }
        Returns: boolean
      }
      link_user_to_institution: {
        Args: {
          p_added_by: string
          p_email: string
          p_institution_id: string
          p_role: string
        }
        Returns: Json
      }
      next_receipt_number: {
        Args: { p_institution_id: string }
        Returns: string
      }
      next_student_code: { Args: { p_institution_id: string }; Returns: string }
      owns_batch_coach: { Args: { p_coach_id: string }; Returns: boolean }
      record_fee_payment: {
        Args: {
          p_amount: number
          p_ledger_id: string
          p_mode: string
          p_notes: string | null
          p_paid_at: string | null
          p_recorded_by: string
        }
        Returns: string
      }
      void_fee_payment: { Args: { p_payment_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
