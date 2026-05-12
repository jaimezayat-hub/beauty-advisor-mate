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
      appointment_reminders: {
        Row: {
          appointment_id: string
          channel: Database["public"]["Enums"]["notification_channel"]
          id: string
          send_at: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          appointment_id: string
          channel: Database["public"]["Enums"]["notification_channel"]
          id?: string
          send_at: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          id?: string
          send_at?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          ba_id: string
          brand: Database["public"]["Enums"]["brand"]
          consumer_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          store_id: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
        }
        Insert: {
          ba_id: string
          brand: Database["public"]["Enums"]["brand"]
          consumer_id: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          store_id: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Update: {
          ba_id?: string
          brand?: Database["public"]["Enums"]["brand"]
          consumer_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          store_id?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_ba_id_fkey"
            columns: ["ba_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["code"]
          },
        ]
      }
      arco_requests: {
        Row: {
          consumer_id: string
          created_at: string
          id: string
          notes: string | null
          request_type: Database["public"]["Enums"]["arco_type"]
          requested_at: string
          requested_by_ba: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["arco_status"]
          updated_at: string
        }
        Insert: {
          consumer_id: string
          created_at?: string
          id?: string
          notes?: string | null
          request_type: Database["public"]["Enums"]["arco_type"]
          requested_at?: string
          requested_by_ba?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["arco_status"]
          updated_at?: string
        }
        Update: {
          consumer_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          request_type?: Database["public"]["Enums"]["arco_type"]
          requested_at?: string
          requested_by_ba?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["arco_status"]
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
        }
        Relationships: []
      }
      consumer_consents: {
        Row: {
          channel: Database["public"]["Enums"]["consent_channel"]
          consumer_id: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          revoked_at: string | null
          source: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["consent_channel"]
          consumer_id: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          source?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["consent_channel"]
          consumer_id?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_consents_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_preferences: {
        Row: {
          consumer_id: string
          created_at: string
          id: string
          key: string
          value: string | null
        }
        Insert: {
          consumer_id: string
          created_at?: string
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          consumer_id?: string
          created_at?: string
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_preferences_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_tags: {
        Row: {
          consumer_id: string
          created_at: string
          tag: string
        }
        Insert: {
          consumer_id: string
          created_at?: string
          tag: string
        }
        Update: {
          consumer_id?: string
          created_at?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumer_tags_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
        ]
      }
      consumers: {
        Row: {
          birthday: string | null
          brand: Database["public"]["Enums"]["brand"]
          city: string | null
          created_at: string
          deleted_at: string | null
          doc_id: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string | null
          lifetime_value: number | null
          notes: string | null
          owner_ba_id: string | null
          phone: string | null
          segment: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          brand: Database["public"]["Enums"]["brand"]
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          doc_id?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          lifetime_value?: number | null
          notes?: string | null
          owner_ba_id?: string | null
          phone?: string | null
          segment?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          brand?: Database["public"]["Enums"]["brand"]
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          doc_id?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          lifetime_value?: number | null
          notes?: string | null
          owner_ba_id?: string | null
          phone?: string | null
          segment?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumers_owner_ba_id_fkey"
            columns: ["owner_ba_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["code"]
          },
        ]
      }
      event_log: {
        Row: {
          created_at: string
          event_type: string
          id: number
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      follow_up_templates: {
        Row: {
          active: boolean
          body_template: string
          brand: Database["public"]["Enums"]["brand"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          days_offset: number
          id: string
          name: string
          trigger: Database["public"]["Enums"]["followup_trigger"]
        }
        Insert: {
          active?: boolean
          body_template: string
          brand: Database["public"]["Enums"]["brand"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          days_offset?: number
          id?: string
          name: string
          trigger: Database["public"]["Enums"]["followup_trigger"]
        }
        Update: {
          active?: boolean
          body_template?: string
          brand?: Database["public"]["Enums"]["brand"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          days_offset?: number
          id?: string
          name?: string
          trigger?: Database["public"]["Enums"]["followup_trigger"]
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          ba_id: string
          channel: Database["public"]["Enums"]["notification_channel"] | null
          completed_at: string | null
          consumer_id: string
          created_at: string
          due_at: string
          id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["followup_outcome"]
          related_purchase_id: string | null
          related_sample_id: string | null
          store_id: string
          template_id: string | null
          trigger: Database["public"]["Enums"]["followup_trigger"]
          updated_at: string
        }
        Insert: {
          ba_id: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          completed_at?: string | null
          consumer_id: string
          created_at?: string
          due_at: string
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["followup_outcome"]
          related_purchase_id?: string | null
          related_sample_id?: string | null
          store_id: string
          template_id?: string | null
          trigger?: Database["public"]["Enums"]["followup_trigger"]
          updated_at?: string
        }
        Update: {
          ba_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          completed_at?: string | null
          consumer_id?: string
          created_at?: string
          due_at?: string
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["followup_outcome"]
          related_purchase_id?: string | null
          related_sample_id?: string | null
          store_id?: string
          template_id?: string | null
          trigger?: Database["public"]["Enums"]["followup_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_ba_id_fkey"
            columns: ["ba_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_related_purchase_id_fkey"
            columns: ["related_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_related_sample_id_fkey"
            columns: ["related_sample_id"]
            isOneToOne: false
            referencedRelation: "sample_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "follow_ups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "follow_up_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          brand: Database["public"]["Enums"]["brand"]
          created_at: string
          id: string
          metric: Database["public"]["Enums"]["goal_metric"]
          period_end: string
          period_start: string
          scope: Database["public"]["Enums"]["goal_scope"]
          scope_ref: string
          target_value: number
          updated_at: string
        }
        Insert: {
          brand: Database["public"]["Enums"]["brand"]
          created_at?: string
          id?: string
          metric: Database["public"]["Enums"]["goal_metric"]
          period_end: string
          period_start: string
          scope: Database["public"]["Enums"]["goal_scope"]
          scope_ref: string
          target_value: number
          updated_at?: string
        }
        Update: {
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          id?: string
          metric?: Database["public"]["Enums"]["goal_metric"]
          period_end?: string
          period_start?: string
          scope?: Database["public"]["Enums"]["goal_scope"]
          scope_ref?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      notice_acceptances: {
        Row: {
          accepted_at: string
          captured_by_ba: string | null
          consumer_id: string
          created_at: string
          id: string
          ip_address: unknown
          notice_id: string
          signature_ref: string | null
        }
        Insert: {
          accepted_at?: string
          captured_by_ba?: string | null
          consumer_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          notice_id: string
          signature_ref?: string | null
        }
        Update: {
          accepted_at?: string
          captured_by_ba?: string | null
          consumer_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          notice_id?: string
          signature_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notice_acceptances_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "privacy_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          enabled: boolean
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          enabled?: boolean
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          enabled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_notices: {
        Row: {
          body_text: string | null
          body_url: string | null
          brand: Database["public"]["Enums"]["brand"]
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          version: string
        }
        Insert: {
          body_text?: string | null
          body_url?: string | null
          brand: Database["public"]["Enums"]["brand"]
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          version: string
        }
        Update: {
          body_text?: string | null
          body_url?: string | null
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          version?: string
        }
        Relationships: []
      }
      product_recommendations: {
        Row: {
          created_at: string
          id: string
          product_id: string
          reason: string | null
          recommended_product_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          reason?: string | null
          recommended_product_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          reason?: string | null
          recommended_product_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recommendations_recommended_product_id_fkey"
            columns: ["recommended_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          attributes: Json | null
          brand: Database["public"]["Enums"]["brand"]
          category: string | null
          created_at: string
          currency: string | null
          ean: string | null
          family: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          sku: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          attributes?: Json | null
          brand: Database["public"]["Enums"]["brand"]
          category?: string | null
          created_at?: string
          currency?: string | null
          ean?: string | null
          family?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          sku: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          attributes?: Json | null
          brand?: Database["public"]["Enums"]["brand"]
          category?: string | null
          created_at?: string
          currency?: string | null
          ean?: string | null
          family?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          sku?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          brand: Database["public"]["Enums"]["brand"]
          created_at: string
          display_name: string
          email: string | null
          id: string
          region: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          region?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          region?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          discount: number
          id: string
          name_snapshot: string
          product_id: string | null
          purchase_id: string
          qty: number
          sku_snapshot: string
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          name_snapshot: string
          product_id?: string | null
          purchase_id: string
          qty?: number
          sku_snapshot: string
          unit_price?: number
        }
        Update: {
          discount?: number
          id?: string
          name_snapshot?: string
          product_id?: string | null
          purchase_id?: string
          qty?: number
          sku_snapshot?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          ba_id: string
          brand: Database["public"]["Enums"]["brand"]
          consumer_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          notes: string | null
          purchased_at: string
          source: Database["public"]["Enums"]["purchase_source"]
          store_id: string
          ticket_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          ba_id: string
          brand: Database["public"]["Enums"]["brand"]
          consumer_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          source?: Database["public"]["Enums"]["purchase_source"]
          store_id: string
          ticket_number?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          ba_id?: string
          brand?: Database["public"]["Enums"]["brand"]
          consumer_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          source?: Database["public"]["Enums"]["purchase_source"]
          store_id?: string
          ticket_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_ba_id_fkey"
            columns: ["ba_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["code"]
          },
        ]
      }
      regions: {
        Row: {
          code: string
          created_at: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          name?: string
        }
        Relationships: []
      }
      sample_deliveries: {
        Row: {
          ba_id: string
          consumer_id: string
          converted_purchase_id: string | null
          created_at: string
          delivered_at: string
          id: string
          notes: string | null
          sample_id: string
          store_id: string
        }
        Insert: {
          ba_id: string
          consumer_id: string
          converted_purchase_id?: string | null
          created_at?: string
          delivered_at?: string
          id?: string
          notes?: string | null
          sample_id: string
          store_id: string
        }
        Update: {
          ba_id?: string
          consumer_id?: string
          converted_purchase_id?: string | null
          created_at?: string
          delivered_at?: string
          id?: string
          notes?: string | null
          sample_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_deliveries_ba_id_fkey"
            columns: ["ba_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_deliveries_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_deliveries_converted_purchase_id_fkey"
            columns: ["converted_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_deliveries_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_deliveries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["code"]
          },
        ]
      }
      samples: {
        Row: {
          active: boolean
          brand: Database["public"]["Enums"]["brand"]
          created_at: string
          id: string
          name: string
          sku: string
        }
        Insert: {
          active?: boolean
          brand: Database["public"]["Enums"]["brand"]
          created_at?: string
          id?: string
          name: string
          sku: string
        }
        Update: {
          active?: boolean
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          id?: string
          name?: string
          sku?: string
        }
        Relationships: []
      }
      store_sample_stock: {
        Row: {
          qty: number
          sample_id: string
          store_code: string
          updated_at: string
        }
        Insert: {
          qty?: number
          sample_id: string
          store_code: string
          updated_at?: string
        }
        Update: {
          qty?: number
          sample_id?: string
          store_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_sample_stock_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sample_stock_store_code_fkey"
            columns: ["store_code"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["code"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          brand: Database["public"]["Enums"]["brand"]
          code: string
          created_at: string
          name: string
          region_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          brand: Database["public"]["Enums"]["brand"]
          code: string
          created_at?: string
          name: string
          region_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          brand?: Database["public"]["Enums"]["brand"]
          code?: string
          created_at?: string
          name?: string
          region_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      tickets: {
        Row: {
          id: string
          ocr_text: string | null
          purchase_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          ocr_text?: string | null
          purchase_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          ocr_text?: string | null
          purchase_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_reasons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          appointment_id: string | null
          ba_id: string
          brand: Database["public"]["Enums"]["brand"]
          consumer_id: string
          created_at: string
          duration_min: number | null
          id: string
          notes: string | null
          reason_id: string | null
          store_id: string
          visited_at: string
        }
        Insert: {
          appointment_id?: string | null
          ba_id: string
          brand: Database["public"]["Enums"]["brand"]
          consumer_id: string
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          reason_id?: string | null
          store_id: string
          visited_at?: string
        }
        Update: {
          appointment_id?: string | null
          ba_id?: string
          brand?: Database["public"]["Enums"]["brand"]
          consumer_id?: string
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          reason_id?: string | null
          store_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "visit_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          consumer_id: string
          external_id: string | null
          id: string
          rendered_body: string
          sent_at: string
          sent_by: string | null
          status: Database["public"]["Enums"]["whatsapp_status"]
          template_id: string | null
        }
        Insert: {
          consumer_id: string
          external_id?: string | null
          id?: string
          rendered_body: string
          sent_at?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          template_id?: string | null
        }
        Update: {
          consumer_id?: string
          external_id?: string | null
          id?: string
          rendered_body?: string
          sent_at?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          approved: boolean
          body: string
          brand: Database["public"]["Enums"]["brand"]
          code: string
          created_at: string
          id: string
          language: string
          variables: Json | null
        }
        Insert: {
          approved?: boolean
          body: string
          brand: Database["public"]["Enums"]["brand"]
          code: string
          created_at?: string
          id?: string
          language?: string
          variables?: Json | null
        }
        Update: {
          approved?: boolean
          body?: string
          brand?: Database["public"]["Enums"]["brand"]
          code?: string
          created_at?: string
          id?: string
          language?: string
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_scope: {
        Args: { _ba: string; _store: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_brand: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["brand"]
      }
      user_region: { Args: { _user_id: string }; Returns: string }
      user_store: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "ba"
        | "store_manager_palacio"
        | "store_manager_liverpool"
        | "zone_supervisor"
        | "central_admin"
        | "store_manager"
      appointment_status:
        | "pending"
        | "confirmed"
        | "done"
        | "no_show"
        | "cancelled"
      appointment_type: "makeover" | "consulta" | "follow_up" | "evento"
      arco_status: "recibida" | "en_proceso" | "completada" | "rechazada"
      arco_type: "acceso" | "rectificacion" | "cancelacion" | "oposicion"
      brand: "lancome" | "ysl"
      consent_channel: "whatsapp" | "email" | "sms"
      followup_outcome:
        | "contacted"
        | "no_answer"
        | "opted_out"
        | "converted"
        | "pending"
      followup_trigger:
        | "post_purchase"
        | "birthday"
        | "inactivity"
        | "sample"
        | "manual"
      goal_metric:
        | "sales"
        | "tickets"
        | "conversion"
        | "new_consumers"
        | "samples_converted"
      goal_scope: "ba" | "store" | "region"
      notification_channel: "inapp" | "email" | "whatsapp" | "sms"
      purchase_source: "pos" | "manual" | "scan"
      whatsapp_status: "stub" | "queued" | "sent" | "failed"
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
      app_role: [
        "ba",
        "store_manager_palacio",
        "store_manager_liverpool",
        "zone_supervisor",
        "central_admin",
        "store_manager",
      ],
      appointment_status: [
        "pending",
        "confirmed",
        "done",
        "no_show",
        "cancelled",
      ],
      appointment_type: ["makeover", "consulta", "follow_up", "evento"],
      arco_status: ["recibida", "en_proceso", "completada", "rechazada"],
      arco_type: ["acceso", "rectificacion", "cancelacion", "oposicion"],
      brand: ["lancome", "ysl"],
      consent_channel: ["whatsapp", "email", "sms"],
      followup_outcome: [
        "contacted",
        "no_answer",
        "opted_out",
        "converted",
        "pending",
      ],
      followup_trigger: [
        "post_purchase",
        "birthday",
        "inactivity",
        "sample",
        "manual",
      ],
      goal_metric: [
        "sales",
        "tickets",
        "conversion",
        "new_consumers",
        "samples_converted",
      ],
      goal_scope: ["ba", "store", "region"],
      notification_channel: ["inapp", "email", "whatsapp", "sms"],
      purchase_source: ["pos", "manual", "scan"],
      whatsapp_status: ["stub", "queued", "sent", "failed"],
    },
  },
} as const
