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
      broadcast_log: {
        Row: {
          audience: string
          body: string
          channel: string
          created_at: string
          id: string
          metadata: Json
          recipients_count: number
          sent_at: string
          sent_by: string | null
          subject: string | null
        }
        Insert: {
          audience: string
          body: string
          channel: string
          created_at?: string
          id?: string
          metadata?: Json
          recipients_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Update: {
          audience?: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json
          recipients_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          created_at: string
          day_number: number
          email: string
          energy_rating: number | null
          id: string
          mood_rating: number | null
          water_glasses: number | null
          win_text: string
        }
        Insert: {
          created_at?: string
          day_number: number
          email: string
          energy_rating?: number | null
          id?: string
          mood_rating?: number | null
          water_glasses?: number | null
          win_text: string
        }
        Update: {
          created_at?: string
          day_number?: number
          email?: string
          energy_rating?: number | null
          id?: string
          mood_rating?: number | null
          water_glasses?: number | null
          win_text?: string
        }
        Relationships: []
      }
      coaching_waitlist: {
        Row: {
          created_at: string
          eligible_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
          why_now: string | null
        }
        Insert: {
          created_at?: string
          eligible_at?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
          why_now?: string | null
        }
        Update: {
          created_at?: string
          eligible_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          why_now?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          body: string | null
          created_at: string
          day_unlock: number
          hero_image: string | null
          id: string
          is_active: boolean
          metadata: Json
          slug: string
          sort_order: number
          summary: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          day_unlock?: number
          hero_image?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          day_unlock?: number
          hero_image?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      dunning_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          created_at: string
          failure_reason: string | null
          id: string
          status: string
          stripe_invoice_id: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          attempted_at?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          status: string
          stripe_invoice_id?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          status?: string
          stripe_invoice_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          blood_sugar: number | null
          created_at: string
          energy: number | null
          id: string
          log_date: string
          notes: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          blood_sugar?: number | null
          created_at?: string
          energy?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          blood_sugar?: number | null
          created_at?: string
          energy?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      intake_submissions: {
        Row: {
          age: number
          availability: string | null
          coaching_agreement: boolean
          country: string
          created_at: string
          current_medications: string | null
          diabetes_duration: string | null
          diabetes_type: string
          email: string
          full_name: string
          health_goals: string | null
          id: string
          order_id: string | null
          phone: string | null
          preferred_start_date: string | null
          preferred_time: string | null
          status: string
          timezone: string | null
          updated_at: string
          uses_insulin: boolean | null
          why_now: string | null
          willing_to_cook: boolean | null
        }
        Insert: {
          age: number
          availability?: string | null
          coaching_agreement?: boolean
          country: string
          created_at?: string
          current_medications?: string | null
          diabetes_duration?: string | null
          diabetes_type: string
          email: string
          full_name: string
          health_goals?: string | null
          id?: string
          order_id?: string | null
          phone?: string | null
          preferred_start_date?: string | null
          preferred_time?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          uses_insulin?: boolean | null
          why_now?: string | null
          willing_to_cook?: boolean | null
        }
        Update: {
          age?: number
          availability?: string | null
          coaching_agreement?: boolean
          country?: string
          created_at?: string
          current_medications?: string | null
          diabetes_duration?: string | null
          diabetes_type?: string
          email?: string
          full_name?: string
          health_goals?: string | null
          id?: string
          order_id?: string | null
          phone?: string | null
          preferred_start_date?: string | null
          preferred_time?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          uses_insulin?: boolean | null
          why_now?: string | null
          willing_to_cook?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_submissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          source?: string
        }
        Relationships: []
      }
      member_progress: {
        Row: {
          completed_at: string
          created_at: string
          day_number: number
          id: string
          metadata: Json
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          day_number: number
          id?: string
          metadata?: Json
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          day_number?: number
          id?: string
          metadata?: Json
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          product_id: string
          product_name: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          product_id: string
          product_name: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          product_id?: string
          product_name?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qa_monthly_usage: {
        Row: {
          created_at: string
          id: string
          period_month: string
          points_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_month: string
          points_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_month?: string
          points_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_submissions: {
        Row: {
          answer: string | null
          answered_at: string | null
          category: string | null
          created_at: string
          id: string
          points_cost: number
          publish_anonymously: boolean
          question: string
          question_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          category?: string | null
          created_at?: string
          id?: string
          points_cost: number
          publish_anonymously?: boolean
          question: string
          question_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          category?: string | null
          created_at?: string
          id?: string
          points_cost?: number
          publish_anonymously?: boolean
          question?: string
          question_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          day_number: number
          id: string
          last_active_at: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          trial_end_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          day_number?: number
          id?: string
          last_active_at?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier?: string
          trial_end_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          day_number?: number
          id?: string
          last_active_at?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier?: string
          trial_end_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_consent: {
        Row: {
          created_at: string
          id: string
          opt_in_ip: string | null
          opted_in_at: string
          phone_number: string
          revoke_reason: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opt_in_ip?: string | null
          opted_in_at?: string
          phone_number: string
          revoke_reason?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opt_in_ip?: string | null
          opted_in_at?: string
          phone_number?: string
          revoke_reason?: string | null
          revoked_at?: string | null
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
        Args: { p_role: string; p_user_id: string }
        Returns: boolean
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
