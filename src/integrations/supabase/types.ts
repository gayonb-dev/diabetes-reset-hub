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
      activity_events: {
        Row: {
          created_at: string
          event_at: string
          event_type: string
          id: string
          metadata: Json
          user_id: string | null
          visitor_profile_id: string | null
        }
        Insert: {
          created_at?: string
          event_at?: string
          event_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
          visitor_profile_id?: string | null
        }
        Update: {
          created_at?: string
          event_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
          visitor_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          tier: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          tier?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tier?: string
          xp_reward?: number
        }
        Relationships: []
      }
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
      cheat_meals: {
        Row: {
          created_at: string
          fast_start_at: string | null
          id: string
          logged_at: string
          meal_description: string | null
          member_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          fast_start_at?: string | null
          id?: string
          logged_at?: string
          meal_description?: string | null
          member_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          fast_start_at?: string | null
          id?: string
          logged_at?: string
          meal_description?: string | null
          member_id?: string
          week_start_date?: string
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
      community_answer_embeddings: {
        Row: {
          answer_id: string
          combined_text: string
          created_at: string
          embedding: string | null
          id: string
          question_id: string
        }
        Insert: {
          answer_id: string
          combined_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          question_id: string
        }
        Update: {
          answer_id?: string
          combined_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_answer_embeddings_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "community_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_answer_embeddings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_answers: {
        Row: {
          admin_related_content_name: string | null
          author_day_in_program: number | null
          author_id: string | null
          content: string
          created_at: string
          display_name: string | null
          helpful_count: number
          id: string
          is_admin_response: boolean
          is_anonymous: boolean
          is_marked_helpful: boolean
          is_verified: boolean
          is_vita_response: boolean
          question_id: string
          related_content_slug: string | null
        }
        Insert: {
          admin_related_content_name?: string | null
          author_day_in_program?: number | null
          author_id?: string | null
          content: string
          created_at?: string
          display_name?: string | null
          helpful_count?: number
          id?: string
          is_admin_response?: boolean
          is_anonymous?: boolean
          is_marked_helpful?: boolean
          is_verified?: boolean
          is_vita_response?: boolean
          question_id: string
          related_content_slug?: string | null
        }
        Update: {
          admin_related_content_name?: string | null
          author_day_in_program?: number | null
          author_id?: string | null
          content?: string
          created_at?: string
          display_name?: string | null
          helpful_count?: number
          id?: string
          is_admin_response?: boolean
          is_anonymous?: boolean
          is_marked_helpful?: boolean
          is_verified?: boolean
          is_vita_response?: boolean
          question_id?: string
          related_content_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_questions: {
        Row: {
          answer_count: number
          author_day_in_program: number | null
          author_id: string
          content: string
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          is_question_of_day: boolean
          is_verified_answered: boolean
          metoo_count: number
          question_of_day_date: string | null
          tags: string[]
          updated_at: string
          upvote_count: number
        }
        Insert: {
          answer_count?: number
          author_day_in_program?: number | null
          author_id: string
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          is_question_of_day?: boolean
          is_verified_answered?: boolean
          metoo_count?: number
          question_of_day_date?: string | null
          tags?: string[]
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          answer_count?: number
          author_day_in_program?: number | null
          author_id?: string
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          is_question_of_day?: boolean
          is_verified_answered?: boolean
          metoo_count?: number
          question_of_day_date?: string | null
          tags?: string[]
          updated_at?: string
          upvote_count?: number
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          created_at: string
          id: string
          reaction_emoji: string | null
          target_id: string
          target_type: string
          vote_type: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_emoji?: string | null
          target_id: string
          target_type: string
          vote_type: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_emoji?: string | null
          target_id?: string
          target_type?: string
          vote_type?: string
          voter_id?: string
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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          metadata: Json
          started_at: string
          summary: string | null
          updated_at: string
          visitor_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          metadata?: Json
          started_at?: string
          summary?: string | null
          updated_at?: string
          visitor_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          metadata?: Json
          started_at?: string
          summary?: string | null
          updated_at?: string
          visitor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_actions: {
        Row: {
          action_description: string
          action_detail_content: Json
          action_title: string
          action_type: string
          created_at: string
          day_name: string
          day_number: number
          id: string
          is_extension_day: boolean
          learning_objective: string | null
          phase_number: number
          sub_tasks: Json
          updated_at: string
        }
        Insert: {
          action_description: string
          action_detail_content?: Json
          action_title: string
          action_type: string
          created_at?: string
          day_name: string
          day_number: number
          id?: string
          is_extension_day?: boolean
          learning_objective?: string | null
          phase_number: number
          sub_tasks?: Json
          updated_at?: string
        }
        Update: {
          action_description?: string
          action_detail_content?: Json
          action_title?: string
          action_type?: string
          created_at?: string
          day_name?: string
          day_number?: number
          id?: string
          is_extension_day?: boolean
          learning_objective?: string | null
          phase_number?: number
          sub_tasks?: Json
          updated_at?: string
        }
        Relationships: []
      }
      daily_digest: {
        Row: {
          actions_today: Json
          anomalies: Json
          conversation_count: number
          created_at: string
          digest_date: string
          email_sent_at: string | null
          id: string
          numbers: Json
          what_agent_heard: string | null
        }
        Insert: {
          actions_today?: Json
          anomalies?: Json
          conversation_count?: number
          created_at?: string
          digest_date: string
          email_sent_at?: string | null
          id?: string
          numbers?: Json
          what_agent_heard?: string | null
        }
        Update: {
          actions_today?: Json
          anomalies?: Json
          conversation_count?: number
          created_at?: string
          digest_date?: string
          email_sent_at?: string | null
          id?: string
          numbers?: Json
          what_agent_heard?: string | null
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          requested_at: string
          requested_email: string | null
          status: string
          updated_at: string
          user_id: string | null
          visitor_profile_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_email?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_profile_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_email?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      if_fasting_log: {
        Row: {
          actual_duration_hours: number | null
          created_at: string
          fast_end_at: string | null
          fast_start_at: string
          id: string
          member_id: string
          notes: string | null
          planned_duration_hours: number
          status: string
          window_type: string
        }
        Insert: {
          actual_duration_hours?: number | null
          created_at?: string
          fast_end_at?: string | null
          fast_start_at: string
          id?: string
          member_id: string
          notes?: string | null
          planned_duration_hours: number
          status?: string
          window_type: string
        }
        Update: {
          actual_duration_hours?: number | null
          created_at?: string
          fast_end_at?: string | null
          fast_start_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          planned_duration_hours?: number
          status?: string
          window_type?: string
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
          phi_consent_required: boolean
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
          phi_consent_required?: boolean
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
          phi_consent_required?: boolean
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
      meal_plans: {
        Row: {
          created_at: string
          generated_at: string
          generation_status: string
          generation_trigger: string
          id: string
          member_id: string
          plan_data: Json
          plan_type: string
          preferences_snapshot: Json
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generation_status?: string
          generation_trigger: string
          id?: string
          member_id: string
          plan_data?: Json
          plan_type?: string
          preferences_snapshot?: Json
          valid_from: string
          valid_until: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          generation_status?: string
          generation_trigger?: string
          id?: string
          member_id?: string
          plan_data?: Json
          plan_type?: string
          preferences_snapshot?: Json
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      meal_swaps: {
        Row: {
          created_at: string
          day: string
          id: string
          meal_type: string
          member_id: string
          plan_id: string
          swapped_at: string
          swapped_to: Json
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          meal_type: string
          member_id: string
          plan_id: string
          swapped_at?: string
          swapped_to: Json
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          meal_type?: string
          member_id?: string
          plan_id?: string
          swapped_at?: string
          swapped_to?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meal_swaps_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      member_daily_progress: {
        Row: {
          action_id: string
          completed_at: string | null
          created_at: string
          day_number: number
          id: string
          member_id: string
          notes: string | null
          status: string
          sub_tasks_completed: Json
          updated_at: string
        }
        Insert: {
          action_id: string
          completed_at?: string | null
          created_at?: string
          day_number: number
          id?: string
          member_id: string
          notes?: string | null
          status?: string
          sub_tasks_completed?: Json
          updated_at?: string
        }
        Update: {
          action_id?: string
          completed_at?: string | null
          created_at?: string
          day_number?: number
          id?: string
          member_id?: string
          notes?: string | null
          status?: string
          sub_tasks_completed?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_daily_progress_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "daily_actions"
            referencedColumns: ["id"]
          },
        ]
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
      messages: {
        Row: {
          classifier: Json
          contains_phi: boolean
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          visitor_profile_id: string
        }
        Insert: {
          classifier?: Json
          contains_phi?: boolean
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          visitor_profile_id: string
        }
        Update: {
          classifier?: Json
          contains_phi?: boolean
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          visitor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      phi_access_log: {
        Row: {
          accessed_at: string
          actor_kind: string
          actor_user_id: string | null
          id: string
          reason: string
          row_id: string | null
          table_name: string
          visitor_profile_id: string | null
        }
        Insert: {
          accessed_at?: string
          actor_kind?: string
          actor_user_id?: string | null
          id?: string
          reason: string
          row_id?: string | null
          table_name: string
          visitor_profile_id?: string | null
        }
        Update: {
          accessed_at?: string
          actor_kind?: string
          actor_user_id?: string | null
          id?: string
          reason?: string
          row_id?: string | null
          table_name?: string
          visitor_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phi_access_log_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_consent: {
        Row: {
          consented_at: string
          created_at: string
          id: string
          ip_address: string | null
          policy_version: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string | null
          visitor_profile_id: string
        }
        Insert: {
          consented_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          policy_version: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_profile_id: string
        }
        Update: {
          consented_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phi_consent_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_validation_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          member_id: string
          product_idea_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          member_id: string
          product_idea_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string
          product_idea_id?: string
          token?: string
          used_at?: string | null
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
      shopping_lists: {
        Row: {
          created_at: string
          id: string
          list_data: Json
          member_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_data?: Json
          member_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          list_data?: Json
          member_id?: string
          week_start_date?: string
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
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
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
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_active_date: string | null
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_engagement_scores: {
        Row: {
          consistency_score: number
          content_score: number
          conversation_score: number
          days_since_last_activity: number | null
          draft_whatsapp_script: string | null
          id: string
          last_conversation_theme: string | null
          last_purchase_at: string | null
          open_unresolved_questions: Json
          recency_score: number
          refreshed_at: string
          score: number
          spend_score: number
          talking_points: Json
          total_paid_usd: number
          user_id: string | null
          visitor_profile_id: string | null
        }
        Insert: {
          consistency_score?: number
          content_score?: number
          conversation_score?: number
          days_since_last_activity?: number | null
          draft_whatsapp_script?: string | null
          id?: string
          last_conversation_theme?: string | null
          last_purchase_at?: string | null
          open_unresolved_questions?: Json
          recency_score?: number
          refreshed_at?: string
          score?: number
          spend_score?: number
          talking_points?: Json
          total_paid_usd?: number
          user_id?: string | null
          visitor_profile_id?: string | null
        }
        Update: {
          consistency_score?: number
          content_score?: number
          conversation_score?: number
          days_since_last_activity?: number | null
          draft_whatsapp_script?: string | null
          id?: string
          last_conversation_theme?: string | null
          last_purchase_at?: string | null
          open_unresolved_questions?: Json
          recency_score?: number
          refreshed_at?: string
          score?: number
          spend_score?: number
          talking_points?: Json
          total_paid_usd?: number
          user_id?: string | null
          visitor_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_engagement_scores_visitor_profile_id_fkey"
            columns: ["visitor_profile_id"]
            isOneToOne: false
            referencedRelation: "visitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_profiles: {
        Row: {
          anonymous_id: string
          badges_earned: Json
          cheat_meal_day_of_week: number | null
          cheat_meal_enabled: boolean
          community_badges_earned: Json
          community_display_name: string | null
          confidence: number
          created_at: string
          current_program_phase: number
          date_of_birth: string | null
          first_seen_at: string
          getting_started_checklist: Json
          helpful_points: number
          id: string
          if_enabled: boolean
          if_window_hours: number | null
          last_activity_at: string
          last_ring_close_at: string | null
          level: number
          level_earned_at: string | null
          lowers_blood_sugar_meds: boolean
          metadata: Json
          phase_1_extension_active: boolean
          reset_points: number
          served_meals: Json
          source: string | null
          streak_count: number
          streak_freeze_available: boolean
          streak_history: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymous_id: string
          badges_earned?: Json
          cheat_meal_day_of_week?: number | null
          cheat_meal_enabled?: boolean
          community_badges_earned?: Json
          community_display_name?: string | null
          confidence?: number
          created_at?: string
          current_program_phase?: number
          date_of_birth?: string | null
          first_seen_at?: string
          getting_started_checklist?: Json
          helpful_points?: number
          id?: string
          if_enabled?: boolean
          if_window_hours?: number | null
          last_activity_at?: string
          last_ring_close_at?: string | null
          level?: number
          level_earned_at?: string | null
          lowers_blood_sugar_meds?: boolean
          metadata?: Json
          phase_1_extension_active?: boolean
          reset_points?: number
          served_meals?: Json
          source?: string | null
          streak_count?: number
          streak_freeze_available?: boolean
          streak_history?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string
          badges_earned?: Json
          cheat_meal_day_of_week?: number | null
          cheat_meal_enabled?: boolean
          community_badges_earned?: Json
          community_display_name?: string | null
          confidence?: number
          created_at?: string
          current_program_phase?: number
          date_of_birth?: string | null
          first_seen_at?: string
          getting_started_checklist?: Json
          helpful_points?: number
          id?: string
          if_enabled?: boolean
          if_window_hours?: number | null
          last_activity_at?: string
          last_ring_close_at?: string | null
          level?: number
          level_earned_at?: string | null
          lowers_blood_sugar_meds?: boolean
          metadata?: Json
          phase_1_extension_active?: boolean
          reset_points?: number
          served_meals?: Json
          source?: string | null
          streak_count?: number
          streak_freeze_available?: boolean
          streak_history?: Json
          updated_at?: string
          user_id?: string | null
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
      win_posts: {
        Row: {
          author_day_in_program: number | null
          author_id: string
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          milestone_label: string
          milestone_type: string
          reaction_counts: Json
          share_stat: boolean
          stat_improvement: string | null
        }
        Insert: {
          author_day_in_program?: number | null
          author_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          milestone_label: string
          milestone_type: string
          reaction_counts?: Json
          share_stat?: boolean
          stat_improvement?: string | null
        }
        Update: {
          author_day_in_program?: number | null
          author_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          milestone_label?: string
          milestone_type?: string
          reaction_counts?: Json
          share_stat?: boolean
          stat_improvement?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          level: number
          total_xp: number
        }[]
      }
      bump_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          longest_streak: number
        }[]
      }
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
